/**
 * test_parser.js
 *
 * Script pengujian mandiri untuk memverifikasi parsing Gemini AI
 * dengan skema baru recording ternak kambing.
 *
 * Jalankan dengan: node scratch/test_parser.js
 */

require('dotenv').config();
const { parseMessage } = require('../src/services/gemini.service');

// ─── Kasus Uji ───────────────────────────────────────────────────────────────

const testCases = [
  {
    label: 'Laporan lengkap kawin & beranak',
    sender: 'Pak Budi (0812-3456-7890)',
    message:
      'Assalamualaikum, ini pak budi dari desa suka maju. ' +
      'Kambing saya no telinga A-023 sudah beranak tadi tanggal 28 Juni 2025. ' +
      'Anaknya 2, satu jantan satu betina. Ini perkawinan yang ke 3. ' +
      'Tanggal kawinnya dulu sekitar 5 Februari 2025. ' +
      'Rencananya mau dijual pas lebaran, target harga 3 juta.',
  },
  {
    label: 'Laporan singkat, hanya beranak',
    sender: 'Ibu Sari',
    message: 'Bu, kambing saya tag B12 beranak semalam 2 ekor betina semua. perkawinan pertama.',
  },
  {
    label: 'Bukan laporan kambing (sapi)',
    sender: 'Pak Rudi',
    message: 'Sapi saya sakit, mencret sudah 2 hari, tolong dibantu penanganannya.',
  },
  {
    label: 'Bukan laporan ternak (obrolan biasa)',
    sender: 'Anonim',
    message: 'Halo selamat pagi, jadwal pertemuan kelompok ternak kapan ya?',
  },
  {
    label: 'Laporan dengan status terjual',
    sender: 'Pak Joko',
    message:
      'Kambing etawa saya tag no C-07 sudah terjual 2.5 juta kemarin. ' +
      'Alamat saya di Desa Karang Asri RT 3 RW 1.',
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

const run = async () => {
  console.log(`\n${BOLD}${CYAN}=== Test Parser: Recording Ternak Kambing ===${RESET}\n`);

  for (let i = 0; i < testCases.length; i++) {
    const { label, sender, message } = testCases[i];
    console.log(`${BOLD}[${i + 1}] ${label}${RESET}`);
    console.log(`    Pengirim : ${sender}`);
    console.log(`    Pesan    : ${message.slice(0, 80)}${message.length > 80 ? '...' : ''}`);

    try {
      const result = await parseMessage(message, sender);

      if (result.bukan_laporan_ternak) {
        console.log(`    ${YELLOW}[BUKAN LAPORAN] ${result.alasan}${RESET}`);
      } else {
        console.log(`    ${GREEN}[OK] Berhasil diparse:${RESET}`);
        const keys = [
          'nama_peternak', 'nomor_telinga', 'alamat',
          'tanggal_kawin', 'tanggal_beranak',
          'jumlah_anak_jantan', 'jumlah_anak_betina',
          'perkawinan_ke', 'target_penjualan', 'terjual', 'catatan',
        ];
        for (const key of keys) {
          const val = result[key];
          if (val !== undefined) {
            const display = val === '-' ? `${YELLOW}-${RESET}` : `${GREEN}${val}${RESET}`;
            console.log(`       ${key.padEnd(22)}: ${display}`);
          }
        }
      }
    } catch (err) {
      console.log(`    ${RED}[ERROR] ${err.message}${RESET}`);
    }

    console.log();
  }

  console.log(`${BOLD}${CYAN}=== Selesai ===${RESET}\n`);
};

run();
