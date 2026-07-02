const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

const buildSchemaDescription = () =>
  config.dataSchema.columns
    .filter((col) => col.key !== 'timestamp' && col.key !== 'pengirim')
    .map((col) => `- "${col.key}": ${col.description}`)
    .join('\n');

const buildPrompt = (messageText, senderName) => `
Kamu adalah sistem pencatat data breeding (reproduksi) dan penjualan TERNAK KAMBING milik kelompok peternak kambing.
Tugasmu adalah mengekstrak informasi dari laporan peternak yang ditulis dalam bahasa Indonesia (termasuk bahasa daerah/campuran) dengan format bebas.

PENTING: Sistem ini HANYA mencatat laporan tentang ternak KAMBING. Jika pesan menyebut hewan selain kambing (misal: sapi, domba, ayam, dll.), perlakukan sebagai bukan laporan sistem ini.

Pengirim pesan: ${senderName}

Pesan dari peternak:
"${messageText}"

Ekstrak informasi berikut dan kembalikan HANYA dalam format JSON (tanpa markdown, tanpa penjelasan tambahan):
${buildSchemaDescription()}

Aturan penting:
1. Jika informasi tidak disebutkan, isi dengan "-".
2. Jika pesan ini BUKAN laporan ternak kambing (misal: salam, pertanyaan umum, obrolan biasa, atau menyebut hewan selain kambing), kembalikan JSON dengan field "bukan_laporan_ternak" bernilai true dan field "alasan" berisi penjelasan singkat.
3. Jangan mengarang informasi yang tidak ada dalam pesan.
4. Field "timestamp" dan "pengirim" TIDAK perlu diekstrak, keduanya diisi otomatis oleh sistem.
5. Pertahankan format tanggal persis seperti yang ditulis peternak.
`.trim();

const callWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`⚠️ Gemini API call failed (${error.message}). Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
};

const parseMessage = async (messageText, senderName) => {
  const prompt = buildPrompt(messageText, senderName);
  
  const result = await callWithRetry(() => model.generateContent(prompt));
  const rawText = result.response.text().trim();

  const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText);
};

module.exports = { parseMessage };

