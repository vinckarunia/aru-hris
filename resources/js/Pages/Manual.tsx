import React, { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Section {
    id: string;
    title: string;
    icon: string;
    roles: string[];
    searchText: string;
    content: React.ReactNode;
}

export default function Manual() {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth.user.role;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<string>('');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Define all sections with their respective roles and content
    const allSections: Section[] = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: 'solar:widget-add-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC'],
            searchText: "{userRole === \'PIC\' ? ( <> Dashboard adalah halaman pertama yang Anda lihat setelah login. Halaman ini memberikan ringkasan (overview) seputar project yang anda kelola. Statistik Cepat: Menampilkan jumlah karyawan aktif, client, project yang dikelola, dan lain-lain. Akses Cepat: Tombol pintas untuk melakukan aksi seperti tambah karyawan, import data, atau melihat reminder. Grafik: Visualisasi data karyawan berdasarkan demografi dan penempatan. ) : ( <> Dashboard adalah halaman pertama yang Anda lihat setelah login. Halaman ini memberikan ringkasan (overview) mengenai metrik utama sistem. Statistik Cepat: Menampilkan jumlah karyawan aktif, client, project yang sedang berjalan, dan lain-lain. Akses Cepat: Tombol pintas untuk melakukan aksi seperti tambah karyawan, import data, atau melihat data request. Notifikasi & Reminder: Peringatan jika ada dokumen yang perlu diverifikasi, data request yang menunggu persetujuan, atau kontrak yang akan habis masa berlakunya. Grafik: Visualisasi data karyawan berdasarkan demografi dan penempatan.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    {userRole === 'PIC' ? (
                        <>
                            <p>Dashboard adalah halaman pertama yang Anda lihat setelah login. Halaman ini memberikan ringkasan (overview) seputar project yang anda kelola.</p>
                        
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Statistik Cepat:</strong> Menampilkan jumlah karyawan aktif, client, project yang dikelola, dan lain-lain.</li>
                                <li><strong>Akses Cepat:</strong> Tombol pintas untuk melakukan aksi seperti tambah karyawan, import data, atau melihat reminder.</li>
                                <li><strong>Grafik:</strong> Visualisasi data karyawan berdasarkan demografi dan penempatan.</li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <p>Dashboard adalah halaman pertama yang Anda lihat setelah login. Halaman ini memberikan ringkasan (overview) mengenai metrik utama sistem.</p>
                        
                            <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Statistik Cepat:</strong> Menampilkan jumlah karyawan aktif, client, project yang sedang berjalan, dan lain-lain.</li>
                            <li><strong>Akses Cepat:</strong> Tombol pintas untuk melakukan aksi seperti tambah karyawan, import data, atau melihat data request.</li>
                            <li><strong>Notifikasi & Reminder:</strong> Peringatan jika ada dokumen yang perlu diverifikasi, data request yang menunggu persetujuan, atau kontrak yang akan habis masa berlakunya.</li>
                            <li><strong>Grafik:</strong> Visualisasi data karyawan berdasarkan demografi dan penempatan.</li>
                        </ul>
                    </>
                    )
                }
                </div>
            )
        },
        {
            id: 'client',
            title: 'Manajemen Client',
            icon: 'solar:buildings-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Fitur ini digunakan untuk mengelola data perusahaan client yang bekerja sama dengan ARU. Tambah Client Baru: Klik tombol \"Tambah Client\" di halaman utama Client. Isi informasi yang diperlukan seperti nama perusahaan, singkatan, PIC dari pihak client, dan alamat. Edit Client: Pada daftar client, klik tombol aksi (biasanya icon pensil atau melalui dropdown menu) untuk mengubah data client yang sudah ada. Hapus Client: Klik tombol hapus jika client tidak lagi aktif. Perhatikan bahwa Anda mungkin tidak bisa menghapus client yang masih memiliki project atau karyawan aktif yang terkait.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Fitur ini digunakan untuk mengelola data perusahaan client yang bekerja sama dengan ARU.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Tambah Client Baru:</strong> Klik tombol "Tambah Client" di halaman utama Client. Isi informasi yang diperlukan seperti nama perusahaan, singkatan, PIC dari pihak client, dan alamat.</li>
                        <li><strong>Edit Client:</strong> Pada daftar client, klik tombol aksi (biasanya icon pensil atau melalui dropdown menu) untuk mengubah data client yang sudah ada.</li>
                        <li><strong>Hapus Client:</strong> Klik tombol hapus jika client tidak lagi aktif. Perhatikan bahwa Anda mungkin tidak bisa menghapus client yang masih memiliki project atau karyawan aktif yang terkait.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'project',
            title: 'Manajemen Project',
            icon: 'solar:folder-with-files-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC'],
            searchText: "{userRole === \'PIC\' ? ( <> Sebagai PIC, Anda dapat melihat daftar project yang ditugaskan kepada Anda. Di halaman ini Anda dapat melihat detail project, client yang terkait, dan daftar karyawan yang berada di project tersebut. Anda juga dapat mengedit informasi project (seperti nama atau prefix), namun Anda tidak dapat memindahkan project ke client lain. ) : ( <> Fitur ini digunakan untuk mengelola project yang berjalan pada setiap client. Tambah Project: Klik \"Tambah Project\", pilih Client, lalu isi nama project dan detail lainnya. Assign PIC: Anda dapat menugaskan satu atau lebih PIC internal ARU untuk mengelola project tersebut. PIC ini nantinya dapat mengelola data karyawan yang ditugaskan di project ini. Delete Project: Gunakan tombol hapus pada baris project jika project tidak lagi aktif. Perhatikan bahwa jika Anda menghapus suatu project, maka dampaknya semua karyawan aktif yang terafiliasi dengan project tersebut status penempatannya akan otomatis berubah menjadi \"Project Closed\". Edit Project: Gunakan menu aksi pada baris project untuk mengubah data project. )}",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    {userRole === 'PIC' ? (
                        <>
                            <p>Sebagai PIC, Anda dapat melihat daftar project yang ditugaskan kepada Anda. Di halaman ini Anda dapat melihat detail project, client yang terkait, dan daftar karyawan yang berada di project tersebut.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Edit Project:</strong> Anda dapat mengedit detail dari project yang Anda pegang. Namun, Anda tidak diperkenankan mengubah <strong>Client</strong> dan <strong>Tipe Dokumen Kontrak</strong> dari project yang sudah ada.</li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <p>Fitur ini digunakan untuk mengelola project yang berjalan pada setiap client.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Tambah Project:</strong> Klik "Tambah Project", pilih Client, lalu isi nama project dan detail lainnya.</li>
                                <li><strong>Assign PIC:</strong> Anda dapat menugaskan satu atau lebih PIC internal ARU untuk mengelola project tersebut. PIC ini nantinya dapat mengelola data karyawan yang ditugaskan di project ini.</li>
                                <li><strong>Delete Project:</strong> Gunakan tombol hapus pada baris project jika project tidak lagi aktif. Perhatikan bahwa jika Anda menghapus suatu project, maka dampaknya semua karyawan aktif yang terafiliasi dengan project tersebut status penempatannya akan otomatis berubah menjadi "Project Closed".</li>
                                <li><strong>Edit Project:</strong> Gunakan menu aksi pada baris project untuk mengubah data project.</li>
                            </ul>
                        </>
                    )}
                </div>
            )
        },
        {
            id: 'worker',
            title: 'Karyawan, Penempatan & Kontrak',
            icon: 'solar:users-group-two-rounded-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC'],
            searchText: "{userRole === \'PIC\' && ( Penting: Sebagai PIC, setiap perubahan data yang Anda lakukan (tambah, edit karyawan, penempatan, atau kontrak) tidak akan langsung merubah sistem, melainkan akan masuk ke alur Data Request terlebih dahulu untuk direview dan disetujui oleh Admin ARU. )} Modul utama ini mengatur siklus hidup karyawan mulai dari pendataan, penempatan ke project, hingga detail kontrak dan kompensasi. 1. Manajemen Karyawan (Worker) Tambah Karyawan: Isi data pribadi dasar (nama, NIK KTP, jenis kelamin, dll). Dokumen Pendukung: Setelah karyawan dibuat, Anda dapat mengunggah dokumen penting (KTP, KK, dll) di tab Dokumen. Admin perlu melakukan verifikasi dokumen tersebut. Data Keluarga: Kelola susunan anggota keluarga (suami/istri, anak) di tab Keluarga. 2. Penempatan (Assignment) Karyawan harus ditempatkan (assigned) ke suatu Project agar dapat dibuatkan kontrak kerja. Masuk ke profil karyawan, pilih tab \"Penempatan\". Klik \"Tambah Penempatan\", lalu pilih Project, Branch (jika ada), dan tanggal penempatan. Anda dapat mencari (search) Project dan Cabang jika daftar pilihan terlalu panjang. Jika Cabang belum ada, Anda bisa klik tombol \"+ Tambah Cabang\" langsung di dalam form untuk membuat cabang baru tanpa perlu keluar form. 3. Kontrak & Kompensasi Setelah ada penempatan, Anda bisa membuat kontrak kerja (PKWT, Harian). Di dalam baris Penempatan yang aktif, klik \"Lihat Kontrak\" atau masuk ke tab \"Kontrak\". Klik \"Tambah Kontrak\", tentukan jenis, tanggal mulai, dan tanggal selesai. Perpanjangan Kontrak: Cukup buat kontrak baru pada penempatan yang sama dengan tanggal mulai meneruskan tanggal selesai kontrak sebelumnya. Kompensasi: Setelah kontrak tersimpan, Anda wajib menambahkan rincian Gaji/Kompensasi (Gaji Pokok, Tunjangan, Lemburan) di dalam detail kontrak tersebut. Dokumen Legal: Anda dapat mencetak/mendownload PKWT, PKPH, Part-time, atau Surat Tugas langsung dari detail kontrak. 4. Export Data Di halaman daftar Karyawan, terdapat tombol \"Export\". Anda dapat mendownload seluruh data karyawan beserta penempatan dan kontrak terakhir dalam format Excel/CSV.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    {userRole === 'PIC' && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-amber-800 dark:text-amber-300 mb-4">
                            <strong>Penting:</strong> Sebagai PIC, setiap perubahan data yang Anda lakukan (tambah, edit karyawan, penempatan, atau kontrak) tidak akan langsung merubah sistem, melainkan akan masuk ke alur <strong>Data Request</strong> terlebih dahulu untuk direview dan disetujui oleh Admin ARU.
                        </div>
                    )}
                    <p>Modul utama ini mengatur siklus hidup karyawan mulai dari pendataan, penempatan ke project, hingga detail kontrak dan kompensasi.</p>
                    
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4">1. Manajemen Karyawan (Worker)</h4>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Tambah Karyawan:</strong> Isi data pribadi dasar (nama, NIK KTP, jenis kelamin, dll).</li>
                        <li><strong>Dokumen Pendukung:</strong> Setelah karyawan dibuat, Anda dapat mengunggah dokumen penting (KTP, KK, dll) di tab Dokumen. Admin perlu melakukan verifikasi dokumen tersebut.</li>
                        <li><strong>Data Keluarga:</strong> Kelola susunan anggota keluarga (suami/istri, anak) di tab Keluarga.</li>
                    </ul>

                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4">2. Penempatan (Assignment)</h4>
                    <p>Karyawan harus ditempatkan (assigned) ke suatu Project agar dapat dibuatkan kontrak kerja.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Masuk ke profil karyawan, pilih tab "Penempatan".</li>
                        <li>Klik "Tambah Penempatan", lalu pilih Project, Branch (jika ada), dan tanggal penempatan.</li>
                        <li><strong>Pencarian Cepat:</strong> Gunakan kolom <em>search</em> yang tersedia di atas pilihan Project dan Cabang jika daftarnya sangat banyak.</li>
                        <li><strong>Tambah Cabang:</strong> Jika cabang belum ada di database, Anda bisa langsung menekan tombol <strong>"+ Tambah Cabang"</strong> dan mengetikkan nama cabang baru tanpa perlu menutup/keluar dari form penempatan.</li>
                    </ul>

                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4">3. Kontrak & Kompensasi</h4>
                    <p>Setelah ada penempatan, Anda bisa membuat kontrak kerja (PKWT, Harian, Part-time).</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Di dalam baris Penempatan yang aktif, klik "Lihat Kontrak" atau masuk ke tab "Kontrak".</li>
                        <li>Klik "Tambah Kontrak", tentukan jenis, tanggal mulai, dan tanggal selesai.</li>
                        <li><strong>Perpanjangan Kontrak:</strong> Cukup buat kontrak baru pada penempatan yang sama dengan tanggal mulai meneruskan tanggal selesai kontrak sebelumnya.</li>
                        <li><strong>Kompensasi:</strong> Setelah kontrak tersimpan, Anda wajib menambahkan rincian Gaji/Kompensasi (Gaji Pokok, Tunjangan, Lemburan) di dalam detail kontrak tersebut.</li>
                        <li><strong>Dokumen Legal:</strong> Anda dapat mencetak/mendownload langsung dokumen kontrak seperti PKWT, PKPH (Harian & Part-time), atau Surat Tugas dari detail kontrak.</li>
                    </ul>

                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4">4. Export Data</h4>
                    <p>Di halaman daftar Karyawan, terdapat tombol "Export". Anda dapat mendownload seluruh data karyawan beserta penempatan dan kontrak terakhir dalam format Excel/CSV.</p>
                </div>
            )
        },
        {
            id: 'bulk-import',
            title: 'Bulk Import Data',
            icon: 'solar:import-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC'],
            searchText: "{userRole === \'PIC\' && ( Penting: Sebagai PIC, setiap perubahan data yang Anda lakukan (tambah, edit karyawan, penempatan, atau kontrak) tidak akan langsung merubah sistem, melainkan akan masuk ke alur Data Request terlebih dahulu untuk direview dan disetujui oleh Admin ARU. )} Fitur ini memungkinkan Anda menambahkan atau mengupdate banyak data karyawan sekaligus menggunakan template Excel. (Opsional) Download Template: Anda dapat mendownload template Excel jika belum memiliki format yang sesuai. Template ini berisi struktur kolom dasar seperti NIK, Nama, dan data opsional lainnya. Langkah 1: Upload File Excel. Di halaman Bulk Import, klik area upload atau \"Pilih File\" untuk mengunggah file Excel data karyawan Anda. Langkah 2: Validasi Data. Setelah diupload, sistem akan membaca dan memvalidasi isi file. Jika terdapat error (seperti format salah atau NIK kosong), sistem akan menampilkan list baris mana saja yang gagal. Langkah 3: Proses Import. Jika seluruh data sudah valid, klik \"Proses Import\". Sistem akan memasukkan data tersebut ke database. Error Data: Anda dapat mendownload file berisi error tersebut, memperbaikinya, lalu mengunggahnya kembali. Bulk Update: Jika NIK KTP yang di-import ternyata sudah ada di dalam sistem, maka sistem akan mendeteksinya sebagai konflik. Anda dapat me-reviewnya, lalu dapat memilih apakah konflik ini akan diabaikan atau dimasukkan sebagai update. Jika dimasukkan sebagai update, maka proses import tidak akan membuat data baru (duplikat), melainkan akan memperbarui (update) data karyawan lama sesuai isian file Excel Anda.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    {userRole === 'PIC' && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-amber-800 dark:text-amber-300 mb-4">
                            <strong>Penting:</strong> Sebagai PIC, setiap perubahan data yang Anda lakukan (tambah, edit karyawan, penempatan, atau kontrak) tidak akan langsung merubah sistem, melainkan akan masuk ke alur <strong>Data Request</strong> terlebih dahulu untuk direview dan disetujui oleh Admin ARU.
                        </div>
                    )}
                    <p>Fitur ini memungkinkan Anda menambahkan atau mengupdate banyak data karyawan sekaligus menggunakan template Excel.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>(Opsional) Download Template:</strong> Anda dapat mendownload template Excel jika belum memiliki format yang sesuai. Template ini berisi struktur kolom dasar seperti NIK, Nama, dan data opsional lainnya.</li>
                        <li><strong>Langkah 1: Upload File Excel.</strong> Di halaman Bulk Import, klik area upload atau "Pilih File" untuk mengunggah file Excel data karyawan Anda.</li>
                        <li><strong>Langkah 2: Validasi Data.</strong> Setelah diupload, sistem akan membaca dan memvalidasi isi file. Jika terdapat error (seperti format salah atau NIK kosong), sistem akan menampilkan list baris mana saja yang gagal.</li>
                        <li><strong>Langkah 3: Proses Import.</strong> Jika seluruh data sudah valid, klik "Proses Import". Sistem akan memasukkan data tersebut ke database.</li>
                        <li><strong>Error Data:</strong> Anda dapat mendownload file berisi error tersebut, memperbaikinya, lalu mengunggahnya kembali.</li>
                        <li><strong>Bulk Update:</strong> Jika NIK KTP yang di-import ternyata sudah ada di dalam sistem, maka sistem akan mendeteksinya sebagai konflik. Anda dapat me-reviewnya, lalu dapat memilih apakah konflik ini akan diabaikan atau dimasukkan sebagai update. Jika dimasukkan sebagai update, maka proses import tidak akan membuat data baru (duplikat), melainkan akan memperbarui (update) data karyawan lama sesuai isian file Excel Anda.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'data-request',
            title: 'Data Request',
            icon: 'solar:file-check-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC'],
            searchText: "{userRole === \'PIC\' ? ( <> Di halaman ini, Anda dapat memantau status pengajuan perubahan data (Data Request) yang telah Anda buat. Anda dapat melihat mana yang masih \"Pending\", \"Approved\", atau \"Rejected\" oleh Admin ARU. ) : ( <> Setiap perubahan data yang dilakukan oleh PIC (atau karyawan itu sendiri jika memiliki akses) akan masuk ke antrean Data Request untuk disetujui. Review Request: Buka halaman Data Request. Klik salah satu request untuk melihat detail perubahan (sebelum vs sesudah). Tindakan: Anda dapat menyetujui (Approve) atau menolak (Reject) dengan memberikan catatan/alasan. Bulk Action: Anda dapat menyeleksi banyak request sekaligus (melalui checkbox) lalu melakukan \"Bulk Approve\" atau \"Bulk Reject\" untuk mempercepat proses. )}",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    {userRole === 'PIC' ? (
                        <>
                            <p>Di halaman ini, Anda dapat memantau status pengajuan perubahan data (Data Request) yang telah Anda buat. Anda dapat melihat mana yang masih "Pending", "Approved", atau "Rejected" oleh Admin ARU.</p>
                        </>
                    ) : (
                        <>
                            <p>Setiap perubahan data yang dilakukan oleh PIC (atau karyawan itu sendiri jika memiliki akses) akan masuk ke antrean Data Request untuk disetujui.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Review Request:</strong> Buka halaman Data Request. Klik salah satu request untuk melihat detail perubahan (sebelum vs sesudah).</li>
                                <li><strong>Tindakan:</strong> Anda dapat menyetujui (Approve) atau menolak (Reject) dengan memberikan catatan/alasan.</li>
                                <li><strong>Bulk Action:</strong> Anda dapat menyeleksi banyak request sekaligus (melalui checkbox) lalu melakukan "Bulk Approve" atau "Bulk Reject" untuk mempercepat proses.</li>
                            </ul>
                        </>
                    )}
                </div>
            )
        },
        {
            id: 'reminder',
            title: 'Reminder',
            icon: 'solar:bell-bing-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Sistem memiliki fitur Reminder otomatis untuk mengingatkan Admin mengenai beberapa hal krusial, antara lain: Kontrak Berakhir: Peringatan ketika ada kontrak kerja (PKWT) yang akan segera habis masa berlakunya (H-30, H-7, dsb). Reminder BPJS: Reminder ini digunakan untuk memastikan bahwa pendaftaran BPJS dari karyawan sudah diproses dan aktif saat hari pertama mereka mulai bekerja. Oleh karena itu, deadline reminder ini mengikuti tanggal hari pertama kontrak berjalan. Anda dapat melakukan \"Dismiss\" (abaikan) pada reminder yang sudah tidak relevan atau sudah ditangani di luar sistem.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Sistem memiliki fitur Reminder otomatis untuk mengingatkan Admin mengenai beberapa hal krusial, antara lain:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Kontrak Berakhir:</strong> Peringatan ketika ada kontrak kerja (PKWT) yang akan segera habis masa berlakunya (H-30, H-7, dsb).</li>
                        <li><strong>Reminder BPJS:</strong> Reminder ini digunakan untuk memastikan bahwa pendaftaran BPJS dari karyawan sudah diproses dan aktif saat hari pertama mereka mulai bekerja. Oleh karena itu, deadline reminder ini mengikuti tanggal hari pertama kontrak berjalan.</li>
                        <li>Anda dapat melakukan "Dismiss" (abaikan) pada reminder yang sudah tidak relevan atau sudah ditangani di luar sistem.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'report',
            title: 'Laporan',
            icon: 'solar:document-text-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Fitur ini digunakan khusus untuk membuat laporan mengenai data Karyawan (Worker) yang dihubungkan dengan Project masing-masing dan Client terkait. Semua kolom yang terafiliasi dengan karyawan, maupun hubungan join dengan modul lain (seperti assignment, kontrak, dll) dapat Anda pilih dan tampilkan di laporan. Tentukan kriteria filter spesifik (misalnya aktif di project tertentu, rentang umur, jenis kelamin, dll). Sistem akan menampilkan preview hasil dalam bentuk tabel yang kemudian dapat diekspor langsung ke format Excel atau CSV.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Fitur ini digunakan khusus untuk membuat laporan mengenai data Karyawan (Worker) yang dihubungkan dengan Project masing-masing dan Client terkait.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Semua kolom yang terafiliasi dengan karyawan, maupun hubungan join dengan modul lain (seperti assignment, kontrak, dll) dapat Anda pilih dan tampilkan di laporan.</li>
                        <li>Tentukan kriteria filter spesifik (misalnya aktif di project tertentu, rentang umur, jenis kelamin, dll).</li>
                        <li>Sistem akan menampilkan preview hasil dalam bentuk tabel yang kemudian dapat diekspor langsung ke format Excel atau CSV.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'internal-employee',
            title: 'Karyawan Internal',
            icon: 'solar:shield-user-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Modul terpisah untuk mengelola data karyawan internal (staff) dari pihak ARU sendiri, bukan karyawan outsourcing. Fungsinya mirip dengan manajemen Karyawan (Workers), namun disesuaikan untuk struktur data internal perusahaan, termasuk bulk import khusus untuk Karyawan Internal.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Modul terpisah untuk mengelola data karyawan internal (staff) dari pihak ARU sendiri, bukan karyawan outsourcing.</p>
                    <p>Fungsinya mirip dengan manajemen Karyawan (Workers), namun disesuaikan untuk struktur data internal perusahaan, termasuk bulk import khusus untuk Karyawan Internal.</p>
                </div>
            )
        },
        {
            id: 'user-management',
            title: 'User Management',
            icon: 'solar:users-group-rounded-bold-duotone',
            roles: ['SUPER_ADMIN'],
            searchText: "Khusus Super Admin. Fitur ini digunakan untuk mengelola akun yang dapat login ke sistem HRIS. Tambah user baru, tentukan email, password awal, dan Role (misal: ADMIN_ARU, PIC, SUPER_ADMIN). Untuk user dengan role PIC atau Karyawan, Anda bisa menghubungkan (link) akun tersebut dengan data profil PIC/Karyawan yang sudah ada di database. Hapus user jika sudah tidak memiliki akses ke sistem.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Khusus Super Admin. Fitur ini digunakan untuk mengelola akun yang dapat login ke sistem HRIS.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Tambah user baru, tentukan email, password awal, dan Role (misal: ADMIN_ARU, PIC, SUPER_ADMIN).</li>
                        <li>Untuk user dengan role PIC atau Karyawan, Anda bisa menghubungkan (link) akun tersebut dengan data profil PIC/Karyawan yang sudah ada di database.</li>
                        <li>Hapus user jika sudah tidak memiliki akses ke sistem.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'pic-management',
            title: 'Manajemen PIC',
            icon: 'solar:user-id-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Manajemen data profil dari PIC yang ditunjuk sebagai penanggung jawab atas berjalannya project tertentu. Data yang dikelola di modul ini adalah assignment PIC ke project tertentu. Sedangkan akun loginnya dikelola terpisah melalui modul User Management.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Manajemen data profil dari PIC yang ditunjuk sebagai penanggung jawab atas berjalannya project tertentu.</p>
                    <p>Data yang dikelola di modul ini adalah assignment PIC ke project tertentu. Sedangkan akun loginnya dikelola terpisah melalui modul User Management.</p>
                    <p><strong>Catatan:</strong>Sebelum bisa menambahkan PIC baru, pastikan sudah membuat user dengan role PIC pada modul User Management terlebih dahulu.</p>
                </div>
            )
        },
        {
            id: 'settings',
            title: 'Pengaturan Sistem',
            icon: 'solar:settings-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Pengaturan master untuk aplikasi HRIS. Validasi Dinamis: Mengatur panjang digit NIK KTP, NPWP, BPJS, dll yang diberlakukan di seluruh form. Dropdown Master: Mengelola opsi dropdown yang ada di aplikasi, seperti daftar Agama, Status PTKP, Tingkat Pendidikan, dan lain-lain. Branding: (Bila tersedia) Mengubah logo aplikasi atau pengaturan tampilan dasar.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Pengaturan master untuk aplikasi HRIS.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Validasi Dinamis:</strong> Mengatur panjang digit NIK KTP, NPWP, BPJS, dll yang diberlakukan di seluruh form.</li>
                        <li><strong>Dropdown Master:</strong> Mengelola opsi dropdown yang ada di aplikasi, seperti daftar Agama, Status PTKP, Tingkat Pendidikan, dan lain-lain.</li>
                        <li><strong>Branding:</strong> (Bila tersedia) Mengubah logo aplikasi atau pengaturan tampilan dasar.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'audit-log',
            title: 'Audit Log',
            icon: 'solar:list-check-bold-duotone',
            roles: ['SUPER_ADMIN', 'ADMIN_ARU'],
            searchText: "Catatan riwayat aktivitas di dalam sistem. Setiap perubahan data penting (Create, Update, Delete) akan dicatat di sini. Anda dapat melacak siapa yang melakukan perubahan, pada jam berapa, dan detail data sebelum vs sesudah diubah.",
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>Catatan riwayat aktivitas di dalam sistem.</p>
                    <p>Setiap perubahan data penting (Create, Update, Delete) akan dicatat di sini. Anda dapat melacak siapa yang melakukan perubahan, pada jam berapa, dan detail data sebelum vs sesudah diubah.</p>
                </div>
            )
        }
    ];

    // Filter sections based on user role
    const filteredSections = allSections.filter(section => section.roles.includes(userRole));

    // Filter further based on search query
    const displaySections = filteredSections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        section.searchText.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Initial expand first section
    useEffect(() => {
        if (displaySections.length > 0 && Object.keys(expandedSections).length === 0) {
            setExpandedSections({ [displaySections[0].id]: true });
            setActiveSection(displaySections[0].id);
        }
    }, [displaySections]);

    // Intersection Observer to highlight active TOC item
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        displaySections.forEach(section => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [displaySections]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            setExpandedSections(prev => ({ ...prev, [id]: true }));
            // Give time for accordion to expand
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    return (
        <AdminLayout title="Panduan Penggunaan" header="Manual & Panduan Penggunaan">
            <Head title="Manual HRIS" />

            <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <iconify-icon icon="solar:book-bookmark-bold-duotone" className="text-primary" width="28"></iconify-icon>
                            Panduan Aplikasi HRIS
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Halaman bantuan ini disesuaikan untuk peran Anda sebagai <strong className="text-primary">{userRole.replace('_', ' ')}</strong>.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72 flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <iconify-icon icon="solar:magnifer-linear" className="text-slate-400" width="20"></iconify-icon>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari topik bantuan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Mobile TOC Dropdown */}
                <div className="w-full lg:hidden bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Lompat ke Topik</label>
                    <select 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm p-2 text-slate-800 dark:text-slate-200 focus:ring-primary focus:border-primary"
                        onChange={(e) => scrollToSection(e.target.value)}
                        value={activeSection}
                    >
                        {displaySections.map(section => (
                            <option key={section.id} value={section.id}>{section.title}</option>
                        ))}
                    </select>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 w-full space-y-4">
                    {displaySections.length > 0 ? (
                        displaySections.map(section => (
                            <div 
                                key={section.id} 
                                id={section.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300"
                            >
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors focus:outline-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${expandedSections[section.id] ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'}`}>
                                            <iconify-icon icon={section.icon} width="22"></iconify-icon>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                            {section.title}
                                        </h3>
                                    </div>
                                    <iconify-icon 
                                        icon="solar:alt-arrow-down-bold-duotone" 
                                        width="24" 
                                        className={`text-slate-400 transition-transform duration-300 ${expandedSections[section.id] ? '-rotate-180 text-primary' : ''}`}
                                    ></iconify-icon>
                                </button>
                                
                                <div 
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                        expandedSections[section.id] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <div className="p-6 pt-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl text-center shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <iconify-icon icon="solar:minimalistic-magnifer-bold-duotone" className="text-slate-400" width="40"></iconify-icon>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tidak ada hasil ditemukan</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                                Maaf, kami tidak dapat menemukan topik bantuan yang sesuai dengan pencarian Anda. Coba gunakan kata kunci lain.
                            </p>
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="mt-6 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 rounded-xl font-medium transition-colors text-sm"
                            >
                                Hapus Pencarian
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Table of Contents */}
                <div className="w-full lg:w-72 lg:sticky lg:top-24 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 max-h-[calc(100vh-120px)] overflow-y-auto hidden lg:block">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 px-2">Daftar Isi</h3>
                    <nav className="space-y-1">
                        {displaySections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                                    activeSection === section.id 
                                        ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary-light' 
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <iconify-icon icon={section.icon} width="18" className="shrink-0"></iconify-icon>
                                <span className="truncate">{section.title}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </AdminLayout>
    );
}
