const { generateDataAnswer } = require('./gemini.service');
const { getPeternakByPhone, searchPeternakByName } = require('../repositories/peternak.repository');
const { getAllDataForQuery } = require('../repositories/recording.repository');

// ─── Rule-based detection — tidak butuh AI ───────────────────────────────────

const DATA_QUERY_PATTERN = /\b(berapa|data|laporan|daftar|rekap|total|jumlah|kapan|kawin|beranak|anak|lahir|kambing|ternak|terjual|belum terjual|punya|milik|peternak)\b/i;

const isDataQuery = (text) => DATA_QUERY_PATTERN.test(text);

// ─── Ringkas data DB agar token Gemini minimal ────────────────────────────────

const summarizeData = (allPeternak) => {
  return allPeternak.map((p) => ({
    peternak: p.nama,
    wa: p.whatsapp_phone,
    alamat: p.alamat,
    kambing: p.kambing.map((k) => {
      const latest = k.recordings[0] || null;
      return {
        no_telinga: k.nomor_telinga,
        total_recording: k.recordings.length,
        terakhir: latest
          ? {
              tgl_kawin: latest.tanggal_kawin,
              tgl_beranak: latest.tanggal_beranak,
              anak_jantan: latest.jumlah_anak_jantan,
              anak_betina: latest.jumlah_anak_betina,
              perkawinan_ke: latest.perkawinan_ke,
              terjual: latest.terjual,
              catatan: latest.catatan,
            }
          : null,
      };
    }),
  }));
};

// ─── Deteksi apakah ada nama peternak yang disebut di pesan ──────────────────

const extractMentionedName = (text) => {
  // Cari pola: "pak X", "bu X", "bapak X", "ibu X"
  const match = text.match(/\b(?:pak|bapak|bu|ibu)\s+([a-zA-Z]+)/i);
  return match ? match[1] : null;
};

// ─── Entry point utama ────────────────────────────────────────────────────────

const handleDataQuery = async (messageText, senderPhone, senderName, historyContext = '') => {
  let queryData;

  const mentionedName = extractMentionedName(messageText);

  if (mentionedName) {
    // Ada nama spesifik yang disebut → cari data peternak tersebut
    const results = await searchPeternakByName(mentionedName);
    if (results.length > 0) {
      queryData = summarizeData(results);
    } else {
      // Tidak ditemukan → fallback ke data semua
      const allData = await getAllDataForQuery();
      queryData = summarizeData(allData);
    }
  } else {
    // Tidak ada nama spesifik → ambil data peternak pengirim + semua data
    const senderData = await getPeternakByPhone(senderPhone);
    if (senderData) {
      // Prioritaskan data milik pengirim, tambahkan ringkasan semua peternak
      const allData = await getAllDataForQuery();
      queryData = summarizeData(allData);
    } else {
      const allData = await getAllDataForQuery();
      queryData = summarizeData(allData);
    }
  }

  return await generateDataAnswer(messageText, queryData, senderName, historyContext);
};

module.exports = { isDataQuery, handleDataQuery };
