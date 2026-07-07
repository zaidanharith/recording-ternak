const farmerRepository = require('../../repositories/farmer.repository');
const { sendTextMessage } = require('../../services/whatsapp.service');

jest.mock('../../repositories/farmer.repository');
jest.mock('../../services/whatsapp.service');

const { listNotReported, sendBulkReminder } = require('../follow-up.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('listNotReported', () => {
  it('defaults to 30 days when no query param is given', async () => {
    farmerRepository.listFarmersNotReported.mockResolvedValue([]);
    const req = { query: {} };
    const res = buildRes();

    await listNotReported(req, res);

    expect(farmerRepository.listFarmersNotReported).toHaveBeenCalledWith(30);
  });
});

describe('sendBulkReminder', () => {
  it('sends a reminder to every farmer returned and reports counts', async () => {
    farmerRepository.listFarmersNotReported.mockResolvedValue([
      { id: 'f1', whatsappPhone: '6281' },
      { id: 'f2', whatsappPhone: '6282' },
    ]);
    sendTextMessage.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('down'));

    const req = { body: {} };
    const res = buildRes();

    await sendBulkReminder(req, res);

    expect(sendTextMessage).toHaveBeenCalledTimes(2);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.sentCount).toBe(1);
    expect(jsonArg.data.failedCount).toBe(1);
  });
});
