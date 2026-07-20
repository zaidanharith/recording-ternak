const { isFarmerRegistered } = require('../../repositories/farmer.repository');
const { handleMessage, handleImageMessage, handleUnsupportedMessage, handleUnregisteredSender } = require('../../services/recording.service');

jest.mock('../../repositories/farmer.repository');
jest.mock('../../services/recording.service');

const { handleWebhookEvent } = require('../webhook.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const buildTextEventBody = (text, from = '628123') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Budi' } }],
            messages: [{ from, type: 'text', text: { body: text } }],
          },
        },
      ],
    },
  ],
});

const buildImageEventBody = (from = '628123') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Budi' } }],
            messages: [{ from, type: 'image', image: { id: 'media-1', caption: '' } }],
          },
        },
      ],
    },
  ],
});

const buildUnsupportedEventBody = (type, from = '628123') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Budi' } }],
            messages: [{ from, type }],
          },
        },
      ],
    },
  ],
});

describe('handleWebhookEvent unregistered sender gate', () => {
  it('replies with the unregistered-sender message and skips handleMessage when the sender is not a registered farmer', async () => {
    isFarmerRegistered.mockResolvedValue(false);
    handleUnregisteredSender.mockResolvedValue({ state: 'unregistered_sender' });
    const req = { body: buildTextEventBody('kambing 12 beranak 2 ekor') };
    const res = buildRes();

    await handleWebhookEvent(req, res);

    expect(isFarmerRegistered).toHaveBeenCalledWith('628123');
    expect(handleUnregisteredSender).toHaveBeenCalledWith('628123');
    expect(handleMessage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
  });

  it('dispatches to handleMessage as usual when the sender is a registered farmer', async () => {
    isFarmerRegistered.mockResolvedValue(true);
    handleMessage.mockResolvedValue({ state: 'awaiting_confirmation' });
    const req = { body: buildTextEventBody('kambing 12 beranak 2 ekor') };
    const res = buildRes();

    await handleWebhookEvent(req, res);

    expect(handleMessage).toHaveBeenCalledWith('kambing 12 beranak 2 ekor', '628123', 'Budi');
    expect(handleUnregisteredSender).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
  });

  it('gates image messages the same way as text messages when the sender is not registered', async () => {
    isFarmerRegistered.mockResolvedValue(false);
    handleUnregisteredSender.mockResolvedValue({ state: 'unregistered_sender' });
    const req = { body: buildImageEventBody() };
    const res = buildRes();

    await handleWebhookEvent(req, res);

    expect(handleUnregisteredSender).toHaveBeenCalledWith('628123');
    expect(handleImageMessage).not.toHaveBeenCalled();
  });

  it('gates unsupported message types the same way as text messages when the sender is not registered', async () => {
    isFarmerRegistered.mockResolvedValue(false);
    handleUnregisteredSender.mockResolvedValue({ state: 'unregistered_sender' });
    const req = { body: buildUnsupportedEventBody('sticker') };
    const res = buildRes();

    await handleWebhookEvent(req, res);

    expect(handleUnregisteredSender).toHaveBeenCalledWith('628123');
    expect(handleUnsupportedMessage).not.toHaveBeenCalled();
  });
});
