<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PKPH Document</title>
    <style>
        @font-face {
            font-family: 'Tahoma';
            src: url('{{ public_path("uploads/assets/fonts/tahoma.ttf") }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'Tahoma';
            src: url('{{ public_path("uploads/assets/fonts/tahomabd.ttf") }}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        body {
            font-family: 'Tahoma', sans-serif;
            font-size: 12px;
            text-align: justify;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        @page { margin: 1.27cm; }
        /* ── Typography ── */
        .text-10 { font-size: 10px; }
        .text-12 { font-size: 12px; }
        .text-13 { font-size: 13px; }
        .text-14 { font-size: 14px; }

        /* ── Title block (font-size 14, bold, underline, center) ── */
        .doc-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 4px;
        }
        /* ── Contract number subtitle (font-size 14, bold, center) ── */
        .doc-subtitle {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 4px;
        }
        .subtitle {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
        }
        .article-title {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-top: 15px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
        }
        tr {
            page-break-inside: avoid;
        }
        td {
            vertical-align: top;
            padding: 2px 0;
        }
        .label-col {
            width: 35%;
        }
        .colon-col {
            width: 5%;
        }
        .value-col {
            width: 55%;
        }
        .num-col {
            width: 5%;
        }
        .signature-table {
            margin-top: 30px;
            width: 100%;
            text-align: center;
            page-break-inside: avoid;
        }
        .indent-list {
            margin: 0;
            padding-left: 20px;
        }
        .page-number {
            font-size: 10px;
            text-align: right;
        }
        .page-header {
            position: fixed;
            top: -15px;
            right: 0px;
            height: 20px;
            font-size: 10px;
            text-align: right;
        }
        .pagenum:after {
            content: counter(page);
        }
        .sign-city-date {
            text-align:center;
            margin-top: 50px;
            margin-bottom: none;
        }
        .doc-footer {
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <div class="page-header">
        <span class="pagenum"></span>
    </div>

    @php
        // Base64-encode assets for reliable dompdf rendering
        $logoBase64      = $logoPath      && file_exists($logoPath)      ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))      : null;
        $signatureBase64 = $signaturePath && file_exists($signaturePath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($signaturePath)) : null;
    @endphp
    @php
        $seqFormatted     = str_pad($pkwtMonthlySeq ?? 1, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $issueDate    = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : now();
        $romanMonth   = $romanMonths[$issueDate->month] ?? 'I';
        $year         = $issueDate->year;
        $pkwt_formatted = sprintf('%s/ARU/PKPH/%s/%s', $seqFormatted, $romanMonth, $year);

        $startDateObj = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : null;
        $endDateObj   = $contract->end_date   ? \Carbon\Carbon::parse($contract->end_date)   : null;
        
        $startDate    = $startDateObj ? $startDateObj->translatedFormat('d F Y') : '-';
        $endDate      = $endDateObj   ? $endDateObj->translatedFormat('d F Y')   : '-';

        // Use duration_months from DB if available, fallback to int casted diffInMonths
        $durationMonths = $contract->duration_months ?: null;
        if (!$durationMonths && $startDateObj && $endDateObj) {
            $durationMonths = (int) $startDateObj->diffInMonths($endDateObj->copy()->addDay());
        }
        $durationText   = $durationMonths !== null ? $durationMonths . ' BULAN' : '-';

        // Compensation
        $upahPokok       = $contract->compensation?->base_salary         ?? 0;
        $uangKehadiran   = $contract->compensation?->attendance_allowance ?? 0;
        $upahLembur      = $contract->compensation?->overtime_weekday_rate ?? 0;
        
        $rateMap = [
            'monthly' => 'Bulan',
            'daily'   => 'Hari',
            'hourly'  => 'Jam'
        ];
        $salaryUnit = $rateMap[$contract->compensation?->salary_rate ?? 'daily'] ?? 'Hari';
        $allowanceUnit = $rateMap[$contract->compensation?->allowance_rate ?? 'daily'] ?? 'Hari';
        $overtimeUnit = $rateMap[$contract->compensation?->overtime_rate ?? 'hourly'] ?? 'Jam';
    @endphp

    <div class="doc-title" style="margin-bottom: 0;">PERJANJIAN KERJA PEKERJA HARIAN</div>
    <div class="doc-subtitle" style="margin-bottom: 25px;">NOMOR : {{ $pkwt_formatted }}</div>

    <p style="margin-bottom: 12px; margin-top: 20px;">Yang bertanda tangan di bawah ini :</p>

    {{-- PIHAK PERTAMA (internal employee) --}}
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ strtoupper($pihakPertama->name ?? 'JUMAGA TUA SINAGA') }}</strong></td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Jabatan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($pihakPertama->position ?? 'HRD MANAGER PT. ALFA REKA USAHA') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat KTP</td>
            <td class="colon-col">:</td>
            <td class="value-col">KOMPLEKS PERKANTORAN RUKO DUTA PERMAI BLOK E NO. 10, JAKASAMPURNA, BEKASI BARAT, KOTA BEKASI, JAWA BARAT</td>
        </tr>
    </table>

    <p style="margin-top: 12px; margin-bottom: 12px;">
        Yang dalam perjanjian ini karena jabatannya untuk mewakili perusahaan dalam hal menandatangani kesepakatan kerja ini bertindak dan atas nama perusahaan <strong>PT. ALFA REKA USAHA</strong> yang selanjutnya disebut <strong>PIHAK PERTAMA</strong>.
    </p>

    {{-- PIHAK KEDUA (worker) --}}
    <table>
        <tr>
            <td class="num-col">2.</td>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->name ?? '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Tempat/Tanggal Lahir</td>
            <td class="colon-col">:</td>
            <td class="value-col">
                {{ strtoupper($worker->birth_place ?? '-') }}, {{ $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-' }}
            </td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Jenis Kelamin</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->gender === 'male' ? 'LAKI-LAKI' : ($worker->gender === 'female' ? 'PEREMPUAN' : '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">No. KTP</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->ktp_number ?? '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Pendidikan Akhir</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->education ?? '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Agama</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->religion ?? '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Status Perkawinan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->marital_status ?? '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat KTP</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->address_ktp ?? '-') }}</td>
        </tr>
    </table>

    <p style="margin-top: 12px; margin-bottom: 12px;">
        Yang dalam perjanjian ini bertindak untuk dan atas nama dirinya sendiri, dan selanjutnya disebut <strong>PIHAK KEDUA</strong>.
    </p>

    <p style="margin-bottom: 12px;">
        Pada hari ini {{ $startDateObj ? $startDateObj->translatedFormat('l') : '-' }} 
        Tanggal {{ $startDateObj ? $startDateObj->format('d') : '-' }} 
        Bulan {{ $startDateObj ? $startDateObj->translatedFormat('F') : '-' }} 
        Tahun {{ $startDateObj ? $startDateObj->format('Y') : '-' }} di Kota Bekasi Jawa Barat, masing &ndash; masing 
        <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> sepakat saat membuat dan menandatanagani kesepakatan kerja ini menyatakan bahwa <strong>PIHAK KEDUA</strong> 
        dalam keadaan kondisi sehat jasmani dan rohani, serta tidak dalam kedaaan terpaksa atau dibawah tekanan 
        oleh siapaun dan atau <strong>PIHAK LAIN</strong> atau siapapun juga, sehingga patut secara hukum membuat kesepakatan serta mengikatkan diri dalam bentuk 
        <strong>PERJANJIAN KERJA PEKERJA HARIAN (DAILY WORKER)</strong> yang telah diatur dalam pasal &ndash; pasal sebagai berikut :
    </p>

    <div class="article-title">
        PASAL 1<br>
        KESEPAKATAN KERJA DAN JANGKA WAKTU
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Kesepakatan kerja ini berlaku <strong>{{ [1 => 'satu', 2 => 'dua', 3 => 'tiga', 4 => 'empat', 5 => 'lima', 6 => 'enam', 7 => 'tujuh', 8 => 'delapan', 9 => 'sembilan', 10 => 'sepuluh', 11 => 'sebelas', 12 => 'dua belas'][$durationMonths ?? 0] ?? ($durationMonths ?? 0) }} ({{ $durationMonths ?? 0 }}) Bulan</strong> dimulai dari tanggal <strong>{{ $startDate }}</strong> dan berakhir sampai dengan tanggal <strong>{{ $endDate }}.</strong></td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Perpanjangan/Pembaharuan atas jangka waktu sebagaimana tersebut di atas dapat dilakukan atas kesepakatan dan itikad baik kedua belah <strong>PIHAK</strong> dan akan di evaluasi kinerja selanjutnya disesuaikan berdasarkan kebutuhan operasional dari <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Pada saat perjanjian kerja berakhir, <strong>PIHAK KEDUA</strong> berkewajiban mengembalikan seluruh aset atau barang &ndash; barang inventaris milik <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> yang telah diserahkan kepada <strong>PIHAK KEDUA</strong>, dan <strong>PIHAK PERTAMA</strong> tidak berkewajiban memberikan uang pisah/pesangon atau kompensasi apapun kepada <strong>PIHAK KEDUA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 2<br>
        TUGAS DAN PENEMPATAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                <strong>PIHAK PERTAMA</strong> menempatkan <strong>PIHAK KEDUA</strong> di <strong>{{ strtoupper($contract->assignment->project->client->full_name ?? 'PT. CJ Foodville Bakery And Cafe Indonesia') }}</strong> dengan status <strong>Pekerja Harian/Daily Worker (Pekerja Tidak Tetap)</strong> dengan ketentuan sebagai berikut:
                <table style="margin-top: 5px;">
                    <tr>
                        <td style="width: 32%;">&bull; Posisi</td>
                        <td style="width: 4%;">:</td>
                        <td>{{ strtoupper($contract->assignment->position ?? '-') }}</td>
                    </tr>
                    <tr>
                        <td>&bull; Nik Karyawan</td>
                        <td>:</td>
                        <td>{{ $worker->nik_aru ?? '-' }}</td>
                    </tr>
                    <tr>
                        <td>&bull; Lokasi Kerja</td>
                        <td>:</td>
                        <td>{{ strtoupper($contract->assignment->branches->pluck('name')->implode(', ') ?: '-') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> harus melaksanakan tugas/pekerjaan dengan sebaik-baiknya sesuai dengan petunjuk/ketentuan serta Peraturan Perusahaan <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Bila dipandang perlu, <strong>PIHAK PERTAMA</strong> dapat memindahkan <strong>PIHAK KEDUA</strong> pada tugas/pekerjaan yang dibutuhkan sesuai dengan kebutuhan <strong>PEMBERI KERJA</strong>, yang akan diatur lebih lanjut melalui <strong>SK Penempatan</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Tenaga Kontrak tersebut tidak dimaksudkan untuk mempersiapkan <strong>PIHAK KEDUA</strong> sebagai karyawan tetap <strong>PIHAK PERTAMA</strong>, dan <strong>PIHAK KEDUA</strong> tidak akan menuntut dikemudian hari untuk menjadi pegawai Tetap <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 3<br>
        HARI DAN JAM KERJA
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td><strong>PIHAK KEDUA</strong> telah menyetujui jam kerja yang dibuat oleh pihak pertama dengan jadwal kerja harian yaitu sehari 8 jam kerja (7 jam kerja dan 1 jam istirahat kerja) dalam sehari atau 42 jam kerja dalam seminggu dengan sistem kerja shifting (1 shift atau 3 shift) dalam sehari disesuaikan dengan jadwal jam kerja dari <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Ketentuan pengaturan waktu, jam kerja serta hari libur (istirahat mingguan) ditetapkan oleh <strong>PEMBERI KERJA</strong> dan harus ditaati oleh <strong>PIHAK KEDUA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 4<br>
        HAK PIHAK KEDUA
    </div>
    
    <p style="margin-top: 0; margin-bottom: 10px;">
        <strong>PIHAK PERTAMA</strong> memberikan Benefit & Fasilitas Jaminan Sosial kepada <strong>PIHAK KEDUA</strong> sebagai berikut :
    </p>
    <table style="margin-bottom: 10px; margin-left: 20px; width: 95%;">
        <tr>
            <td style="width: 5%;">-</td>
            <td style="width: 40%;">Gaji/Upah Harian</td>
            <td style="width: 5%;">:</td>
            <td>Rp. {{ number_format($upahPokok, 0, ',', '.') }},-/{{ ucfirst($salaryUnit) }}</td>
        </tr>
        <tr>
            <td>-</td>
            <td>Tunjangan Kehadiran</td>
            <td>:</td>
            <td>Rp. {{ number_format($uangKehadiran, 0, ',', '.') }},-/{{ ucfirst($allowanceUnit) }}</td>
        </tr>
        <tr>
            <td>-</td>
            <td>Upah Lembur</td>
            <td>:</td>
            <td>Rp. {{ number_format($upahLembur, 0, ',', '.') }},-/{{ ucfirst($overtimeUnit) }}</td>
        </tr>
        <tr>
            <td>-</td>
            <td colspan="3">BPJS Ketenagakerjaan :
                <div class="indent-list" style="margin-top: 5px;">
                    &bull; Jaminan Kecelakaan Kerja (JKK)<br>
                    &bull; Jaminan Kematian (JKM)
                </div>
            </td>
        </tr>
    </table>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Gaji (Upah) dibayarkan <strong>PIHAK PERTAMA</strong> kepada <strong>PIHAK KEDUA</strong> setiap bulannya di setiap tanggal 28 (dua puluh delapan) akhir bulan.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Apabila <strong>PIHAK KEDUA</strong> tidak masuk bekerja dengan alasan apapun maka upah/ gajinya tidak diperhitungkan sebesar (Upah Pokoknya/perhitungan gaji pokok : 25 hari x hari kerja tidak masuk bekerja) + tunjangan lain selama hari tidak masuk kerja.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Pembayaran Gaji (Upah) dinyatakan dalam bruto (kotor) dan dikenakan pajak penghasilan (PPH) Pasal 21 yang dipotong oleh perusahaan sesuai dengan peraturan perpajakan yang berlaku.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td><strong>PIHAK PERTAMA</strong> akan memberikan Tunjangan Hari Raya (THR) kepada <strong>PIHAK KEDUA</strong> sesuai dengan kententuan Undang &ndash; undang Ketenagakerjaan berdasarkan Permenaker No. 6 Tahun 2016 dan akan diberikan paling lambat 2 (dua) minggu sebelum Hari Raya Keagamaan.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 5<br>
        TATA TERTIB
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td><strong>PIHAK KEDUA</strong> harus melakukan absensi finger print pada saat masuk dan pulang kerja.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> tidak diperbolehkan tukar menukar jadwal jam kerja dan hari libur kerja tanpa persetujuan Atasan.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td><strong>PIHAK KEDUA</strong> wajib mematuhi segala bentuk peraturan yang berlaku di Perusahaan.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td><strong>PIHAK KEDUA</strong> diharapkan datang ke tempat kerja 30 (tiga puluh) menit sebelum jam kerja dan masuk bekerja tepat pada waktunya.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td>Apabila diperlukan oleh <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>, <strong>PIHAK KEDUA</strong> bersedia untuk bekerja baik pada hari libur, istirahat dan hari besar Nasional.</td>
        </tr>
        <tr>
            <td class="num-col">6.</td>
            <td>Apabila <strong>PIHAK KEDUA</strong> tidak dapat bekerja dikarenakan alasan pribadi maka pengajuan ijin tidak masuk kerja harus dilakukan minimal 1 (satu) hari sebelumnya. Ijin hanya dapat dilaksanakan setelah mendapat persetujuan tertulis dari atasan langsung/Manager <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">7.</td>
            <td>Ijin datang terlambat, pulang cepat maupun meninggalkan lokasi kerja untuk beberapa saat hanya dapat dilakukan setelah mendapat persetujuan tertulis dari atasan langsung/Manager <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">8.</td>
            <td><strong>PIHAK KEDUA</strong> wajib menginformasikan segala ijin yang sudah mendapat persetujuan dari atasan <strong>PIHAK KEDUA</strong> kepada <strong>PIHAK PERTAMA</strong> melalui bagian HRD.</td>
        </tr>
        <tr>
            <td class="num-col">9.</td>
            <td><strong>PIHAK KEDUA</strong> diwajibkan mengetahui dan mentaati ketentuan/prosedur kesehatan dan keselamatan kerja serta melaksanakan dengan sebaik-baiknya.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 6<br>
        SANKSI - SANKSI
    </div>

    <p style="margin-top: 0; margin-bottom: 10px;">
        <strong>PIHAK KEDUA</strong> bersedia dikenakan sanksi administrasi disiplin atau sanksi yang dapat berakibat sampai <strong>pemutusan hubungan kerja</strong> atas perbuatannya atau tindakannya yang bertentangan dengan <strong>Peraturan Ketenagakerjaan</strong> dan <strong>Peraturan Perusahaan</strong> yang berlaku.
    </p>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Tindakan pendisiplinan atau sanksi tersebut di atas juga dapat dilakukan oleh <strong>PIHAK PERTAMA</strong> jika <strong>PIHAK KEDUA</strong> dalam menjalankan tugas/pekerjaan tidak menunjukan kemauan bekerja dengan baik, misalnya :
                <div class="indent-list">
                    a. Bermalas-malasan dalam pekerjaan<br>
                    b. Sering meninggalkan pekerjaan atau tidak masuk tanpa izin Pimpinan/Atasan<br>
                    c. Terlambat masuk kerja<br>
                    d. Tidak menuruti instruksi yang wajar dari Atasan<br>
                    e. Mengganggu, menghambat kerja yang berkaitan dengan operasional (teman sekerja)<br>
                    f. Terlibat tindakan kriminal, baik di dalam maupun di luar lingkungan <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>.<br>
                    g. Melakukan perbuatan yang merugikan <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> langsung maupun tidak langsung lainnya.<br>
                    h. Tidak menuntut segala hal dalam bentuk apapun jika <strong>PIHAK KEDUA</strong> resign atau mengundurkan tidak sesuai prosedure (resign mendadak) maka surat keterangan kerja atau paklaring dan gaji ataupun THR tidak akan di berikan oleh Perusahaan.<br>
                    i. <strong>PIHAK KEDUA</strong> wajib mengganti kerugian sebesar kerugian perusahaan jika terbukti melakukan pencurian uang maupun barang &ndash; barang lainnya milik perusahaan.
                </div>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>
                Tindakan pendisiplinan atau sanksi tersebut diatas diambil oleh <strong>PIHAK PERTAMA</strong> dengan terlebih dahulu memberikan peringatan, dalam hal peringatan<br>
                <div class="indent-list">
                    a. <strong>PIHAK PERTAMA</strong> dapat memberikan Peringatan Pertama, Kedua dan Ketiga.<br>
                    b. Peringatan tidak harus diberikan secara berurutan, akan tetapi dapat langsung diberikan surat Peringatan III/terakhir, hal ini tergantung pada berat ringannya kesalahan/pelanggaran yang dilakukan <strong>PIHAK KEDUA</strong>.<br>
                    c. Apabila <strong>PIHAK KEDUA</strong> telah mendapatkan surat Peringatan III/terakhir dan <strong>PIHAK KEDUA</strong> masih melakukan kesalahan/pelanggaran, maka <strong>PIHAK PERTAMA</strong> dapat memutuskan hubungan kerja tanpa kompensasi berupa apapun.
                </div>
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 7<br>
        PENGAKHIRAN/PEMUTUSAN DAN PERPANJANGAN HUBUNGAN KERJA
    </div>
    
    <table style="width: 100%;">
        <tr>
            <td style="width: 5%; vertical-align: top;">I.</td>
            <td style="vertical-align: top;">
                Pemutusan Hubungan kerja dapat dilakukan oleh <strong>PARA PIHAK</strong> dengan ketentuan sebagai berikut:
                <table style="width: 100%; margin-top: 5px;">
                    <tr>
                        <td class="num-col" style="width: 5%;">1.</td>
                        <td>Hubungan Kerja berakhir demi hukum sesuai dengan berakhirnya perjanjian kerja ini seperti tercantum pada pasal 1 ayat 1 diatas.</td>
                    </tr>
                    <tr>
                        <td class="num-col">2.</td>
                        <td>
                            <strong>PIHAK PERTAMA</strong> dapat memutuskan hubungan kerja sewaktu-waktu dan secara sepihak apabila:
                            <div class="indent-list">
                                a. <strong>PIHAK KEDUA</strong> melakukan pelanggaran berat seperti tercantum pada <strong>pasal 158 Undang-undang Ketenagakerjaan no.13 Tahun 2003</strong>. seperti: Melakukan penipuan, pencurian, penggelapan barang atau uang milik <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>, memberikan keterangan palsu atau yang dipalsukan, mabuk, minum minuman keras di lokasi kerja memakai atau mengedarkan Narkoba, melakukan asusila atau perjudian dilokasi kerja dan melakukan hal-hal lain yang tercantum pada pasal tersebut.<br>
                                b. <strong>PIHAK KEDUA</strong> melanggar peraturan yang berlaku atau melakukan kelalaian yang merugikan <strong>PIHAK PERTAMA</strong>, maupun <strong>PEMBERI KERJA</strong> dalam hal ini <strong>PIHAK PERTAMA</strong> tidak memberikan kompensasi dalam bentuk apapun dan <strong>PIHAK KEDUA</strong> harus mengganti rugi seluruh kerugian <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> setelah dinyatakan terbukti bersalah oleh <strong>PIHAK PERTAMA</strong>.<br>
                                c. Kontrak kerja <strong>PIHAK PERTAMA</strong> dengan <strong>PEMBERI KERJA</strong> tidak diperpanjang lagi dan atau diputuskan secara tiba-tiba dan sepihak karena sesuatu hal, atau karena perusahaan <strong>PEMBERI KERJA</strong> tutup sebagian atau seluruhnya, meskipun Kontrak kerja antara <strong>PIHAK PERTAMA</strong> dengan <strong>PIHAK KEDUA</strong> jangka waktunya belum berakhir, maka <strong>PIHAK PERTAMA</strong> tidak wajib memberikan ganti kerugian dalam bentuk apapun kepada <strong>PIHAK KEDUA</strong>.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="num-col">3.</td>
                        <td>Bahwa <strong>PIHAK KEDUA</strong> dianggap mengundurkan diri atas kehendak sendiri apabila selama 5 (lima) hari berturut-turut tidak masuk kerja tanpa ijin dan tanpa memberikan alasan yang sah dan dapat diterima.</td>
                    </tr>
                    <tr>
                        <td class="num-col">4.</td>
                        <td><strong>PIHAK KEDUA</strong> tidak mengindahkan teguran lisan maupun tulisan yang diberikan oleh <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> dimana pekerja ditempatkan.</td>
                    </tr>
                    <tr>
                        <td class="num-col">5.</td>
                        <td>Apabila oleh suatu hal <strong>PEMBERI KERJA</strong> mengembalikan <strong>PIHAK KEDUA</strong> kepada <strong>PIHAK PERTAMA</strong> dengan alasan apapun, maka dengan sendirinya hubungan kerja antara <strong>PIHAK PERTAMA</strong> dengan <strong>PIHAK KEDUA</strong> berakhir.</td>
                    </tr>
                    <tr>
                        <td class="num-col">6.</td>
                        <td>Apabila <strong>PIHAK KEDUA</strong> dan atau <strong>PIHAK PERTAMA</strong> berkeinginan mengakhiri kontrak kerja sebelum jangka waktunya berakhir, maka <strong>PIHAK KEDUA</strong> harus memberitahukan atau mengajukan surat secara tertulis mengenai hal tersebut minimal 1 (satu) bulan sebelumnya, maka dalam hal ini <strong>PIHAK PERTAMA</strong> tidak wajib memberikan ganti kerugian dalam bentuk apapun kepada <strong>PIHAK KEDUA</strong>.</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="width: 5%; vertical-align: top; padding-top: 10px;">II.</td>
            <td style="vertical-align: top; padding-top: 10px;">
                Perpanjangan Jangka Waktu Perjanjian kerja ini hanya dapat terjadi bilamana <strong>PARA PIHAK</strong> sepakat untuk melakukan hal tersebut dengan pertimbangan sebagai berikut :
                <div class="indent-list" style="margin-top: 5px;">
                    a. Adanya kebutuhan di <strong>PIHAK PERTAMA</strong> berdasarkan order dan kebutuhan dari <strong>PEMBERI KERJA</strong> yang menggunakan tenaga <strong>PIHAK KEDUA</strong>.<br>
                    b. Catatan prestasi kerja <strong>PIHAK KEDUA</strong> selama hubungan kerja berlangsung adalah dinyatakan baik dan wajar sesuai dengan kriteria <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>.<br>
                    c. Tidak adanya alasan-alasan tertentu berdasarkan peraturan Ketenagakerjaan <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> dan atau Peraturan Ketenagakerjaan yang berlaku.
                </div>
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 8<br>
        PENYESELAIAN PERSELISIHAN DAN LAIN-LAIN
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td><strong>PIHAK KEDUA</strong> tidak akan meminta / menuntut penghasilan lain diluar apa yang telah dicantumkan pada pasal 4 ayat 1 diatas.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> wajib menjaga kerahasiaan apapun milik <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>, meskipun <strong>PIHAK KEDUA</strong> sudah tidak bekerja lagi untuk <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Apabila terjadi perselisihan diantara <strong>KEDUA BELAH PIHAK</strong>, maka <strong>KEDUA BELAH PIHAK</strong> sepakat menempuh jalan musyawarah untuk mufakat.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Apabila Musyawarah tidak menghasilkan kata sepakat maka <strong>KEDUA BELAH PIHAK</strong> dapat menempuh mekanisme hukum sesuai dengan undang-undang ketenagakerjaan yang berlaku.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td><strong>PIHAK KEDUA</strong> dilarang membocorkan, mengungkapkan data dan atau informasi rahasia Perusahaan, kecuali untuk kepentingan Negara atau keputusan Pengadilan.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 9<br>
        PENUTUP
    </div>
    
    <p style="margin-top: 0; margin-bottom: 10px;">
        Hal - hal yang belum diatur dalam kesepakatan kerja ini akan mengacu kepada Peraturan Ketenagakerjaan yang berlaku, Kesepakatan kerja ini dibuat rangkap 1 (satu), dan memiliki kekuatan hukum yang sama.
    </p>
    <p style="margin-top: 0; margin-bottom: 10px;">
        Hal-hal mengenai perubahan dan/atau segala sesuatu yang belum cukup diatur dan/atau belum diatur dalam kesepakatan kerja ini, apabila dipandang perlu akan diatur kemudian dengan dibuatkan perubahan atau tambahan <strong>(amandemen/addendum)</strong> yang ditandatangani oleh <strong>PARA PIHAK</strong> merupakan bagian yang mengikat dan tidak terpisahkan dari kesepakatan kerja ini. Serta akan disampaikan kembali apabila ada perubahan dan atau dalam kesepakatan kerja ini.
    </p>
    <p style="margin-top: 0; margin-bottom: 15px;">
        Demikian kesepakatan kerja ini dibuat dan untuk ditandatangani oleh <strong>KEDUA BELAH PIHAK</strong> dan disepakati bersama dalam keadaan sehat jasmani dan rohani serta tanpa paksaan dari pihak manapun.
    </p>

    <div class="sign-city-date">
        Bekasi, {{ $startDateObj ? $startDateObj->translatedFormat('d F Y') : '-' }}
    </div>

    <table class="signature-table">
        <tr>
            <td style="width: 40%;" class="sign-party-label"><strong>PIHAK PERTAMA</strong></td>
            <td style="width: 20%;">&nbsp;</td>
            <td style="width: 40%;" class="sign-party-label"><strong>PIHAK KEDUA</strong></td>
        </tr>
        <tr>
            <td style="height: 90px; text-align: center; vertical-align: bottom;">
                &nbsp;
            </td>
            <td style="height: 90px; text-align: center; vertical-align: middle;">
                <div class="sign-materai" style="border: 1px solid #000; display: inline-block; padding: 8px 18px; font-style: italic;">
                    Materai 10.000
                </div>
            </td>
            <td style="height: 90px; text-align: center; vertical-align: bottom;">
                &nbsp;
            </td>
        </tr>
        <tr>
            <td class="sign-party-name">
                <strong><u>{{ strtoupper($pihakPertama->name ?? 'JUMAGA TUA SINAGA') }}</u></strong>
            </td>
            <td>&nbsp;</td>
            <td class="sign-party-name">
                <strong><u>{{ strtoupper($worker->name ?? '-') }}</u></strong>
            </td>
        </tr>
    </table>
</body>
</html>