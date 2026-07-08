const config = require('../config');

const sendTextMessage = async (recipientPhone, text) => {
  const url = `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};

const getMediaUrl = async (mediaId) => {
  const url = `https://graph.facebook.com/v21.0/${mediaId}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.whatsapp.accessToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  const data = await response.json();
  return { url: data.url, mimeType: data.mime_type };
};

const downloadMedia = async (url) => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.whatsapp.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengunduh media WhatsApp: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

module.exports = { sendTextMessage, getMediaUrl, downloadMedia };
