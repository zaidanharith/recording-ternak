const config = require('../config');
const { handleMessage, handleUnsupportedMessage, handleImageMessage } = require('../services/recording.service');

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

    if (body.object !== 'whatsapp_business_account') {
      return res.status(404).send('NOT_FOUND');
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const senderPhone = message.from;
    const senderName = value.contacts?.[0]?.profile?.name || senderPhone;

    let result;
    if (message.type === 'text') {
      const messageText = message.text.body;
      console.log(`📩 [${senderName}] ${messageText}`);
      result = await handleMessage(messageText, senderPhone, senderName);
    } else if (message.type === 'image') {
      const caption = message.image?.caption || '';
      console.log(`📩 [${senderName}] <image> ${caption}`);
      result = await handleImageMessage(message.image.id, caption, senderPhone, senderName);
    } else {
      console.log(`📩 [${senderName}] <${message.type}>`);
      result = await handleUnsupportedMessage(message.type, senderPhone, senderName);
    }

    console.log(`✅ State: ${result.state}`);
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('❌ Error menangani webhook:', error);
    res.status(500).send('ERROR');
  }
};

module.exports = { verifyWebhook, handleWebhookEvent };
