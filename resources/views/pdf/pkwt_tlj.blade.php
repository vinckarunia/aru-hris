<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PKWT Document</title>
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
        .bpjs tr,
        .bpjs th,
        .bpjs td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
        }
        .bpjs th.top-left {
            border-color: #fff!important;
            border-right-color: #000!important;
        }        
        .bpjs td.top-left {
            border-left-color: #fff!important;
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
        /**
         * Contract number: {monthlySeq}/ARU/PKWT-{pkwtNumber}/{romanMonth}/{year}
         * First segment = monthly letter sequence (from controller).
         * Second segment = pkwt_number (which PKWT this is for the worker).
         * Roman month & year = document issuance date (today), not contract start.
         */
        $seqFormatted     = str_pad($pkwtMonthlySeq ?? 1, 3, '0', STR_PAD_LEFT);
        $pkwtNumFormatted = str_pad($contract->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $contractDate = \Carbon\Carbon::parse($contract->start_date ?? now());
        $issueDate    = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : now();
        $romanMonth   = $romanMonths[$issueDate->month] ?? 'I';
        $year         = $issueDate->year;
        $pkwt_formatted = sprintf('%s/ARU/PKWT-%s/%s/%s', $seqFormatted, $pkwtNumFormatted, $romanMonth, $year);

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
        $tunjanganAllowance = $contract->compensation?->allowance        ?? 0;
        $uangMakan       = $contract->compensation?->meal_allowance      ?? 0;
        $uangTransport   = $contract->compensation?->transport_allowance  ?? 0;
        $uangKehadiran   = $contract->compensation?->attendance_allowance ?? 0;
        $insentifKinerja = $contract->compensation?->performance_bonus   ?? 0;

        // Dynamic footer year
        $footerYear = $year;
    @endphp

    <div class="doc-title">PERJANJIAN KERJA WAKTU TERTENTU (PKWT)</div>
    <div class="doc-subtitle">NOMOR : {{ $pkwt_formatted }}</div>

    <p style="margin-bottom: 12px; margin-top: 20px;">Yang bertanda tangan di bawah ini:</p>

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
            <td class="value-col">{{ strtoupper($pihakPertama->position ?? 'HEAD OF OPERATION PT. ALFA REKA USAHA') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat</td>
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
            <td class="value-col">{{ strtoupper($worker->gender === 'male' ? 'Laki-laki' : ($worker->gender === 'female' ? 'Perempuan' : '-')) }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Nomor KTP</td>
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
            <td class="label-col">Status Pernikahan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->tax_status ? (strpos($worker->tax_status, 'TK') === 0 ? 'Tidak Kawin' : (strpos($worker->tax_status, 'K') === 0 ? 'Kawin' : $worker->tax_status)) : '-') }} ({{ $worker->tax_status }})</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat Lengkap</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->address_domicile ?? $worker->address_ktp ?? '-') }}</td>
        </tr>
    </table>

    <p style="margin-top: 12px; margin-bottom: 12px;">
        Yang dalam perjanjian ini bertindak untuk dan atas nama dirinya sendiri, dan selanjutnya disebut <strong>PIHAK KEDUA</strong>.
    </p>

    <p style="margin-bottom: 12px;">
        Pada hari ini {{ $startDateObj ? $startDateObj->translatedFormat('l') : '-' }} 
        Tanggal {{ $startDateObj ? $startDateObj->format('d') : '-' }} 
        Bulan {{ $startDateObj ? $startDateObj->translatedFormat('F') : '-' }} 
        Tahun {{ $startDateObj ? $startDateObj->format('Y') : '-' }} di Kota Bekasi Jawa Barat, 
        masing-masing <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> sepakat saat membuat dan menandatangani perjanjian kerja ini menyatakan bahwa <strong>PIHAK KEDUA</strong> 
        dalam keadaan kondisi sehat jasmani dan rohani, serta tidak dalam keadaan terpaksa atau dibawah tekanan 
        oleh siapapun juga, sehingga patut secara hukum membuat kesepakatan serta mengikatkan diri dalam bentuk 
        <strong>Perjanjian Kerja Waktu Tertentu (PKWT)</strong> yang diatur dalam pasal-pasal sebagai berikut:
    </p>

    <div class="article-title">
        PASAL 1<br>
        NAMA PERJANJIAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Perjanjian kerja ini disebut <strong>Perjanjian Kerja Waktu Tertentu</strong>, dan disingkat : <strong>PKWT</strong></td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> sepakat perjanjian kerja ini didasarkan pada jangka waktu tertentu.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 2<br>
        MASA BERLAKU PERJANJIAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Kesepakatan kerja ini dibuat dan berlaku <strong>{{ $durationText }}</strong> terhitung mulai dari tanggal <strong>{{ $startDate }}</strong> sampai dengan tanggal <strong>{{ $endDate }}</strong>.
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Apabila dipandang perlu oleh <strong>PIHAK PERTAMA</strong>, perjanjian kerja ini dapat diperpanjang dengan persetujuan <strong>PIHAK KEDUA</strong> berdasarkan Penilaian kerja dari <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Apabila perjanjian kerja ini berakhir masa berlakunya sebagaimana dimaksud dalam ayat 1 (satu) pasal ini tidak diadakan perpanjangan lagi, maka hubungan kerja antara <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> dinyatakan berakhir demi Hukum dan <strong>PIHAK PERTAMA</strong> tidak berkewajiban membayar kompensasi dalam bentuk apapun kepada <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Salah satu pihak dilarang memaksakan kehendak terhadap PIHAK lainnya untuk memperpanjang perjanjian kerja ini setelah berakhirnya masa berlaku sebagaimana dimaksud dalam ayat 1 (satu) pasal ini.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td>Pemberitahuan akan berakhirnya masa berlaku perjanjian kerja ini dilakukan paling lambat 30 (tiga puluh) hari sebelumnya oleh salah satu PIHAK kepada PIHAK lainnya dalam perjanjian ini.</td>
        </tr>
        <tr>
            <td class="num-col">6.</td>
            <td>Apabila Perjanjian kerja ini berakhir masa berlakunya sebagaimana dimaksud dalam ayat 1 (satu) pasal ini tidak diadakan perpanjangan lagi, maka hubungan kerja antara <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> dinyatakan berakhir demi Hukum dan <strong>PIHAK PERTAMA</strong> tidak berkewajiban membayar kompensasi apapun.</td>
        </tr>
        <tr>
            <td class="num-col">7.</td>
            <td>Apabila <strong>PIHAK KEDUA</strong> bermaksud mengakhiri hubungan kerja sebelum habis masa berlaku perjanjian kerja ini sebagaimana dimaksud dalam ayat 1 (satu) pasal ini, maka <strong>PIHAK KEDUA</strong> wajib memberitahukan kepada <strong>PIHAK PERTAMA</strong> selambat-lambatnya 30 (tiga puluh) hari sebelum mengakhiri hubungan kerjanya.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 3<br>
        PENEMPATAN KERJA
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                <strong>PIHAK PERTAMA</strong> menempatkan <strong>PIHAK KEDUA</strong> di <strong>{{ $contract->assignment->project->client->full_name ?? '-' }}</strong> dengan ketentuan sebagai berikut:
                <table style="margin-top: 5px;">
                    <tr>
                        <td style="width: 32%;">Posisi</td>
                        <td style="width: 4%;">:</td>
                        <td>{{ strtoupper($contract->assignment->position ?? '-') }}</td>
                    </tr>
                    <tr>
                        <td>Lokasi Kerja</td>
                        <td>:</td>
                        <td>STORE TOUS LES JOURS BAKERY - JABODETABEK</td>
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
            <td>
                Bila dipandang perlu, <strong>PIHAK PERTAMA</strong> dapat memindahkan <strong>PIHAK KEDUA</strong> pada tugas/pekerjaan yang dibutuhkan sesuai dengan kebutuhan <strong>PEMBERI KERJA</strong>, 
                yang akan diatur lebih lanjut melalui <strong>SK Penempatan</strong>.
            </td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>
                Apabila dikemudian hari <strong>PIHAK KEDUA</strong> menolak untuk dimutasi kerja ke lokasi lainnya sebagaimana dimaksud dalam ayat (3) pasal
                ini, maka <strong>PIHAK PERTAMA</strong> dapat memutuskan hubungan kerja dengan <strong>PIHAK KEDUA</strong> dengan cara mengakhiri perjanjian kerja
                ini secara sepihak tanpa kewajiban membayar ganti rugi sisa kontrak kerja yang masih berlaku.
            </td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td>
                Tenaga Kontrak tersebut tidak dimaksudkan untuk mempersiapkan <strong>PIHAK KEDUA</strong> sebagai karyawan tetap <strong>PIHAK PERTAMA</strong>, 
                dan <strong>PIHAK KEDUA</strong> tidak akan menuntut dikemudian hari untuk menjadi pegawai Tetap (karyawan permanen) <strong>PIHAK PERTAMA</strong>.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 4<br>
        HARI DAN JAM KERJA
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                <strong>PIHAK KEDUA</strong> telah menyetujui jam kerja yang dibuat oleh <strong>PIHAK PERTAMA</strong> dengan jadwal kerja yaitu:
                <div class="indent-list">
                    - Hari kerja : 6 (enam) hari kerja seminggu<br>
                    - Jam kerja : 7 (tujuh) jam kerja sehari<br>
                    - Shift : 1 (satu), 2 (dua), 3 (tiga) shift kerja sehari
                </div>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Ketentuan pengaturan waktu, jam kerja serta hari libur (istirahat mingguan) ditetapkan oleh <strong>PEMBERI KERJA</strong> dan harus ditaati oleh <strong>PIHAK KEDUA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 5<br>
        HAK PIHAK KEDUA
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                <strong>PIHAK PERTAMA</strong> memberikan Benefit & Fasilitas Jaminan Sosial kepada <strong>PIHAK KEDUA</strong> sebagai berikut:
                <table style="margin-top: 8px; margin-bottom: 8px; margin-left: 10px; width: 90%;">
                    <tr>
                        <td style="width: 45%;">- Gaji/Upah Pokok</td>
                        <td style="width: 5%;">:</td>
                        <td>Rp. {{ number_format($upahPokok, 0, ',', '.') }},- / Bulan</td>
                    </tr>
                    @if($tunjanganAllowance > 0)
                    <tr>
                        <td>- Tunjangan Allowance</td>
                        <td>:</td>
                        <td>Rp. {{ number_format($tunjanganAllowance, 0, ',', '.') }},- / Bulan</td>
                    </tr>
                    @endif
                    @if($uangKehadiran > 0)
                    <tr>
                        <td>- Tunjangan Kehadiran</td>
                        <td>:</td>
                        <td>Rp. {{ number_format($uangKehadiran, 0, ',', '.') }},- / Hari</td>
                    </tr>
                    @endif
                    @if($uangMakan > 0)
                    <tr>
                        <td>- Uang Makan</td>
                        <td>:</td>
                        <td>Rp. {{ number_format($uangMakan, 0, ',', '.') }},- / Hari</td>
                    </tr>
                    @endif
                    @if($uangTransport > 0)
                    <tr>
                        <td>- Uang Transport</td>
                        <td>:</td>
                        <td>Rp. {{ number_format($uangTransport, 0, ',', '.') }},- / Hari</td>
                    </tr>
                    @endif
                    <tr>
                        <td colspan="3">- BPJS Ketenagakerjaan (Jaminan Hari Tua, Jaminan Pensiun, Jaminan Kecelakaan Kerja, Jaminan Kematian)</td>
                    </tr>
                    <tr>
                        <td colspan="3">- BPJS Kesehatan</td>
                    </tr>
                </table>
                <table class="bpjs" style="margin-left: 10px; width:90%;">
                    <thead>
                        <tr>
                            <th class="top-left"></th>
                            <th colspan="6">BPJS KETENAGAKERJAAN</th>
                            <th colspan="2">BPJS KESEHATAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="top-left"></td>
                            <td colspan="3">PERUSAHAAN</td>
                            <td colspan="3">KARYAWAN</td>
                            <td>PERUSAHAAN</td>
                            <td>KARYAWAN</td>
                        </tr>
                        <tr>
                            <td>BASIC SALARY 2025</td>
                            <td>JHT (3,7%)</td>
                            <td>JP (2%)</td>
                            <td>JKK (0,54%)</td>
                            <td>JKM (0,3%)</td>
                            <td>JHT (2%)</td>
                            <td>JP (1%)</td>
                            <td>BPJS KESEHATAN (4%)</td>
                            <td>BPJS KESEHATAN (1%)</td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>
                Gaji (Upah) diberikan atau dibayarkan <strong>PIHAK PERTAMA</strong> kepada <strong>PIHAK KEDUA</strong> sebagai imbalan atas jasa <strong>PIHAK KEDUA</strong> berdasarkan pembayaran bulanan yang dibayarkan setiap tanggal 28 (dua puluh delapan) setiap bulannya.
            </td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>
                Pembayaran Gaji (Upah) dinyatakan dalam bruto (kotor) dan <strong>PIHAK KEDUA</strong> dikenakan Pajak Penghasilan (PPH) Pasal 21 yang dipotong oleh perusahaan sesuai dengan peraturan perpajakan yang berlaku.
            </td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>
                Apabila <strong>PIHAK KEDUA</strong> tidak masuk kerja tanpa pemberitahuan kepada <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> maka upah akan dipotong berdasarkan jumlah hari tidak masuk kerja (gaji pokok : 25 hari kerja x jumlah hari tidak masuk kerja) atau dengan sebutan IPU (IJIN POTONG UPAH)
            </td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td>
                Ijin-ijin meninggalkan tugas pekerjaan tanpa pengurangi upah <strong>PIHAK KEDUA</strong> :
                <div class="indent-list">
                    a)&nbsp; Sakit dibuktikan dengan Surat Keterangan Dokter<br>
                    b)&nbsp; Keluarga inti meninggal<br>
                    c)&nbsp; Anak Khitanan/Baptis<br>
                    d)&nbsp; Tugas Negara<br>
                    e)&nbsp; Menikah
                    f)&nbsp; Istri Melahirkan
                </div>
            </td>
        </tr>
        <tr>
            <td class="num-col">6.</td>
            <td>
                Ijin-ijin meninggal tugas pekerjaan yang dikategorikan dikenakan pemotongan upah <strong>PIHAK KEDUA</strong> :
                <div class="indent-list">
                    a)&nbsp; Ijin untuk kepentingan sendiri di luar urusan pekerjaan.<br>
                    b)&nbsp; Tidak masuk kerja tanpa pemberitahuan (alpa)<br>
                    c)&nbsp; Tidak masuk kerja dengan alasan sakit tanpa surat keterangan dokter
                </div>
            </td>
        </tr>
        <tr>
            <td class="num-col">7.</td>
            <td>
                <strong>PIHAK PERTAMA</strong> akan memberikan Tunjangan Hari Raya (THR) kepada <strong>PIHAK KEDUA</strong> sesuai dengan berdasarkan Permenaker No. 6 Tahun 2016 dan akan diberikan paling lambat 2 (dua) minggu sebelum hari raya keagamaan.
            </td>
        </tr>
        <tr>
            <td class="num-col">8.</td>
            <td>
                Perhitungan lembur/overtime menyesuaikan dengan kebutuhan dan ketentuan yang berlaku dan dalam pelaksaannya atas perintah Atasan.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 6<br>
        KEWAJIBAN PIHAK KEDUA
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
               <strong>PIHAK KEDUA</strong> wajib menanggung Pajak Penghasilan (PPH) Pasal 21 yang akan dipungut oleh <strong>PIHAK PERTAMA</strong>.
            </td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> menyanggupi untuk melaksanakan pekerjaan yang menjadi tugas dan tanggung jawabnya dengan baik sesuai standard dan prosedur kerja yang sudah ditetapkan oleh <strong>PIHAK PERTAMA</strong> dan <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td><strong>PIHAK KEDUA</strong> bersedia dan sanggup mentaati segala bentuk peraturan dan tata tertib lainnya yang berlaku di <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td><strong>PIHAK KEDUA</strong> bersedia mematuhi segala perintah yang layak dari Atasan / Pimpinan Perusahaan <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td><strong>PIHAK KEDUA</strong> bertanggung jawab terhadap tugas dan pekerjaan yang diberikan oleh <strong>PIHAK PERTAMA</strong> dan / atau Atasan.</td>
        </tr>
        <tr>
            <td class="num-col">6.</td>
            <td><strong>PIHAK KEDUA</strong> dilarang melakukan pekerjaan yang menyimpang dari tugas dan tanggungjawab yang melekat pada jabatan yang disebutkan sesuai Pasal 3 ayat 1 pada perjanjian ini.</td>
        </tr>
        <tr>
            <td class="num-col">7.</td>
            <td><strong>PIHAK KEDUA</strong> sanggup dan bersedia menjalankan pekerjaan lembur apabila <strong>PIHAK PERTAMA</strong> / Atasan memerintahkan untuk kerja lembur.</td>
        </tr>
        <tr>
            <td class="num-col">8.</td>
            <td><strong>PIHAK KEDUA</strong> wajib menyelesaikan tugas dan tanggung jawabnya tepat waktu yang telah ditentukan, Apabila tugas dan tanggung jawab pekerjaan belum selesai maka PIHAK KEDUA wajib menyelesaikannya.</td>
        </tr>
        <tr>
            <td class="num-col">9.</td>
            <td><strong>PIHAK KEDUA</strong> sanggup memahami segala prosedur dan standard kerja yang ditetapkan <strong>PIHAK PERTAMA</strong>, serta menjaga alat kerja dan aset milik <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">10.</td>
            <td><strong>PIHAK KEDUA</strong> wajib memberitahukan setiap perubahan data seperti alamat tempat tinggal, status keluarga, dengan menyerahkan bukti yang sah kepada <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">11.</td>
            <td><strong>PIHAK KEDUA</strong> sanggup dan bersedia menjalani mutasi, rotasi, dan / atau promosi atau demosi dalam lingkungan kerja <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> bilamana diperlukan.</td>
        </tr>
        <tr>
            <td class="num-col">12.</td>
            <td><strong>PIHAK KEDUA</strong> wajib memakai alat pelindung diri (APD) dan menggunakannya dengan cara yang benar sesuai yang ditentukan oleh <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">13.</td>
            <td>
                <strong>PIHAK KEDUA</strong> diwajibkan mengetahui dan mentaati ketentuan/prosedur kesehatan dan keselamatan kerja serta melaksanakan dengan sebaik-baiknya.
            </td>
        </tr>
        <tr>
            <td class="num-col">14.</td>
            <td>
                <strong>PIHAK KEDUA</strong> wajib menjaga kerahasiaan yang berkaitan dengan informasi yang berhubungan dengan pekerjaan yang diberikan oleh <strong>PIHAK PERTAMA</strong>.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 7<br>
        TATA TERTIB
    </div>
    <p style="margin-top: 0; margin-bottom: 10px; padding-left: 10px;">
        <strong>PIHAK KEDUA</strong> harus melakukan absensi finger print atau sistem absensi yang diberlakukan oleh <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> pada saat masuk dan pulang kerja.
    </p>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td><strong>PIHAK KEDUA</strong> tidak diperbolehkan tukar menukar jadwal jam kerja dan hari libur kerja tanpa persetujuan Atasan.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> wajib mematuhi segala bentuk peraturan yang berlaku di Perusahaan.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td><strong>PIHAK KEDUA</strong> diharapkan datang ke tempat atau lokasi kerja minimal 30 (tiga puluh) menit sebelum jam kerja dan masuk bekerja dimulai tepat pada waktunya.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Apabila diperlukan oleh <strong>PEMBERI KERJA</strong>, <strong>PIHAK KEDUA</strong> bersedia untuk bekerja baik pada hari libur, istirahat dan hari besar Nasional.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td>Apabila <strong>PIHAK KEDUA</strong> tidak dapat bekerja dikarenakan alasan pribadi maka pengajuan ijin tidak masuk kerja harus dilakukan minimal 1 (satu) hari sebelumnya. Ijin hanya dapat dilaksanakan setelah mendapat persetujuan tertulis dari Atasan langsung/Manager <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">6.</td>
            <td>Ijin datang terlambat, pulang cepat maupun meninggalkan lokasi kerja untuk beberapa saat hanya dapat dilakukan setelah mendapat persetujuan tertulis dari Atasan langsung/Manager <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">7.</td>
            <td><strong>PIHAK KEDUA</strong> wajib menginformasikan segala ijin, apabila ada keluarga (Ayah kandung, Ibu kandung, Istri, Suami, Anak, Kakak kandung, Adik kandung) meninggal dunia, mendapat panggilan Negara, atau urusan lain yang sangat mendesak dan dapat diterima alasannya, yang sudah mendapat persetujuan dari Atasan <strong>PIHAK KEDUA</strong> kepada <strong>PIHAK PERTAMA</strong> melalui bagian HRD.</td>
        </tr>
        <tr>
            <td class="num-col">8.</td>
            <td><strong>PIHAK KEDUA</strong> tidak diperkenankan mengikat diri dengan dan atau dalam bentuk apapun suatu hubungan kerja dengan <strong>PIHAK LAIN</strong> tanpa seijin <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 8<br>
        PENGUNDURAN DIRI
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Apabila <strong>PIHAK KEDUA</strong> hendak mengundurkan diri sebelum masa berlaku perjanjian kerja sebagaimana yang dimaksud pasal 2 (dua) ayat 7 (tujuh) diatas, maka permohonan pegajuan pengunduran diri harus diajukan secara tertulis kepada <strong>PIHAK PERTAMA</strong> selambat-lambatnya 30 (tiga puluh) hari sebelum tanggal efektif pengunduran diri.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Apabila surat pengunduran diri <strong>PIHAK KEDUA</strong> diajukan kurang dari 30 (tiga puluh) hari, maka surat keterangan kerja tidak akan diberikan kepada <strong>PIHAK KEDUA</strong> atau <strong>PIHAK LAIN</strong> atau orang yang dikuasakan, dan gaji atau sisa perhitungan gaji bulan berjalan akan ditahan (di pending) pembayarannya.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td><strong>PIHAK KEDUA</strong> berkewajiban untuk mengembalikan semua inventaris atau atribut miliki perusahaan dan atau perlengkapan kerja lainnya termasuk pakaian seragam, sepatu dan lainnya setelah tidak aktif bekerja dan dikembalikan kepada <strong>PIHAK PERTAMA</strong>, apabila <strong>PIHAK KEDUA</strong> tidak mengembalikan semua atribut miliki perusahaan atau perlengkapan kerja yang dititipkan atau dipinjamkan kepada <strong>PIHAK KEDUA</strong> maka gaji atau sisa perhitungan gaji akan ditahan (di pending) sampai <strong>PIHAK KEDUA</strong> mengembalikannya kepada <strong>PIHAK PERTAMA</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 9<br>
        SANKSI &ndash; SANKSI
    </div>
    <p style="margin-top: 0; margin-bottom: 10px; padding-left: 10px;">
        <strong>PIHAK KEDUA</strong> bersedia dikenakan sanksi administrasi disiplin atau sanksi yang dapat berakibat sampai <strong>pemutusan hubungan kerja</strong> atas perbuatannya atau tindakannya yang bertentangan dengan <strong>Peraturan Ketenagakerjaan</strong> dan <strong>Peraturan Perusahaan</strong> yang berlaku.
    </p>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Apabila dikemudian hari diketahui ada data - data yang diberikan <strong>PIHAK KEDUA</strong> tidak benar atau dipalsukan, baik yang tertera dalam biodata dan data - data yang tertera dalam berkas lamaran kerja maupun data yang tertera dalam perjanjian kerja ini, maka <strong>PIHAK KEDUA</strong> setuju dan bersedia menerima sanksi berupa diberhentikan secara tidak hormat dari Perusahaan oleh <strong>PIHAK PERTAMA</strong> dengan kehilangan hak guna menuntut sesuatu hak apapun, dan <strong>PIHAK PERTAMA</strong> tidak berkewajiban untuk membayar upah selama sisa masa kontrak kerja masih berlaku.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Apabila terjadi pemalsuan dokumen apapun terkait diri <strong>PIHAK KEDUA</strong>, maka <strong>PIHAK KEDUA</strong> setuju apabila <strong>PIHAK PERTAMA</strong> menyerahkan proses penanganannya kepada pihak yang berwajib (Kepolisian) karena dianggap telah terjadi tindak pidana pemalsuan data yang dilakukan oleh <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>
                Tindakan pendisiplinan atau sanksi tersebut di atas juga dapat dilakukan oleh <strong>PIHAK PERTAMA</strong> jika <strong>PIHAK KEDUA</strong> dalam menjalankan tugas/pekerjaan tidak menunjukan kemauan bekerja dengan baik, misalnya :
                <div class="indent-list">
                    a. Bermalas-malasan dalam pekerjaan.<br>
                    b. Sering meninggalkan pekerjaan atau tidak masuk tanpa izin Pimpinan/Atasan.<br>
                    c. Terlambat masuk kerja.<br>
                    d. Tidak menuruti instruksi yang wajar dari Atasan.<br>
                    e. Mengganggu, menghambat kerja yang berkaitan dengan operasional (teman sekerja).<br>
                    f. Terlibat tindakan kriminal, baik di dalam maupun di luar lingkungan <strong>PEMBERI KERJA</strong>.<br>
                    g. Melakukan perbuatan yang merugikan <strong>PEMBERI KERJA</strong> langsung maupun tidak langsung lainnya.<br>
                    h. Mengundurkan diri secara mendadak maka hak <strong>PIHAK KEDUA</strong> akan di tahan (di pending) selama dalam proses adminitrasi belum dinyatakan selesai oleh <strong>PIHAK PERTAMA</strong> dan <strong>PEMBERI KERJA</strong>.<br>
                    i. <strong>PIHAK KEDUA</strong> wajib mengganti kerugian sebesar kerugian perusahaan jika terbukti melakukan pencurian uang maupun barang &ndash; barang lainnya milik perusahaan.
                </div>
            </td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>
                Tindakan pendisiplinan atau sanksi tersebut diatas diambil oleh <strong>PIHAK PERTAMA</strong> dengan terlebih dahulu memberikan peringatan, dalam hal peringatan :
                <div class="indent-list">
                    a. <strong>PIHAK PERTAMA</strong> dapat memberikan Peringatan Pertama, Kedua dan Ketiga.<br>
                    b. Peringatan tidak harus diberikan secara berurutan, akan tetapi dapat langsung diberikan surat Peringatan III/terakhir, hal ini tergantung pada berat ringannya kesalahan/pelanggaran yang dilakukan <strong>PIHAK KEDUA</strong>.<br>
                    c. Apabila <strong>PIHAK KEDUA</strong> telah mendapatkan surat Peringatan III/terakhir dan <strong>PIHAK KEDUA</strong> masih melakukan kesalahan/ pelanggaran, maka <strong>PIHAK PERTAMA</strong> dapat memutuskan hubungan kerja tanpa kompensasi berupa apapun.
                </div>
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 10<br>
        SEBAB LAIN YANG MENGAKIBATKAN BERAKHIRNYA PERJANJIAN
    </div>
    <p style="margin-top: 0; margin-bottom: 10px; padding-left: 10px;">
        Pemutusan Hubungan kerja dapat dilakukan oleh <strong>PARA PIHAK</strong> dengan ketentuan sebagai berikut:
    </p>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Hubungan Kerja berakhir demi hukum sesuai dengan berakhirnya perjanjian kerja ini seperti tercantum pada pasal 1 ayat 2 (dua) diatas.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Hubungan Kerja ini sewaktu - waktu dapat diakhir karena terjadi force majeur / over macht (Keadaan Memaksa / Keadaan Mendesak) seperti faktor bencana alam, kebakaran, kerusuhan politik, peperangan, wabah penyakit dan kebijakan Pemerintah di bidang moneter dan atau di bidang lain yang berdampak buruk pada finansial (kondisi keuangan) <strong>PIHAK PERTAMA</strong> ATAU <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>
                <strong>PIHAK PERTAMA</strong> dapat memutuskan hubungan kerja sewaktu-waktu dan secara sepihak apabila:
                <div class="indent-list">
                    a. <strong>PIHAK KEDUA</strong> melakukan pelanggaran berat seperti tercantum pada <strong>pasal 158 Undang-undang Ketenagakerjaan no.13 Tahun 2003</strong>. seperti: Melakukan penipuan, pencurian, penggelapan barang atau uang milik <strong>PEMBERI KERJA</strong>, memberikan keterangan palsu atau yang dipalsukan, mabuk, minum minuman keras di lokasi kerja memakai atau mengedarkan Narkoba, melakukan asusila atau perjudian dilokasi kerja dan melakukan hal-hal lain yang tercantum pada pasal tersebut.<br>
                    b. <strong>PIHAK KEDUA</strong> melanggar peraturan yang berlaku atau melakukan kelalaian yang merugikan <strong>PIHAK PERTAMA</strong>, maupun <strong>PEMBERI KERJA</strong> dalam hal ini <strong>PIHAK PERTAMA</strong> tidak memberikan kompensasi dalam bentuk apapun dan <strong>PIHAK KEDUA</strong> harus mengganti rugi seluruh kerugian <strong>PIHAK PERTAMA</strong> atau <strong>PEMEBRI KERJA</strong> setelah dinyatakan terbukti bersalah oleh <strong>PIHAK PERTAMA</strong>.<br>
                    c. Kontrak kerja <strong>PIHAK PERTAMA</strong> dengan <strong>PEMBERI KERJA</strong> tidak diperpanjang lagi dan atau diputuskan secara tiba-tiba dan sepihak karena sesuatu hal, atau karena perusahaan <strong>PEMBERI KERJA</strong> tutup sebagian atau seluruhnya, meskipun Kontrak kerja antara <strong>PIHAK PERTAMA</strong> dengan <strong>PIHAK KEDUA</strong> jangka waktunya belum berakhir, maka <strong>PIHAK PERTAMA</strong> tidak wajib memberikan ganti kerugian dalam bentuk apapun kepada <strong>PIHAK KEDUA</strong>.<br>
                    d. Bahwa <strong>PIHAK KEDUA</strong> dianggap mengundurkan diri atas kehendak sendiri apabila selama 5 (lima) hari berturut-turut tidak masuk kerja tanpa ijin dan tanpa memberikan alasan yang sah dan dapat diterima.<br>
                    e. <strong>PIHAK KEDUA</strong> tidak mengindahkan teguran lisan maupun tulisan yang diberikan oleh <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> dimana pekerja ditempatkan.<br>
                    f. Apabila oleh suatu hal <strong>PEMBERI KERJA</strong> mengembalikan <strong>PIHAK KEDUA</strong> kepada <strong>PIHAK PERTAMA</strong> dengan alasan apapun, maka dengan sendirinya hubungan kerja antara <strong>PIHAK PERTAMA</strong> dengan <strong>PIHAK KEDUA</strong> berakhir.
                </div>
            </td>
        </tr>
    </table>
    <p style="margin-top: 10px; margin-bottom: 12px; padding-left: 10px;">
        Perpanjangan Jangka Waktu Perjanjian kerja ini hanya dapat terjadi bilamana <strong>PARA PIHAK</strong> sepakat untuk melakukan hal tersebut dengan pertimbangan sebagai berikut :
    </p>
    <div class="indent-list" style="margin-bottom: 10px;">
        a. Adanya kebutuhan di <strong>PIHAK PERTAMA</strong> berdasarkan kebutuhan dari <strong>PEMBERI KERJA</strong> yang menggunakan tenaga <strong>PIHAK KEDUA</strong>.<br>
        b. Catatan prestasi kerja atau penilaian kinerja <strong>PIHAK KEDUA</strong> selama hubungan kerja berlangsung adalah dinyatakan baik dan wajar sesuai dengan kriteria <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>.<br>
        c. Tidak adanya alasan-alasan tertentu berdasarkan peraturan Ketenagakerjaan <strong>PIHAK PERTAMA</strong> atau <strong>PEMBERI KERJA</strong> dan atau Peraturan Ketenagakerjaan yang berlaku
    </div>

    <div class="article-title">
        PASAL 11<br>
        PENYESELESAIAN PERSELISIHAN DAN LAIN-LAIN
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td><strong>PIHAK KEDUA</strong> tidak akan meminta / menuntut penghasilan lain diluar apa yang telah dicantumkan pada pasal 5 ayat 1 diatas.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td><strong>PIHAK KEDUA</strong> wajib menjaga kerahasiaan apapun milik <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>, meskipun <strong>PIHAK KEDUA</strong> sudah tidak bekerja lagi untuk <strong>PIHAK PERTAMA</strong> dan atau <strong>PEMBERI KERJA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Apabila terjadi perselisihan diantara kedua belah PIHAK, maka kedua belah pihak sepakat menempuh jalan musyawarah untuk mufakat.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Apabila Musyawarah tidak menghasilkan kata sepakat maka kedua belah PIHAK dapat menempuh mekanisme hukum sesuai dengan undang-undang ketenagakerjaan yang berlaku.</td>
        </tr>
        <tr>
            <td class="num-col">5.</td>
            <td><strong>PIHAK KEDUA</strong> dilarang membocorkan, mengungkapkan data dan atau informasi rahasia Perusahaan, kecuali untuk kepentingan Negara atau keputusan Pengadilan.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL 12<br>
        PENUTUP
    </div>
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Berdasarkan Pasal 1338 KUH perdata, Perjanjian kerja ini berlaku sebagai undang-undang bagi <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong>.</td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Apabila ada hal-hal khusus dalam perjanjian ini yang telah di sepakati oleh <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong> dianggap menyimpang dari perjanjian kerja bersama atau peraturan perundang undangan di bidang Ketenagakerjaan, maka yang berlaku dan mengikat secara Hukum adalah perjanjian kerja ini berdasarkan ketentuan sebagaimana yang dimaksud dalam ayat 1 (satu) pasal ini.</td>
        </tr>
        <tr>
            <td class="num-col">3.</td>
            <td>Demikian perjanjian kerja ini dibuat dan untuk di tanda tangani oleh kedua belah PIHAK diatas materai yang cukup dalam rangkap 1 (satu) serta <strong>PIHAK KEDUA</strong> diperbolehkan <em>meng copy</em> dengan kekuatan pembuktian sama secara Hukum.</td>
        </tr>
        <tr>
            <td class="num-col">4.</td>
            <td>Apabila ada hal-hal yang belum cukup diatur dalam pasal &ndash; pasal perjanjian ini maka akan diatur di kemudian hari dalam perjanjian tersendiri dan apabila dipandang perlu akan diatur kemudian dengan dibuatkan perubahan atau tambahan <strong>(amandemen/addendum)</strong> yang tidak terpisahkan dari perjanjian ini.</td>
        </tr>
    </table>
    <p style="margin-top: 15px;">
        Demikian kesepakatan kerja ini dibuat dengan sebenarnya tanpa paksaan dari PIHAK manapun dan tidak akan menuntut sesuatu apabila Perjanjian Kerja Waktu Tertentu ini berakhir dan masing &ndash; masing PIHAK dalam keadaan sehat jasmani dan rohani dan sah sejak ditandatangani oleh <strong>PIHAK PERTAMA</strong> dan <strong>PIHAK KEDUA</strong>.
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
                <div class="sign-materai" style="border: 1px solid #000; display: inline-block; padding: 8px 18px;">
                    Materai<br>
                    Rp. 10.000
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