const prisma = require('../lib/prisma');

const SINGLETON_ID = 'singleton';

const getSyncStatus = async () => {
  return await prisma.syncStatus.findUnique({ where: { id: SINGLETON_ID } });
};

const recordSyncSuccess = async () => {
  return await prisma.syncStatus.upsert({
    where: { id: SINGLETON_ID },
    update: { lastSyncAt: new Date(), lastStatus: 'SUCCESS', lastError: null },
    create: { id: SINGLETON_ID, lastSyncAt: new Date(), lastStatus: 'SUCCESS', lastError: null },
  });
};

const recordSyncFailure = async (errorMessage) => {
  return await prisma.syncStatus.upsert({
    where: { id: SINGLETON_ID },
    update: { lastSyncAt: new Date(), lastStatus: 'FAILED', lastError: errorMessage },
    create: { id: SINGLETON_ID, lastSyncAt: new Date(), lastStatus: 'FAILED', lastError: errorMessage },
  });
};

module.exports = { getSyncStatus, recordSyncSuccess, recordSyncFailure };
