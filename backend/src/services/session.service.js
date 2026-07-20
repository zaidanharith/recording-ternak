/**
 * Session Service — Menyimpan sesi percakapan user di tabel `session` (Postgres)
 *
 * Dipakai (bukan in-memory Map) karena backend dijalankan sebagai serverless
 * function di Vercel: request yang berdekatan waktu bisa mendarat di instance
 * lambda yang berbeda, jadi state harus dibagi lewat storage eksternal supaya
 * konsisten antar-instance.
 *
 * State yang mungkin:
 *  - 'awaiting_confirmation'  : laporan sudah di-parse, menunggu user konfirmasi ("ya/tidak")
 *  - 'awaiting_nomor_telinga' : laporan terdeteksi tapi nomor telinga kosong, menunggu input user
 *  - 'photo_staged'           : foto diterima sebelum ada laporan teks, menunggu laporan menyusul
 *
 * Sesi expired otomatis setelah TTL_MS (default: 10 menit).
 */

const prisma = require('../lib/prisma');

const TTL_MS = 10 * 60 * 1000; // 10 menit

const setSession = async (phone, state, data) => {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.session.upsert({
    where: { phone },
    create: { phone, state, data, expiresAt },
    update: { state, data, expiresAt },
  });
};

const getSession = async (phone) => {
  const session = await prisma.session.findUnique({ where: { phone } });
  if (!session) return null;

  if (Date.now() > session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { phone } }).catch(() => {});
    return null;
  }

  return session;
};

const clearSession = async (phone) => {
  await prisma.session.delete({ where: { phone } }).catch(() => {});
};

module.exports = { setSession, getSession, clearSession };
