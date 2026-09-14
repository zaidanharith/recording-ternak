const goatRepository = require('../repositories/goat.repository');
const kematianService = require('../services/kematian.service');

exports.getFormOptions = async (req, res) => {
  try {
    const penyebabKematian = await kematianService.getPenyebabKematianOptions(req.token);
    return res.status(200).json({ success: true, data: { penyebabKematian } });
  } catch (error) {
    console.error('Get Kematian Form Options Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: 'Gagal mengambil data penyebab kematian dari dashboard.',
      error: error.message,
    });
  }
};

exports.generateBeritaAcara = async (req, res) => {
  try {
    const goat = await goatRepository.findGoatById(req.params.goatId);
    if (!goat) {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }

    const { tanggalKematian, penyebabKematianId, catatan, jenisKelamin, tanggalLahir, rasRumpun, format } = req.body;

    if (!tanggalKematian || !penyebabKematianId) {
      return res.status(400).json({
        success: false,
        message: 'tanggalKematian dan penyebabKematianId wajib diisi.',
      });
    }

    const ternak = await kematianService.provisionTernak(
      { goat, jenisKelamin, tanggalLahir, rasRumpun },
      req.token,
    );

    const laporan = await kematianService.createLaporanKematian(
      { ternakId: ternak.id, penyebabKematianId, tanggalKematian, catatan },
      req.token,
    );

    const file = await kematianService.getBeritaAcaraFile(laporan.id, format, req.token);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', file.contentDisposition);
    return res.send(file.buffer);
  } catch (error) {
    console.error('Generate Berita Acara Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal men-generate berita acara kematian.',
      error: error.message,
    });
  }
};

exports.listLaporan = async (req, res) => {
  try {
    const laporanKematian = await kematianService.listLaporanKematian(req.token);
    return res.status(200).json({ success: true, data: { laporanKematian } });
  } catch (error) {
    console.error('List Laporan Kematian Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal mengambil daftar laporan kematian.',
      error: error.message,
    });
  }
};

exports.getLaporan = async (req, res) => {
  try {
    const laporan = await kematianService.getLaporanKematianById(req.params.id, req.token);
    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Get Laporan Kematian Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal mengambil laporan kematian.',
      error: error.message,
    });
  }
};

exports.updateLaporan = async (req, res) => {
  try {
    const { penyebabKematianId, tanggalKematian, catatan } = req.body;
    const laporan = await kematianService.updateLaporanKematian(
      req.params.id,
      { penyebabKematianId, tanggalKematian, catatan },
      req.token,
    );
    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Update Laporan Kematian Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal memperbarui laporan kematian.',
      error: error.message,
    });
  }
};

exports.deleteLaporan = async (req, res) => {
  try {
    await kematianService.deleteLaporanKematian(req.params.id, req.token);
    return res.status(200).json({ success: true, message: 'Laporan kematian berhasil dihapus.' });
  } catch (error) {
    console.error('Delete Laporan Kematian Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal menghapus laporan kematian.',
      error: error.message,
    });
  }
};

exports.downloadBeritaAcara = async (req, res) => {
  try {
    const format = req.query.format === 'pdf' ? 'pdf' : 'docx';
    const file = await kematianService.getBeritaAcaraFile(req.params.id, format, req.token);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', file.contentDisposition);
    return res.send(file.buffer);
  } catch (error) {
    console.error('Download Berita Acara Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.payload?.message || 'Gagal mengunduh berita acara.',
      error: error.message,
    });
  }
};
