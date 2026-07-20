const crypto = require('crypto');
const config = require('../../config');
const verifyWhatsappSignature = require('../verify-whatsapp-signature.middleware');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const sign = (secret, rawBody) =>
  `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

describe('verifyWhatsappSignature', () => {
  const originalAppSecret = config.whatsapp.appSecret;

  afterEach(() => {
    config.whatsapp.appSecret = originalAppSecret;
  });

  it('skips verification and calls next when WA_APP_SECRET is not configured', () => {
    config.whatsapp.appSecret = undefined;
    const req = { headers: {}, rawBody: Buffer.from('{}') };
    const res = buildRes();
    const next = jest.fn();

    verifyWhatsappSignature(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the signature header is missing', () => {
    config.whatsapp.appSecret = 'test-secret';
    const req = { headers: {}, rawBody: Buffer.from('{}') };
    const res = buildRes();
    const next = jest.fn();

    verifyWhatsappSignature(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the signature does not match the payload', () => {
    config.whatsapp.appSecret = 'test-secret';
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
    const req = {
      headers: { 'x-hub-signature-256': sign('wrong-secret', rawBody) },
      rawBody,
    };
    const res = buildRes();
    const next = jest.fn();

    verifyWhatsappSignature(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when the signature matches the payload', () => {
    config.whatsapp.appSecret = 'test-secret';
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
    const req = {
      headers: { 'x-hub-signature-256': sign('test-secret', rawBody) },
      rawBody,
    };
    const res = buildRes();
    const next = jest.fn();

    verifyWhatsappSignature(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
