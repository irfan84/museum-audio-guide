const request = require('supertest');
const express = require('express');

jest.mock('../db/index');
jest.mock('../middleware/upload');

const db = require('../db/index');
const upload = require('../middleware/upload');
const adminRouter = require('./admin');

describe('Admin router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/admin/exhibits returns array of 3 exhibits', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, title: 'Exhibit One', category: 'gallery', hall_name: 'Main', status: 'live', audio_count: 2, updated_at: '2026-05-12T10:00:00Z' },
        { id: 2, title: 'Exhibit Two', category: 'gallery', hall_name: 'Side', status: 'live', audio_count: 1, updated_at: '2026-05-12T09:00:00Z' },
        { id: 3, title: 'Exhibit Three', category: 'interactive', hall_name: 'Upper', status: 'draft', audio_count: 0, updated_at: '2026-05-12T08:00:00Z' }
      ]
    });

    const res = await request(app).get('/api/admin/exhibits');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].title).toBe('Exhibit One');
  });

  it('POST /api/admin/exhibits/1/audio uploads file successfully', async () => {
    upload.single.mockImplementation(() => (req, res, next) => {
      req.file = {
        path: './uploads/audio/1_en_1715405000000.mp3',
        mimetype: 'audio/mpeg',
        originalname: 'audio.mp3'
      };
      next();
    });

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/admin/exhibits/1/audio')
      .field('language_code', 'en');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file_path).toBe('./uploads/audio/1_en_1715405000000.mp3');
    expect(res.body.language_code).toBe('en');
  });

  it('POST /api/admin/exhibits/1/audio with no file returns 400', async () => {
    upload.single.mockImplementation(() => (req, res, next) => {
      req.file = null;
      next();
    });

    const res = await request(app)
      .post('/api/admin/exhibits/1/audio')
      .field('language_code', 'en');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/exhibits/1/qr generates QR on first call', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/admin/exhibits/1/qr');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qr_token).toBeDefined();
    expect(res.body.qr_image).toMatch(/^data:image/);
  });

  it('GET /api/admin/exhibits/1/qr returns same token on second call', async () => {
    const tokenValue = 'abc-123-def-456';

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ qr_token: tokenValue }] });

    const res = await request(app).get('/api/admin/exhibits/1/qr');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qr_token).toBe(tokenValue);
    expect(res.body.qr_image).toMatch(/^data:image/);
  });
});
