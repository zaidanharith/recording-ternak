const config = require('../config');
const { handleMessage } = require('../services/recording.service');

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
  // Langsung balas 200 agar WhatsApp tidak timeout
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const senderPhone = message.from;
    const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
    const messageText = message.text.body;

    console.log(`📩 [${senderName}] ${messageText}`);

    const result = await handleMessage(messageText, senderPhone, senderName);
    console.log(`✅ State: ${result.state}`);
  } catch (error) {
    console.error('❌ Error menangani webhook:', error);
  }
};

module.exports = { verifyWebhook, handleWebhookEvent };
