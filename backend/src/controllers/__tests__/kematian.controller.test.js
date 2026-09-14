const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const kematianService = require('../../services/kematian.service');
jest.mock('../../services/kematian.service');

const {
  getFormOptions,
  generateBeritaAcara,
  listLaporan,
  getLaporan,
  updateLaporan,
  deleteLaporan,
  downloadBeritaAcara,
} = require('../kematian.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('getFormOptions', () => {
  it('returns penyebab kematian options', async () => {
    kematianService.getPenyebabKematianOptions.mockResolvedValue([{ id: 'p1', nama: 'Penyakit' }]);
    const req = {};
    const res = buildRes();

    await getFormOptions(req, res);

    expect(kematianService.getPenyebabKematianOptions).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { penyebabKematian: [{ id: 'p1', nama: 'Penyakit' }] } }),
    );
  });
});

describe('generateBeritaAcara', () => {
  it('returns 404 when the goat does not exist', async () => {
    goatRepository.findGoatById.mockResolvedValue(null);
    const req = { params: { goatId: 'missing' }, body: {}, user: { id: 'admin-1' } };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(kematianService.createLaporanKematian).not.toHaveBeenCalled();
  });

  it('returns 400 when tanggalKematian or penyebabKematianId is missing', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const req = { params: { goatId: 'g1' }, body: {}, user: { id: 'admin-1' } };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(kematianService.createLaporanKematian).not.toHaveBeenCalled();
  });

  it('creates the laporan locally and streams the berita acara file', async () => {
    const goat = { id: 'g1', earTagNumber: 12, farmerId: 'f1' };
    goatRepository.findGoatById.mockResolvedValue(goat);
    kematianService.createLaporanKematian.mockResolvedValue({ id: 'laporan-1' });
    kematianService.getBeritaAcaraFile.mockResolvedValue({
      buffer: Buffer.from('docx-bytes'),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contentDisposition: 'attachment; filename="berita-acara-12.docx"',
    });

    const req = {
      params: { goatId: 'g1' },
      body: {
        tanggalKematian: '2026-01-01',
        penyebabKematianId: 'p1',
        catatan: 'Sakit',
        jenisKelamin: 'JANTAN',
        tanggalLahir: '2024-01-01',
      },
      user: { id: 'admin-1' },
    };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(kematianService.createLaporanKematian).toHaveBeenCalledWith(
      expect.objectContaining({ goat, penyebabKematianId: 'p1', tanggalKematian: '2026-01-01' }),
      'admin-1',
    );
    expect(kematianService.getBeritaAcaraFile).toHaveBeenCalledWith('laporan-1', undefined);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('docx-bytes'));
  });

  it('forwards the service error status when creation fails', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const error = new Error('Kambing ini sudah dilaporkan mati sebelumnya.');
    error.status = 400;
    kematianService.createLaporanKematian.mockRejectedValue(error);

    const req = {
      params: { goatId: 'g1' },
      body: { tanggalKematian: '2026-01-01', penyebabKematianId: 'p1' },
      user: { id: 'admin-1' },
    };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Kambing ini sudah dilaporkan mati sebelumnya.' }),
    );
  });
});

describe('listLaporan', () => {
  it('returns the laporan kematian list from the service', async () => {
    kematianService.listLaporanKematian.mockResolvedValue([{ id: 'laporan-1' }]);
    const req = {};
    const res = buildRes();

    await listLaporan(req, res);

    expect(kematianService.listLaporanKematian).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { laporanKematian: [{ id: 'laporan-1' }] } }),
    );
  });
});

describe('getLaporan', () => {
  it('returns the laporan detail from the service', async () => {
    kematianService.getLaporanKematianById.mockResolvedValue({ id: 'laporan-1' });
    const req = { params: { id: 'laporan-1' } };
    const res = buildRes();

    await getLaporan(req, res);

    expect(kematianService.getLaporanKematianById).toHaveBeenCalledWith('laporan-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when the laporan does not exist', async () => {
    kematianService.getLaporanKematianById.mockResolvedValue(null);
    const req = { params: { id: 'missing' } };
    const res = buildRes();

    await getLaporan(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('updateLaporan', () => {
  it('forwards the update payload to the service', async () => {
    kematianService.updateLaporanKematian.mockResolvedValue({ id: 'laporan-1', catatan: 'Diperbarui' });
    const req = {
      params: { id: 'laporan-1' },
      body: { penyebabKematianId: 'p2', tanggalKematian: '2026-02-01', catatan: 'Diperbarui' },
    };
    const res = buildRes();

    await updateLaporan(req, res);

    expect(kematianService.updateLaporanKematian).toHaveBeenCalledWith('laporan-1', {
      penyebabKematianId: 'p2',
      tanggalKematian: '2026-02-01',
      catatan: 'Diperbarui',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when the laporan does not exist', async () => {
    kematianService.updateLaporanKematian.mockResolvedValue(null);
    const req = { params: { id: 'missing' }, body: {} };
    const res = buildRes();

    await updateLaporan(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteLaporan', () => {
  it('deletes the laporan via the service', async () => {
    kematianService.deleteLaporanKematian.mockResolvedValue({ id: 'laporan-1' });
    const req = { params: { id: 'laporan-1' } };
    const res = buildRes();

    await deleteLaporan(req, res);

    expect(kematianService.deleteLaporanKematian).toHaveBeenCalledWith('laporan-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when the laporan does not exist', async () => {
    kematianService.deleteLaporanKematian.mockResolvedValue(null);
    const req = { params: { id: 'missing' } };
    const res = buildRes();

    await deleteLaporan(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('downloadBeritaAcara', () => {
  it('streams the requested format from the service', async () => {
    kematianService.getBeritaAcaraFile.mockResolvedValue({
      buffer: Buffer.from('pdf-bytes'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="berita-acara-12.pdf"',
    });
    const req = { params: { id: 'laporan-1' }, query: { format: 'pdf' } };
    const res = buildRes();

    await downloadBeritaAcara(req, res);

    expect(kematianService.getBeritaAcaraFile).toHaveBeenCalledWith('laporan-1', 'pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('pdf-bytes'));
  });
});
