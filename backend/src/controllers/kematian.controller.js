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
