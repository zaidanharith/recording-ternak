const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { uploadPhoto } = require('../controllers/uploads.controller');

router.use(authMiddleware);

// multer errors (bad mime type, file too large) are handled here via callback
// form instead of Express error middleware — this is multer's documented
// pattern and works regardless of where a global error handler might sit.
const runUpload = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/photo', requireRole('ADMIN', 'SUPERADMIN'), runUpload, uploadPhoto);

module.exports = router;
