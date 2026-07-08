const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const adminRepository = require('../repositories/admin.repository');
const authService = require('../services/auth.service');

const googleClient = new OAuth2Client(config.auth.googleClientId);

const toPublicAdmin = (admin) => {
  const { password, ...publicAdmin } = admin;
  return publicAdmin;
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi.',
      });
    }

    const admin = await adminRepository.findAdminByEmail(email);

    if (!admin || !admin.password) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.',
      });
    }

    const isMatch = await authService.comparePassword(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.',
      });
    }

    const token = authService.generateToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: { token, admin: toPublicAdmin(admin) },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login.',
      error: error.message,
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID Token wajib dikirimkan.',
      });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.auth.googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({
        success: false,
        message: 'Google ID Token tidak valid atau kedaluwarsa.',
        error: verifyError.message,
      });
    }

    const { sub: googleId, email, email_verified: emailVerified, picture } = payload;

    if (!email || emailVerified === false) {
      return res.status(400).json({
        success: false,
        message: 'Akun Google tidak menyediakan alamat email yang terverifikasi.',
      });
    }

    let admin = await adminRepository.findAdminByGoogleId(googleId);

    if (!admin) {
      admin = await adminRepository.findAdminByEmail(email);

      if (!admin) {
        return res.status(403).json({
          success: false,
          message: 'Akun belum terdaftar. Hubungi SUPERADMIN untuk didaftarkan.',
        });
      }

      const avatarToSet = admin.avatarUrl ? undefined : picture;
      admin = await adminRepository.linkGoogleId(admin.id, googleId, avatarToSet);
    }

    const token = authService.generateToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Login Google berhasil.',
      data: { token, admin: toPublicAdmin(admin) },
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login Google.',
      error: error.message,
    });
  }
};

exports.me = async (req, res) => {
  try {
    const admin = await adminRepository.findAdminById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { admin: toPublicAdmin(admin) },
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil profil.',
      error: error.message,
    });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, avatarUrl, currentPassword, newPassword } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'currentPassword wajib diisi untuk mengubah password.',
        });
      }

      const admin = await adminRepository.findAdminById(req.user.id);
      const isMatch = admin.password && (await authService.comparePassword(currentPassword, admin.password));

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'currentPassword tidak sesuai.',
        });
      }

      updateData.password = await authService.hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data yang diubah.',
      });
    }

    const updatedAdmin = await adminRepository.updateAdmin(req.user.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: { admin: toPublicAdmin(updatedAdmin) },
    });
  } catch (error) {
    console.error('Update Me Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui profil.',
      error: error.message,
    });
  }
};
