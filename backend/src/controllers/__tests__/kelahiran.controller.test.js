const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const kelahiranService = require('../../services/kelahiran.service');
jest.mock('../../services/kelahiran.service');

const {
  generateAktaKelahiran,
  listLaporan,
  getLaporan,
  updateLaporan,
  deleteLaporan,
  downloadAkta,
} = require('../kelahiran.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('generateAktaKelahiran', () => {
  it('returns 404 when the goat does not exist', async () => {
    goatRepository.findGoatById.mockResolvedValue(null);
    const req = { params: { goatId: 'missing' }, body: {}, token: 'jwt-token' };
    const res = buildRes();

    await generateAktaKelahiran(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(kelahiranService.createLaporanKelahiran).not.toHaveBeenCalled();
  });

  it('returns 400 when jenisKelamin or tanggalLahir is missing', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const req = { params: { goatId: 'g1' }, body: {}, token: 'jwt-token' };
    const res = buildRes();

    await generateAktaKelahiran(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(kelahiranService.createLaporanKelahiran).not.toHaveBeenCalled();
  });

  it('creates the laporan and streams the akta file', async () => {
    const goat = { id: 'g1', earTagNumber: 12, farmerId: 'f1' };
    goatRepository.findGoatById.mockResolvedValue(goat);
    kelahiranService.createLaporanKelahiran.mockResolvedValue({ id: 'laporan-1' });
    kelahiranService.getAktaFile.mockResolvedValue({
      buffer: Buffer.from('docx-bytes'),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contentDisposition: 'attachment; filename="akta-kelahiran-12.docx"',
    });

    const req = {
      params: { goatId: 'g1' },
      body: { jenisKelamin: 'BETINA', tanggalLahir: '2026-01-01', rasRumpun: 'Jawa', catatan: 'Sehat' },
      token: 'jwt-token',
    };
    const res = buildRes();

    await generateAktaKelahiran(req, res);

    expect(kelahiranService.createLaporanKelahiran).toHaveBeenCalledWith(
      expect.objectContaining({ goat, jenisKelamin: 'BETINA', tanggalLahir: '2026-01-01' }),
      'jwt-token',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('docx-bytes'));
  });

  it('forwards the dashboard error status when creation fails', async () => {
    goatRepository.findGoatById.mockResolvedValue({ id: 'g1', earTagNumber: 12, farmerId: 'f1' });
    const error = new Error('Kode ternak sudah digunakan.');
    error.status = 400;
    error.payload = { message: 'Kode ternak sudah digunakan.' };
    kelahiranService.createLaporanKelahiran.mockRejectedValue(error);

    const req = {
      params: { goatId: 'g1' },
      body: { jenisKelamin: 'JANTAN', tanggalLahir: '2026-01-01' },
      token: 'jwt-token',
    };
    const res = buildRes();

    await generateAktaKelahiran(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Kode ternak sudah digunakan.' }),
    );
  });
});

describe('listLaporan', () => {
  it('returns the laporan kelahiran list from the service', async () => {
    kelahiranService.listLaporanKelahiran.mockResolvedValue([{ id: 'laporan-1' }]);
    const req = { token: 'jwt-token' };
    const res = buildRes();

    await listLaporan(req, res);

    expect(kelahiranService.listLaporanKelahiran).toHaveBeenCalledWith('jwt-token');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getLaporan', () => {
  it('returns the laporan detail from the service', async () => {
    kelahiranService.getLaporanKelahiranById.mockResolvedValue({ id: 'laporan-1' });
    const req = { params: { id: 'laporan-1' }, token: 'jwt-token' };
    const res = buildRes();

    await getLaporan(req, res);

    expect(kelahiranService.getLaporanKelahiranById).toHaveBeenCalledWith('laporan-1', 'jwt-token');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('updateLaporan', () => {
  it('forwards the update payload to the service', async () => {
    kelahiranService.updateLaporanKelahiran.mockResolvedValue({ id: 'laporan-1', catatan: 'Diperbarui' });
    const req = {
      params: { id: 'laporan-1' },
      body: { tanggalLahir: '2026-02-01', catatan: 'Diperbarui', nomorAkta: '001' },
      token: 'jwt-token',
    };
    const res = buildRes();

    await updateLaporan(req, res);

    expect(kelahiranService.updateLaporanKelahiran).toHaveBeenCalledWith(
      'laporan-1',
      { tanggalLahir: '2026-02-01', catatan: 'Diperbarui', nomorAkta: '001' },
      'jwt-token',
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('deleteLaporan', () => {
  it('deletes the laporan via the service', async () => {
    kelahiranService.deleteLaporanKelahiran.mockResolvedValue(undefined);
    const req = { params: { id: 'laporan-1' }, token: 'jwt-token' };
    const res = buildRes();

    await deleteLaporan(req, res);

    expect(kelahiranService.deleteLaporanKelahiran).toHaveBeenCalledWith('laporan-1', 'jwt-token');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('downloadAkta', () => {
  it('streams the requested format from the service', async () => {
    kelahiranService.getAktaFile.mockResolvedValue({
      buffer: Buffer.from('pdf-bytes'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="akta-kelahiran-12.pdf"',
    });
    const req = { params: { id: 'laporan-1' }, query: { format: 'pdf' }, token: 'jwt-token' };
    const res = buildRes();

    await downloadAkta(req, res);

    expect(kelahiranService.getAktaFile).toHaveBeenCalledWith('laporan-1', 'pdf', 'jwt-token');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('pdf-bytes'));
  });
});
