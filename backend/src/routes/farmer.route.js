const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listFarmers, getFarmer, createFarmer, updateFarmer, deleteFarmer,
  getFarmerChatMessages, sendReminder, exportFarmers,
} = require('../controllers/farmer.controller');

router.use(authMiddleware);

router.get('/', listFarmers);
router.get('/export', exportFarmers);
router.get('/:id', getFarmer);
router.get('/:id/chat-messages', getFarmerChatMessages);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createFarmer);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateFarmer);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteFarmer);
router.post('/:id/reminder', requireRole('ADMIN', 'SUPERADMIN'), sendReminder);

module.exports = router;
