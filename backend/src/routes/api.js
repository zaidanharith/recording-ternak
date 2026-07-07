const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.route');
const adminRoutes = require('./admin.route');
const farmerRoutes = require('./farmer.route');
const goatRoutes = require('./goat.route');
const recordingRoutes = require('./recording.route');
const followUpRoutes = require('./follow-up.route');
const dashboardRoutes = require('./dashboard.route');
const syncRoutes = require('./sync.route');
const webhookRoutes = require('./webhook.route');

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    endpoints: {
      auth: '/api/auth',
      admins: '/api/admins',
      farmers: '/api/farmers',
      goats: '/api/goats',
      recordings: '/api/recordings',
      followUps: '/api/follow-ups',
      dashboard: '/api/dashboard',
      sync: '/api/sync',
      webhook: '/api/webhook',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/farmers', farmerRoutes);
router.use('/goats', goatRoutes);
router.use('/recordings', recordingRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sync', syncRoutes);
router.use('/webhook', webhookRoutes);

module.exports = router;
