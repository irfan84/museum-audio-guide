const request = require('supertest');
const express = require('express');

jest.mock('../db/index');
const db = require('../db/index');
const exhibitsRouter = require('./exhibits');

describe('Exhibits router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/exhibits', exhibitsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/exhibits returns two exhibits', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, category: 'gallery', status: 'live', hall_name: 'Main Hall', title: 'First Exhibit', language_code: 'en' },
        { id: 2, category: 'gallery', status: 'live', hall_name: 'Side Hall', title: 'Second Exhibit', language_code: 'en' }
      ]
    });

    const res = await request(app).get('/api/exhibits');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ id: 1 });
  });

  it('GET /api/exhibits/1 returns exhibit with translations and audio', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, category: 'gallery', status: 'live', hall_name: 'Main Hall' }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', title: 'Exhibit One', transcript_text: 'Transcript', kids_transcript_text: 'Kids transcript' }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', file_path: '/audio/1.mp3', duration_secs: 120 }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', fact_text: 'Fun fact' }] });

    const res = await request(app).get('/api/exhibits/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: 1, category: 'gallery', status: 'live', hall_name: 'Main Hall' });
    expect(res.body.data.translations).toEqual([
      { language_code: 'en', title: 'Exhibit One', transcript_text: 'Transcript', kids_transcript_text: 'Kids transcript' }
    ]);
    expect(res.body.data.audio).toEqual([
      { language_code: 'en', file_path: '/audio/1.mp3', duration_secs: 120 }
    ]);
    expect(res.body.data.facts).toEqual([
      { language_code: 'en', fact_text: 'Fun fact' }
    ]);
  });

  it('GET /api/exhibits/999 returns 404 when exhibit not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/exhibits/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/exhibits/qr/exhibit-geo-001 returns exhibit data with qr_token', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ exhibit_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, category: 'gallery', status: 'live', hall_name: 'Main Hall' }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', title: 'Exhibit One', transcript_text: 'Transcript', kids_transcript_text: 'Kids transcript' }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', file_path: '/audio/1.mp3', duration_secs: 120 }] })
      .mockResolvedValueOnce({ rows: [{ language_code: 'en', fact_text: 'Fun fact' }] });

    const res = await request(app).get('/api/exhibits/qr/exhibit-geo-001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: 1, qr_token: 'exhibit-geo-001' });
  });

  it('GET /api/exhibits/qr/bad-token returns 404 when QR code not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/exhibits/qr/bad-token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
