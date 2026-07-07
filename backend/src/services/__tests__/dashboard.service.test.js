const prisma = require('../../lib/prisma');
const { getSyncStatus } = require('../../repositories/sync-status.repository');
const { listFarmersNotReported } = require('../../repositories/farmer.repository');
const { listGoatsWithoutRecentRecording } = require('../../repositories/goat.repository');

jest.mock('../../lib/prisma', () => ({
  farmer: { count: jest.fn() },
  goat: { count: jest.fn() },
  recording: { count: jest.fn(), findMany: jest.fn() },
}));
jest.mock('../../repositories/sync-status.repository');
jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/goat.repository');

const { getSummary, getCharts, getAlerts } = require('../dashboard.service');

describe('getSummary', () => {
  it('aggregates counts and last sync status', async () => {
    prisma.farmer.count.mockResolvedValue(10);
    prisma.goat.count.mockResolvedValue(25);
    prisma.recording.count.mockResolvedValueOnce(4).mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    listFarmersNotReported.mockResolvedValue([{ id: 'f1' }]);
    getSyncStatus.mockResolvedValue({ lastStatus: 'SUCCESS' });

    const summary = await getSummary();

    expect(summary.totalFarmers).toBe(10);
    expect(summary.totalGoats).toBe(25);
    expect(summary.pendingReviewCount).toBe(3);
    expect(summary.farmersNotReportedCount).toBe(1);
    expect(summary.lastSync.lastStatus).toBe('SUCCESS');
  });
});

describe('getCharts', () => {
  it('aggregates recording trend and kid counts by gender', async () => {
    prisma.recording.findMany.mockResolvedValue([
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '2', femaleKidCount: '1', sold: 'Ya', saleTarget: '-' },
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '-', femaleKidCount: '3', sold: 'Belum', saleTarget: '10 Juli' },
    ]);

    const charts = await getCharts();

    expect(charts.recordingTrend).toEqual([{ date: '2026-07-01', count: 2 }]);
    expect(charts.kidsBornByGender).toEqual({ male: 2, female: 4 });
    expect(charts.soldVsTarget).toEqual({ sold: 1, targetOnly: 1 });
  });
});

describe('getAlerts', () => {
  it('maps goats without recent recordings to alert entries', async () => {
    listGoatsWithoutRecentRecording.mockResolvedValue([
      { id: 'g1', earTagNumber: '12', farmerId: 'f1', farmer: { name: 'Pak Budi' } },
    ]);

    const alerts = await getAlerts();

    expect(alerts).toEqual([{ goatId: 'g1', earTagNumber: '12', farmerId: 'f1', farmerName: 'Pak Budi' }]);
  });
});
