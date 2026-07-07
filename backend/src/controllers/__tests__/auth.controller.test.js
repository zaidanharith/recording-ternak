const adminRepository = require('../../repositories/admin.repository');
const authService = require('../../services/auth.service');

jest.mock('../../repositories/admin.repository');
jest.mock('../../services/auth.service');
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const { login, me, updateMe } = require('../auth.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('login', () => {
  it('returns a token when email and password are correct', async () => {
    adminRepository.findAdminByEmail.mockResolvedValue({
      id: 'admin-1', username: 'budi', email: 'budi@example.com', name: 'Budi', role: 'ADMIN', password: 'hashed',
    });
    authService.comparePassword.mockResolvedValue(true);
    authService.generateToken.mockReturnValue('signed.jwt.token');

    const req = { body: { email: 'budi@example.com', password: 'rahasia123' } };
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ token: 'signed.jwt.token' }) })
    );
  });

  it('returns 401 when password is wrong', async () => {
    adminRepository.findAdminByEmail.mockResolvedValue({
      id: 'admin-1', email: 'budi@example.com', password: 'hashed',
    });
    authService.comparePassword.mockResolvedValue(false);

    const req = { body: { email: 'budi@example.com', password: 'salah' } };
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 401 when email is not registered', async () => {
    adminRepository.findAdminByEmail.mockResolvedValue(null);

    const req = { body: { email: 'tidakada@example.com', password: 'apapun' } };
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when email or password is missing', async () => {
    const req = { body: { email: 'budi@example.com' } };
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('me', () => {
  it('returns the current admin profile without the password field', async () => {
    adminRepository.findAdminById.mockResolvedValue({
      id: 'admin-1', username: 'budi', email: 'budi@example.com', name: 'Budi', role: 'ADMIN', password: 'hashed', avatarUrl: null,
    });

    const req = { user: { id: 'admin-1' } };
    const res = buildRes();

    await me(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.admin.password).toBeUndefined();
    expect(jsonArg.data.admin.id).toBe('admin-1');
  });
});

describe('updateMe', () => {
  it('updates name and avatarUrl without touching password', async () => {
    adminRepository.updateAdmin.mockResolvedValue({
      id: 'admin-1', name: 'Budi Baru', avatarUrl: 'https://example.com/a.png', email: 'budi@example.com', username: 'budi', role: 'ADMIN',
    });

    const req = { user: { id: 'admin-1' }, body: { name: 'Budi Baru', avatarUrl: 'https://example.com/a.png' } };
    const res = buildRes();

    await updateMe(req, res);

    expect(adminRepository.updateAdmin).toHaveBeenCalledWith('admin-1', { name: 'Budi Baru', avatarUrl: 'https://example.com/a.png' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when changing password without the correct currentPassword', async () => {
    adminRepository.findAdminById.mockResolvedValue({ id: 'admin-1', password: 'hashed' });
    authService.comparePassword.mockResolvedValue(false);

    const req = { user: { id: 'admin-1' }, body: { currentPassword: 'salah', newPassword: 'baru12345' } };
    const res = buildRes();

    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adminRepository.updateAdmin).not.toHaveBeenCalled();
  });
});
