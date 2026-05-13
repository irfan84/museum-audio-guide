const express = require('express');
const router  = express.Router();
const db      = require('../db/index');

// ── POST /api/events/scan ─────────────────────────────
// Called every time a visitor scans a QR code
router.post('/scan', async (req, res) => {
  const { device_id, exhibit_id, language_code, event_id } = req.body;

  // Validate required fields
  if (!device_id || !exhibit_id || !language_code) {
    return res.status(400).json({
      success: false,
      error: 'device_id, exhibit_id, and language_code are required'
    });
  }

  try {
    await db.query(`
  INSERT INTO scan_events (device_id, exhibit_id, language_code, event_id)
  VALUES ($1, $2, $3, $4)
`, [device_id, exhibit_id, language_code, event_id || null]);

    res.json({ success: true });
  } catch (err) {
     // Duplicate event_id — idempotent, not an error
  if (err.code === '23505') {
    return res.json({ success: true, duplicate: true });
  }
    console.error('POST /events/scan error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/events/play ─────────────────────────────
// Called when a visitor presses Play on an audio file
router.post('/play', async (req, res) => {
  const { device_id, exhibit_id, language_code, event_id } = req.body;

  if (!device_id || !exhibit_id || !language_code) {
    return res.status(400).json({
      success: false,
      error: 'device_id, exhibit_id, and language_code are required'
    });
  }

  try {
    const result = await db.query(`
    INSERT INTO play_events (device_id, exhibit_id, language_code, event_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `, [device_id, exhibit_id, language_code, event_id || null]);

    // Return the new play_event id so the app can
    // reference it when sending progress events later
    res.json({
      success: true,
      play_event_id: result.rows[0].id
    });
  } catch (err) {
    // Duplicate event_id — idempotent, not an error
  if (err.code === '23505') {
    return res.json({ success: true, duplicate: true });
  }

    console.error('POST /events/play error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;