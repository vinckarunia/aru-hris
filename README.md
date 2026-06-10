# HRIS PT. Alfa Reka Usaha (Vinckarunia ARU HRIS)

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
