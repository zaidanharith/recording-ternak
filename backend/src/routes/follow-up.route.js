const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { listNotReported, sendBulkReminder } = require('../controllers/follow-up.controller');

router.use(authMiddleware);

router.get('/', listNotReported);
router.post('/reminders', requireRole('ADMIN', 'SUPERADMIN'), sendBulkReminder);

module.exports = router;
