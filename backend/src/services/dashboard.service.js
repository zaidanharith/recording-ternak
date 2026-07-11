const prisma = require('../lib/prisma');
const { getSyncStatus } = require('../repositories/sync-status.repository');
const { listFarmersNotReported } = require('../repositories/farmer.repository');
const { listGoatsWithoutRecentRecording } = require('../repositories/goat.repository');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const toNumberSafe = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSummary = async () => {
  const [
    totalFarmers, totalGoats, recordingsLast7Days, recordingsLast30Days,
    pendingReviewCount, farmersNotReported, syncStatus,
  ] = await Promise.all([
    prisma.farmer.count(),
    prisma.goat.count(),
    prisma.recording.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.recording.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.recording.count({ where: { status: 'PERLU_REVIEW' } }),
    listFarmersNotReported(30),
    getSyncStatus(),
  ]);

  return {
    totalFarmers,
    totalGoats,
    recordingsLast7Days,
    recordingsLast30Days,
    pendingReviewCount,
    farmersNotReportedCount: farmersNotReported.length,
    lastSync: syncStatus || { lastSyncAt: null, lastStatus: 'BELUM_PERNAH', lastError: null },
  };
};

const getCharts = async () => {
  const recordings = await prisma.recording.findMany({
    where: { createdAt: { gte: daysAgo(30) } },
    select: { createdAt: true, maleKidCount: true, femaleKidCount: true, sold: true, saleTarget: true },
  });

  const trendByDay = {};
  let totalMaleKids = 0;
  let totalFemaleKids = 0;
  let soldCount = 0;
  let targetOnlyCount = 0;

  for (const recording of recordings) {
    const day = recording.createdAt.toISOString().slice(0, 10);
    trendByDay[day] = (trendByDay[day] || 0) + 1;

    totalMaleKids += toNumberSafe(recording.maleKidCount);
    totalFemaleKids += toNumberSafe(recording.femaleKidCount);

    const isSold = recording.sold === 'YA';
    const hasTarget = recording.saleTarget && recording.saleTarget !== '-';

    if (isSold) soldCount += 1;
    else if (hasTarget) targetOnlyCount += 1;
  }

  const recordingTrend = Object.entries(trendByDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  return {
    recordingTrend,
    kidsBornByGender: { male: totalMaleKids, female: totalFemaleKids },
    soldVsTarget: { sold: soldCount, targetOnly: targetOnlyCount },
  };
};

const getAlerts = async () => {
  const goats = await listGoatsWithoutRecentRecording(30);
  return goats.map((goat) => ({
    goatId: goat.id,
    earTagNumber: goat.earTagNumber,
    farmerId: goat.farmerId,
    farmerName: goat.farmer.name,
  }));
};

module.exports = { getSummary, getCharts, getAlerts };
