const goatRepository = require('../repositories/goat.repository');
const exportService = require('../services/export.service');
const { EXPORT_FORMATS, SORT_DIRECTIONS } = require('../config');
const { isValidDateString } = require('../lib/date-range');

const JENIS_KELAMIN_VALUES = ['JANTAN', 'BETINA'];
const GOAT_CONDITION_VALUES = ['SEHAT', 'SAKIT'];

const GOAT_EDITABLE_FIELDS = [
  'registrationNumber', 'jenisKelamin', 'rasRumpun', 'birthDate', 'specialTraits',
  'origin', 'enteredAt', 'purchasePrice', 'lengthCm', 'heightCm', 'lactationCount',
  'initialCondition', 'photoUrls', 'photoPublicIds',
];

/**
 * Ambil field-field detail kambing dari body request (dipakai saat create & update).
 * Validasi enum & tanggal di sini, lempar Error dengan pesan yang sudah siap ditampilkan.
 */
const parseGoatDetailFields = (body) => {
  const data = {};
  for (const field of GOAT_EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    data[field] = body[field];
  }

  if (data.jenisKelamin !== undefined && data.jenisKelamin !== null && !JENIS_KELAMIN_VALUES.includes(data.jenisKelamin)) {
    throw new Error(`jenisKelamin harus salah satu dari: ${JENIS_KELAMIN_VALUES.join(', ')}.`);
  }
  if (data.initialCondition !== undefined && data.initialCondition !== null && !GOAT_CONDITION_VALUES.includes(data.initialCondition)) {
    throw new Error(`initialCondition harus salah satu dari: ${GOAT_CONDITION_VALUES.join(', ')}.`);
  }
  for (const dateField of ['birthDate', 'enteredAt']) {
    if (data[dateField] === undefined) continue;
    if (!isValidDateString(data[dateField])) {
      throw new Error(`${dateField} harus berformat YYYY-MM-DD.`);
    }
    data[dateField] = new Date(data[dateField]);
  }

  return data;
};

const isGoatValidationError = (error) =>
  error.message === 'Nomor telinga harus berupa angka bulat' ||
  error.message.startsWith('jenisKelamin harus') ||
  error.message.startsWith('initialCondition harus') ||
  error.message.endsWith('harus berformat YYYY-MM-DD.');

exports.listGoats = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const farmerId = req.query.farmerId || undefined;
    const search = req.query.search || undefined;

    const { goats, total } = await goatRepository.listGoats({ farmerId, search, page, limit });

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

    const detailFields = parseGoatDetailFields(req.body);
    const goat = await goatRepository.createGoat({ earTagNumber, farmerId, ...detailFields });

    return res.status(201).json({
      success: true,
      message: 'Kambing berhasil ditambahkan.',
      data: { goat },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target ?? '';
      const message = String(target).includes('registration_number')
        ? 'Nomor registrasi sudah digunakan.'
        : 'Nomor telinga sudah digunakan.';
      return res.status(409).json({ success: false, message });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    if (isGoatValidationError(error)) {
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
    const updateData = parseGoatDetailFields(req.body);
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
      const target = error.meta?.target ?? '';
      const message = String(target).includes('registration_number')
        ? 'Nomor registrasi sudah digunakan.'
        : 'Nomor telinga sudah digunakan.';
      return res.status(409).json({ success: false, message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    if (isGoatValidationError(error)) {
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

const GOAT_SORT_FIELDS = ['earTagNumber', 'farmer', 'createdAt'];

exports.exportGoats = async (req, res) => {
  try {
    const { format, farmerId, startDate, endDate } = req.query;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (!GOAT_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${GOAT_SORT_FIELDS.join(', ')}.` });
    }
    if (!SORT_DIRECTIONS.includes(sortDir)) {
      return res.status(400).json({ success: false, message: `sortDir harus salah satu dari: ${SORT_DIRECTIONS.join(', ')}.` });
    }
    if (startDate && !isValidDateString(startDate)) {
      return res.status(400).json({ success: false, message: 'startDate harus berformat YYYY-MM-DD.' });
    }
    if (endDate && !isValidDateString(endDate)) {
      return res.status(400).json({ success: false, message: 'endDate harus berformat YYYY-MM-DD.' });
    }

    const goats = await goatRepository.exportGoats({ farmerId, startDate, endDate, sortBy, sortDir });

    const columns = [
      { header: 'No. Telinga', key: 'earTagNumber', width: 16 },
      { header: 'Peternak', key: 'farmerName', width: 24 },
      { header: 'Terdaftar', key: 'createdAt', width: 16 },
    ];

    const rows = goats.map((goat) => ({
      earTagNumber: goat.earTagNumber,
      farmerName: goat.farmer?.name ?? '-',
      createdAt: exportService.formatDateId(goat.createdAt),
    }));

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'goat',
      title: 'Laporan Data Kambing',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Goats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data kambing.',
      error: error.message,
    });
  }
};
