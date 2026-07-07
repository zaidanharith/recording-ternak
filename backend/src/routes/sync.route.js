const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { getStatus, retrySync } = require('../controllers/sync.controller');

router.get('/status', authMiddleware, getStatus);
router.post('/retry', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), retrySync);

module.exports = router;
