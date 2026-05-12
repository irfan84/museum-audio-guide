const request = require('supertest');
const express = require('express');

jest.mock('../db/index');
const db = require('../db/index');
const eventRouter = require('./events');

describe('Events router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/events', eventRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/events/scan with valid body returns success true', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/events/scan')
      .send({ device_id: 'device-123', exhibit_id: 1, language_code: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/events/scan missing device_id returns 400', async () => {
    const res = await request(app)
      .post('/api/events/scan')
      .send({ exhibit_id: 1, language_code: 'en' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('POST /api/events/play with valid body returns play_event_id', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 42 }] });

    const res = await request(app)
      .post('/api/events/play')
      .send({ device_id: 'device-123', exhibit_id: 1, language_code: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.play_event_id).toBe(42);
  });
});
