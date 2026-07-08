# 🐄 Digitalisasi Recording Ternak via WhatsApp & Dashboard Web

Proyek KKN ini dirancang untuk mendigitalisasi pencatatan rekam medis, populasi, dan kesehatan hewan ternak (kambing) di desa KKN secara instan dan efisien.

Melalui kolaborasi antara **Teknologi Informasi** (digitalisasi otomatis) dan **Kedokteran Hewan** (pemeriksaan klinis lapangan), sistem ini memungkinkan peternak atau mahasiswa KKN di lapangan untuk melaporkan data ternak cukup dengan mengirim pesan WhatsApp berformat bebas (bahasa Indonesia sehari-hari/campuran). Kecerdasan Buatan (AI) dari Gemini menerjemahkan teks bebas tersebut menjadi data terstruktur, menyimpannya ke PostgreSQL, lalu menyinkronkannya ke Google Spreadsheet secara otomatis. Data yang sama juga bisa dipantau, dicari, dan diedit lewat dashboard web (Next.js) oleh admin/dokter hewan.

Dokumentasi lengkap dan mendetail ada di folder [`docs/`](./docs) — README ini hanya ringkasan cara mulai.

---

## 🧱 Struktur Repositori

```
recording-ternak/
├── backend/       # Node.js + Express (serverless di Vercel), Prisma + PostgreSQL
├── frontend/      # Next.js 16 App Router + shadcn/ui (dashboard admin)
└── docs/          # Dokumentasi arsitektur, API, setup, ADR, dll
```

---

## 🛠️ Arsitektur & Cara Kerja Sistem

```
[Peternak / Lapangan]
        │
        ▼ (Mengirim WhatsApp pesan bebas)
┌─────────────────────────────────┐
│     WhatsApp Business API       │ (Dikelola oleh Meta Cloud)
└────────────────┬────────────────┘
                 │ (Webhook Event HTTP POST)
                 ▼
┌─────────────────────────────────┐
│  Backend Express (Vercel)       │ (Serverless, gratis 24/7)
└────────────────┬────────────────┘
                 │
                 ├─► [Gemini 2.5 Flash AI]     (Ekstraksi teks bebas ke JSON terstruktur)
                 ├─► [PostgreSQL via Prisma]   (Penyimpanan utama: peternak, kambing, recording)
                 ├─► [Cloudinary]              (Upload foto kondisi kambing dari WhatsApp)
                 ├─► [Google Sheets API]       (Sinkronisasi baris untuk dilihat stakeholder)
                 ▼
[ WhatsApp Balasan Konfirmasi Sukses ke Peternak ]

┌─────────────────────────────────┐
│  Dashboard Web (Next.js)        │ ◄──► Backend API (JWT / Google OAuth login, role-based access)
└─────────────────────────────────┘
```

Detail lengkap tiap komponen dan diagram sequence ada di [`docs/architecture/`](./docs/architecture).

---

## ✨ Fitur Utama

1. **AI Text Parsing (Gemini 2.5 Flash):** Menganalisis teks percakapan bebas (tidak baku, typo, istilah kasual), lalu mengekstraknya ke parameter medis terstruktur secara instan.
2. **Penyimpanan Utama PostgreSQL (Prisma):** Data peternak, kambing, dan recording tersimpan di database relasional dengan riwayat lengkap, bukan hanya di spreadsheet.
3. **Sinkronisasi Google Sheets:** Data tetap disalin ke Google Spreadsheet agar mudah dilihat/diunduh oleh rekan kedokteran hewan atau perangkat desa tanpa perlu akses dashboard.
4. **Dashboard Web (Next.js + shadcn/ui):** Admin/dokter hewan bisa login (email+password atau Google OAuth), melihat statistik, mengelola data peternak/kambing/recording, dan melakukan follow-up langsung dari browser.
5. **Role-Based Access Control:** Tiga peran (`ADMIN`, `SUPERADMIN`, `VIEWER`) membatasi siapa yang boleh mengubah data vs hanya melihat.
6. **Upload Foto (Cloudinary):** Foto kondisi kambing yang dikirim lewat WhatsApp otomatis diunggah dan ditautkan ke recording terkait.
7. **Serverless Architecture (Vercel Ready):** Backend dan frontend berjalan sebagai *Serverless Functions*/edge di Vercel, aktif 24 jam tanpa perlu laptop menyala.
8. **Skema Fleksibel:** Kolom data dan instruksi ekstraksi AI dikonfigurasi terpusat di `backend/src/config/index.js` sehingga mudah ditambah/dikurangi sesuai hasil observasi lapangan terbaru.

