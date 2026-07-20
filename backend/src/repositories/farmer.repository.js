const prisma = require('../lib/prisma');

/**
 * Cari peternak berdasarkan nomor WhatsApp.
 * Jika belum ada, buat peternak baru.
 */
const findOrCreateFarmer = async (whatsappPhone, { nama }) => {
  const existing = await prisma.farmer.findUnique({
    where: { whatsappPhone },
  });

  if (existing) {
    // Perbarui nama jika ada info baru
    const updateData = {};
    if (nama && nama !== '-' && nama !== existing.name) updateData.name = nama;

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
    },
  });
};

/**
 * Ambil nama peternak terdaftar berdasarkan nomor WhatsApp.
 * Dipakai untuk menyapa/merujuk peternak dengan nama dari database,
 * bukan nama profil WhatsApp yang tidak bisa diandalkan.
 */
const getFarmerNameByPhone = async (whatsappPhone) => {
  return await prisma.farmer.findUnique({
    where: { whatsappPhone },
    select: { name: true },
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

const listFarmers = async ({ search, page, limit }) => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { whatsappPhone: { contains: search } },
        ],
      }
    : {};

  const [farmers, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.farmer.count({ where }),
  ]);

  return { farmers, total };
};

const findFarmerById = async (id) => {
  return await prisma.farmer.findUnique({
    where: { id },
    include: { goats: true },
  });
};

const createFarmer = async ({ name, desa, dusun, rt, rw, whatsappPhone }) => {
  return await prisma.farmer.create({
    data: {
      name,
      desa: desa || 'Besuki',
      dusun: dusun || '-',
      rt: rt || '-',
      rw: rw || '-',
      whatsappPhone,
    },
  });
};

const updateFarmer = async (id, data) => {
  return await prisma.farmer.update({ where: { id }, data });
};

const deleteFarmer = async (id) => {
  return await prisma.farmer.delete({ where: { id } });
};

const listFarmersNotReported = async (days) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await prisma.farmer.findMany({
    where: {
      goats: { none: { recordings: { some: { createdAt: { gte: cutoff } } } } },
    },
    include: { goats: true },
    orderBy: { name: 'asc' },
  });
};

const FARMER_EXPORT_SORT_MAP = {
  name: (dir) => ({ name: dir }),
  whatsappPhone: (dir) => ({ whatsappPhone: dir }),
  desa: (dir) => ({ desa: dir }),
};

const exportFarmers = async ({ search, sortBy, sortDir }) => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { whatsappPhone: { contains: search } },
        ],
      }
    : {};

  return await prisma.farmer.findMany({
    where,
    orderBy: FARMER_EXPORT_SORT_MAP[sortBy](sortDir),
    take: 5000,
  });
};

module.exports = {
  findOrCreateFarmer,
  getFarmerNameByPhone,
  getFarmerByPhone,
  searchFarmerByName,
  listFarmers,
  findFarmerById,
  createFarmer,
  updateFarmer,
  deleteFarmer,
  listFarmersNotReported,
  exportFarmers,
};
