# Export Excel/PDF untuk Recording, Kambing, Peternak

## Konteks

Stakeholder desa (Bumdes, admin) butuh cara mengunduh data recording, kambing, dan peternak sebagai file Excel atau PDF untuk dibagikan/diarsipkan di luar dashboard. Saat ini tidak ada fitur export sama sekali.

## Tujuan

Tiap halaman (Recording, Kambing, Peternak) punya tombol "Export" yang membuka dialog untuk memilih filter, urutan data, dan format file (Excel atau PDF), lalu mengunduh file hasil generate dari backend.

## Alur

1. User klik tombol "Export" di halaman.
2. Dialog terbuka: user isi filter (independen dari filter/sort tabel utama) dan memilih format (Excel atau PDF).
3. User klik "Export" di dialog.
4. Frontend memanggil endpoint export dengan query params sesuai filter, `responseType: "blob"`.
5. Backend mengambil seluruh data yang cocok (tanpa pagination, dibatasi cap 5000 baris), generate file Excel/PDF, kirim sebagai attachment.
6. Frontend menerima blob, memicu unduhan file otomatis di browser.

## Akses

Tombol Export tampil untuk semua role yang login (SUPERADMIN, ADMIN, VIEWER) — ini aksi read-only, tidak mengubah data. Endpoint backend cukup dilindungi middleware auth biasa, tanpa role-gating tambahan.

## Backend

### Dependency baru

- `exceljs` — generate file Excel (`.xlsx`)
- `pdfmake` — generate file PDF

Dipilih karena pure-JS, tanpa binary eksternal (beda dengan puppeteer), cocok untuk serverless function di Vercel.

### Asset

Copy `frontend/public/logo-bumdes.png` ke `backend/src/assets/logo-bumdes.png` untuk dipakai sebagai kop PDF.

### Endpoint baru

Didaftarkan di route file masing-masing, **sebelum** route `/:id` agar tidak bentrok:

- `GET /api/recordings/export`
  - Query: `format` (`xlsx`|`pdf`, wajib), `status` (`PERLU_REVIEW`|`FINAL`), `sold` (`YA`|`TIDAK`), `condition` (`SEHAT`|`SAKIT`), `source` (`WA`|`MANUAL`), `startDate`, `endDate` (rentang `recordingDate`, format `YYYY-MM-DD`), `sortBy` (`goat`|`farmer`|`birthDate`|`source`|`status`, default `birthDate`), `sortDir` (`asc`|`desc`, default `desc`)
- `GET /api/goats/export`
  - Query: `format`, `farmerId`, `startDate`, `endDate` (rentang `createdAt`), `sortBy` (`earTagNumber`|`farmer`|`createdAt`, default `createdAt`), `sortDir`
- `GET /api/farmers/export`
  - Query: `format`, `search`, `sortBy` (`name`|`whatsappPhone`|`address`, default `name`), `sortDir`

Validasi: `format` wajib salah satu dari `xlsx`/`pdf` (400 jika tidak valid), field enum lain divalidasi sama seperti endpoint list yang sudah ada.

### Repository

Tambah fungsi baru di tiap repository (tidak mengubah fungsi `list*` yang sudah ada):

- `recordingRepository.exportRecordings({ status, sold, condition, source, startDate, endDate, sortBy, sortDir })`
- `goatRepository.exportGoats({ farmerId, startDate, endDate, sortBy, sortDir })`
- `farmerRepository.exportFarmers({ search, sortBy, sortDir })`

Semua pakai `prisma.<model>.findMany` tanpa `skip`/`take` selain cap pengaman `take: 5000`, `where` dibangun dari filter yang ada (rentang tanggal pakai `gte`/`lte`), `orderBy` dipetakan dari `sortBy`/`sortDir` (untuk field relasi seperti `goat`/`farmer`, sort pakai field terkait, mis. `{ goat: { earTagNumber: sortDir } }`).

### Service

`backend/src/services/export.service.js`:

- `buildExcelBuffer({ sheetName, columns, rows })` — `columns: { header: string, key: string, width?: number }[]`, `rows: Record<string, string|number>[]`. Header baris pertama bold, lebar kolom mengikuti `width` atau auto dari panjang konten.
- `buildPdfBuffer({ title, columns, rows })` — kop berisi logo (base64 dari `assets/logo-bumdes.png`), judul laporan, tanggal export (format Indonesia), lalu tabel data dengan header bold dan garis pemisah tipis. Orientasi halaman `landscape` jika jumlah kolom > 6 (recording), `portrait` untuk goat/farmer.

Service ini generic (tidak tahu soal domain recording/goat/farmer) — controller yang menyiapkan `columns`/`rows` dengan label dan format Indonesia (tanggal `formatDateId`, status jadi label seperti "Perlu Review"/"Final", dsb — mapping label yang sama seperti badge di frontend, didefinisikan ulang di controller karena backend tidak share kode dengan frontend).

### Controller

