const recordingRepository = require('../repositories/recording.repository');
const cloudinaryService = require('../services/cloudinary.service');
const exportService = require('../services/export.service');
const { EXPORT_FORMATS, SORT_DIRECTIONS } = require('../config');
const { isValidDateString } = require('../lib/date-range');

const RECORDING_STATUSES = ['PERLU_REVIEW', 'FINAL'];

const SOLD_STATUSES = ['YA', 'TIDAK'];
const GOAT_CONDITIONS = ['SEHAT', 'SAKIT'];
const RECORDING_SOURCES = ['WA', 'MANUAL'];
const RECORDING_SORT_FIELDS = ['goat', 'farmer', 'birthDate', 'source', 'status'];

const SOLD_LABELS = { YA: 'Ya', TIDAK: 'Tidak' };
const CONDITION_LABELS = { SEHAT: 'Sehat', SAKIT: 'Sakit' };
const SOURCE_LABELS = { WA: 'WhatsApp', MANUAL: 'Manual' };
const STATUS_LABELS = { PERLU_REVIEW: 'Perlu Review', FINAL: 'Final' };
const JENIS_KELAMIN_LABELS = { JANTAN: 'Jantan', BETINA: 'Betina' };
const GOAT_STATUS_LABELS = { HIDUP: 'Hidup', MATI: 'Mati' };

const RECORDING_VALIDATION_MESSAGES = [
  'Tanggal tidak valid, gunakan format YYYY-MM-DD (contoh: 2026-07-11).',
  'Status terjual harus "Ya" atau "Tidak".',
  'Kondisi harus "Sehat" atau "Sakit".',
];

const isRecordingValidationError = (error) => RECORDING_VALIDATION_MESSAGES.includes(error.message);

exports.listRecordings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status, goatId, farmerId } = req.query;

    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.`,
      });
    }

    const { recordings, total } = await recordingRepository.listRecordings({ status, goatId, farmerId, page, limit });

    return res.status(200).json({
      success: true,
      data: { recordings, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Recordings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar recording.',
      error: error.message,
    });
  }
};

exports.getRecording = async (req, res) => {
  try {
    const recording = await recordingRepository.findRecordingById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { recording } });
  } catch (error) {
    console.error('Get Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data recording.',
      error: error.message,
    });
  }
};

exports.createRecording = async (req, res) => {
  try {
    const {
      goatId, matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrls, photoPublicIds,
    } = req.body;

    if (!goatId) {
      return res.status(400).json({ success: false, message: 'goatId wajib diisi.' });
    }

    const recording = await recordingRepository.createManualRecording({
      goatId,
      senderName: req.user.name,
      matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrls, photoPublicIds,
    });

    return res.status(201).json({
      success: true,
      message: 'Recording berhasil ditambahkan.',
      data: { recording },
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    if (isRecordingValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan recording.',
      error: error.message,
    });
  }
};

exports.updateRecording = async (req, res) => {
  try {
    const {
      matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrls, photoPublicIds, status,
    } = req.body;

    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.`,
      });
    }

    const updateData = {};
    if (matingDate !== undefined) updateData.matingDate = recordingRepository.parseRecordingDate(matingDate);
    if (birthDate !== undefined) updateData.birthDate = recordingRepository.parseRecordingDate(birthDate);
    if (recordingDate !== undefined) updateData.recordingDate = recordingRepository.parseRecordingDate(recordingDate) || new Date();
    if (maleKidCount !== undefined) updateData.maleKidCount = maleKidCount;
    if (femaleKidCount !== undefined) updateData.femaleKidCount = femaleKidCount;
    if (matingNumber !== undefined) updateData.matingNumber = matingNumber;
    if (saleTarget !== undefined) updateData.saleTarget = saleTarget;
    if (sold !== undefined) updateData.sold = recordingRepository.parseSoldStatus(sold);
    if (condition !== undefined) updateData.condition = recordingRepository.parseGoatCondition(condition);
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrls !== undefined) updateData.photoUrls = photoUrls;
    if (photoPublicIds !== undefined) updateData.photoPublicIds = photoPublicIds;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    let removedPublicIds = [];
    if (photoPublicIds !== undefined) {
      const existing = await recordingRepository.findRecordingById(req.params.id);
      const keep = new Set(photoPublicIds);
      removedPublicIds = (existing?.photoPublicIds ?? []).filter((id) => !keep.has(id));
    }

    const recording = await recordingRepository.updateRecording(req.params.id, updateData);

    removedPublicIds.forEach((publicId) => cloudinaryService.deleteImage(publicId));

    return res.status(200).json({
      success: true,
      message: 'Recording berhasil diperbarui.',
      data: { recording },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    if (isRecordingValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Update Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui recording.',
      error: error.message,
    });
  }
};

