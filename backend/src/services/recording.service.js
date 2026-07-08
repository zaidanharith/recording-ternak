const { parseMessage, generateChatReply, classifyMessageInConfirmation } = require('./gemini.service');
const { setSession, getSession, clearSession } = require('./session.service');
const { findOrCreateFarmer } = require('../repositories/farmer.repository');
const { findOrCreateGoat } = require('../repositories/goat.repository');
const { createRecording } = require('../repositories/recording.repository');
const { appendRecording, upsertKambing, upsertPeternak } = require('./sheets.service');
const { sendTextMessage } = require('./whatsapp.service');
const { isDataQuery, handleDataQuery } = require('./query.service');
const { verifySheetsConsistency } = require('./sync.service');
const { buildHistoryContext, logTurn, pruneHistory } = require('./chat-history.service');

const formatTimestamp = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ─── Fallback untuk pesan non-teks ────────────────────────────────────────────

const UNSUPPORTED_MESSAGE_TAGS = {
  image: '[image]',
  sticker: '[sticker]',
  video: '[video]',
  audio: '[audio]',
  document: '[document]',
  location: '[location]',
  contacts: '[contacts]',
};

const UNSUPPORTED_MESSAGE_REPLIES = {
  image: 'Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏 Boleh diketik ulang laporannya?',
  sticker: 'Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏 Boleh diketik ulang laporannya?',
  video: 'Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏 Boleh diketik ulang laporannya?',
  audio: 'Maaf, saya belum bisa mendengarkan pesan suara, Pak/Bu 🙏 Boleh diketik saja laporannya?',
};

const DEFAULT_UNSUPPORTED_REPLY = 'Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏';

const handleUnsupportedMessage = async (messageType, senderPhone, senderName) => {
  const tag = UNSUPPORTED_MESSAGE_TAGS[messageType] || `[${messageType}]`;
  const reply = UNSUPPORTED_MESSAGE_REPLIES[messageType] || DEFAULT_UNSUPPORTED_REPLY;

  await sendTextMessage(senderPhone, reply);
  logTurn(senderPhone, tag, reply).catch((err) =>
    console.error('❌ Gagal mencatat riwayat pesan unsupported:', err.message)
  );

  return { state: 'unsupported_message_type', type: messageType };
};

// ─── Deteksi konfirmasi / penolakan secara rule-based (tanpa AI) ─────────────

const KONFIRMASI_POSITIF = /^(ya|iya|yak|yoi|benar|betul|ok|oke|setuju|bener|lanjut|kirim|simpan|yup|yes)\b/i;
const KONFIRMASI_NEGATIF = /^(tidak|gak|nggak|ndak|bukan|salah|cancel|batal|ulang|ganti|no)\b/i;

const isKonfirmasiYa = (text) => KONFIRMASI_POSITIF.test(text.trim());
const isKonfirmasiTidak = (text) => KONFIRMASI_NEGATIF.test(text.trim());

// ─── Format pesan konfirmasi ringkasan ───────────────────────────────────────

const buildKonfirmasiMessage = (parsed, nomorTelinga, namaPeternak) => {
  const j = (val) => (val && val !== '-' ? val : '-');
  return [
    '📋 *Ringkasan laporan yang akan disimpan:*',
    '',
    `👤 Peternak: ${j(namaPeternak)}`,
    `🏷️ No. Telinga: ${j(nomorTelinga)}`,
    `💑 Tanggal Kawin: ${j(parsed.tanggal_kawin)}`,
    `🐣 Tanggal Beranak: ${j(parsed.tanggal_beranak)}`,
    `♂️ Anak Jantan: ${j(parsed.jumlah_anak_jantan)}  |  ♀️ Anak Betina: ${j(parsed.jumlah_anak_betina)}`,
    `🔢 Perkawinan Ke: ${j(parsed.perkawinan_ke)}`,
    `🎯 Target Jual: ${j(parsed.target_penjualan)}`,
    `💰 Terjual: ${j(parsed.terjual)}`,
    parsed.catatan && parsed.catatan !== '-' ? `📝 Catatan: ${parsed.catatan}` : null,
    '',
    'Apakah data di atas sudah benar?\nBalas *ya* untuk menyimpan, atau *tidak* untuk membatalkan.',
  ]
    .filter((l) => l !== null)
    .join('\n');
};

// ─── Format pesan sukses ──────────────────────────────────────────────────────

const buildSuksesMessage = (parsed, nomorTelinga, namaPeternak) => {
  return [
    '✅ *Data berhasil disimpan!*',
    '',
    `👤 Peternak: ${namaPeternak ?? '-'}`,
    `🏷️ No. Telinga: ${nomorTelinga ?? '-'}`,
    '',
    '_Data sudah tercatat di database dan Google Spreadsheet._',
  ].join('\n');
};

// ─── Simpan laporan yang sudah dikonfirmasi ke DB + Sheets ───────────────────

