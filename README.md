# 🐄 Digitalisasi Recording Ternak via WhatsApp & Google Sheets

Proyek KKN ini dirancang untuk mendigitalisasi pencatatan rekam medis, populasi, dan kesehatan hewan ternak di desa KKN secara instan dan efisien. 

Melalui kolaborasi antara **Teknologi Informasi** (digitalisasi otomatis) dan **Kedokteran Hewan** (pemeriksaan klinis lapangan), sistem ini memungkinkan peternak atau mahasiswa KKN di lapangan untuk melaporkan data ternak cukup dengan mengirim pesan WhatsApp berformat bebas (menggunakan bahasa Indonesia sehari-hari/campuran). Kecerdasan Buatan (AI) dari Gemini akan menerjemahkan teks bebas tersebut menjadi data terstruktur dan memasukkannya langsung ke dalam Google Spreadsheet secara otomatis.

---

## 🛠️ Arsitektur & Cara Kerja Sistem

```
[Peternak / Lapangan] 
        │ 
        ▼ (Mengirim WhatsApp pesan bebas)
┌─────────────────────────────────┐
│     WhatsApp Business API       │ (Dikelola oleh Meta Cloud)
└────────────────┬────────────────┘
                 │ 
                 ▼ (Webhook Event HTTP POST)
┌─────────────────────────────────┐
│  Serverless Backend (Vercel)    │ (Gratis 24/7, tanpa laptop menyala)
└────────────────┬────────────────┘
                 │
                 ├─► [Gemini 2.5 Flash AI] (Ekstraksi teks bebas ke format JSON)
                 │
                 ├─► [Google Sheets API]  (Pencatatan baris baru otomatis)
                 │
                 ▼
[ WhatsApp Balasan Konfirmasi Sukses ke Peternak ]
```

---

## ✨ Fitur Utama

1. **AI Text Parsing (Gemini 2.5 Flash):** Mampu menganalisis teks percakapan bebas (tidak baku), typos, hingga istilah kasual, lalu mengekstraknya ke parameter medis terstruktur secara instan.
2. **Serverless Architecture (Vercel Ready):** Kode dirancang untuk berjalan sebagai *Serverless Functions* di Vercel. Aktif 24 jam non-stop dengan biaya Rp 0 (Gratis) tanpa perlu menyalakan laptop.
3. **Penyimpanan Cloud (Google Sheets):** Data tersimpan rapi langsung di Google Spreadsheet yang dapat dilihat, diedit, dan diunduh oleh rekan kedokteran hewan atau perangkat desa kapan saja melalui Google Drive.
4. **Skema Fleksibel:** Kolom data dan instruksi ekstraksi AI dikonfigurasi terpusat di `src/config.js` sehingga sangat mudah ditambah/dikurangi sesuai hasil observasi lapangan terbaru.

---

## 🔑 Konfigurasi Environment Variables (`.env`)

Salin file `.env.example` menjadi `.env` di root folder proyek, lalu lengkapi variabel berikut:

