const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const kematianService = require('../../services/kematian.service');
jest.mock('../../services/kematian.service');

const { getFormOptions, generateBeritaAcara } = require('../kematian.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('getFormOptions', () => {
  it('returns penyebab kematian options from dashboard', async () => {
    kematianService.getPenyebabKematianOptions.mockResolvedValue([{ id: 'p1', nama: 'Penyakit' }]);
    const req = { token: 'jwt-token' };
    const res = buildRes();

    await getFormOptions(req, res);

    expect(kematianService.getPenyebabKematianOptions).toHaveBeenCalledWith('jwt-token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { penyebabKematian: [{ id: 'p1', nama: 'Penyakit' }] } }),
    );
  });

  it('forwards the error status when dashboard call fails', async () => {
    const error = new Error('Dashboard down');
    error.status = 502;
    kematianService.getPenyebabKematianOptions.mockRejectedValue(error);
    const req = { token: 'jwt-token' };
    const res = buildRes();

    await getFormOptions(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});

describe('generateBeritaAcara', () => {
  it('returns 404 when the goat does not exist', async () => {
    goatRepository.findGoatById.mockResolvedValue(null);
    const req = { params: { goatId: 'missing' }, body: {}, token: 'jwt-token' };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(kematianService.provisionTernak).not.toHaveBeenCalled();
  });

  it('returns 400 when tanggalKematian or penyebabKematianId is missing', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const req = { params: { goatId: 'g1' }, body: {}, token: 'jwt-token' };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(kematianService.provisionTernak).not.toHaveBeenCalled();
  });

  it('provisions the ternak, creates the laporan, and streams the berita acara file', async () => {
    const goat = { id: 'g1', earTagNumber: 12, farmerId: 'f1' };
    goatRepository.findGoatById.mockResolvedValue(goat);
    kematianService.provisionTernak.mockResolvedValue({ id: 'ternak-1' });
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
      token: 'jwt-token',
    };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(kematianService.provisionTernak).toHaveBeenCalledWith(
      expect.objectContaining({ goat, jenisKelamin: 'JANTAN', tanggalLahir: '2024-01-01' }),
      'jwt-token',
    );
    expect(kematianService.createLaporanKematian).toHaveBeenCalledWith(
      expect.objectContaining({ ternakId: 'ternak-1', penyebabKematianId: 'p1' }),
      'jwt-token',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('docx-bytes'));
  });

  it('forwards the dashboard error status when provisioning fails', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const error = new Error('Ternak belum terdaftar');
    error.status = 400;
    error.payload = { message: 'Ternak belum terdaftar' };
    kematianService.provisionTernak.mockRejectedValue(error);

    const req = {
      params: { goatId: 'g1' },
      body: { tanggalKematian: '2026-01-01', penyebabKematianId: 'p1' },
      token: 'jwt-token',
    };
    const res = buildRes();

    await generateBeritaAcara(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ternak belum terdaftar' }),
    );
  });
});
