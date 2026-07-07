const { requireRole } = require('../role.middleware');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('requireRole', () => {
  it('calls next when req.user.role is in the allowed list', () => {
    const middleware = requireRole('SUPERADMIN');
    const req = { user: { role: 'SUPERADMIN' } };
    const res = buildRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when req.user.role is not in the allowed list', () => {
    const middleware = requireRole('SUPERADMIN');
    const req = { user: { role: 'VIEWER' } };
    const res = buildRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows any role passed in a multi-role list', () => {
    const middleware = requireRole('ADMIN', 'SUPERADMIN');
    const req = { user: { role: 'ADMIN' } };
    const res = buildRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