exports.deleteRecording = async (req, res) => {
  try {
    const existing = await recordingRepository.findRecordingById(req.params.id);
    await recordingRepository.deleteRecording(req.params.id);

    (existing?.photoPublicIds ?? []).forEach((publicId) => cloudinaryService.deleteImage(publicId));

    return res.status(200).json({ success: true, message: 'Recording berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    console.error('Delete Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus recording.',
      error: error.message,
    });
  }
};

exports.exportRecordings = async (req, res) => {
  try {
    const { format, status, sold, condition, source, startDate, endDate } = req.query;
    const sortBy = req.query.sortBy || 'birthDate';
    const sortDir = req.query.sortDir || 'desc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.` });
    }
    if (sold && !SOLD_STATUSES.includes(sold)) {
      return res.status(400).json({ success: false, message: `sold harus salah satu dari: ${SOLD_STATUSES.join(', ')}.` });
    }
    if (condition && !GOAT_CONDITIONS.includes(condition)) {
      return res.status(400).json({ success: false, message: `condition harus salah satu dari: ${GOAT_CONDITIONS.join(', ')}.` });
    }
    if (source && !RECORDING_SOURCES.includes(source)) {
      return res.status(400).json({ success: false, message: `source harus salah satu dari: ${RECORDING_SOURCES.join(', ')}.` });
    }
    if (!RECORDING_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${RECORDING_SORT_FIELDS.join(', ')}.` });
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

    const recordings = await recordingRepository.exportRecordings({
      status, sold, condition, source, startDate, endDate, sortBy, sortDir,
    });

    const columns = [
      { header: 'No. Telinga Kambing', key: 'earTagNumber', width: 20 },
      { header: 'Peternak', key: 'farmerName', width: 24 },
      { header: 'Tanggal Lahir', key: 'birthDate', width: 16 },
      { header: 'Kondisi', key: 'condition', width: 12 },
      { header: 'Anak Jantan', key: 'maleKidCount', width: 12 },
      { header: 'Anak Betina', key: 'femaleKidCount', width: 12 },
      { header: 'Terjual', key: 'sold', width: 10 },
      { header: 'Sumber', key: 'source', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'No. Registrasi Kambing', key: 'registrationNumber', width: 20 },
      { header: 'Jenis Kelamin Kambing', key: 'jenisKelamin', width: 16 },
      { header: 'Ras/Rumpun', key: 'rasRumpun', width: 16 },
      { header: 'Tanggal Lahir Kambing', key: 'goatBirthDate', width: 18 },
      { header: 'Ciri Khusus', key: 'specialTraits', width: 24 },
      { header: 'Asal', key: 'origin', width: 16 },
      { header: 'Tanggal Masuk', key: 'enteredAt', width: 16 },
      { header: 'Harga Beli', key: 'purchasePrice', width: 14 },
      { header: 'Panjang (cm)', key: 'lengthCm', width: 12 },
      { header: 'Tinggi (cm)', key: 'heightCm', width: 12 },
      { header: 'Jumlah Laktasi', key: 'lactationCount', width: 14 },
      { header: 'Kondisi Awal Kambing', key: 'initialCondition', width: 16 },
      { header: 'Status Kambing', key: 'goatStatus', width: 14 },
      { header: 'Foto Kambing', key: 'goatPhotoUrls', width: 30 },
    ];

    const rows = recordings.map((recording) => {
      const goat = recording.goat ?? {};
      return {
        earTagNumber: goat.earTagNumber ?? '-',
        farmerName: goat.farmer?.name ?? '-',
        birthDate: exportService.formatDateId(recording.birthDate),
        condition: recording.condition ? CONDITION_LABELS[recording.condition] : '-',
        maleKidCount: recording.maleKidCount,
        femaleKidCount: recording.femaleKidCount,
        sold: recording.sold ? SOLD_LABELS[recording.sold] : '-',
        source: SOURCE_LABELS[recording.source],
        status: STATUS_LABELS[recording.status],
        registrationNumber: goat.registrationNumber ?? '-',
        jenisKelamin: goat.jenisKelamin ? JENIS_KELAMIN_LABELS[goat.jenisKelamin] : '-',
        rasRumpun: goat.rasRumpun ?? '-',
        goatBirthDate: exportService.formatDateId(goat.birthDate),
        specialTraits: goat.specialTraits ?? '-',
        origin: goat.origin ?? '-',
        enteredAt: exportService.formatDateId(goat.enteredAt),
        purchasePrice: goat.purchasePrice ?? '-',
        lengthCm: goat.lengthCm ?? '-',
        heightCm: goat.heightCm ?? '-',
        lactationCount: goat.lactationCount ?? '-',
        initialCondition: goat.initialCondition ? CONDITION_LABELS[goat.initialCondition] : '-',
        goatStatus: goat.status ? GOAT_STATUS_LABELS[goat.status] : '-',
        goatPhotoUrls: goat.photoUrls?.length ? goat.photoUrls.join(', ') : '-',
      };
    });

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'recording',
      title: 'Laporan Data Recording',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Recordings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data recording.',
      error: error.message,
    });
  }
};
