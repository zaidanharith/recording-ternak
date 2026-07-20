const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhookEvent } = require('../controllers/webhook.controller');
const verifyWhatsappSignature = require('../middlewares/verify-whatsapp-signature.middleware');

router.get('/', verifyWebhook);
router.post('/', verifyWhatsappSignature, handleWebhookEvent);

module.exports = router;