---

## 🔑 Konfigurasi Environment Variables

Salin `backend/.env.example` menjadi `backend/.env`, lalu lengkapi variabel berikut (daftar lengkap beserta cara mendapatkannya ada di [`docs/setup/environment.md`](./docs/setup/environment.md)):

| Variabel | Keterangan |
|---|---|
| `PORT` | Port server backend lokal (default `5000`) |
| `GEMINI_API_KEY` | Kunci akses API Gemini AI ([Google AI Studio](https://aistudio.google.com/)) |
| `SPREADSHEET_ID` | ID Google Spreadsheet tujuan sinkronisasi |
| `SHEET_RECORDING` / `SHEET_KAMBING` / `SHEET_PETERNAK` | Nama tab per jenis data di Google Sheets |
| `WA_ACCESS_TOKEN` | Token akses WhatsApp Cloud API (System User permanen di Meta Business Settings) |
| `WA_PHONE_NUMBER_ID` | ID nomor telepon WhatsApp (Meta Developer Console > WhatsApp > API Setup) |
| `WA_VERIFY_TOKEN` | Sandi rahasia webhook, bebas ditentukan sendiri |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Kredensial akun Cloudinary untuk upload foto |
| `DATABASE_URL` | Connection string PostgreSQL (pooled, mis. via Supabase pgbouncer) |
| `DIRECT_URL` | Connection string PostgreSQL langsung (dipakai Prisma Migrate) |
| `JWT_SECRET` | Secret untuk menandatangani token JWT dashboard |
| `GOOGLE_CLIENT_ID` | Client ID untuk login "Sign in with Google" di dashboard |
| `GOOGLE_CREDENTIALS` *(khusus deploy Vercel)* | Isi JSON service account Google Sheets sebagai satu baris string env var |

Untuk kredensial Google Sheets di lokal, gunakan berkas `google-credentials.json` (lihat langkah di bawah) alih-alih env var `GOOGLE_CREDENTIALS`.

---

## 📋 Langkah Persiapan Layanan

### 1. Konfigurasi Google Sheets API & Service Account
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **Google Sheets API** pada pustaka API.
3. Masuk ke **IAM & Admin > Service Accounts**, buat akun layanan baru (misal: `sheets-bot`).
4. Buka detail akun layanan tersebut, masuk ke tab **Keys**, klik **Add Key > Create new key > JSON**. Berkas kunci akan terunduh.
5. Pindahkan berkas tersebut ke folder `backend/`, ubah namanya menjadi **`google-credentials.json`**.
6. **PENTING:** Buka file JSON tersebut, salin nilai `"client_email"`. Buka Google Spreadsheet tujuan Anda, klik **Share (Bagikan)**, lalu bagikan akses sebagai **Editor** ke email akun layanan tersebut.

### 2. Setup WhatsApp Cloud API di Meta Developer
1. Buka [Meta for Developers](https://developers.facebook.com/) dan buat aplikasi baru dengan tipe **Business**.
2. Tambahkan produk **WhatsApp** ke aplikasi Anda.
3. Daftarkan nomor telepon layanan recording Anda pada menu **Step 2. Production setup** (pastikan akun WhatsApp di HP untuk nomor tersebut telah dihapus secara permanen terlebih dahulu melalui aplikasi WA HP sebelum didaftarkan ke Meta).
4. Daftarkan Pengguna Sistem (System User) bertipe Admin di **Meta Business Suite > Business Settings**, berikan izin akses ke Aplikasi Anda serta Akun WhatsApp, lalu klik **Generate Token** dengan mencentang izin `whatsapp_business_messaging`.

### 3. Setup PostgreSQL & Prisma
1. Siapkan database PostgreSQL (mis. proyek [Supabase](https://supabase.com/)), catat connection string pooled (`DATABASE_URL`) dan direct (`DIRECT_URL`).
2. Di folder `backend/`, jalankan `npm install` lalu `npm run db:migrate` untuk membuat skema tabel.

### 4. Setup Login Google OAuth (Dashboard)
1. Di Google Cloud Console yang sama, buka **APIs & Services > Credentials**, buat **OAuth 2.0 Client ID** tipe **Web application**.
2. Tambahkan origin frontend (`http://localhost:3000` untuk lokal, domain Vercel untuk produksi) ke **Authorized JavaScript origins**.
3. Salin **Client ID** ke `GOOGLE_CLIENT_ID` (backend) dan variabel setara di `frontend/.env.local` (lihat [`docs/setup/environment.md`](./docs/setup/environment.md)).

---

## 💻 Cara Menjalankan & Menguji Lokal

### Backend
```bash
cd backend
npm install
npm run dev        # Server berjalan di http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev         # Dashboard berjalan di http://localhost:3000
```

### Menguji Webhook WhatsApp via ngrok
1. Jalankan backend (`npm run dev` di folder `backend`).
2. Buka terowongan publik:
   ```bash
   npx ngrok http 5000
   ```
   Salin alamat HTTPS yang digenerasi (mis. `https://abcd-12-34.ngrok-free.app`).
3. Masuk ke dashboard Meta Developer > WhatsApp > Configuration:
   * Isi **Callback URL** dengan: `https://[alamat-ngrok-anda]/api/webhook`
   * Isi **Verify Token** dengan nilai `WA_VERIFY_TOKEN` dari `backend/.env`
   * Klik **Verify and save**, lalu di tabel **Webhook Fields**, klik **Manage** dan centang **`messages`**.

---

## 🚀 Cara Deploy ke Vercel

Backend dan frontend di-deploy sebagai dua proyek Vercel terpisah dari repo yang sama.

1. Unggah kode proyek ke repositori **GitHub** pribadi Anda.
2. Buka [Vercel](https://vercel.com/) dan masuk menggunakan akun GitHub.
3. **Backend:** klik **Add New > Project**, impor repo ini, set **Root Directory** ke `backend`. Tambahkan semua env var dari `backend/.env` di bagian **Environment Variables**, termasuk `GOOGLE_CREDENTIALS` (seluruh isi `google-credentials.json` sebagai satu baris string).
4. **Frontend:** ulangi dengan **Root Directory** `frontend`, tambahkan env var API base URL yang mengarah ke domain backend Vercel Anda.
5. Klik **Deploy** pada masing-masing proyek.
6. Setelah backend selesai deploy, salin URL produksinya, lalu ganti **Callback URL** di dashboard Meta Developers menjadi:
   `https://[nama-backend-anda].vercel.app/api/webhook`

Detail konfigurasi `vercel.json` dan langkah lengkap ada di [`docs/setup/deployment.md`](./docs/setup/deployment.md).

---

## 💡 Troubleshooting

Panduan lengkap ada di [`docs/setup/troubleshooting.md`](./docs/setup/troubleshooting.md). Beberapa masalah umum:

* **Error: Quota Exceeded (Limit 0):**
  Pastikan model yang dipakai di `backend/src/config/index.js` adalah `gemini-2.5-flash` (parsing) / `gemini-2.5-flash-lite` (chat) — model versi lama sudah dipensiunkan atau dibatasi di beberapa wilayah.
* **Error: The caller does not have permission (Google Sheets):**
  Pastikan Anda sudah membagikan akses Google Spreadsheet tujuan kepada email `"client_email"` di `google-credentials.json` (atau `GOOGLE_CREDENTIALS` di produksi) dengan hak akses **Editor**.
* **Error: Object with ID does not exist (WhatsApp):**
  Periksa kembali `.env`. Pastikan `WA_PHONE_NUMBER_ID` diisi dengan **Phone Number ID**, bukan *WhatsApp Business Account ID*.
* **Error koneksi database / Prisma:**
  Pastikan `DATABASE_URL` (pooled) dan `DIRECT_URL` (direct) sudah benar, dan `npm run db:generate` sudah dijalankan setelah perubahan skema.

---

## 📚 Dokumentasi Lengkap

- [`docs/architecture/`](./docs/architecture) — desain sistem, struktur folder, skema database, alur API
- [`docs/api/`](./docs/api) — daftar endpoint per resource (auth, farmers, goats, recordings, dll)
- [`docs/setup/`](./docs/setup) — instalasi, environment variables, deployment, troubleshooting
- [`docs/frontend/`](./docs/frontend) — design system, komponen, routing, state management
- [`docs/backend/`](./docs/backend) — coding standards, validasi, autentikasi
- [`docs/database/`](./docs/database) — konvensi Prisma dan migrasi
- [`docs/decisions/`](./docs/decisions) — Architecture Decision Records (ADR)
- [`docs/changelog.md`](./docs/changelog.md) — riwayat perubahan
