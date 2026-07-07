const adminRepository = require('../../repositories/admin.repository');
const authService = require('../../services/auth.service');

jest.mock('../../repositories/admin.repository');
jest.mock('../../services/auth.service');

const { listAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../admin.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('createAdmin', () => {
  it('creates an ADMIN account with a hashed password', async () => {
    authService.hashPassword.mockResolvedValue('hashed-pw');
    adminRepository.createAdmin.mockResolvedValue({
      id: 'admin-2', username: 'siti', email: 'siti@example.com', name: 'Siti', role: 'ADMIN', password: 'hashed-pw',
    });

    const req = {
      body: { username: 'siti', email: 'siti@example.com', password: 'rahasia123', name: 'Siti', role: 'ADMIN' },
    };
    const res = buildRes();

    await createAdmin(req, res);

    expect(authService.hashPassword).toHaveBeenCalledWith('rahasia123');
    expect(res.status).toHaveBeenCalledWith(201);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.admin.password).toBeUndefined();
  });

  it('returns 400 when role is SUPERADMIN', async () => {
    const req = {
      body: { username: 'siti', email: 'siti@example.com', password: 'rahasia123', name: 'Siti', role: 'SUPERADMIN' },
    };
    const res = buildRes();

    await createAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adminRepository.createAdmin).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const req = { body: { email: 'siti@example.com' } };
    const res = buildRes();

    await createAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deleteAdmin', () => {
  it('returns 400 when trying to delete a SUPERADMIN account', async () => {
    adminRepository.findAdminById.mockResolvedValue({ id: 'admin-1', role: 'SUPERADMIN' });

    const req = { params: { id: 'admin-1' } };
    const res = buildRes();

    await deleteAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adminRepository.deleteAdmin).not.toHaveBeenCalled();
  });

  it('deletes an ADMIN account', async () => {
    adminRepository.findAdminById.mockResolvedValue({ id: 'admin-2', role: 'ADMIN' });
    adminRepository.deleteAdmin.mockResolvedValue({ id: 'admin-2' });

    const req = { params: { id: 'admin-2' } };
    const res = buildRes();

    await deleteAdmin(req, res);

    expect(adminRepository.deleteAdmin).toHaveBeenCalledWith('admin-2');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('listAdmins', () => {
  it('returns the list of admins without password fields', async () => {
    adminRepository.listAdmins.mockResolvedValue([
      { id: 'admin-1', role: 'ADMIN', password: 'hashed' },
      { id: 'admin-2', role: 'VIEWER', password: 'hashed' },
    ]);

    const req = {};
    const res = buildRes();

    await listAdmins(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.admins).toHaveLength(2);
    expect(jsonArg.data.admins[0].password).toBeUndefined();
  });
});

describe('updateAdmin', () => {
  it('returns 400 when trying to set role to SUPERADMIN', async () => {
    const req = { params: { id: 'admin-2' }, body: { role: 'SUPERADMIN' } };
    const res = buildRes();

    await updateAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adminRepository.updateAdmin).not.toHaveBeenCalled();
  });
});
