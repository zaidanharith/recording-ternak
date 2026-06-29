const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

const buildSchemaDescription = () =>
  config.dataSchema.columns
    .filter((col) => col.key !== 'timestamp' && col.key !== 'pengirim')
    .map((col) => `- "${col.key}": ${col.description}`)
    .join('\n');

const buildPrompt = (messageText, senderName) => `
Kamu adalah sistem pencatat hewan ternak. Tugasmu adalah mengekstrak informasi dari laporan peternak yang ditulis dalam bahasa Indonesia (termasuk bahasa daerah/campuran) dengan format bebas.

Pengirim pesan: ${senderName}

Pesan dari peternak:
"${messageText}"

Ekstrak informasi berikut dan kembalikan HANYA dalam format JSON (tanpa markdown, tanpa penjelasan tambahan):
${buildSchemaDescription()}

Aturan penting:
1. Jika informasi tidak disebutkan, isi dengan "-".
2. Jika pesan ini BUKAN laporan hewan ternak (misal: salam, pertanyaan umum, obrolan biasa), kembalikan JSON dengan field "bukan_laporan_ternak" bernilai true dan field "alasan" berisi penjelasan singkat.
3. Jangan mengarang informasi yang tidak ada dalam pesan.
4. Normalize jenis ternak ke nama umum Indonesia (sapi, kambing, domba, kerbau, babi, ayam, itik, kelinci).
`.trim();

const parseMessage = async (messageText, senderName) => {
  const prompt = buildPrompt(messageText, senderName);
  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();

  const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText);
};

module.exports = { parseMessage };