| Variabel | Keterangan | Cara Mendapatkan |
|---|---|---|
| `GEMINI_API_KEY` | Kunci akses API Gemini AI | Buat gratis di [Google AI Studio](https://aistudio.google.com/) |
| `SPREADSHEET_ID` | ID Google Spreadsheet tujuan | Ambil dari URL spreadsheet: `.../d/[SPREADSHEET_ID]/edit` |
| `SHEET_NAME` | Nama tab di Google Sheets | Masukkan nama tab, default: `Recording Ternak` |
| `WA_ACCESS_TOKEN` | Token keamanan WhatsApp API | Menu **System Users** di Meta Business Settings (Gunakan token permanen) |
| `WA_PHONE_NUMBER_ID`| ID unik nomor telepon WhatsApp | Menu **WhatsApp > API Setup** di Meta Developer Console |
| `WA_VERIFY_TOKEN` | Sandi rahasia untuk Webhook | Buat kata sandi acak bebas pilihan Anda sendiri |

---

## 📋 Langkah Persiapan Layanan

### 1. Konfigurasi Google Sheets API & Service Account
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **Google Sheets API** pada pustaka API.
3. Masuk ke **IAM & Admin > Service Accounts**, buat akun layanan baru (misal: `sheets-bot`).
4. Buka detail akun layanan tersebut, masuk ke tab **Keys**, klik **Add Key > Create new key > JSON**. Berkas kunci akan terunduh.
5. Pindahkan berkas tersebut ke root folder proyek Anda, ubah namanya menjadi **`google-credentials.json`**.
6. **PENTING:** Buka file JSON tersebut, salin nilai `"client_email"`. Buka Google Spreadsheet tujuan Anda, klik **Share (Bagikan)**, lalu bagikan akses sebagai **Editor** ke email akun layanan tersebut.

### 2. Setup WhatsApp Cloud API di Meta Developer
1. Buka [Meta for Developers](https://developers.facebook.com/) dan buat aplikasi baru dengan tipe **Business**.
2. Tambahkan produk **WhatsApp** ke aplikasi Anda.
3. Daftarkan nomor telepon layanan recording Anda pada menu **Step 2. Production setup** (Pastikan akun WhatsApp di HP untuk nomor tersebut telah dihapus secara permanen terlebih dahulu melalui aplikasi WA HP sebelum didaftarkan ke Meta).
4. Daftarkan Pengguna Sistem (System User) bertipe Admin di **Meta Business Suite > Business Settings**, berikan izin akses ke Aplikasi Anda serta Akun WhatsApp, lalu klik **Generate Token** dengan mencentang izin `whatsapp_business_messaging`.

---

## 💻 Cara Menjalankan & Menguji Lokal (ngrok)

Untuk menguji alur pengiriman pesan sebelum melakukan deploy ke Vercel:

1. **Install Dependensi:**
   ```bash
   npm install
   ```
2. **Jalankan Server Lokal:**
   ```bash
   node src/index.js
   ```
   *Server akan berjalan di port `http://localhost:3000`.*
3. **Aktifkan ngrok (Terowongan Publik):**
   ```bash
   npx ngrok http 3000
   ```
   Salin alamat HTTPS yang digenerasi oleh ngrok (misal: `https://abcd-12-34.ngrok-free.app`).
4. **Hubungkan Webhook di Meta Developer:**
   * Masuk ke dashboard Meta Developer > WhatsApp > Configuration.
   * Isi **Callback URL** dengan: `https://[alamat-ngrok-anda]/api/webhook`
   * Isi **Verify Token** dengan nilai `WA_VERIFY_TOKEN` dari file `.env`.
   * Klik **Verify and save**.
   * Di tabel **Webhook Fields** di bawahnya, klik **Manage** lalu centang opsi **`messages`** agar server menerima notifikasi pesan masuk.

---

## 🚀 Cara Deploy ke Vercel (Gratis 24/7)

1. Unggah kode proyek Anda ke repositori **GitHub** pribadi Anda.
2. Buka [Vercel](https://vercel.com/) dan masuk menggunakan akun GitHub.
3. Klik **Add New > Project**, lalu impor repositori proyek Anda ini.
4. Di bagian **Environment Variables**, tambahkan semua variabel yang ada di file `.env` Anda.
5. **Khusus Kredensial Google:** Tambahkan variabel bernama **`GOOGLE_CREDENTIALS`**. Buka berkas `google-credentials.json` di komputer Anda, salin seluruh teks JSON di dalamnya, dan tempelkan sebagai nilai untuk variabel ini.
6. Klik **Deploy**.
7. Setelah selesai, salin URL produksi Vercel Anda, lalu ganti **Callback URL** di dashboard Meta Developers Anda menjadi:
   `https://[nama-aplikasi-anda].vercel.app/api/webhook`

---

## 💡 Troubleshooting (Panduan Solusi Masalah)

* **Error: Quota Exceeded (Limit 0):**
  Pastikan Anda menggunakan model `'gemini-2.5-flash'` di berkas `src/config.js` karena model versi lama (`gemini-1.5-flash`) sudah dipensiunkan oleh Google dan model 2.0-flash dibatasi di beberapa wilayah.
* **Error: The caller does not have permission:**
  Pastikan Anda sudah membagikan akses Google Spreadsheet tujuan kepada email `"client_email"` yang tertulis di berkas `google-credentials.json` dengan hak akses sebagai **Editor**.
* **Error: Object with ID does not exist:**
  Periksa kembali berkas `.env` Anda. Pastikan variabel `WA_PHONE_NUMBER_ID` diisi menggunakan **Phone Number ID (ID Nomor Telepon)**, bukan *WhatsApp Business Account ID*.
