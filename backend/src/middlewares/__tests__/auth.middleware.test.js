const jwt = require('jsonwebtoken');
const config = require('../../config');
const authMiddleware = require('../auth.middleware');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = buildRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is malformed', () => {
    const req = { headers: { authorization: 'Token abc' } };
    const res = buildRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = buildRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next when token is valid', () => {
    const token = jwt.sign(
      { id: 'admin-1', username: 'budi', email: 'budi@example.com', name: 'Budi', role: 'ADMIN' },
      config.auth.jwtSecret,
      { expiresIn: '1h' }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = buildRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(req.user).toMatchObject({ id: 'admin-1', role: 'ADMIN' });
    expect(next).toHaveBeenCalled();
  });
});
