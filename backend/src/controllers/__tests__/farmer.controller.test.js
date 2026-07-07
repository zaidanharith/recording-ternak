const farmerRepository = require('../../repositories/farmer.repository');
const chatMessageRepository = require('../../repositories/chat-message.repository');
const { sendTextMessage } = require('../../services/whatsapp.service');

jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/chat-message.repository');
jest.mock('../../services/whatsapp.service');

const { createFarmer, getFarmer, getFarmerChatMessages, sendReminder } = require('../farmer.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('createFarmer', () => {
  it('returns 400 when whatsappPhone is missing', async () => {
    const req = { body: { name: 'Pak Budi' } };
    const res = buildRes();

    await createFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(farmerRepository.createFarmer).not.toHaveBeenCalled();
  });

  it('returns 409 when the WhatsApp number is already registered', async () => {
    farmerRepository.createFarmer.mockRejectedValue({ code: 'P2002' });
    const req = { body: { name: 'Pak Budi', whatsappPhone: '628123' } };
    const res = buildRes();

    await createFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('getFarmer', () => {
  it('returns 404 when the farmer does not exist', async () => {
    farmerRepository.findFarmerById.mockResolvedValue(null);
    const req = { params: { id: 'missing' } };
    const res = buildRes();

    await getFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('getFarmerChatMessages', () => {
  it("looks up messages by the farmer's WhatsApp phone", async () => {
    farmerRepository.findFarmerById.mockResolvedValue({ id: 'f1', whatsappPhone: '628123' });
    chatMessageRepository.getRecentMessages.mockResolvedValue([{ id: 'm1' }]);

    const req = { params: { id: 'f1' }, query: {} };
    const res = buildRes();

    await getFarmerChatMessages(req, res);

    expect(chatMessageRepository.getRecentMessages).toHaveBeenCalledWith('628123', 100);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('sendReminder', () => {
  it('sends a WhatsApp reminder to the farmer', async () => {
    farmerRepository.findFarmerById.mockResolvedValue({ id: 'f1', name: 'Pak Budi', whatsappPhone: '628123' });

    const req = { params: { id: 'f1' } };
    const res = buildRes();

    await sendReminder(req, res);

    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
