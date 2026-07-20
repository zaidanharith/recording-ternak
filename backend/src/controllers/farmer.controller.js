const farmerRepository = require('../repositories/farmer.repository');
const chatMessageRepository = require('../repositories/chat-message.repository');
const { sendTextMessage } = require('../services/whatsapp.service');
const exportService = require('../services/export.service');
const { EXPORT_FORMATS, SORT_DIRECTIONS } = require('../config');

const REMINDER_MESSAGE = 'Halo Pak/Bu, kami belum menerima laporan ternak dari Anda dalam beberapa waktu terakhir. Mohon kirim laporan terbaru kondisi kambing Anda ya. Terima kasih 🙏';

exports.listFarmers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { farmers, total } = await farmerRepository.listFarmers({ search, page, limit });

    return res.status(200).json({
      success: true,
      data: { farmers, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Farmers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar peternak.',
      error: error.message,
    });
  }
};

exports.getFarmer = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { farmer } });
  } catch (error) {
    console.error('Get Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data peternak.',
      error: error.message,
    });
  }
};

exports.createFarmer = async (req, res) => {
  try {
    const { name, desa, dusun, rt, rw, whatsappPhone } = req.body;

    if (!name || !whatsappPhone) {
      return res.status(400).json({
        success: false,
        message: 'name dan whatsappPhone wajib diisi.',
      });
    }

    const farmer = await farmerRepository.createFarmer({ name, desa, dusun, rt, rw, whatsappPhone });

    return res.status(201).json({
      success: true,
      message: 'Peternak berhasil ditambahkan.',
      data: { farmer },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor WhatsApp sudah terdaftar.' });
    }
    console.error('Create Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan peternak.',
      error: error.message,
    });
  }
};

exports.updateFarmer = async (req, res) => {
  try {
    const { name, desa, dusun, rt, rw, whatsappPhone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (desa) updateData.desa = desa;
    if (dusun) updateData.dusun = dusun;
    if (rt) updateData.rt = rt;
    if (rw) updateData.rw = rw;
    if (whatsappPhone) updateData.whatsappPhone = whatsappPhone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    const farmer = await farmerRepository.updateFarmer(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Peternak berhasil diperbarui.',
      data: { farmer },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor WhatsApp sudah terdaftar.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    console.error('Update Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui peternak.',
      error: error.message,
    });
  }
};

exports.deleteFarmer = async (req, res) => {
  try {
    await farmerRepository.deleteFarmer(req.params.id);
    return res.status(200).json({ success: true, message: 'Peternak berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    console.error('Delete Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus peternak.',
      error: error.message,
    });
  }
};

exports.getFarmerChatMessages = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }

    const limit = parseInt(req.query.limit, 10) || 100;
    const messages = await chatMessageRepository.getRecentMessages(farmer.whatsappPhone, limit);

    return res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    console.error('Get Farmer Chat Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat chat.',
      error: error.message,
    });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }

    await sendTextMessage(farmer.whatsappPhone, REMINDER_MESSAGE);

    return res.status(200).json({
      success: true,
      message: `Reminder berhasil dikirim ke ${farmer.name}.`,
    });
  } catch (error) {
    console.error('Send Reminder Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim reminder.',
      error: error.message,
    });
  }
};

const FARMER_SORT_FIELDS = ['name', 'whatsappPhone', 'desa'];

exports.exportFarmers = async (req, res) => {
  try {
    const { format, search } = req.query;
    const sortBy = req.query.sortBy || 'name';
    const sortDir = req.query.sortDir || 'asc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (!FARMER_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${FARMER_SORT_FIELDS.join(', ')}.` });
    }
    if (!SORT_DIRECTIONS.includes(sortDir)) {
      return res.status(400).json({ success: false, message: `sortDir harus salah satu dari: ${SORT_DIRECTIONS.join(', ')}.` });
    }

    const farmers = await farmerRepository.exportFarmers({ search, sortBy, sortDir });

    const columns = [
      { header: 'Nama', key: 'name', width: 24 },
      { header: 'Nomor WhatsApp', key: 'whatsappPhone', width: 20 },
      { header: 'Desa', key: 'desa', width: 18 },
      { header: 'Dusun', key: 'dusun', width: 18 },
      { header: 'RT', key: 'rt', width: 8 },
      { header: 'RW', key: 'rw', width: 8 },
    ];

    const rows = farmers.map((farmer) => ({
      name: farmer.name,
      whatsappPhone: farmer.whatsappPhone,
      desa: farmer.desa,
      dusun: farmer.dusun,
      rt: farmer.rt,
      rw: farmer.rw,
    }));

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'farmer',
      title: 'Laporan Data Peternak',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Farmers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data peternak.',
      error: error.message,
    });
  }
};
