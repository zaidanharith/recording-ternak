const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { getSummary, getCharts, getAlerts } = require('../controllers/dashboard.controller');

router.use(authMiddleware);

router.get('/summary', getSummary);
router.get('/charts', getCharts);
router.get('/alerts', getAlerts);

module.exports = router;
