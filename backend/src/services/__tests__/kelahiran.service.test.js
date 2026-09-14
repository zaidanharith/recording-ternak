const mockDashboardFetch = jest.fn();
jest.mock('../../lib/dashboard-client', () => ({
  dashboardFetch: (...args) => mockDashboardFetch(...args),
}));

const { createLaporanKelahiran, listLaporanKelahiran } = require('../kelahiran.service');

describe('createLaporanKelahiran', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the Kambing jenisTernakId before creating the laporan', async () => {
    mockDashboardFetch.mockImplementation((path) => {
      if (path === '/api/jenis-ternak') {
        return Promise.resolve({
          payload: { data: { jenisTernak: [{ id: 'sapi-id', nama: 'Sapi' }, { id: 'kambing-id', nama: 'Kambing' }] } },
        });
      }
      if (path === '/api/laporan-kelahiran') {
        return Promise.resolve({ payload: { data: { laporan: { id: 'laporan-1' } } } });
      }
      throw new Error(`unexpected path ${path}`);
    });

    const goat = { earTagNumber: 42, farmerId: 'farmer-1' };
    const result = await createLaporanKelahiran(
      { goat, jenisKelamin: 'BETINA', tanggalLahir: '2026-01-01', rasRumpun: 'Jawa', catatan: 'Sehat' },
      'jwt-token',
    );

    expect(mockDashboardFetch).toHaveBeenCalledWith('/api/jenis-ternak', { token: 'jwt-token' });
    expect(mockDashboardFetch).toHaveBeenCalledWith('/api/laporan-kelahiran', {
      method: 'POST',
      token: 'jwt-token',
      body: {
        peternakId: 'farmer-1',
        jenisTernakId: 'kambing-id',
        kodeTernak: '42',
        jenisKelamin: 'BETINA',
        rasRumpun: 'Jawa',
        tanggalLahir: '2026-01-01',
        catatan: 'Sehat',
      },
    });
    expect(result).toEqual({ id: 'laporan-1' });
  });

  it('throws when Kambing is not found among jenis ternak', async () => {
    mockDashboardFetch.mockResolvedValue({ payload: { data: { jenisTernak: [{ id: 'sapi-id', nama: 'Sapi' }] } } });

    await expect(
      createLaporanKelahiran({ goat: { earTagNumber: 1, farmerId: 'f1' }, jenisKelamin: 'JANTAN', tanggalLahir: '2026-01-01' }, 'jwt-token'),
    ).rejects.toThrow('Kambing');
  });
});

describe('listLaporanKelahiran', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only returns laporan for ternak whose jenis is Kambing', async () => {
    mockDashboardFetch.mockResolvedValue({
      payload: {
        data: {
          laporanKelahiran: [
            { id: 'l1', ternak: { jenisTernak: { nama: 'Kambing' } } },
            { id: 'l2', ternak: { jenisTernak: { nama: 'Domba' } } },
          ],
        },
      },
    });

    const result = await listLaporanKelahiran('jwt-token');

    expect(result.map((l) => l.id)).toEqual(['l1']);
  });
});
