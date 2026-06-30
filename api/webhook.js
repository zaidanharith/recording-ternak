const config = require('../src/config');
const { parseMessage } = require('../src/gemini');
const { appendRow } = require('../src/sheets');
const { sendTextMessage } = require('../src/whatsapp');

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

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        return res.status(200).send(challenge);
      }
      return res.status(403).end();
    }
    return res.status(400).end();
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.type === 'text') {
          const senderPhone = message.from;
          const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
          const messageText = message.text.body;

          const parsed = await parseMessage(messageText, senderName);

          if (!parsed.bukan_laporan_ternak) {
            const timestamp = formatTimestamp();
            const rowData = {
              ...parsed,
              timestamp,
              pengirim: senderName,
            };

            await appendRow(rowData);
            await sendTextMessage(senderPhone, buildSuccessReply(parsed));
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      }
      return res.status(404).end();
    } catch (error) {
      console.error(error);
      return res.status(500).end();
    }
  }

  return res.status(405).end();
};
