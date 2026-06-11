# HRIS PT. Alfa Reka Usaha (ARU HRIS)

[![Laravel Framework](https://img.shields.io/badge/Framework-Laravel%2011-red.svg)](https://laravel.com)
[![Frontend Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue.svg)](https://react.dev)
[![State Manager](https://img.shields.io/badge/Inertia.js-v1.0-emerald.svg)](https://inertiajs.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistem Informasi Sumber Daya Manusia (HRIS) terpadu yang dirancang khusus untuk mempermudah manajemen karyawan, penugasan proyek, administrasi kontrak kerja, dan pengawasan operasional bagi **PT. Alfa Reka Usaha**.

---

## 🚀 Fitur Utama

Sistem ini memiliki beberapa modul dan mesin backend canggih:

### 1. 📄 Document Engine (Native DOCX)
*   **Templat Terpusat (*Shared Library*):** Admin dan PIC berbagi repositori templat dokumen (`.docx`) yang sama.
*   **Parsing Placeholder Dinamis:** Parsing otomatis data pekerja ke placeholder templat seperti `${name}`, `${birth_place}`, `${nik_aru}`, `${ktp_number}`, dan penomoran surat otomatis menggunakan `PhpOffice\PhpWord`.
*   **Fallback Penanganan Berkas:** Alur cerdas yang otomatis mencari templat *default* global jika templat khusus proyek tidak tersedia.
*   **Hak Akses Templat:** PIC berhak melihat dan mengunggah templat baru, sementara Admin memegang kuasa penuh untuk menghapus atau menjadikannya *default*.

### 2. 👥 Manajemen Karyawan & Kompensasi
*   **Pekerja & Anggota Keluarga:** Pencatatan komprehensif data identitas, data bank, BPJS Kesehatan, BPJS Ketenagakerjaan, NPWP, dan bagan keluarga.
*   **Struktur Penugasan Fleksibel:** Penugasan pekerja ke klien, proyek, dan beberapa cabang sekaligus (*multi-branch assignment*) lewat tabel relasi.
*   **Skema Kompensasi Dinamis:** Konfigurasi gaji pokok, tunjangan makan, tunjangan transportasi, upah lembur (hari kerja/libur), dan kompensasi tambahan (*extra compensation*) per kontrak kerja.

### 3. 🛡️ Alur Validasi Dua Tingkat (*Two-Tier Approval*)
*   PIC dapat mengajukan penambahan pekerja baru, perubahan data, atau perubahan status penugasan.
*   Pengajuan masuk ke daftar **Data Requests** dan wajib melewati validasi dua tingkat: ditinjau oleh PIC (*PIC Reviewed*) lalu disetujui akhir oleh Admin (*Admin Approved*) sebelum datanya terintegrasi ke sistem utama.

### 4. ⏰ Pengingat & Otomatisasi BPJS
*   Pendeteksian otomatis tanggal berakhirnya kontrak pekerja, masa berlaku MoU Klien, dan status BPJS.
*   Sistem notifikasi pengingat berbasis tenggat waktu (*deadline scheduler*) dengan pengiriman surel otomatis.

### 5. 📝 Log Audit & Transparansi Operasional
*   Pencatatan detail setiap aksi user (Buat, Ubah, Hapus, Setujui, Unggah, Unduh, Masuk, Keluar) lengkap dengan data *metadata* (perbandingan data sebelum & sesudah diubah) serta alamat IP pelaku.

---

## 🛠️ Tech Stack

Sistem dibangun dengan teknologi modern untuk skalabilitas dan performa maksimal:

*   **Backend:** PHP 8.2+ & [Laravel 11](https://laravel.com)
*   **Frontend:** [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) via [Inertia.js](https://inertiajs.com)
*   **Gaya & Desain:** [Tailwind CSS](https://tailwindcss.com) + Komponen UI Kustom premium
*   **Database:** MySQL / PostgreSQL
*   **Pengolah Dokumen:** `PhpOffice\PhpWord` (Native DOCX engine)
*   **Pengujian:** Pest PHP

---

## 📊 Entity Relationship Diagram (ERD)

Struktur database dirancang untuk menampung data relasional yang kompleks secara optimal. Silakan lihat diagram lengkap ERD berbasis Mermaid pada berkas berikut:

👉 **[erd-mermaid.md](file:///home/vinc/hris/erd-mermaid.md)**

---

## ⚙️ Cara Memulai (Local Setup)

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di komputer lokal Anda:

### 1. Kloning Repositori & Instal Dependensi
```bash
git clone https://github.com/vinckarunia/aru-hris.git
cd aru-hris

# Instal dependensi PHP
composer install

# Instal dependensi JavaScript/TypeScript
npm install
```

### 2. Konfigurasi Environment
Salin berkas `.env.example` ke `.env` dan sesuaikan konfigurasi database Anda:
```bash
cp .env.example .env
php artisan key:generate
```

### 3. Migrasi & Seeding Database
Jalankan migrasi untuk membuat seluruh tabel:
```bash
php artisan migrate
```
*(Opsional: Jalankan `php artisan db:seed` jika ada berkas seeder untuk data awal)*.

### 4. Jalankan Development Server
Gunakan dua terminal terpisah untuk menjalankan backend dan frontend asset compiler:

*   **Terminal 1 (Laravel Dev Server):**
    ```bash
    php artisan serve
    ```
*   **Terminal 2 (Vite Compiler):**
    ```bash
    npm run dev
    ```

---

## 📖 Panduan Penggunaan Sistem

Untuk panduan operasional lengkap mengenai pengunggahan templat, penulisan variabel placeholder, serta aturan penomoran surat PKWT/PKPH, silakan akses halaman **Manual** langsung di dalam aplikasi pada menu navigasi utama.

---

## 🖨️ Panduan Setup Google PDF Converter (Shared Hosting)

Fitur konversi dari format DOCX ke PDF menggunakan **Google Drive API** (Google Docs automatic conversion) untuk melakukan konversi berkualitas tinggi secara gratis tanpa perlu memasang library PDF eksternal di *shared hosting*. Alurnya mengunggah berkas `.docx` sementara, mengonversinya ke dokumen Google Docs, mengunduhnya sebagai `.pdf`, lalu menghapusnya kembali dari Google Drive secara bersih.

Terdapat dua metode autentikasi yang didukung. Anda cukup memilih salah satu:

### Metode A: Menggunakan Service Account + Folder Bersama (Sangat Direkomendasikan)
Metode ini paling cepat karena menggunakan autentikasi server-to-server secara otomatis. Namun, karena akun layanan (*Service Account*) baru memiliki kuota penyimpanan default `0` byte, Anda harus menyimpan berkas sementara pada folder bersama di Google Drive pribadi Anda:

1. **Buat Service Account & Unduh JSON Kredensial**:
   - Masuk ke [Google Cloud Console](https://console.cloud.google.com/).
   - Buat proyek baru, lalu aktifkan **Google Drive API**.
   - Masuk ke menu **IAM & Admin > Service Accounts**, klik **Create Service Account**.
   - Setelah dibuat, masuk ke tab **Keys > Add Key > Create new key**, pilih format **JSON**.
   - Simpan berkas JSON tersebut ke server HRIS Anda pada lokasi berikut:
     `storage/app/private/google-credentials.json`
2. **Dapatkan Email Akun Layanan**:
   - Buka berkas JSON kredensial tersebut, salin nilai `"client_email"` (misalnya: `your-sa-name@your-project-id.iam.gserviceaccount.com`).
3. **Buat & Bagikan Folder Google Drive**:
   - Buka Google Drive pribadi Anda.
   - Buat folder baru (misalnya: `HRIS Temp`).
   - Bagikan folder tersebut ke alamat email akun layanan (`client_email`) di atas dengan hak akses **Editor**.
4. **Salin ID Folder Google Drive**:
   - Masuk ke folder tersebut, salin string ID unik yang ada di ujung URL browser Anda:
     Contoh: `https://drive.google.com/drive/folders/1igA-HlIilj6fOzDG_0aOmkNO2sG4uo2M` -> ID-nya adalah `1igA-HlIilj6fOzDG_0aOmkNO2sG4uo2M`.
5. **Konfigurasikan `.env`**:
   Tambahkan variabel ini pada berkas `.env` server produksi:
   ```env
   GOOGLE_DRIVE_PARENT_FOLDER_ID=1igA-HlIilj6fOzDG_0aOmkNO2sG4uo2M
   ```

---

### Metode B: Menggunakan OAuth 2.0 User Consent (Pribadi)
Metode ini berjalan langsung atas nama akun Google pribadi Anda sehingga memiliki akses penuh ke kuota penyimpanan 15 GB gratis Anda secara langsung:

1. **Buat OAuth Client ID**:
   - Di Google Cloud Console, buka **APIs & Services > Credentials**.
   - Klik **Create Credentials > OAuth client ID**, pilih tipe aplikasi **Web application**.
   - Di bagian **Authorized redirect URIs**, tambahkan: `https://developers.google.com/oauthplayground`.
   - Salin **Client ID** dan **Client Secret** yang didapatkan.
2. **Dapatkan Refresh Token**:
   - Buka [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   - Klik ikon gerigi (Settings) di pojok kanan atas, centang **Use your own OAuth credentials**, lalu masukkan **Client ID** & **Client Secret** Anda.
   - Di panel kiri (Step 1), cari **Google Drive API v3**, centang scope `https://www.googleapis.com/auth/drive` atau `https://www.googleapis.com/auth/drive.file`.
   - Klik **Authorize APIs** dan setujui izin pada akun Google Anda.
   - Di Step 2, klik **Exchange authorization code for tokens**, lalu salin **Refresh Token** yang muncul di panel kanan.
3. **Konfigurasikan `.env`**:
   Tambahkan variabel berikut ke berkas `.env` server produksi:
   ```env
   GOOGLE_CLIENT_ID=isi_client_id_anda
   GOOGLE_CLIENT_SECRET=isi_client_secret_anda
   GOOGLE_REFRESH_TOKEN=isi_refresh_token_anda
   ```
   *(Jika variabel OAuth ini terisi, sistem secara otomatis akan memprioritaskan metode OAuth ini dibanding Service Account).*

---

### 🧪 Verifikasi Fungsionalitas Konversi
Jalankan tes unit otomatis untuk memastikan integrasi dan kredensial Anda berjalan dengan baik:
```bash
php artisan test --filter ContractDownloadTest
```
Jika sukses, hasil tes akan menampilkan:
```text
   PASS  Tests\Feature\ContractDownloadTest
  ✓ it downloads docx file when pdf conversion is disabled
  ✓ it falls back to docx when pdf conversion fails
  ✓ it downloads pdf file when conversion is enabled and succeeds
```

