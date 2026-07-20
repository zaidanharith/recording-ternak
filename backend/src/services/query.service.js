const { generateDataAnswer } = require('./gemini.service');
const { getFarmerByPhone, searchFarmerByName } = require('../repositories/farmer.repository');
const { getAllDataForQuery } = require('../repositories/recording.repository');

// ─── Rule-based detection — tidak butuh AI ───────────────────────────────────

const DATA_QUERY_PATTERN = /\b(berapa|data|laporan|daftar|rekap|total|jumlah|kapan|kawin|beranak|anak|lahir|kambing|ternak|terjual|belum terjual|punya|milik|peternak)\b/i;

const isDataQuery = (text) => DATA_QUERY_PATTERN.test(text);

// ─── Ringkas data DB agar token Gemini minimal ────────────────────────────────

const summarizeData = (allPeternak) => {
  return allPeternak.map((p) => ({
    peternak: p.name,
    wa: p.whatsappPhone,
    desa: p.desa,
    dusun: p.dusun,
    rt: p.rt,
    rw: p.rw,
    kambing: p.goats.map((k) => {
      const latest = k.recordings[0] || null;
      return {
        no_telinga: k.earTagNumber,
        total_recording: k.recordings.length,
        terakhir: latest
          ? {
              tgl_kawin: latest.matingDate,
              tgl_beranak: latest.birthDate,
              anak_jantan: latest.maleKidCount,
              anak_betina: latest.femaleKidCount,
              perkawinan_ke: latest.matingNumber,
              terjual: latest.sold,
              catatan: latest.notes,
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
    const results = await searchFarmerByName(mentionedName);
    if (results.length > 0) {
      queryData = summarizeData(results);
    } else {
      // Tidak ditemukan → fallback ke data semua
      const allData = await getAllDataForQuery();
      queryData = summarizeData(allData);
    }
  } else {
    // Tidak ada nama spesifik → ambil data peternak pengirim + semua data
    const senderData = await getFarmerByPhone(senderPhone);
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