const saveReport = async (pendingData, peternak) => {
  const { parsed, nomorTelinga, photo } = pendingData;

  // Simpan ke database
  const kambing = await findOrCreateGoat(nomorTelinga, peternak.id);
  const recording = await createRecording({
    kambingId: kambing.id,
    pengirim: peternak.name,
    tanggal_kawin: parsed.tanggal_kawin,
    tanggal_beranak: parsed.tanggal_beranak,
    jumlah_anak_jantan: parsed.jumlah_anak_jantan,
    jumlah_anak_betina: parsed.jumlah_anak_betina,
    perkawinan_ke: parsed.perkawinan_ke,
    target_penjualan: parsed.target_penjualan,
    terjual: parsed.terjual,
    catatan: parsed.catatan,
    photoUrl: photo?.url,
    photoPublicId: photo?.publicId,
  });

  const timestamp = formatTimestamp();
  const terdaftar = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

  // Simpan ke 3 sheet Google Spreadsheet secara paralel
  await Promise.all([
    // Sheet Recording: satu baris per laporan
    appendRecording({
      timestamp,
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.name,
      tanggal_kawin: parsed.tanggal_kawin,
      tanggal_beranak: parsed.tanggal_beranak,
      jumlah_anak_jantan: parsed.jumlah_anak_jantan,
      jumlah_anak_betina: parsed.jumlah_anak_betina,
      perkawinan_ke: parsed.perkawinan_ke,
      target_penjualan: parsed.target_penjualan,
      terjual: parsed.terjual,
      catatan: parsed.catatan,
    }),
    // Sheet Kambing: upsert agar tidak duplikat
    upsertKambing({
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.name,
      whatsapp_phone: peternak.whatsappPhone,
      createdAt: terdaftar,
    }),
    // Sheet Peternak: upsert agar tidak duplikat
    upsertPeternak({
      nama: peternak.name,
      alamat: peternak.address,
      whatsapp_phone: peternak.whatsappPhone,
      createdAt: terdaftar,
    }),
  ]);

  // Jalankan verifikasi konsistensi secara async (tidak memblokir response ke user)
  verifySheetsConsistency().catch((err) =>
    console.error('❌ Consistency check error (non-critical):', err.message)
  );

  return { kambing, recording };
};

// ─── Entry point utama ────────────────────────────────────────────────────────

