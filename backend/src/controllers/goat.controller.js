const goatRepository = require('../repositories/goat.repository');

exports.listGoats = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const farmerId = req.query.farmerId || undefined;

    const { goats, total } = await goatRepository.listGoats({ farmerId, page, limit });

    return res.status(200).json({
      success: true,
      data: { goats, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Goats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar kambing.',
      error: error.message,
    });
  }
};

exports.getGoat = async (req, res) => {
  try {
    const goat = await goatRepository.findGoatById(req.params.id);
    if (!goat) {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { goat } });
  } catch (error) {
    console.error('Get Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data kambing.',
      error: error.message,
    });
  }
};

exports.getNextEarTagNumber = async (req, res) => {
  try {
    const nextEarTagNumber = await goatRepository.getNextEarTagNumber();
    return res.status(200).json({ success: true, data: { nextEarTagNumber } });
  } catch (error) {
    console.error('Get Next Ear Tag Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghitung nomor telinga berikutnya.',
      error: error.message,
    });
  }
};

exports.createGoat = async (req, res) => {
  try {
    const { earTagNumber, farmerId } = req.body;

    if (!earTagNumber || !farmerId) {
      return res.status(400).json({
        success: false,
        message: 'earTagNumber dan farmerId wajib diisi.',
      });
    }

    const goat = await goatRepository.createGoat({ earTagNumber, farmerId });

    return res.status(201).json({
      success: true,
      message: 'Kambing berhasil ditambahkan.',
      data: { goat },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor telinga sudah digunakan.' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    if (error.message === 'Nomor telinga harus berupa angka bulat') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan kambing.',
      error: error.message,
    });
  }
};

exports.updateGoat = async (req, res) => {
  try {
    const { earTagNumber, farmerId } = req.body;
    const updateData = {};
    if (earTagNumber) updateData.earTagNumber = goatRepository.parseEarTagNumber(earTagNumber);
    if (farmerId) updateData.farmerId = farmerId;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    const goat = await goatRepository.updateGoat(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Kambing berhasil diperbarui.',
      data: { goat },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor telinga sudah digunakan.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    if (error.message === 'Nomor telinga harus berupa angka bulat') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Update Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui kambing.',
      error: error.message,
    });
  }
};

exports.deleteGoat = async (req, res) => {
  try {
    await goatRepository.deleteGoat(req.params.id);
    return res.status(200).json({ success: true, message: 'Kambing berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    console.error('Delete Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus kambing.',
      error: error.message,
    });
  }
};
