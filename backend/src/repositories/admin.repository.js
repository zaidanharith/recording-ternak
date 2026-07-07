const prisma = require('../lib/prisma');

const findAdminByEmail = async (email) => {
  return await prisma.admin.findUnique({ where: { email } });
};

const findAdminByGoogleId = async (googleId) => {
  return await prisma.admin.findUnique({ where: { googleId } });
};

const findAdminById = async (id) => {
  return await prisma.admin.findUnique({ where: { id } });
};

const listAdmins = async () => {
  return await prisma.admin.findMany({ orderBy: { createdAt: 'desc' } });
};

const createAdmin = async ({ username, email, password, name, role, avatarUrl }) => {
  return await prisma.admin.create({
    data: { username, email, password, name, role, avatarUrl },
  });
};

const updateAdmin = async (id, data) => {
  return await prisma.admin.update({ where: { id }, data });
};

const deleteAdmin = async (id) => {
  return await prisma.admin.delete({ where: { id } });
};

const linkGoogleId = async (id, googleId) => {
  return await prisma.admin.update({ where: { id }, data: { googleId } });
};

module.exports = {
  findAdminByEmail,
  findAdminByGoogleId,
  findAdminById,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  linkGoogleId,
};
