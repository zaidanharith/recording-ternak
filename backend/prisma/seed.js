require('dotenv').config();
const prisma = require('../src/lib/prisma');

const penyebabKematian = [
  'Penyakit',
  'Kecelakaan',
  'Usia Tua',
  'Keracunan',
  'Cuaca Ekstrem',
  'Tidak Diketahui',
];

async function main() {
  console.log('[Seed] Menambahkan data penyebab kematian...');
  for (const nama of penyebabKematian) {
    await prisma.penyebabKematian.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
  }
  console.log('[Seed] Selesai.');
}

main()
  .catch((error) => {
    console.error('[Seed] Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
