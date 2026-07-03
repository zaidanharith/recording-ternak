const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const parserModel = genAI.getGenerativeModel({ model: config.gemini.model });

// Model ringan untuk chat reply non-laporan (hemat token)
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: { maxOutputTokens: 250 },
});

// Daftar field yang perlu diekstrak AI dari pesan peternak
const PARSE_FIELDS = config.dataSchema.aiParseFields
  .map((col) => `- "${col.key}": ${col.description}`)
  .join('\n');

// Ambil tanggal hari ini dalam format yang dipahami AI
const getTodayContext = () => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Parse pesan peternak untuk mengekstrak data laporan ternak.
 * Kembalikan JSON dengan field data ternak, atau { bukan_laporan_ternak: true }.
 */
const parseMessage = async (messageText, senderName) => {
  const todayContext = getTodayContext();

  const prompt = `Kamu adalah sistem pencatat data ternak KAMBING.
Hari ini: ${todayContext}
Pengirim: ${senderName}
Pesan: "${messageText}"

Ekstrak data berikut, kembalikan HANYA JSON (tanpa markdown):
${PARSE_FIELDS}

Aturan:
1. Field tidak disebutkan → isi "-"
2. Bukan laporan kambing (salam, pertanyaan, obrolan) → { "bukan_laporan_ternak": true }
3. Jangan mengarang informasi
4. "timestamp" dan "pengirim" JANGAN diisi, diurus sistem
5. TANGGAL: Normalisasi SEMUA tanggal ke format DD/MM/YYYY. Gunakan konteks hari ini untuk menentukan tahun/bulan yang dimaksud (misal "kemarin", "12 februari", "minggu lalu"). Jika tahun tidak disebutkan, gunakan tahun saat ini. Jika tidak dapat ditentukan sama sekali, isi "-".`;

  const result = await callWithRetry(() => parserModel.generateContent(prompt));
  const rawText = result.response.text().trim();
  const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText);
};

/**
 * Tentukan apakah pesan saat ini merupakan laporan baru/revisi laporan,
 * atau sekadar obrolan, saat user ada di sesi awaiting_confirmation.
 *
 * Mengembalikan:
 *   { isRevisi: true, parsed } — jika pesan mengandung data laporan
 *   { isRevisi: false }       — jika pesan hanya obrolan biasa
 */
const classifyMessageInConfirmation = async (messageText, senderName, existingData) => {
  const todayContext = getTodayContext();

  const prompt = `Kamu sistem pencatat data ternak KAMBING.
Hari ini: ${todayContext}
Pengirim: ${senderName}

User baru saja menerima ringkasan laporan kambing dan mengirim pesan baru.
Pesan baru: "${messageText}"

Tentukan apakah pesan ini:
A) Merupakan laporan/revisi baru (mengandung data ternak: nomor telinga, tanggal, jumlah anak, dll)
B) Hanya pertanyaan atau obrolan biasa (tidak ada data ternak)

Jika A, ekstrak datanya ke JSON dengan field sama seperti laporan normal.
Jika B, kembalikan: { "bukan_laporan_ternak": true }

TANGGAL: Normalisasi ke format DD/MM/YYYY. Gunakan tahun saat ini jika tidak disebutkan.
Kembalikan HANYA JSON (tanpa markdown).`;

  const result = await callWithRetry(() => parserModel.generateContent(prompt));
  const rawText = result.response.text().trim();
  const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(jsonText);

  if (parsed.bukan_laporan_ternak) return { isRevisi: false };
  return { isRevisi: true, parsed };
};

/**
 * Buat balasan ramah untuk pesan non-laporan.
 * Hemat token: model ringan, output pendek.
 */
const generateChatReply = async (messageText, senderName, context = null) => {
  const contextInfo = context
    ? `\nKonteks tambahan: ${context}`
    : '';

  const prompt = `Kamu asisten WhatsApp kelompok peternak kambing di Jawa Timur.
Balas pesan berikut dengan ramah, singkat, bahasa Indonesia yang mudah dipahami peternak desa.
Jika ada campuran bahasa Jawa, tetap balas bahasa Indonesia.
Nama pengirim: ${senderName}
Pesan: "${messageText}"${contextInfo}
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

/**
 * Jawab pertanyaan user berdasarkan data dari database.
 * Data dikirim sebagai JSON ringkas agar token minimal.
 */
const generateDataAnswer = async (messageText, dbDataJson, senderName) => {
  const prompt = `Kamu asisten WhatsApp kelompok peternak kambing di Jawa Timur.
Jawab pertanyaan peternak berdasarkan DATA TERNAK di bawah ini.
Bahasa: Indonesia sederhana, mudah dipahami peternak desa.
Pengirim: ${senderName}
Pertanyaan: "${messageText}"

DATA TERNAK (JSON):
${JSON.stringify(dbDataJson, null, 0)}

Aturan:
- Jawab HANYA berdasarkan data yang ada
- Jika data tidak ditemukan, katakan dengan sopan
- Maksimal 5 kalimat singkat
- Jika ada campuran bahasa Jawa dalam pertanyaan, tetap balas bahasa Indonesia`;

  const result = await callWithRetry(() => chatModel.generateContent(prompt));
  return result.response.text().trim();
};

module.exports = { parseMessage, generateChatReply, classifyMessageInConfirmation, generateDataAnswer };
