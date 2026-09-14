const goatRepository = require('../repositories/goat.repository');
const kelahiranService = require('../services/kelahiran.service');

exports.generateAktaKelahiran = async (req, res) => {
  try {
    const goat = await goatRepository.findGoatById(req.params.goatId);
    if (!goat) {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }

    const { jenisKelamin, tanggalLahir, rasRumpun, catatan, format } = req.body;

    if (!jenisKelamin || !tanggalLahir) {
      return res.status(400).json({
        success: false,
        message: 'jenisKelamin dan tanggalLahir wajib diisi.',
      });
    }

    const laporan = await kelahiranService.createLaporanKelahiran(
      { goat, jenisKelamin, tanggalLahir, rasRumpun, catatan },
      { id: req.user.id, name: req.user.name },
    );

    const file = await kelahiranService.getAktaFile(laporan.id, format);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', file.contentDisposition);
    return res.send(file.buffer);
  } catch (error) {
    console.error('Generate Akta Kelahiran Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Gagal men-generate akta kelahiran.',
    });
  }
};

exports.listLaporan = async (req, res) => {
  try {
    const laporanKelahiran = await kelahiranService.listLaporanKelahiran();
    return res.status(200).json({ success: true, data: { laporanKelahiran } });
  } catch (error) {
    console.error('List Laporan Kelahiran Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar laporan kelahiran.',
      error: error.message,
    });
  }
};

exports.getLaporan = async (req, res) => {
  try {
    const laporan = await kelahiranService.getLaporanKelahiranById(req.params.id);
    if (!laporan) {
      return res.status(404).json({ success: false, message: 'Laporan kelahiran tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Get Laporan Kelahiran Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan kelahiran.',
      error: error.message,
    });
  }
};

exports.updateLaporan = async (req, res) => {
  try {
    const { tanggalLahir, catatan, nomorAkta } = req.body;
    const laporan = await kelahiranService.updateLaporanKelahiran(req.params.id, {
      tanggalLahir,
      catatan,
      nomorAkta,
    });
    if (!laporan) {
      return res.status(404).json({ success: false, message: 'Laporan kelahiran tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Update Laporan Kelahiran Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui laporan kelahiran.',
      error: error.message,
    });
  }
};

exports.deleteLaporan = async (req, res) => {
  try {
    const laporan = await kelahiranService.deleteLaporanKelahiran(req.params.id);
    if (!laporan) {
      return res.status(404).json({ success: false, message: 'Laporan kelahiran tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Laporan kelahiran berhasil dihapus.' });
  } catch (error) {
    console.error('Delete Laporan Kelahiran Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus laporan kelahiran.',
      error: error.message,
    });
  }
};

exports.downloadAkta = async (req, res) => {
  try {
    const format = req.query.format === 'pdf' ? 'pdf' : 'docx';
    const file = await kelahiranService.getAktaFile(req.params.id, format);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', file.contentDisposition);
    return res.send(file.buffer);
  } catch (error) {
    console.error('Download Akta Kelahiran Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Gagal mengunduh akta kelahiran.',
    });
  }
};
