const prisma = require('../lib/prisma');

const createRecording = async (recordingData) => {
  return await prisma.recording.create({
    data: {
      kambingId: recordingData.kambingId,
      pengirim: recordingData.pengirim,
      tanggal_kawin: recordingData.tanggal_kawin || '-',
      tanggal_beranak: recordingData.tanggal_beranak || '-',
      jumlah_anak_jantan: String(recordingData.jumlah_anak_jantan || '-'),
      jumlah_anak_betina: String(recordingData.jumlah_anak_betina || '-'),
      perkawinan_ke: String(recordingData.perkawinan_ke || '-'),
      target_penjualan: recordingData.target_penjualan || '-',
      terjual: recordingData.terjual || '-',
      catatan: recordingData.catatan || '-'
    }
  });
};

const getRecordingsByKambingId = async (kambingId) => {
  return await prisma.recording.findMany({
    where: { kambingId },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Ambil semua kambing + recording terakhir milik satu peternak.
 */
const getFullDataByPeternakId = async (peternakId) => {
  return await prisma.kambing.findMany({
    where: { peternakId },
    include: {
      recordings: { orderBy: { createdAt: 'desc' } },
      peternak: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Ambil semua data (peternak + kambing + recording) untuk keperluan query AI.
 */
const getAllDataForQuery = async () => {
  return await prisma.peternak.findMany({
    include: {
      kambing: {
        include: {
          recordings: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { nama: 'asc' },
  });
};

module.exports = {
  createRecording,
  getRecordingsByKambingId,
  getFullDataByPeternakId,
  getAllDataForQuery,
};

