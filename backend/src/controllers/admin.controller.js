const adminRepository = require('../repositories/admin.repository');
const authService = require('../services/auth.service');

const ASSIGNABLE_ROLES = ['ADMIN', 'VIEWER'];

const toPublicAdmin = (admin) => {
  const { password, ...publicAdmin } = admin;
  return publicAdmin;
};

exports.listAdmins = async (req, res) => {
  try {
    const admins = await adminRepository.listAdmins();

    return res.status(200).json({
      success: true,
      data: { admins: admins.map(toPublicAdmin) },
    });
  } catch (error) {
    console.error('List Admins Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar akun.',
      error: error.message,
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, name, role, avatarUrl } = req.body;

    if (!username || !email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'username, email, password, name, dan role wajib diisi.',
      });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role harus salah satu dari: ${ASSIGNABLE_ROLES.join(', ')}.`,
      });
    }

    const hashedPassword = await authService.hashPassword(password);

    const admin = await adminRepository.createAdmin({
      username,
      email,
      password: hashedPassword,
      name,
      role,
      avatarUrl,
    });

    return res.status(201).json({
      success: true,
      message: 'Akun berhasil dibuat.',
      data: { admin: toPublicAdmin(admin) },
    });
  } catch (error) {
    console.error('Create Admin Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat akun.',
      error: error.message,
    });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, name, role, avatarUrl } = req.body;

    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role harus salah satu dari: ${ASSIGNABLE_ROLES.join(', ')}.`,
      });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const admin = await adminRepository.updateAdmin(id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil diperbarui.',
      data: { admin: toPublicAdmin(admin) },
    });
  } catch (error) {
    console.error('Update Admin Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui akun.',
      error: error.message,
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await adminRepository.findAdminById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan.',
      });
    }

    if (admin.role === 'SUPERADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Akun SUPERADMIN tidak dapat dihapus melalui endpoint ini.',
      });
    }

    await adminRepository.deleteAdmin(id);

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil dihapus.',
    });
  } catch (error) {
    console.error('Delete Admin Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus akun.',
      error: error.message,
    });
  }
};
