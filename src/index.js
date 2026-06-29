const { initWhatsApp } = require('./whatsapp');
const { parseMessage } = require('./gemini');
const { appendRow } = require('./sheets');

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
  const lines = [
    '✅ *Laporan ternak berhasil dicatat!*',
    '',
    `🐄 *Jenis Ternak:* ${data.jenis_ternak}`,
    `👤 *Pemilik:* ${data.nama_pemilik}`,
    `🏷️ *ID Hewan:* ${data.id_hewan}`,
    `❤️ *Kondisi:* ${data.kondisi_kesehatan}`,
    `💊 *Tindakan:* ${data.tindakan}`,
    '',
    '_Data telah tersimpan di Google Spreadsheet._',
  ];
  return lines.join('\n');
};

const handleMessage = async (message) => {
  if (message.fromMe) return;

  const contact = await message.getContact();
  const senderName = contact.pushname || contact.number || message.from;

  console.log(`📩 Pesan dari ${senderName}: "${message.body}"`);

  try {
    const parsed = await parseMessage(message.body, senderName);

    if (parsed.bukan_laporan_ternak) {
      console.log(`⏭️  Pesan bukan laporan ternak (${parsed.alasan}). Dilewati.\n`);
      return;
    }

    const timestamp = formatTimestamp();
    const rowData = {
      ...parsed,
      timestamp,
      pengirim: senderName,
    };

    await appendRow(rowData);
    console.log(`✅ Data berhasil dicatat ke Google Sheets.\n`);

    await message.reply(buildSuccessReply(parsed));
  } catch (error) {
    console.error(`❌ Error memproses pesan dari ${senderName}:`, error.message);
  }
};

console.log('🚀 Memulai backend recording ternak...\n');
initWhatsApp(handleMessage);
