const prisma = require('../lib/prisma');

/**
 * Cari peternak berdasarkan nomor WhatsApp.
 * Jika belum ada, buat peternak baru.
 */
const findOrCreateFarmer = async (whatsappPhone, { nama, alamat }) => {
  const existing = await prisma.farmer.findUnique({
    where: { whatsappPhone },
  });

  if (existing) {
    // Perbarui nama & alamat jika ada info baru
    const updateData = {};
    if (nama && nama !== '-' && nama !== existing.name) updateData.name = nama;
    if (alamat && alamat !== '-' && alamat !== existing.address) updateData.address = alamat;

    if (Object.keys(updateData).length > 0) {
      return await prisma.farmer.update({
        where: { id: existing.id },
        data: updateData,
      });
    }
    return existing;
  }

  return await prisma.farmer.create({
    data: {
      whatsappPhone,
      name: nama && nama !== '-' ? nama : 'Tanpa Nama',
      address: alamat && alamat !== '-' ? alamat : '-',
    },
  });
};

/**
 * Ambil peternak berdasarkan nomor WhatsApp.
 */
const getFarmerByPhone = async (whatsappPhone) => {
  return await prisma.farmer.findUnique({
    where: { whatsappPhone },
    include: { goats: true },
  });
};

/**
 * Cari peternak berdasarkan nama sebagian (case-insensitive).
 */
const searchFarmerByName = async (namaParsial) => {
  return await prisma.farmer.findMany({
    where: {
      name: { contains: namaParsial, mode: 'insensitive' },
    },
    include: {
      goats: {
        include: {
          recordings: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

module.exports = {
  findOrCreateFarmer,
  getFarmerByPhone,
  searchFarmerByName,
};
