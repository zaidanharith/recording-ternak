/**
 * Session Service — Menyimpan sesi percakapan user di memori (in-memory)
 *
 * State yang mungkin:
 *  - 'awaiting_confirmation'  : laporan sudah di-parse, menunggu user konfirmasi ("ya/tidak")
 *  - 'awaiting_nomor_telinga' : laporan terdeteksi tapi nomor telinga kosong, menunggu input user
 *
 * Sesi expired otomatis setelah TTL_MS (default: 10 menit).
 */

const TTL_MS = 10 * 60 * 1000; // 10 menit

/** @type {Map<string, { state: string, data: object, expiresAt: number }>} */
const sessions = new Map();

const setSession = (phone, state, data) => {
  sessions.set(phone, {
    state,
    data,
    expiresAt: Date.now() + TTL_MS,
  });
};

const getSession = (phone) => {
  const session = sessions.get(phone);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(phone);
    return null;
  }

  return session;
};

const clearSession = (phone) => {
  sessions.delete(phone);
};

module.exports = { setSession, getSession, clearSession };
