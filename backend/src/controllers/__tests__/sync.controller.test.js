const { runFullSync } = require('../../services/sync.service');
const { getSyncStatus } = require('../../repositories/sync-status.repository');

jest.mock('../../services/sync.service');
jest.mock('../../repositories/sync-status.repository');

const { getStatus, retrySync } = require('../sync.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('getStatus', () => {
  it('returns a BELUM_PERNAH placeholder when no sync has run yet', async () => {
    getSyncStatus.mockResolvedValue(null);
    const req = {};
    const res = buildRes();

    await getStatus(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.sync.lastStatus).toBe('BELUM_PERNAH');
  });
});

describe('retrySync', () => {
  it('returns 500 with the failure message when the sync fails', async () => {
    runFullSync.mockRejectedValue(new Error('Sheets API down'));
    const req = {};
    const res = buildRes();

    await retrySync(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 200 when the sync succeeds', async () => {
    runFullSync.mockResolvedValue();
    const req = {};
    const res = buildRes();

    await retrySync(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