Tiap controller (`recording.controller.js`, `goat.controller.js`, `farmer.controller.js`) dapat fungsi `exportX`:

1. Validasi `format` dan enum filter lain.
2. Panggil `repository.exportX(filters)`.
3. Map hasil ke `columns`/`rows` sesuai kolom tabel di frontend (recording: Kambing, Peternak, Tanggal Lahir, Kondisi, Anak (J/B), Terjual, Sumber, Status; goat: No. Telinga, Peternak, Terdaftar; farmer: Nama, Nomor WhatsApp, Alamat).
4. Panggil `export.service` sesuai `format`.
5. `res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf')`, `Content-Disposition: attachment; filename="<resource>-<YYYY-MM-DD>.<ext>"`, kirim buffer dengan `res.send(buffer)`.

Error handling sama seperti endpoint lain di controller ini (try/catch, 500 + pesan Indonesia).

## Frontend

### Util baru

`src/lib/download-file.ts`:

```ts
export function downloadBlob(blob: Blob, filename: string): void
```

Membuat object URL, klik `<a>` sementara, revoke URL setelah selesai.

### Komponen bersama

`src/components/common/export-dialog.tsx` — presentational, dipakai ketiga fitur:

- Props: `title: string`, `isExporting: boolean`, `onExport: (format: "xlsx" | "pdf") => void`, `children?: React.ReactNode` (slot filter fields), `trigger?: React.ReactNode` (default tombol "Export" dengan ikon).
- Isi: pilihan format (dua `Button variant="outline"` yang bisa toggle aktif, atau `RadioGroup` — pakai `RadioGroup` yang sudah ada di `components/ui/radio-group.tsx` untuk konsistensi dengan field Terjual di form recording), lalu `children`, lalu tombol submit "Export" (disabled + label "Memproses..." saat `isExporting`).

### Service per resource

Tambah fungsi di service yang sudah ada:

```ts
export async function exportRecordings(params: ExportRecordingsQuery): Promise<Blob> {
  const { data } = await api.get("/recordings/export", { params, responseType: "blob" });
  return data;
}
```

Pola sama untuk `exportGoats` (`goat.service.ts`) dan `exportFarmers` (`farmer.service.ts`). Tipe query baru ditambahkan di `src/types/recording.ts`, `goat.ts`, `farmer.ts` (`ExportRecordingsQuery`, dst).

### Komponen spesifik per fitur

1. `src/features/recordings/components/recording-export-dialog.tsx`
   - State filter: `status`, `sold`, `condition`, `source` (masing-masing select dengan opsi "Semua" + enum terkait), `startDate`/`endDate` (date picker yang sudah dipakai di form recording), `sortBy`/`sortDir`.
   - Handler `handleExport(format)`: panggil `exportRecordings({ ...filters, format })`, lalu `downloadBlob(blob, "recording-<tanggal>.<ext>")`, `toast.success`/`toast.error` di catch.

2. `src/features/goats/components/goat-export-dialog.tsx`
   - State filter: `farmerId` (pakai `farmer-select` yang sudah ada, opsional/boleh kosong), `startDate`/`endDate`, `sortBy`/`sortDir`.
   - Handler sama polanya, panggil `exportGoats`.

3. `src/features/farmers/components/farmer-export-dialog.tsx`
   - State filter: `search` (Input teks), `sortBy`/`sortDir`.
   - Handler sama polanya, panggil `exportFarmers`.

### Integrasi ke halaman

Di tiap `page.tsx` (`recording/page.tsx`, `kambing/page.tsx`, `peternak/page.tsx`), tambahkan komponen export dialog ke `action` slot `PageHeader`, di samping tombol tambah data yang sudah ada (tidak digabung — dua tombol terpisah: "Export" dan "Tambah ..."), dibungkus `<>` fragment karena `action` sekarang berisi 2 elemen.

## Error Handling

- Backend: format tidak valid → 400 dengan pesan Indonesia (konsisten dengan validasi lain di controller ini).
- Backend: data kosong (tidak ada baris cocok filter) → tetap generate file dengan header saja (tidak error).
- Frontend: request gagal (network/500) → `toast.error("Gagal mengekspor data.")`, dialog tetap terbuka agar user bisa coba lagi.

## Testing

Ikuti konvensi testing yang sudah ada di backend (`__tests__` per controller/repository):

- `recording.controller.test.js`, `goat.controller.test.js`, `farmer.controller.test.js`: tambah test case untuk `exportX` — format tidak valid → 400, format valid → response header `Content-Type`/`Content-Disposition` benar dan `export.service` dipanggil dengan data yang benar (mock repository & service).
- Repository test: tambah case untuk `exportX` — filter dan sort membentuk `where`/`orderBy` Prisma yang benar (mock Prisma client seperti test lain yang sudah ada).

## Di luar cakupan

- Tidak ada penjadwalan export otomatis/berkala.
- Tidak ada export gabungan (recording + kambing + peternak dalam satu file).
- Tidak ada penyimpanan riwayat file export yang pernah dibuat.
