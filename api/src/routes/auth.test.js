const request = require('supertest');
const express = require('express');

jest.mock('../db/index', () => ({
  query: jest.fn(),
}));
const db = require('../db/index');

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));
const bcrypt = require('bcryptjs');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
const jwt = require('jsonwebtoken');

const authRouter = require('./auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

describe('Auth routes', () => {
  describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'secret' });

      expect(response.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com' });

      expect(response.status).toBe(400);
    });

    it('returns 401 when email is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'secret' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('returns 200 and token when credentials are correct', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Admin',
            email: 'admin@example.com',
            password_hash: 'hashed-password',
            role: 'admin',
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValueOnce('fake-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'secret' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('fake-token');
      expect(response.body.user).toEqual({
        id: 1,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      });
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('returns 401 when password is wrong', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Admin',
            email: 'admin@example.com',
            password_hash: 'hashed-password',
            role: 'admin',
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no token is provided', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns 200 and user info when token is valid', async () => {
      jwt.verify.mockReturnValueOnce({
        id: 1,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 200 and a success message', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
