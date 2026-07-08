const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  admin: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const {
  findAdminByEmail,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  linkGoogleId,
} = require('../admin.repository');

describe('findAdminByEmail', () => {
  it('queries the admin table by email', async () => {
    prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1', email: 'budi@example.com' });

    const result = await findAdminByEmail('budi@example.com');

    expect(prisma.admin.findUnique).toHaveBeenCalledWith({ where: { email: 'budi@example.com' } });
    expect(result).toMatchObject({ id: 'admin-1' });
  });
});

describe('createAdmin', () => {
  it('creates an admin with the given data', async () => {
    prisma.admin.create.mockResolvedValue({ id: 'admin-2' });

    const result = await createAdmin({
      username: 'siti',
      email: 'siti@example.com',
      password: 'hashed',
      name: 'Siti',
      role: 'ADMIN',
    });

    expect(prisma.admin.create).toHaveBeenCalledWith({
      data: {
        username: 'siti',
        email: 'siti@example.com',
        password: 'hashed',
        name: 'Siti',
        role: 'ADMIN',
        avatarUrl: undefined,
      },
    });
    expect(result).toEqual({ id: 'admin-2' });
  });
});

describe('updateAdmin', () => {
  it('updates the admin with the given id', async () => {
    prisma.admin.update.mockResolvedValue({ id: 'admin-2', name: 'Siti Baru' });

    const result = await updateAdmin('admin-2', { name: 'Siti Baru' });

    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-2' },
      data: { name: 'Siti Baru' },
    });
    expect(result).toEqual({ id: 'admin-2', name: 'Siti Baru' });
  });
});

describe('deleteAdmin', () => {
  it('deletes the admin with the given id', async () => {
    prisma.admin.delete.mockResolvedValue({ id: 'admin-2' });

    const result = await deleteAdmin('admin-2');

    expect(prisma.admin.delete).toHaveBeenCalledWith({ where: { id: 'admin-2' } });
    expect(result).toEqual({ id: 'admin-2' });
  });
});

describe('linkGoogleId', () => {
  it('updates only googleId when avatarUrl is not provided', async () => {
    prisma.admin.update.mockResolvedValue({ id: 'admin-1', googleId: 'g-1' });

    await linkGoogleId('admin-1', 'g-1');

    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { googleId: 'g-1' },
    });
  });

  it('includes avatarUrl in the update when provided', async () => {
    prisma.admin.update.mockResolvedValue({ id: 'admin-1', googleId: 'g-1', avatarUrl: 'https://pic.example/a.png' });

    await linkGoogleId('admin-1', 'g-1', 'https://pic.example/a.png');

    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { googleId: 'g-1', avatarUrl: 'https://pic.example/a.png' },
    });
  });
});
