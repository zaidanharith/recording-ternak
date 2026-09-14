const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const penyebabKematianRepository = require('../../repositories/penyebab-kematian.repository');
jest.mock('../../repositories/penyebab-kematian.repository');

const laporanKematianRepository = require('../../repositories/laporan-kematian.repository');
jest.mock('../../repositories/laporan-kematian.repository');

const dashboardSyncService = require('../dashboard-sync.service');
jest.mock('../dashboard-sync.service');

jest.mock('../berita-acara.service', () => ({
  generateBeritaAcaraDocx: jest.fn(() => Buffer.from('docx-bytes')),
  generateBeritaAcaraPdf: jest.fn(() => Promise.resolve(Buffer.from('pdf-bytes'))),
}));

const {
  getPenyebabKematianOptions,
  createLaporanKematian,
  getBeritaAcaraFile,
  listLaporanKematian,
  updateLaporanKematian,
  deleteLaporanKematian,
} = require('../kematian.service');

beforeEach(() => jest.clearAllMocks());

describe('getPenyebabKematianOptions', () => {
  it('lists penyebab kematian from the local repository', async () => {
    penyebabKematianRepository.listPenyebabKematian.mockResolvedValue([{ id: 'p1', nama: 'Penyakit' }]);

    const result = await getPenyebabKematianOptions();

    expect(result).toEqual([{ id: 'p1', nama: 'Penyakit' }]);
  });
});

describe('createLaporanKematian', () => {
  it('throws when the goat is already reported dead', async () => {
    const goat = { id: 'g1', status: 'MATI' };

    await expect(
      createLaporanKematian({ goat, penyebabKematianId: 'p1', tanggalKematian: '2026-01-01' }, 'admin-1'),
    ).rejects.toThrow('sudah dilaporkan mati');
    expect(laporanKematianRepository.createLaporanKematian).not.toHaveBeenCalled();
  });

  it('throws when jenisKelamin/tanggalLahir is missing and not provided', async () => {
    const goat = { id: 'g1', status: 'HIDUP', jenisKelamin: null, birthDate: null };

    await expect(
      createLaporanKematian({ goat, penyebabKematianId: 'p1', tanggalKematian: '2026-01-01' }, 'admin-1'),
    ).rejects.toThrow('belum lengkap');
    expect(laporanKematianRepository.createLaporanKematian).not.toHaveBeenCalled();
  });

  it('fills missing goat details, creates the laporan, and pushes the sync', async () => {
    const goat = { id: 'g1', status: 'HIDUP', jenisKelamin: null, birthDate: null, rasRumpun: null, earTagNumber: 12 };
    penyebabKematianRepository.findPenyebabKematianById.mockResolvedValue({ id: 'p1', nama: 'Penyakit' });
    const createdLaporan = { id: 'laporan-1', goat: { ...goat, jenisKelamin: 'JANTAN' }, penyebabKematianId: 'p1' };
    laporanKematianRepository.createLaporanKematian.mockResolvedValue(createdLaporan);

    const result = await createLaporanKematian(
      { goat, penyebabKematianId: 'p1', tanggalKematian: '2026-01-01', catatan: 'Sakit', jenisKelamin: 'JANTAN', tanggalLahir: '2024-01-01', rasRumpun: 'Jawa' },
      'admin-1',
    );

    expect(goatRepository.updateGoat).toHaveBeenCalledWith('g1', {
      jenisKelamin: 'JANTAN',
      birthDate: new Date('2024-01-01'),
      rasRumpun: 'Jawa',
    });
    expect(laporanKematianRepository.createLaporanKematian).toHaveBeenCalledWith({
      goatId: 'g1',
      penyebabKematianId: 'p1',
      petugasId: 'admin-1',
      tanggalKematian: '2026-01-01',
      catatan: 'Sakit',
    });
    expect(dashboardSyncService.pushLaporanKematianUpsert).toHaveBeenCalledWith(
      createdLaporan,
      createdLaporan.goat,
      'Penyakit',
    );
    expect(result).toBe(createdLaporan);
  });

  it('throws when penyebab kematian is not found', async () => {
    const goat = { id: 'g1', status: 'HIDUP', jenisKelamin: 'JANTAN', birthDate: new Date('2024-01-01'), rasRumpun: 'Jawa' };
    penyebabKematianRepository.findPenyebabKematianById.mockResolvedValue(null);

    await expect(
      createLaporanKematian({ goat, penyebabKematianId: 'missing', tanggalKematian: '2026-01-01' }, 'admin-1'),
    ).rejects.toThrow('Penyebab kematian tidak ditemukan.');
    expect(laporanKematianRepository.createLaporanKematian).not.toHaveBeenCalled();
  });
});

