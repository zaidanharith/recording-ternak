const { parseMessage } = require('./gemini.service');
const { findOrCreateKambing } = require('../repositories/kambing.repository');
const { createRecording } = require('../repositories/recording.repository');
const { appendRow } = require('./sheets.service');
const { sendTextMessage } = require('./whatsapp.service');

const formatTimestamp = () => {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildSuccessReply = (data) => {
  const jantan = data.jumlah_anak_jantan !== '-' ? data.jumlah_anak_jantan : '-';
  const betina = data.jumlah_anak_betina !== '-' ? data.jumlah_anak_betina : '-';
  const lines = [
    '✅ *Data kambing berhasil dicatat!*',
    '',
    `👤 *Nama Peternak:* ${data.nama_peternak ?? '-'}`,
    `🏷️ *No. Telinga/Ternak:* ${data.nomor_telinga ?? '-'}`,
    `📍 *Alamat:* ${data.alamat ?? '-'}`,
    `💑 *Tanggal Kawin:* ${data.tanggal_kawin ?? '-'}`,
    `🐣 *Tanggal Beranak:* ${data.tanggal_beranak ?? '-'}`,
    `♂️ *Anak Jantan:* ${jantan}  |  ♀️ *Anak Betina:* ${betina}`,
    `🔢 *Perkawinan Ke:* ${data.perkawinan_ke ?? '-'}`,
    `🎯 *Target Penjualan:* ${data.target_penjualan ?? '-'}`,
    `💰 *Terjual:* ${data.terjual ?? '-'}`,
    data.catatan && data.catatan !== '-' ? `📝 *Catatan:* ${data.catatan}` : null,
    '',
    '_Data telah tersimpan di Database (Supabase) & Google Spreadsheet._',
  ].filter((line) => line !== null);
  return lines.join('\n');
};

const handleIncomingReport = async (messageText, senderPhone, senderName) => {
  const parsed = await parseMessage(messageText, senderName);

  if (parsed.bukan_laporan_ternak) {
    return { success: false, notAReport: true, alasan: parsed.alasan };
  }

  const kambing = await findOrCreateKambing(parsed.nomor_telinga, {
    nama_peternak: parsed.nama_peternak,
    alamat: parsed.alamat
  });
  const recording = await createRecording({
    kambingId: kambing.id,
    pengirim: senderName,
    tanggal_kawin: parsed.tanggal_kawin,
    tanggal_beranak: parsed.tanggal_beranak,
    jumlah_anak_jantan: parsed.jumlah_anak_jantan,
    jumlah_anak_betina: parsed.jumlah_anak_betina,
    perkawinan_ke: parsed.perkawinan_ke,
    target_penjualan: parsed.target_penjualan,
    terjual: parsed.terjual,
    catatan: parsed.catatan
  });

  const timestamp = formatTimestamp();
  const sheetsRow = {
    ...parsed,
    nomor_telinga: kambing.nomor_telinga,
    timestamp,
    pengirim: senderName
  };
  await appendRow(sheetsRow);

  const replyMessage = buildSuccessReply({
    ...parsed,
    nomor_telinga: kambing.nomor_telinga
  });
  await sendTextMessage(senderPhone, replyMessage);

  return { success: true, kambing, recording };
};

module.exports = {
  handleIncomingReport
};
