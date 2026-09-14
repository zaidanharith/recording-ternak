const mockDashboardFetch = jest.fn();
jest.mock('../../lib/dashboard-client', () => ({
  dashboardFetch: (...args) => mockDashboardFetch(...args),
}));

const { listLaporanKematian } = require('../kematian.service');

describe('listLaporanKematian', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only returns laporan for ternak whose jenis is Kambing', async () => {
    mockDashboardFetch.mockResolvedValue({
      payload: {
        data: {
          laporanKematian: [
            { id: 'l1', ternak: { jenisTernak: { nama: 'Kambing' } } },
            { id: 'l2', ternak: { jenisTernak: { nama: 'Sapi' } } },
            { id: 'l3', ternak: { jenisTernak: { nama: 'Kambing' } } },
          ],
        },
      },
    });

    const result = await listLaporanKematian('jwt-token');

    expect(mockDashboardFetch).toHaveBeenCalledWith('/api/laporan-kematian', { token: 'jwt-token' });
    expect(result.map((l) => l.id)).toEqual(['l1', 'l3']);
  });
});
