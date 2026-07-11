const prisma = require('../lib/prisma');

const ERR_INVALID_DATE = 'Tanggal tidak valid, gunakan format YYYY-MM-DD (contoh: 2026-07-11).';
const ERR_INVALID_SOLD = 'Status terjual harus "Ya" atau "Tidak".';
const ERR_INVALID_CONDITION = 'Kondisi harus "Sehat" atau "Sakit".';

const isEmpty = (value) => value === undefined || value === null || value === '' || value === '-';

const parseRecordingDate = (value) => {
  if (isEmpty(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(ERR_INVALID_DATE);
  }
  return date;
};

const SOLD_STATUS_MAP = { ya: 'YA', tidak: 'TIDAK', belum: 'TIDAK' };

const parseSoldStatus = (value) => {
  if (isEmpty(value)) return null;
  if (value === 'YA' || value === 'TIDAK') return value;
  const mapped = SOLD_STATUS_MAP[String(value).trim().toLowerCase()];
  if (!mapped) throw new Error(ERR_INVALID_SOLD);
  return mapped;
};

const CONDITION_MAP = { sehat: 'SEHAT', sakit: 'SAKIT' };

const parseGoatCondition = (value) => {
  if (isEmpty(value)) return null;
  if (value === 'SEHAT' || value === 'SAKIT') return value;
  const mapped = CONDITION_MAP[String(value).trim().toLowerCase()];
  if (!mapped) throw new Error(ERR_INVALID_CONDITION);
  return mapped;
};

const createRecording = async (recordingData) => {
  return await prisma.recording.create({
    data: {
      goatId: recordingData.kambingId,
      senderName: recordingData.pengirim,
      matingDate: parseRecordingDate(recordingData.tanggal_kawin),
      birthDate: parseRecordingDate(recordingData.tanggal_beranak),
      recordingDate: parseRecordingDate(recordingData.recordingDate) || new Date(),
      maleKidCount: String(recordingData.jumlah_anak_jantan || '-'),
      femaleKidCount: String(recordingData.jumlah_anak_betina || '-'),
      matingNumber: String(recordingData.perkawinan_ke || '-'),
      saleTarget: recordingData.target_penjualan || '-',
      sold: parseSoldStatus(recordingData.terjual),
      condition: parseGoatCondition(recordingData.kondisi),
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
  goatId, senderName, matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
  matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
}) => {
  return await prisma.recording.create({
    data: {
      goatId,
      senderName,
      matingDate: parseRecordingDate(matingDate),
      birthDate: parseRecordingDate(birthDate),
      recordingDate: parseRecordingDate(recordingDate) || new Date(),
      maleKidCount: maleKidCount !== undefined ? String(maleKidCount) : '-',
      femaleKidCount: femaleKidCount !== undefined ? String(femaleKidCount) : '-',
      matingNumber: matingNumber !== undefined ? String(matingNumber) : '-',
      saleTarget: saleTarget || '-',
      sold: parseSoldStatus(sold),
      condition: parseGoatCondition(condition),
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
  ERR_INVALID_DATE,
  ERR_INVALID_SOLD,
  ERR_INVALID_CONDITION,
  parseRecordingDate,
  parseSoldStatus,
  parseGoatCondition,
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

