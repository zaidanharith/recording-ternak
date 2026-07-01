const config = require('../config');
const { handleIncomingReport } = require('../services/recording.service');

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      console.log('✅ Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }
  return res.status(400).end();
};

const handleWebhookEvent = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const senderPhone = message.from;
        const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
        const messageText = message.text.body;

        console.log(`📩 Incoming message from ${senderName} (${senderPhone}): "${messageText}"`);

        // Panggil service untuk memproses laporan
        const result = await handleIncomingReport(messageText, senderPhone, senderName);

        if (result.success) {
          console.log(`✅ Report processed successfully for Goat: ${result.kambing.nomor_telinga}`);
        } else if (result.notAReport) {
          console.log(`ℹ️ Message ignored: Not a livestock report. Alasan: ${result.alasan}`);
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).end();
  } catch (error) {
    console.error('❌ Error handling webhook event:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

module.exports = {
  verifyWebhook,
  handleWebhookEvent
};
