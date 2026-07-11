const recordingRepository = require('../repositories/recording.repository');
const cloudinaryService = require('../services/cloudinary.service');

const RECORDING_STATUSES = ['PERLU_REVIEW', 'FINAL'];

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
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
    } = req.body;

    if (!goatId) {
      return res.status(400).json({ success: false, message: 'goatId wajib diisi.' });
    }

    const recording = await recordingRepository.createManualRecording({
      goatId,
      senderName: req.user.name,
      matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
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
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId, status,
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
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (photoPublicId !== undefined) updateData.photoPublicId = photoPublicId;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    let oldPhotoPublicId = null;
    if (photoUrl !== undefined) {
      const existing = await recordingRepository.findRecordingById(req.params.id);
      if (existing && existing.photoUrl !== photoUrl && existing.photoPublicId) {
        oldPhotoPublicId = existing.photoPublicId;
      }
    }

    const recording = await recordingRepository.updateRecording(req.params.id, updateData);

    if (oldPhotoPublicId) {
      cloudinaryService.deleteImage(oldPhotoPublicId);
    }

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

    if (existing && existing.photoPublicId) {
      cloudinaryService.deleteImage(existing.photoPublicId);
    }

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
