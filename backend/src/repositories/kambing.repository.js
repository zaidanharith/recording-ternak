const prisma = require('../lib/prisma');

const findOrCreateKambing = async (nomorTelinga, data) => {
  let cleanNomorTelinga = (nomorTelinga || '-').trim();

  // Jika nomor telinga tidak didefinisikan (-), buat ID unik buatan agar tidak melanggar unique constraint di DB
  if (cleanNomorTelinga === '-') {
    cleanNomorTelinga = `NON-TAG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  // Coba cari kambing berdasarkan nomor telinga (jika bukan non-tag)
  if (!cleanNomorTelinga.startsWith('NON-TAG-')) {
    const existing = await prisma.kambing.findUnique({
      where: { nomor_telinga: cleanNomorTelinga }
    });

    if (existing) {
      // Update alamat dan nama peternak jika ada perubahan data baru
      return await prisma.kambing.update({
        where: { id: existing.id },
        data: {
          nama_peternak: data.nama_peternak || existing.nama_peternak,
          alamat: data.alamat && data.alamat !== '-' ? data.alamat : existing.alamat
        }
      });
    }
  }

  // Jika tidak ditemukan atau non-tag, buat baru
  return await prisma.kambing.create({
    data: {
      nomor_telinga: cleanNomorTelinga,
      nama_peternak: data.nama_peternak || 'Tanpa Nama',
      alamat: data.alamat || '-'
    }
  });
};

const getKambingById = async (id) => {
  return await prisma.kambing.findUnique({
    where: { id }
  });
};

module.exports = {
  findOrCreateKambing,
  getKambingById
};
