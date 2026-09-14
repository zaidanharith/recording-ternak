const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const laporanKelahiranRepository = require('../../repositories/laporan-kelahiran.repository');
jest.mock('../../repositories/laporan-kelahiran.repository');

const dashboardSyncService = require('../dashboard-sync.service');
jest.mock('../dashboard-sync.service');

jest.mock('../akta-kelahiran.service', () => ({
  generateAktaKelahiranDocx: jest.fn(() => Buffer.from('docx-bytes')),
  generateAktaKelahiranPdf: jest.fn(() => Promise.resolve(Buffer.from('pdf-bytes'))),
}));

const {
  createLaporanKelahiran,
  getAktaFile,
  listLaporanKelahiran,
  updateLaporanKelahiran,
  deleteLaporanKelahiran,
} = require('../kelahiran.service');

beforeEach(() => jest.clearAllMocks());

describe('createLaporanKelahiran', () => {
  it('fills missing goat details, creates the laporan, and pushes the sync', async () => {
    const goat = { id: 'g1', jenisKelamin: null, rasRumpun: null, birthDate: null, earTagNumber: 12 };
    const createdLaporan = { id: 'laporan-1', goat: { ...goat, jenisKelamin: 'BETINA' } };
    laporanKelahiranRepository.createLaporanKelahiran.mockResolvedValue(createdLaporan);

    const result = await createLaporanKelahiran(
      { goat, jenisKelamin: 'BETINA', tanggalLahir: '2026-01-01', rasRumpun: 'Jawa', catatan: 'Sehat' },
      { id: 'admin-1', name: 'Admin' },
    );

    expect(goatRepository.updateGoat).toHaveBeenCalledWith('g1', {
      jenisKelamin: 'BETINA',
      rasRumpun: 'Jawa',
      birthDate: new Date('2026-01-01'),
    });
    expect(laporanKelahiranRepository.createLaporanKelahiran).toHaveBeenCalledWith({
      goatId: 'g1',
      petugasId: 'admin-1',
      petugasNama: 'Admin',
      tanggalLahir: '2026-01-01',
      catatan: 'Sehat',
    });
    expect(dashboardSyncService.pushLaporanKelahiranUpsert).toHaveBeenCalledWith(createdLaporan, createdLaporan.goat);
    expect(result).toBe(createdLaporan);
  });

  it('does not overwrite already-known goat details', async () => {
    const goat = { id: 'g1', jenisKelamin: 'JANTAN', rasRumpun: 'Jawa', birthDate: new Date('2025-01-01'), earTagNumber: 12 };
    laporanKelahiranRepository.createLaporanKelahiran.mockResolvedValue({ id: 'laporan-1', goat });

    await createLaporanKelahiran(
      { goat, jenisKelamin: 'BETINA', tanggalLahir: '2026-01-01' },
      { id: 'admin-1', name: 'Admin' },
    );

    expect(goatRepository.updateGoat).not.toHaveBeenCalled();
  });
});

describe('getAktaFile', () => {
  it('throws 404 when the laporan does not exist', async () => {
    laporanKelahiranRepository.findLaporanKelahiranById.mockResolvedValue(null);

    await expect(getAktaFile('missing', 'docx')).rejects.toThrow('Laporan kelahiran tidak ditemukan.');
  });

  it('returns the docx buffer by default', async () => {
    laporanKelahiranRepository.findLaporanKelahiranById.mockResolvedValue({ id: 'laporan-1', goat: { earTagNumber: 12 } });

    const file = await getAktaFile('laporan-1');

    expect(file.buffer).toEqual(Buffer.from('docx-bytes'));
    expect(file.contentDisposition).toContain('akta-kelahiran-12.docx');
  });
});

describe('listLaporanKelahiran', () => {
  it('lists laporan kelahiran from the local repository', async () => {
    laporanKelahiranRepository.listLaporanKelahiran.mockResolvedValue([{ id: 'laporan-1' }]);

    const result = await listLaporanKelahiran();

    expect(result).toEqual([{ id: 'laporan-1' }]);
  });
});

describe('updateLaporanKelahiran', () => {
  it('returns null when the laporan does not exist', async () => {
    laporanKelahiranRepository.updateLaporanKelahiran.mockResolvedValue(null);

    const result = await updateLaporanKelahiran('missing', { catatan: 'x' });

    expect(result).toBeNull();
    expect(dashboardSyncService.pushLaporanKelahiranUpsert).not.toHaveBeenCalled();
  });

  it('updates and pushes the sync', async () => {
    const updated = { id: 'laporan-1', goat: { id: 'g1', earTagNumber: 12 } };
    laporanKelahiranRepository.updateLaporanKelahiran.mockResolvedValue(updated);

    const result = await updateLaporanKelahiran('laporan-1', { catatan: 'Diperbarui' });

    expect(dashboardSyncService.pushLaporanKelahiranUpsert).toHaveBeenCalledWith(updated, updated.goat);
    expect(result).toBe(updated);
  });
});

describe('deleteLaporanKelahiran', () => {
  it('returns null when the laporan does not exist', async () => {
    laporanKelahiranRepository.deleteLaporanKelahiranById.mockResolvedValue(null);

    const result = await deleteLaporanKelahiran('missing');

    expect(result).toBeNull();
    expect(dashboardSyncService.pushLaporanKelahiranDelete).not.toHaveBeenCalled();
  });

  it('deletes and pushes the sync delete', async () => {
    laporanKelahiranRepository.deleteLaporanKelahiranById.mockResolvedValue({ id: 'laporan-1' });

    const result = await deleteLaporanKelahiran('laporan-1');

    expect(dashboardSyncService.pushLaporanKelahiranDelete).toHaveBeenCalledWith('laporan-1');
    expect(result).toEqual({ id: 'laporan-1' });
  });
});
