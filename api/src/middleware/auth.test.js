jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));
const jwt = require('jsonwebtoken');

const { authenticateToken, requireRole } = require('./auth');

const buildResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

describe('authenticateToken middleware', () => {
  it('returns 401 when no authorization header is present', () => {
    const req = { headers: {} };
    const res = buildResponse();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Access denied. No token provided.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not contain Bearer token', () => {
    const req = { headers: { authorization: 'abc' } };
    const res = buildResponse();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Access denied. No token provided.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches req.user when token is valid', () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = buildResponse();
    const next = jest.fn();
    const decodedUser = { id: 1, name: 'Admin', role: 'admin' };

    jwt.verify.mockReturnValueOnce(decodedUser);

    authenticateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.user).toEqual(decodedUser);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when token is invalid', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = buildResponse();
    const next = jest.fn();

    jwt.verify.mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token. Please log in again.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  it('calls next when user has admin role', () => {
    const req = { user: { role: 'admin' } };
    const res = buildResponse();
    const next = jest.fn();

    const middleware = requireRole('admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user role is not allowed', () => {
    const req = { user: { role: 'editor' } };
    const res = buildResponse();
    const next = jest.fn();

    const middleware = requireRole('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Access denied. Required role: admin',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
