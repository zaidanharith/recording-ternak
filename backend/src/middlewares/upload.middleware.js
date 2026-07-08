const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Tipe file harus JPEG atau PNG.'));
    }
    cb(null, true);
  },
});

module.exports = { upload, ALLOWED_MIME_TYPES, MAX_SIZE_BYTES };
