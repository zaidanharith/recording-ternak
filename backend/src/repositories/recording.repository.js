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
      notes: recordingData.catatan || '-',
      photoUrl: recordingData.photoUrl || null,
      photoPublicId: recordingData.photoPublicId || null,
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

const createManualRecording = async ({
  goatId, senderName, matingDate, birthDate, maleKidCount, femaleKidCount,
  matingNumber, saleTarget, sold, notes, photoUrl, photoPublicId,
}) => {
  return await prisma.recording.create({
    data: {
      goatId,
      senderName,
      matingDate: matingDate || '-',
      birthDate: birthDate || '-',
      maleKidCount: maleKidCount !== undefined ? String(maleKidCount) : '-',
      femaleKidCount: femaleKidCount !== undefined ? String(femaleKidCount) : '-',
      matingNumber: matingNumber !== undefined ? String(matingNumber) : '-',
      saleTarget: saleTarget || '-',
      sold: sold || '-',
      notes: notes || '-',
      photoUrl: photoUrl || null,
      photoPublicId: photoPublicId || null,
      status: 'FINAL',
      source: 'MANUAL',
    },
  });
};

const listRecordings = async ({ status, goatId, farmerId, page, limit }) => {
  const where = {
    ...(status && { status }),
    ...(goatId && { goatId }),
    ...(farmerId && { goat: { farmerId } }),
  };

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where,
      include: { goat: { include: { farmer: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recording.count({ where }),
  ]);

  return { recordings, total };
};

const findRecordingById = async (id) => {
  return await prisma.recording.findUnique({
    where: { id },
    include: { goat: { include: { farmer: true } } },
  });
};

const updateRecording = async (id, data) => {
  return await prisma.recording.update({ where: { id }, data });
};

const deleteRecording = async (id) => {
  return await prisma.recording.delete({ where: { id } });
};

module.exports = {
  createRecording,
  getRecordingsByGoatId,
  getFullDataByFarmerId,
  getAllDataForQuery,
  createManualRecording,
  listRecordings,
  findRecordingById,
  updateRecording,
  deleteRecording,
};

