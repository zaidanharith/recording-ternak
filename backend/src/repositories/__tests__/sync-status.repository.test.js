const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  syncStatus: { findUnique: jest.fn(), upsert: jest.fn() },
}));

const { getSyncStatus, recordSyncSuccess, recordSyncFailure } = require('../sync-status.repository');

describe('sync-status.repository', () => {
  it('reads the singleton sync status', async () => {
    prisma.syncStatus.findUnique.mockResolvedValue({ id: 'singleton', lastStatus: 'SUCCESS' });
    const result = await getSyncStatus();
    expect(prisma.syncStatus.findUnique).toHaveBeenCalledWith({ where: { id: 'singleton' } });
    expect(result.lastStatus).toBe('SUCCESS');
  });

  it('records a successful sync', async () => {
    await recordSyncSuccess();
    const call = prisma.syncStatus.upsert.mock.calls[0][0];
    expect(call.update.lastStatus).toBe('SUCCESS');
    expect(call.update.lastError).toBeNull();
  });

  it('records a failed sync with the error message', async () => {
    await recordSyncFailure('boom');
    const call = prisma.syncStatus.upsert.mock.calls[0][0];
    expect(call.update.lastStatus).toBe('FAILED');
    expect(call.update.lastError).toBe('boom');
  });
});
