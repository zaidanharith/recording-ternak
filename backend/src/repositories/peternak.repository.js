const prisma = require('../lib/prisma');

/**
 * Cari peternak berdasarkan nomor WhatsApp.
 * Jika belum ada, buat peternak baru.
 */
const findOrCreatePeternak = async (whatsappPhone, { nama, alamat }) => {
  const existing = await prisma.peternak.findUnique({
    where: { whatsapp_phone: whatsappPhone },
  });

  if (existing) {
    // Perbarui nama & alamat jika ada info baru
    const updateData = {};
    if (nama && nama !== '-' && nama !== existing.nama) updateData.nama = nama;
    if (alamat && alamat !== '-' && alamat !== existing.alamat) updateData.alamat = alamat;

    if (Object.keys(updateData).length > 0) {
      return await prisma.peternak.update({
        where: { id: existing.id },
        data: updateData,
      });
    }
    return existing;
  }

  return await prisma.peternak.create({
    data: {
      whatsapp_phone: whatsappPhone,
      nama: nama && nama !== '-' ? nama : 'Tanpa Nama',
      alamat: alamat && alamat !== '-' ? alamat : '-',
    },
  });
};

/**
 * Ambil peternak berdasarkan nomor WhatsApp.
 */
const getPeternakByPhone = async (whatsappPhone) => {
  return await prisma.peternak.findUnique({
    where: { whatsapp_phone: whatsappPhone },
    include: { kambing: true },
  });
};

/**
 * Cari peternak berdasarkan nama sebagian (case-insensitive).
 */
const searchPeternakByName = async (namaParsial) => {
  return await prisma.peternak.findMany({
    where: {
      nama: { contains: namaParsial, mode: 'insensitive' },
    },
    include: {
      kambing: {
        include: {
          recordings: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

module.exports = {
  findOrCreatePeternak,
  getPeternakByPhone,
  searchPeternakByName,
};
