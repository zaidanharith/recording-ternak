const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhookEvent } = require('../controllers/webhook.controller');

router.get('/', verifyWebhook);
router.post('/', handleWebhookEvent);

module.exports = router;
