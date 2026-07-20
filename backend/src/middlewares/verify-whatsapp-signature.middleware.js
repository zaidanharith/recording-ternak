const crypto = require('crypto');
const config = require('../config');

module.exports = (req, res, next) => {
  const appSecret = config.whatsapp.appSecret;

  if (!appSecret) {
    console.warn('⚠️ WA_APP_SECRET belum diatur — verifikasi signature webhook dilewati.');
    return next();
  }

  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return res.status(403).send('FORBIDDEN');
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody || Buffer.alloc(0))
    .digest('hex');

  const receivedSignature = signatureHeader.slice('sha256='.length);
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const receivedBuffer = Buffer.from(receivedSignature, 'hex');

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return res.status(403).send('FORBIDDEN');
  }

  return next();
};
