const cloudinaryService = require('../services/cloudinary.service');

const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File foto wajib diunggah.' });
    }

    const { url, publicId } = await cloudinaryService.uploadImage(req.file.buffer, 'recording-ternak/dashboard');

    return res.status(201).json({
      success: true,
      data: { url, publicId },
    });
  } catch (error) {
    console.error('Upload Photo Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengunggah foto.',
      error: error.message,
    });
  }
};

module.exports = { uploadPhoto };
