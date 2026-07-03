const { parseMessage, generateChatReply, classifyMessageInConfirmation } = require('./gemini.service');
const { setSession, getSession, clearSession } = require('./session.service');
const { findOrCreatePeternak } = require('../repositories/peternak.repository');
const { findOrCreateKambing } = require('../repositories/kambing.repository');
const { createRecording } = require('../repositories/recording.repository');
const { appendRecording, upsertKambing, upsertPeternak } = require('./sheets.service');
const { sendTextMessage } = require('./whatsapp.service');
const { isDataQuery, handleDataQuery } = require('./query.service');
const { verifySheetsConsistency } = require('./sync.service');

const formatTimestamp = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  const { parsed, nomorTelinga } = pendingData;

  // Simpan ke database
  const kambing = await findOrCreateKambing(nomorTelinga, peternak.id);
  const recording = await createRecording({
    kambingId: kambing.id,
    pengirim: peternak.nama,
    tanggal_kawin: parsed.tanggal_kawin,
    tanggal_beranak: parsed.tanggal_beranak,
    jumlah_anak_jantan: parsed.jumlah_anak_jantan,
    jumlah_anak_betina: parsed.jumlah_anak_betina,
    perkawinan_ke: parsed.perkawinan_ke,
    target_penjualan: parsed.target_penjualan,
    terjual: parsed.terjual,
    catatan: parsed.catatan,
  });

  const timestamp = formatTimestamp();
  const terdaftar = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

  // Simpan ke 3 sheet Google Spreadsheet secara paralel
  await Promise.all([
    // Sheet Recording: satu baris per laporan
    appendRecording({
      timestamp,
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.nama,
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
      nama_peternak: peternak.nama,
      whatsapp_phone: peternak.whatsapp_phone,
      createdAt: terdaftar,
    }),
    // Sheet Peternak: upsert agar tidak duplikat
    upsertPeternak({
      nama: peternak.nama,
      alamat: peternak.alamat,
      whatsapp_phone: peternak.whatsapp_phone,
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

const handleMessage = async (messageText, senderPhone, senderName) => {
  const session = getSession(senderPhone);

  // ── State: awaiting_confirmation ─────────────────────────────────────────
  if (session?.state === 'awaiting_confirmation') {
    if (isKonfirmasiYa(messageText)) {
      const peternak = await findOrCreatePeternak(senderPhone, {
        nama: session.data.namaPeternak,
        alamat: session.data.parsed.alamat,
      });
      clearSession(senderPhone);

      const { kambing } = await saveReport(session.data, peternak);
      const reply = buildSuksesMessage(session.data.parsed, session.data.nomorTelinga, peternak.nama);
      await sendTextMessage(senderPhone, reply);
      return { state: 'saved', nomorTelinga: kambing.nomor_telinga };
    }

    if (isKonfirmasiTidak(messageText)) {
      clearSession(senderPhone);
      await sendTextMessage(
        senderPhone,
        '❌ Laporan dibatalkan.\n\nSilakan kirim ulang laporan yang benar ya, Pak/Bu. 🙏'
      );
      return { state: 'cancelled' };
    }

    // Pesan tidak jelas ya/tidak — cek apakah ini revisi laporan atau pertanyaan biasa
    try {
      const classification = await classifyMessageInConfirmation(messageText, senderName, session.data);

      if (classification.isRevisi) {
        // User mengirim revisi laporan — ganti data pending dengan yang baru
        const parsed = classification.parsed;
        const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
        const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
        const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-'
          ? parsed.nama_peternak
          : session.data.namaPeternak;

        if (!nomorTelinga) {
          // Revisi tanpa nomor telinga — tanya nomor telinga
          clearSession(senderPhone);
          setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak });
          await sendTextMessage(
            senderPhone,
            `Baik, laporan diperbarui 🔄\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`
          );
          return { state: 'awaiting_nomor_telinga' };
        }

        // Revisi lengkap — tampilkan konfirmasi baru
        const newSessionData = { parsed, nomorTelinga, namaPeternak };
        clearSession(senderPhone);
        setSession(senderPhone, 'awaiting_confirmation', newSessionData);
        const reply = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
        await sendTextMessage(
          senderPhone,
          `🔄 *Laporan diperbarui. Berikut ringkasan terbaru:*\n\n${reply}`
        );
        return { state: 'awaiting_confirmation' };
      }

      // Bukan revisi — jawab pertanyaan/obrolan, pertahankan sesi konfirmasi
      const chatReply = await generateChatReply(
        messageText,
        senderName,
        'User masih punya laporan yang menunggu konfirmasi. Setelah menjawab, ingatkan user untuk membalas ya/tidak untuk laporannya.'
      );
      await sendTextMessage(senderPhone, chatReply);
      return { state: 'chat_while_pending' };
    } catch (err) {
      console.error('❌ Error classifying message in confirmation:', err);
      // Fallback — ingatkan user
      await sendTextMessage(
        senderPhone,
        'Mohon balas *ya* untuk menyimpan laporan, atau *tidak* untuk membatalkan. 🙏'
      );
      return { state: 'waiting_clarification' };
    }
  }

  // ── State: awaiting_nomor_telinga ─────────────────────────────────────────
  if (session?.state === 'awaiting_nomor_telinga') {
    const nomorTelinga = messageText.replace(/\D/g, ''); // Ambil hanya angka bulat
    if (!nomorTelinga) {
      await sendTextMessage(
        senderPhone,
        'Mohon masukkan nomor telinga kambing berupa angka bulat saja ya, Pak/Bu.\n_(Contoh: 12, 105)_'
      );
      return { state: 'waiting_nomor_telinga' };
    }

    // Update sesi dengan nomor telinga dan lanjut ke konfirmasi
    const updatedData = { ...session.data, nomorTelinga };
    clearSession(senderPhone);
    setSession(senderPhone, 'awaiting_confirmation', updatedData);

    const reply = buildKonfirmasiMessage(session.data.parsed, nomorTelinga, session.data.namaPeternak);
    await sendTextMessage(senderPhone, reply);
    return { state: 'awaiting_confirmation' };
  }

  // ── Tidak ada sesi aktif — proses pesan baru dengan AI ───────────────────
  let parsed;
  try {
    parsed = await parseMessage(messageText, senderName);
  } catch (err) {
    console.error('❌ Gagal parsing pesan:', err);
    await sendTextMessage(
      senderPhone,
      'Maaf, sistem sedang gangguan. Silakan coba lagi beberapa menit lagi ya, Pak/Bu. 🙏'
    );
    return { state: 'error' };
  }

  // Bukan laporan ternak — cek apakah ini pertanyaan tentang data
  if (parsed.bukan_laporan_ternak) {
    if (isDataQuery(messageText)) {
      // Ada kata kunci data/ternak → query DB dan jawab
      try {
        const dataReply = await handleDataQuery(messageText, senderPhone, senderName);
        await sendTextMessage(senderPhone, dataReply);
        return { state: 'data_query_replied' };
      } catch (err) {
        console.error('❌ Gagal menangani data query:', err);
        // Fallback ke chat reply biasa
      }
    }

    // Pesan umum/obrolan → balas dengan chat ramah
    let reply;
    try {
      reply = await generateChatReply(messageText, senderName);
    } catch {
      reply = 'Halo! Ada yang bisa saya bantu? Silakan kirim laporan ternak kambing Anda ya, Pak/Bu. 🐐';
    }
    await sendTextMessage(senderPhone, reply);
    return { state: 'chat_replied' };
  }

  // Laporan ternak — cek nomor telinga
  const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
  const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
  const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-' ? parsed.nama_peternak : senderName;

  if (!nomorTelinga) {
    // Nomor telinga tidak disebutkan — tanya dulu tanpa AI
    setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak });
    await sendTextMessage(
      senderPhone,
      `Terima kasih laporan dari *${namaPeternak}* 🙏\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`
    );
    return { state: 'awaiting_nomor_telinga' };
  }

  // Semua data cukup — kirim ringkasan konfirmasi
  setSession(senderPhone, 'awaiting_confirmation', { parsed, nomorTelinga, namaPeternak });
  const reply = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
  await sendTextMessage(senderPhone, reply);
  return { state: 'awaiting_confirmation' };
};

module.exports = { handleMessage };
