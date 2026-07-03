const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const parserModel = genAI.getGenerativeModel({ model: config.gemini.model });

// Model ringan untuk chat reply non-laporan (hemat token)
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: { maxOutputTokens: 200 },
});

// Daftar field yang perlu diekstrak AI dari pesan peternak
const PARSE_FIELDS = config.dataSchema.aiParseFields
  .map((col) => `- "${col.key}": ${col.description}`)
  .join('\n');

/**
 * Parse pesan peternak untuk mengekstrak data laporan ternak.
 * Kembalikan JSON dengan field data ternak, atau { bukan_laporan_ternak: true }.
 */
const parseMessage = async (messageText, senderName) => {
  const prompt = `Kamu adalah sistem pencatat data ternak KAMBING.
Pengirim: ${senderName}
Pesan: "${messageText}"

Ekstrak data berikut, kembalikan HANYA JSON (tanpa markdown):
${PARSE_FIELDS}

Aturan:
1. Field tidak disebutkan → isi "-"
2. Bukan laporan kambing (salam, pertanyaan, obrolan) → { "bukan_laporan_ternak": true }
3. Jangan mengarang informasi
4. "timestamp" dan "pengirim" JANGAN diisi, diurus sistem`;

  const result = await callWithRetry(() => parserModel.generateContent(prompt));
  const rawText = result.response.text().trim();
  const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText);
};

/**
 * Buat balasan ramah untuk pesan non-laporan.
 * Hemat token: model ringan, output pendek.
 */
const generateChatReply = async (messageText, senderName) => {
  const prompt = `Kamu asisten WhatsApp kelompok peternak kambing di Jawa Timur.
Balas pesan berikut dengan ramah, singkat, bahasa Indonesia yang mudah dipahami peternak desa.
Jika ada campuran bahasa Jawa, tetap balas bahasa Indonesia.
Nama pengirim: ${senderName}
Pesan: "${messageText}"
Balas maksimal 3 kalimat pendek.`;

  const result = await callWithRetry(() => chatModel.generateContent(prompt));
  return result.response.text().trim();
};

const callWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`⚠️ Gemini API gagal (${error.message}). Mencoba ulang dalam ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
};

module.exports = { parseMessage, generateChatReply };
