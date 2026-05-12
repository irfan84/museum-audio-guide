const express = require('express');
const router  = express.Router();
const db      = require('../db/index');

// ── GET /api/exhibits ─────────────────────────────────
// Returns all live exhibits for the home screen
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        e.id,
        e.category,
        e.status,
        h.name  AS hall_name,
        t.title,
        t.language_code
      FROM exhibits e
      LEFT JOIN halls h             ON h.id = e.hall_id
      LEFT JOIN exhibit_translations t ON t.exhibit_id = e.id
      WHERE e.status = 'live'
      ORDER BY e.id, t.language_code
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /exhibits error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/exhibits/:id ─────────────────────────────
// Returns one exhibit with all translations + audio files
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Exhibit base info
    const exhibitRes = await db.query(`
      SELECT e.id, e.category, e.status, h.name AS hall_name
      FROM exhibits e
      LEFT JOIN halls h ON h.id = e.hall_id
      WHERE e.id = $1
    `, [id]);

    if (exhibitRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exhibit not found' });
    }

    // All translations (Urdu + English)
    const translationsRes = await db.query(`
      SELECT language_code, title, transcript_text, kids_transcript_text
      FROM exhibit_translations
      WHERE exhibit_id = $1
    `, [id]);

    // All audio files
    const audioRes = await db.query(`
      SELECT language_code, file_path, duration_secs
      FROM audio_files
      WHERE exhibit_id = $1
    `, [id]);

    // Did you know facts
    const factsRes = await db.query(`
      SELECT language_code, fact_text
      FROM facts
      WHERE exhibit_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...exhibitRes.rows[0],
        translations: translationsRes.rows,
        audio:        audioRes.rows,
        facts:        factsRes.rows,
      }
    });
  } catch (err) {
    console.error('GET /exhibits/:id error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/exhibits/qr/:token ───────────────────────
// Called when visitor scans a QR code
// Finds the exhibit linked to that QR token
router.get('/qr/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find exhibit id from qr_codes table
    const qrRes = await db.query(`
      SELECT exhibit_id FROM qr_codes WHERE qr_token = $1
    `, [token]);

    if (qrRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'QR code not found' });
    }

    const exhibitId = qrRes.rows[0].exhibit_id;

    // Reuse the same logic as /:id by redirecting internally
    req.params.id = exhibitId;

    // Fetch full exhibit data
    const exhibitRes = await db.query(`
      SELECT e.id, e.category, e.status, h.name AS hall_name
      FROM exhibits e
      LEFT JOIN halls h ON h.id = e.hall_id
      WHERE e.id = $1
    `, [exhibitId]);

    const translationsRes = await db.query(
      'SELECT language_code, title, transcript_text, kids_transcript_text FROM exhibit_translations WHERE exhibit_id = $1',
      [exhibitId]
    );
    const audioRes = await db.query(
      'SELECT language_code, file_path, duration_secs FROM audio_files WHERE exhibit_id = $1',
      [exhibitId]
    );
    const factsRes = await db.query(
      'SELECT language_code, fact_text FROM facts WHERE exhibit_id = $1',
      [exhibitId]
    );

    res.json({
      success: true,
      data: {
        ...exhibitRes.rows[0],
        qr_token:     token,
        translations: translationsRes.rows,
        audio:        audioRes.rows,
        facts:        factsRes.rows,
      }
    });
  } catch (err) {
    console.error('GET /exhibits/qr/:token error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;