describe('getBeritaAcaraFile', () => {
  it('throws 404 when the laporan does not exist', async () => {
    laporanKematianRepository.findLaporanKematianById.mockResolvedValue(null);

    await expect(getBeritaAcaraFile('missing', 'docx')).rejects.toThrow('Laporan kematian tidak ditemukan.');
  });

  it('returns the docx buffer by default', async () => {
    laporanKematianRepository.findLaporanKematianById.mockResolvedValue({ id: 'laporan-1', goat: { earTagNumber: 12 } });

    const file = await getBeritaAcaraFile('laporan-1');

    expect(file.buffer).toEqual(Buffer.from('docx-bytes'));
    expect(file.contentDisposition).toContain('berita-acara-12.docx');
  });

  it('returns the pdf buffer when format is pdf', async () => {
    laporanKematianRepository.findLaporanKematianById.mockResolvedValue({ id: 'laporan-1', goat: { earTagNumber: 12 } });

    const file = await getBeritaAcaraFile('laporan-1', 'pdf');

    expect(file.buffer).toEqual(Buffer.from('pdf-bytes'));
    expect(file.contentType).toBe('application/pdf');
  });
});

describe('listLaporanKematian', () => {
  it('lists laporan kematian from the local repository', async () => {
    laporanKematianRepository.listLaporanKematian.mockResolvedValue([{ id: 'laporan-1' }]);

    const result = await listLaporanKematian();

    expect(result).toEqual([{ id: 'laporan-1' }]);
  });
});

describe('updateLaporanKematian', () => {
  it('returns null when the laporan does not exist', async () => {
    laporanKematianRepository.updateLaporanKematian.mockResolvedValue(null);

    const result = await updateLaporanKematian('missing', { catatan: 'x' });

    expect(result).toBeNull();
    expect(dashboardSyncService.pushLaporanKematianUpsert).not.toHaveBeenCalled();
  });

  it('updates and pushes the sync', async () => {
    const updated = {
      id: 'laporan-1',
      goat: { id: 'g1', earTagNumber: 12 },
      penyebabKematianId: 'p1',
      penyebabKematian: { id: 'p1', nama: 'Penyakit' },
    };
    laporanKematianRepository.updateLaporanKematian.mockResolvedValue(updated);

    const result = await updateLaporanKematian('laporan-1', { catatan: 'Diperbarui' });

    expect(dashboardSyncService.pushLaporanKematianUpsert).toHaveBeenCalledWith(updated, updated.goat, 'Penyakit');
    expect(result).toBe(updated);
  });
});

describe('deleteLaporanKematian', () => {
  it('returns null when the laporan does not exist', async () => {
    laporanKematianRepository.deleteLaporanKematianById.mockResolvedValue(null);

    const result = await deleteLaporanKematian('missing');

    expect(result).toBeNull();
    expect(dashboardSyncService.pushLaporanKematianDelete).not.toHaveBeenCalled();
  });

  it('deletes and pushes the sync delete', async () => {
    laporanKematianRepository.deleteLaporanKematianById.mockResolvedValue({ id: 'laporan-1' });

    const result = await deleteLaporanKematian('laporan-1');

    expect(dashboardSyncService.pushLaporanKematianDelete).toHaveBeenCalledWith('laporan-1');
    expect(result).toEqual({ id: 'laporan-1' });
  });
});
