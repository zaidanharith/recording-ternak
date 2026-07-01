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

module.exports = {
  createRecording,
  getRecordingsByKambingId
};