const handleMessage = async (messageText, senderPhone, senderName, photo = null) => {
  pruneHistory(senderPhone).catch((err) =>
    console.error('❌ Gagal membersihkan riwayat percakapan lama:', err.message)
  );

  let historyContext = '';
  try {
    historyContext = await buildHistoryContext(senderPhone);
  } catch (err) {
    console.error('❌ Gagal mengambil riwayat percakapan:', err.message);
  }

  const logReply = (reply) =>
    logTurn(senderPhone, messageText, reply).catch((err) =>
      console.error('❌ Gagal mencatat riwayat percakapan:', err.message)
    );

  const session = await getSession(senderPhone);
  const carriedPhoto = photo || session?.data?.photo || null;

  // ── State: awaiting_confirmation ─────────────────────────────────────────
  if (session?.state === 'awaiting_confirmation') {
    if (isKonfirmasiYa(messageText)) {
      const peternak = await findOrCreateFarmer(senderPhone, {
        nama: session.data.namaPeternak,
        alamat: session.data.parsed.alamat,
      });
      await clearSession(senderPhone);

      const { kambing } = await saveReport({ ...session.data, photo: carriedPhoto }, peternak);
      const reply = buildSuksesMessage(session.data.parsed, session.data.nomorTelinga, peternak.name);
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'saved', nomorTelinga: kambing.earTagNumber };
    }

    if (isKonfirmasiTidak(messageText)) {
      await clearSession(senderPhone);
      const reply = '❌ Laporan dibatalkan.\n\nSilakan kirim ulang laporan yang benar ya, Pak/Bu. 🙏';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'cancelled' };
    }

    // Pesan tidak jelas ya/tidak — cek apakah ini revisi, pembatalan tidak langsung, atau pertanyaan
    try {
      const classification = await classifyMessageInConfirmation(
        messageText,
        senderName,
        session.data,
        historyContext
      );

      if (classification.intent === 'PEMBATALAN') {
        await clearSession(senderPhone);
        const reply = '❌ Laporan dibatalkan.\n\nSilakan kirim ulang laporan yang benar ya, Pak/Bu. 🙏';
        await sendTextMessage(senderPhone, reply);
        logReply(reply);
        return { state: 'cancelled' };
      }

      if (classification.intent === 'REVISI') {
        // User mengirim revisi laporan — ganti data pending dengan yang baru
        const parsed = classification.parsed;
        const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
        const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
        const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-'
          ? parsed.nama_peternak
          : session.data.namaPeternak;

        if (!nomorTelinga) {
          // Revisi tanpa nomor telinga — tanya nomor telinga
          await clearSession(senderPhone);
          await setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak, photo: carriedPhoto });
          const reply = `Baik, laporan diperbarui 🔄\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`;
          await sendTextMessage(senderPhone, reply);
          logReply(reply);
          return { state: 'awaiting_nomor_telinga' };
        }

        // Revisi lengkap — tampilkan konfirmasi baru
        const newSessionData = { parsed, nomorTelinga, namaPeternak, photo: carriedPhoto };
        await clearSession(senderPhone);
        await setSession(senderPhone, 'awaiting_confirmation', newSessionData);
        const summary = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
        const reply = `🔄 *Laporan diperbarui. Berikut ringkasan terbaru:*\n\n${summary}`;
        await sendTextMessage(senderPhone, reply);
        logReply(reply);
        return { state: 'awaiting_confirmation' };
      }

      // PERTANYAAN — jawab pertanyaan/obrolan, pertahankan sesi konfirmasi
      const chatReply = await generateChatReply(
        messageText,
        senderName,
        'User masih punya laporan yang menunggu konfirmasi. Setelah menjawab, ingatkan user untuk membalas ya/tidak untuk laporannya.',
        historyContext
      );
      await sendTextMessage(senderPhone, chatReply);
      logReply(chatReply);
      return { state: 'chat_while_pending' };
    } catch (err) {
      console.error('❌ Error classifying message in confirmation:', err);
      // Fallback — ingatkan user
      const reply = 'Mohon balas *ya* untuk menyimpan laporan, atau *tidak* untuk membatalkan. 🙏';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'waiting_clarification' };
    }
  }

  // ── State: awaiting_nomor_telinga ─────────────────────────────────────────
  if (session?.state === 'awaiting_nomor_telinga') {
    const nomorTelinga = messageText.replace(/\D/g, ''); // Ambil hanya angka bulat
    if (!nomorTelinga) {
      const reply = 'Mohon masukkan nomor telinga kambing berupa angka bulat saja ya, Pak/Bu.\n_(Contoh: 12, 105)_';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'waiting_nomor_telinga' };
    }

    // Update sesi dengan nomor telinga dan lanjut ke konfirmasi
    const updatedData = { ...session.data, nomorTelinga, photo: carriedPhoto };
    await clearSession(senderPhone);
    await setSession(senderPhone, 'awaiting_confirmation', updatedData);

    const reply = buildKonfirmasiMessage(session.data.parsed, nomorTelinga, session.data.namaPeternak);
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'awaiting_confirmation' };
  }

  // ── Tidak ada sesi aktif — proses pesan baru dengan AI ───────────────────
  let parsed;
  try {
    parsed = await parseMessage(messageText, senderName, historyContext);
  } catch (err) {
    console.error('❌ Gagal parsing pesan:', err);
    const reply = 'Maaf, sistem sedang gangguan. Silakan coba lagi beberapa menit lagi ya, Pak/Bu. 🙏';
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'error' };
  }

  // Bukan laporan ternak — cek apakah ini pertanyaan tentang data
  if (parsed.bukan_laporan_ternak) {
    if (isDataQuery(messageText)) {
      // Ada kata kunci data/ternak → query DB dan jawab
      try {
        const dataReply = await handleDataQuery(messageText, senderPhone, senderName, historyContext);
        await sendTextMessage(senderPhone, dataReply);
        logReply(dataReply);
        return { state: 'data_query_replied' };
      } catch (err) {
        console.error('❌ Gagal menangani data query:', err);
        // Fallback ke chat reply biasa
      }
    }

    // Pesan umum/obrolan → balas dengan chat ramah
    let reply;
    try {
      reply = await generateChatReply(messageText, senderName, null, historyContext);
    } catch {
      reply = 'Halo! Ada yang bisa saya bantu? Silakan kirim laporan ternak kambing Anda ya, Pak/Bu. 🐐';
    }
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'chat_replied' };
  }

  // Laporan ternak — cek nomor telinga
  const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
  const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
  const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-' ? parsed.nama_peternak : senderName;

  if (!nomorTelinga) {
    // Nomor telinga tidak disebutkan — tanya dulu tanpa AI
    await setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak, photo: carriedPhoto });
    const reply = `Terima kasih laporan dari *${namaPeternak}* 🙏\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`;
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'awaiting_nomor_telinga' };
  }

  // Semua data cukup — kirim ringkasan konfirmasi
  await setSession(senderPhone, 'awaiting_confirmation', { parsed, nomorTelinga, namaPeternak, photo: carriedPhoto });
  const reply = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
  await sendTextMessage(senderPhone, reply);
  logReply(reply);
  return { state: 'awaiting_confirmation' };
};

module.exports = { handleMessage, handleUnsupportedMessage };
