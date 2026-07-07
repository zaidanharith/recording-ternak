const prisma = require('../lib/prisma');

const createRecording = async (recordingData) => {
  return await prisma.recording.create({
    data: {
      goatId: recordingData.kambingId,
      senderName: recordingData.pengirim,
      matingDate: recordingData.tanggal_kawin || '-',
      birthDate: recordingData.tanggal_beranak || '-',
      maleKidCount: String(recordingData.jumlah_anak_jantan || '-'),
      femaleKidCount: String(recordingData.jumlah_anak_betina || '-'),
      matingNumber: String(recordingData.perkawinan_ke || '-'),
      saleTarget: recordingData.target_penjualan || '-',
      sold: recordingData.terjual || '-',
      notes: recordingData.catatan || '-'
    }
  });
};

const getRecordingsByGoatId = async (goatId) => {
  return await prisma.recording.findMany({
    where: { goatId },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Ambil semua kambing + recording terakhir milik satu peternak.
 */
const getFullDataByFarmerId = async (farmerId) => {
  return await prisma.goat.findMany({
    where: { farmerId },
    include: {
      recordings: { orderBy: { createdAt: 'desc' } },
      farmer: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Ambil semua data (peternak + kambing + recording) untuk keperluan query AI.
 */
const getAllDataForQuery = async () => {
  return await prisma.farmer.findMany({
    include: {
      goats: {
        include: {
          recordings: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
};

module.exports = {
  createRecording,
  getRecordingsByGoatId,
  getFullDataByFarmerId,
  getAllDataForQuery,
};

