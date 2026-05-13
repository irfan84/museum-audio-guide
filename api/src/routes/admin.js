const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const upload = require('../middleware/upload');
const db = require('../db/index');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/exhibits
router.get('/exhibits', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        e.id,
        t.title,
        e.category,
        h.name AS hall_name,
        e.status,
        COUNT(a.*) AS audio_count,
        e.updated_at
      FROM exhibits e
      LEFT JOIN exhibit_translations t
        ON t.exhibit_id = e.id
        AND t.language_code = 'en'
      LEFT JOIN halls h
        ON h.id = e.hall_id
      LEFT JOIN audio_files a
        ON a.exhibit_id = e.id
      GROUP BY e.id, t.title, e.category, h.name, e.status, e.updated_at
      ORDER BY e.updated_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/admin/exhibits error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/admin/exhibits/:id/audio
router.post('/exhibits/:id/audio',
  requireRole('admin', 'editor'),
  upload.single('audio'),
  async (req, res) => {
  try {
    const exhibitId = req.params.id;
    const { language_code } = req.body;

    if (!language_code) {
      return res.status(400).json({ success: false, error: 'language_code is required' });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const exhibitRes = await db.query(
      'SELECT id FROM exhibits WHERE id = $1',
      [exhibitId]
    );

    if (exhibitRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exhibit not found' });
    }

    await db.query(
      'DELETE FROM audio_files WHERE exhibit_id = $1 AND language_code = $2',
      [exhibitId, language_code]
    );

    await db.query(
      `INSERT INTO audio_files (exhibit_id, language_code, file_path, duration_secs)
       VALUES ($1, $2, $3, NULL)`,
      [exhibitId, language_code, req.file.path]
    );

    res.json({
      success: true,
      file_path: req.file.path,
      language_code
    });
  } catch (err) {
    console.error('POST /api/admin/exhibits/:id/audio error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

async function getOrCreateQrToken(exhibitId) {
  const qrRes = await db.query(
    'SELECT qr_token FROM qr_codes WHERE exhibit_id = $1',
    [exhibitId]
  );

  if (qrRes.rows.length > 0) {
    return qrRes.rows[0].qr_token;
  }

  const qrToken = uuidv4();
  await db.query(
    'INSERT INTO qr_codes (exhibit_id, qr_token) VALUES ($1, $2)',
    [exhibitId, qrToken]
  );

  return qrToken;
}

async function buildQrResponse(token) {
  const scanUrl = `${process.env.API_BASE_URL}/api/exhibits/qr/${token}`;
  const qrImage = await QRCode.toDataURL(scanUrl);

  return {
    qr_token: token,
    qr_image: qrImage,
    scan_url: scanUrl
  };
}

// GET /api/admin/exhibits/:id/qr
router.get('/exhibits/:id/qr', async (req, res) => {
  try {
    const exhibitId = req.params.id;
    const exhibitRes = await db.query(
      'SELECT id FROM exhibits WHERE id = $1',
      [exhibitId]
    );

    if (exhibitRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exhibit not found' });
    }

    const token = await getOrCreateQrToken(exhibitId);
    const qrData = await buildQrResponse(token);

    res.json({ success: true, ...qrData });
  } catch (err) {
    console.error('GET /api/admin/exhibits/:id/qr error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/admin/exhibits/:id/qr/pdf
router.get('/exhibits/:id/qr/pdf', async (req, res) => {
  try {
    const exhibitId = req.params.id;

    const exhibitRes = await db.query(
      `SELECT e.id, t.title, h.name AS hall_name
       FROM exhibits e
       LEFT JOIN exhibit_translations t
         ON t.exhibit_id = e.id
         AND t.language_code = 'en'
       LEFT JOIN halls h
         ON h.id = e.hall_id
       WHERE e.id = $1`,
      [exhibitId]
    );

    if (exhibitRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exhibit not found' });
    }

    const { title, hall_name } = exhibitRes.rows[0];
    const token = await getOrCreateQrToken(exhibitId);
    const scanUrl = `${process.env.API_BASE_URL}/api/exhibits/qr/${token}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl);  // reuse scanUrl — no duplication
    const qrImageBase64 = qrDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrImageBase64, 'base64');

    const mmToPt = (mm) => mm * 2.83465;
    const width = mmToPt(148);
    const height = mmToPt(105);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="qr-${exhibitId}.pdf"`);

    const doc = new PDFDocument({ size: [width, height], margin: 20 });
    doc.pipe(res);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1B4332')
    .text('Pakistan Museum of Natural History', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(title || 'Exhibit', {
      align: 'center'
    });

    const qrSize = Math.min(width * 0.45, height * 0.45);
    const qrX = (width - qrSize) / 2;
    const qrY = height * 0.30;
    doc.image(qrBuffer, qrX, qrY, { fit: [qrSize, qrSize], align: 'center' });

    // Move cursor below the image manually before writing text
    doc.y = qrY + qrSize + 10;

    doc.fontSize(10).font('Helvetica').fillColor('#6B7280')
    .text(hall_name || '', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#9CA3AF')
   .text('Scan to hear the audio guide', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('GET /api/admin/exhibits/:id/qr/pdf error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
});

module.exports = router;
