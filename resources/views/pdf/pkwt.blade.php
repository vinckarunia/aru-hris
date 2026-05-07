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
        .page-break {
            page-break-after: always;
        }
        .title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 5px;
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
        .text-10 {
            font-size: 10px;
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
        .text-12 {
            font-size: 12px;
        }
        .text-13 {
            font-size: 13px;
        }
        .text-14 {
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        tr {
            page-break-inside: avoid;
        }
        td {
            vertical-align: top;
            padding: 2px 0;
        }
        .label-col {
            width: 40%;
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
        }
        .indent-list {
            margin: 0;
            padding-left: 20px;
        }
</style>
</head>
<body>
    <div class="page-header">
        <span class="pagenum"></span>
    </div>

    @php
        // Embed assets as base64 for reliable dompdf rendering
        $logoBase64 = $logoPath && file_exists($logoPath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath)) : null;
        $signatureBase64 = $signaturePath && file_exists($signaturePath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($signaturePath)) : null;
    @endphp
    @php
        /**
         * Contract number format: {monthlySeq}/ARU/PKWT-{pkwtNumber}/{romanMonth}/{year}
         * First segment = monthly letter sequence (passed from controller).
         * Second segment = pkwt_number (which contract this is for the worker).
         * Roman month & year = document issuance date (today), not contract start.
         */
        $seqFormatted     = str_pad($pkwtMonthlySeq ?? 1, 3, '0', STR_PAD_LEFT);
        $pkwtNumFormatted = str_pad($contract->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $issueDate    = now();
        $romanMonth   = $romanMonths[$issueDate->month] ?? 'I';
        $year         = $issueDate->year;
        $pkwt_formatted = sprintf('%s/ARU/PKWT-%s/%s/%s', $seqFormatted, $pkwtNumFormatted, $romanMonth, $year);
    @endphp
    
    <div class="title">PERJANJIAN KERJA WAKTU TERTENTU (PKWT)</div>
    <div class="subtitle">NO. : {{ $pkwt_formatted }}</div>

    <p style="margin-bottom: 15px;">Yang bertanda tangan dibawah ini :</p>

    <table>
        <tr>
            <td style="width: 5%;">1.</td>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col capitalize">{{ strtoupper($pihakPertama->name ?? 'Jumaga Tua Sinaga') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat</td>
            <td class="colon-col">:</td>
            <td class="value-col">Kompleks Ruko Duta Permai Blok E/10 <br> RT.09 RW.01 Kel. Jakasampurna, Bekasi</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Jabatan</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ $pihakPertama->position ?? 'Head of Operation' . " PT. Alfa Reka Usaha" }}</strong></td>
        </tr>
    </table>

    <p style="margin-top: 15px; margin-bottom: 15px;">Yang dalam perjanjian ini karena jabatannya mewakili pengusaha sah bertindak untuk dan atas nama PT. Alfa Reka Usaha, yang selanjutnya disebut <strong>Pihak Pertama</strong></p>

    <table>
        <tr>
            <td style="width: 5%;">2.</td>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->name ?? '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Tempat & tgl. lahir</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->birth_place ?? '-' }}, {{ $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">NIK</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->ktp_number ?? '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Jenis Kelamin</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->gender === 'male' ? 'Laki-Laki' : ($worker->gender === 'female' ? 'Perempuan' : '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Pendidikan Akhir</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->education ?? '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Status Pernikahan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->tax_status ? (strpos($worker->tax_status, 'TK') === 0 ? 'Belum Menikah' : (strpos($worker->tax_status, 'K') === 0 ? 'Menikah' : $worker->tax_status)) : '-' }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->address_domicile ?? $worker->address_ktp ?? '-' }}</td>
        </tr>
    </table>

    <p style="margin-top: 15px; margin-bottom: 15px;">Yang dalam perjanjian ini bertindak untuk dan atas nama dirinya sendiri, dan selanjutnya disebut <strong>Pihak Kedua</strong>.</p>

    <p style="margin-bottom: 15px;">Pada hari ini, tanggal {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }} masing – masing <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong> saat membuat dan menandatangani perjanjian kerja ini menyatakan dirinya dalam keadaan kondisi sehat jasmani dan rohani, serta tidak dalam keadaan terpaksa atau dibawah tekanan oleh siapapun juga, sehingga patut secara hukum membuat kesepakatan serta mengikatkan diri dalam bentuk <strong>Perjanjian Kerja Waktu Tertentu (PKWT)</strong> yang diatur dalam pasal – pasal sebagai berikut:</p>

    <div class="article-title">
        PASAL I<br>
        NAMA PERJANJIAN
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Perjanjian kerja ini disebut <strong>Perjanjian Kerja Waktu Tertentu</strong>, dan disingkat : <strong>PKWT</strong>.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td><strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong> sepakat perjanjian kerja ini di dasarkan pada jangka waktu tertentu.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL II<br>
        PENEMPATAN KERJA
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>
                Dalam perjanjian kerja ini <strong>Pihak Pertama</strong> setuju untuk mempekerjakan <strong>Pihak Kedua</strong> dengan penempatan di <strong>{{ strtoupper($contract->assignment->project->client->full_name ?? '-') }}</strong> dengan jangka waktu tertentu yang ditempatkan pada :
                <table style="margin-top: 5px;">
                    <tr>
                        <td style="width: 30%;">A. Lokasi</td>
                        <td style="width: 5%;">:</td>
                        <td>{{ $contract->assignment->branches->pluck('name')->implode(', ') ?: '-' }}</td>
                    </tr>
                    <tr>
                        <td>B. Jabatan</td>
                        <td>:</td>
                        <td>{{ $contract->assignment->position ?? '-' }}</td>
                    </tr>
                    <tr>
                        <td>C. Status Hubungan Kerja</td>
                        <td>:</td>
                        <td>{{ strtoupper($contract->contract_type ?? 'Kontrak') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
    </table>

    

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">2.</td>
            <td>Atas dasar pemenuhan kebutuhan kerja dan keseimbangan kebutuhan sumber daya manusia pada unit kerja tertentu, maka <strong>Pihak Pertama</strong> berhak melakukan <strong>mutasi kerja</strong> terhadap <strong>Pihak Kedua</strong> dalam lingkungan <strong>Pihak Pertama</strong> di lokasi yang lain selama perjanjian kerja ini masih berlaku.</td>
        </tr>
        <tr>
            <td style="width: 5%;">3.</td>
            <td><strong>Pihak Kedua</strong> menyatakan sanggup dan bersedia melaksanakan <strong>mutasi kerja</strong> sebagaimana dimaksud dalam ayat (2) pasal ini.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Apabila dikemudian hari <strong>Pihak Kedua</strong> menolak <strong>mutasi kerja</strong> ke lokasi lainnya sebagaimana dimaksud dalam ayat (2) pasal ini, maka <strong>Pihak Pertama</strong> dapat memutuskan hubungan kerja dengan <strong>Pihak Kedua</strong> dengan cara mengakhiri perjanjian kerja ini secara sepihak tanpa kewajiban membayar ganti rugi sisa kontrak kerja yang masih berlaku.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td><strong>Pihak Kedua</strong> berkewajiban melaksanakan tugas pekerjaan yang ditetapkan dengan sebaik-baiknya.</td>
        </tr>
        <tr>
            <td>6.</td>
            <td><strong>Pihak Kedua</strong> saat memasuki lokasi kerja, dan pada saat bekerja harus memakai tanda pengenal yang disediakan <strong>Pihak Pertama</strong>.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL III<br>
        HARI DAN JAM KERJA
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Hari kerja : 5 (lima) Hari kerja seminggu</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Jam Kerja : 8 (delapan) Jam kerja sehari</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL IV<br>
        MASA BERLAKUNYA PERJANJIAN
    </div>

    @php
        $startDate = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date)->translatedFormat('d F Y') : '-';
        $endDate = $contract->end_date ? \Carbon\Carbon::parse($contract->end_date)->translatedFormat('d F Y') : '-';
    @endphp

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Kesepakatan kerja ini dibuat terhitung mulai dari tanggal <strong>{{ $startDate }}</strong> sampai dengan <strong>{{ $endDate }}</strong></td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Apabila dipandang perlu oleh <strong>Pihak Pertama</strong>, perjanjian kerja ini dapat diperpanjang dengan persetujuan <strong>Pihak Kedua</strong></td>
        </tr>
        <tr>
            <td>3.</td>
            <td>Salah satu pihak dilarang memaksakan kehendak terhadap pihak lainnya untuk memperpanjang perjanjian kerja ini setelah berakhirnya masa berlaku sebagaimana dimaksud dalam ayat satu (1) pasal ini.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Dengan alasan apapun selama perjanjian kerja ini berlangsung, <strong>Pihak Kedua</strong> dilarang keras memaksakan kehendak untuk menuntut agar diangkat menjadi pekerja tetap.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td>Pemberitahuan akan berakhirnya masa berlaku perjanjian kerja ini dilakukan paling <strong>lambat 30 hari</strong> sebelumnya oleh salah satu pihak kepada pihak lainnya dalam perjanjian ini.</td>
        </tr>
        <tr>
            <td>6.</td>
            <td>Apabila Perjanjian kerja ini berakhir masa berlakunya sebagaimana dimaksud dalam ayat (1) pasal ini dan tidak diadakan perpanjangan lagi, Maka hubungan kerja antara <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong> dinyatakan berakhir demi hukum dan <strong>Pihak Pertama</strong> tidak berkewajiban membayar kompensasi apapun.</td>
        </tr>
        <tr>
            <td>7.</td>
            <td>Apabila <strong>Pihak Kedua</strong> bermaksud mengakhiri hubungan kerja sebelum habis masa berlaku perjanjian kerja ini sebagaimana dimaksud dalam ayat (1) pasal ini, maka <strong>Pihak Kedua</strong> wajib memberitahukan kepada <strong>Pihak Pertama</strong> selambat-lambatnya <strong>30 (tiga puluh) hari</strong> sebelum mengakhiri hubungan kerjanya.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL V<br>
        SEBAB LAIN YANG MENGAKIBATKAN BERAKHIRNYA PERJANJIAN
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Perjanjian ini sewaktu – waktu dapat diakhiri karena terjadinya force majeur / over macht (Keadaan Memaksa / Keadaan Mendesak) seperti faktor bencana alam, kebakaran, kerusuhan sosial politik, peperangan, <strong>wabah penyakit</strong> dan kebijakan pemerintah di bidang moneter dan bidang lain yang berdampak buruk pada finansial (kondisi keuangan) <strong>Pihak Pertama</strong>.</td>
        </tr>
        <tr>
            <td style="width: 5%;">2.</td>
            <td>Perjanjian kerja ini sewaktu – waktu dapat diakhiri oleh <strong>Pihak Pertama</strong> karena berdasarkan penilaian bahwa <strong>Pihak Kedua</strong> tidak dapat memenuhi target kerja yang ditentukan <strong>Pihak Pertama</strong> dan pengakhiran kerja seperti ini <strong>Pihak Pertama</strong> tidak berkewajiban membayarkan kompensasi apapun kepada <strong>Pihak Kedua</strong></td>
        </tr>
        <tr>
            <td>3.</td>
            <td>Perjanjian kerja ini dapat diakhiri, karena <strong>Pihak Kedua</strong> masih melakukan pelanggaran dalam masa berlaku Surat peringatan ketiga.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Apabila hubungan kerja antara <strong>Pihak Pertama</strong> dengan <strong>Pihak Kedua</strong> putus sebagai akibat langsung dan tidak langsung dari sebab – sebab sebagaimana dimaksud dalam ayat (1) pasal ini, maka <strong>Pihak Pertama</strong> tidak berkewajiban memberikan kompensasi sisa kontrak kepada <strong>Pihak Kedua</strong>.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td>Apabila perjanjian kerja ini hendak diakhiri oleh karena salah satu faktor penyebab sebagaimana dimaksud dalam ayat (1) atau ayat (2) pasal ini, maka <strong>Pihak Pertama</strong> wajib memberitahukan <strong>7 (Tujuh) hari</strong> sebelum tanggal jatuh tempo pengakhiran yang sudah ditetapkan oleh <strong>Pihak Pertama.</strong></td>
        </tr>
        <tr>
            <td>6.</td>
            <td>Dalam hal <strong>Pihak Kedua</strong> tidak masuk kerja/mangkir selama 5 (lima) hari berturut- turut tanpa ada alasan yang jelas dan sudah dipanggil 3 (tiga) kali berturut-turut, maka <strong>Pihak Kedua</strong> tersebut dinyatakan mengundurkan diri secara sepihak dan <strong>Pihak Pertama</strong> tidak berkewajiban untuk membayar ganti rugi berupa apapun.</td>
        </tr>
        <tr>
            <td>7.</td>
            <td>Apabila selama dalam menjalin hubungan kerja, ternyata <strong>Pihak Kedua</strong> telah memberikan keterangan-keterangan yang tidak benar (dipalsukan), baik sewaktu memasukan data lamaran, pada waktu wawancara ataupun selama melaksanakan hubungan kerja, maka <strong>Pihak Pertama</strong> berhak mengadakan pemutusan hubungan kerja dan pelaksanaan pemutusan hubungan kerja dan <strong>Pihak Pertama</strong> tidak berkewajiban memberikan ganti rugi berupa apapun.</td>
        </tr>
        <tr>
            <td>8.</td>
            <td>Setiap pelanggaran terhadap ketentuan-ketentuan, tata tertib, kedisiplinan dan kewajiban yang dibebankan oleh <strong>Pihak Pertama</strong>, maka <strong>Pihak Kedua</strong> akan dikenakan sanksi.</td>
        </tr>
        <tr>
            <td>9.</td>
            <td>Dalam hal terjadinya <strong>pemutusan hubungan kerja</strong>,karena kesalahan atau pelanggaran oleh <strong>Pihak Kedua</strong> seperti tidak disiplin walaupun sudah diberi teguran berulang-ulang, mencuri, merusak milik perusahaan dengan sengaja, mabuk, mengancam pimpinan, memakai obat-obatan terlarang, membawa senjata tajam/api. Dan apabila tindakan <strong>Pihak Kedua</strong> merugikan <strong>Pihak Pertama</strong>, maka <strong>Pihak Kedua</strong> harus mengganti kerugian tersebut dan permasalahan tersebut akan dilaporkan kepada <strong>Pihak Berwajib</strong> untuk diproses secara pidana.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VI<br>
        HAK PIHAK KEDUA
    </div>

    @php
        $upah = $contract->compensation?->base_salary ?? 0;
        $tunjangan = ($contract->compensation?->meal_allowance ?? 0) + ($contract->compensation?->transport_allowance ?? 0);

        // Build dynamic compensation list — only show items with value > 0
        $kompensasiItems = collect([
            ['label' => 'Upah Pokok', 'value' => $upah, 'always' => true],
            ['label' => 'Tunjangan Pengganti Fasilitas', 'value' => $tunjangan],
            ['label' => 'BPJS Tenaga Kerja', 'value' => null, 'always' => true],
            ['label' => 'BPJS Kesehatan', 'value' => null, 'always' => true],
            ['label' => 'BPJS Pensiun', 'value' => null, 'always' => true],
        ])->filter(fn($item) => ($item['always'] ?? false) || ($item['value'] ?? 0) > 0)->values();
    @endphp

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Sebagai imbalan atas jasa <strong>Pihak Kedua</strong> kepada <strong>Pihak Pertama</strong>, upah diberikan berdasarkan pembayaran bulanan, yang dibayarkan setiap tanggal 25 (Dua Puluh Lima) bulan berikutnya dengan rincian sebagai berikut :
                <table style="margin-top: 5px;">
                    @foreach($kompensasiItems as $idx => $item)
                    <tr>
                        <td style="width: 50%;">{{ chr(97 + $idx) }}. {{ $item['label'] }}</td>
                        <td>@if(!is_null($item['value'])): Rp. {{ number_format($item['value'], 0, ',', '.') }}@endif</td>
                    </tr>
                    @endforeach
                </table>
                <p style="margin: 0;">Apabila Pihak Kedua tidak masuk kerja tanpa pemberitahuan, upah dipotong sesuai jumlah hari tidak masuk kerja.</p>
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Pada akhir periode PKWT, pihak kedua akan mendapatkan kompensasi pengakhiran PKWT sesuai ketentuan yang berlaku.</td>
        </tr>
    </table>

    

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">3.</td>
            <td>Ijin-ijin meninggalkan tugas tanpa mengurangi upah adalah :
                <div class="indent-list">
                    a) Sakit dibuktikan dengan Surat Keterangan Dokter<br>
                    b) Keluarga inti meninggal<br>
                    c) Anak Khitanan/Baptis<br>
                    d) Tugas Negara<br>
                    e) Menikah
                </div>
            </td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Ijin-ijin meninggalkan tugas yang dikategorikan dikenai pemotongan upah :
                <div class="indent-list">
                    a) Ijin untuk kepentingan sendiri di luar urusan pekerjaan.<br>
                    b) Tidak masuk kerja tanpa pemberitahuan (alfa)<br>
                    c) Tidak masuk kerja dengan alasan sakit tanpa surat keterangan dokter
                </div>
            </td>
        </tr>
        <tr>
            <td>5.</td>
            <td><strong>Pihak Pertama</strong> akan memberikan Tunjangan Hari Raya kepada <strong>Pihak Kedua</strong> sesuai dengan ketentuan Undang-undang Ketenaga-Kerjaan yang berlaku dan akan diberikan paling lambat 2 (dua) minggu sebelum hari raya keagamaan.</td>
        </tr>
        <tr>
            <td>6.</td>
            <td>Perhitungan lembur menyesuaikan dengan ketentuan yang berlaku dan pelaksanaannya memperhatikan kebutuhan</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VII<br>
        KEWAJIBAN PIHAK KEDUA
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Sebelum memulai hari kerja pertamanya, <strong>Pihak Kedua</strong> wajib melakukan <strong>Test Kesehatan</strong> dengan menyerahkan bukti hasil testnya dengan biaya sendiri, jika dipersyaratkan oleh perusahaan.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td><strong>Pihak Kedua</strong> wajib menanggung Pajak Penghasilan (PPh) Pasal 21 yang akan dipungut oleh <strong>Pihak Pertama</strong> sebagai Pemberi Kerja.</td>
        </tr>
        <tr>
            <td>3.</td>
            <td><strong>Pihak Kedua</strong> menyanggupi untuk melaksanakan pekerjaan yang menjadi tugas dan tanggung jawabnya dengan baik sesuai standard dan prosedur kerja yang sudah di tetapkan oleh perusahaan <strong>Pihak Pertama</strong></td>
        </tr>
        <tr>
            <td>4.</td>
            <td><strong>Pihak Kedua</strong> bersedia dan sanggup mentaati segala bentuk peraturan, baik perjanjian kerja bersama maupun tata tertib lainnya yang berlaku di <strong>Pihak Pertama</strong></td>
        </tr>
        <tr>
            <td>5.</td>
            <td>Pihak kedua dilarang melakukan pekerjaan yang menyimpang dari tugas dan tanggungjawab yang melekat pada jabatan yang disebutkan sesuai Pasal II ayat 1 pada perjanjian ini.</td>
        </tr>
    </table>
    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">6.</td>
            <td><strong>Pihak Kedua</strong> bersedia mematuhi segala perintah yang layak dari atasan / Pimpinan perusahaan <strong>Pihak Pertama</strong></td>
        </tr>
        <tr>
            <td>7.</td>
            <td><strong>Pihak Kedua</strong> bertanggung jawab terhadap tugas dan pekerjaan yang di berikan oleh <strong>Pihak Pertama</strong> dan / atau atasannya.</td>
        </tr>
        <tr>
            <td>8.</td>
            <td><strong>Pihak Kedua</strong> sanggup dan bersedia menjalankan pekerjaan lembur apabila <strong>Pihak Pertama</strong> / atasan memerintahkan untuk kerja lembur.</td>
        </tr>
        <tr>
            <td>9.</td>
            <td><strong>Pihak Kedua</strong> wajib menyelesaikan tugas dan tangung jawabnya tepat waktu. Apabila tugas tanggung jawabnya belum dapat diselesaikan maka <strong>Pihak Kedua</strong> wajib menyelesaikannya dan kelebihan jam kerjanya tidak dihitung sebagai kerja lembur.</td>
        </tr>
        <tr>
            <td>10.</td>
            <td><strong>Pihak Kedua</strong> sanggup memahami segala prosedur dan standard kerja yang ditetapkan <strong>Pihak Pertama</strong>, serta menjaga alat kerja dan aset milik <strong>Pihak Pertama</strong></td>
        </tr>
        <tr>
            <td>11.</td>
            <td><strong>Pihak Kedua</strong> wajib memberitahukan setiap perubahan alamat, status keluarga, dengan menyerahkan bukti yang sah kepada <strong>Pihak Pertama.</strong></td>
        </tr>
        <tr>
            <td>12.</td>
            <td><strong>Pihak Kedua</strong> bersedia dan sanggup menjalani mutasi, rotasi dan / atau promosi, atau demosi dalam lingkungan <strong>Pihak Pertama</strong> bila di perlukan.</td>
        </tr>
    </table>

    

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">13.</td>
            <td>Wajib memakai alat pelindung diri (APD), menggunakannya dengan cara yang benar sesuai yang di tentukan oleh <strong>Pihak Pertama.</strong></td>
        </tr>
        <tr>
            <td>14.</td>
            <td><strong>Pihak Kedua</strong> wajib menjaga kerahasiaan semua informasi yang berhubungan dengan pekerjaan yang diberikan oleh <strong>Pihak Pertama.</strong></td>
        </tr>
        <tr>
            <td>15.</td>
            <td>Terhadap semua pengajuan di depan <em>(advance request)</em> atas biaya-biaya yang diperbolehkan diajukan kepada perusahaan, karyawan wajib memberikan laporan pertanggungjawaban dengan dilengkapi bukti-bukti yang valid tepat pada waktu yang ditentukan. Jika belum diberikan laporan pertanggungjawaban sebagaimana mestinya, maka <strong>Pihak Kedua</strong> mengijinkan perusahaan untuk melakukan pemotongan sejumlah biaya tersebut dari upah bulanan terdekat, untuk diperhitungkan sebagai pengganti biaya dimaksud karena belum adanya laporan pertanggungjawaban yang diberikan kepada perusahaan.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VIII<br>
        TATA TERTIB
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td><strong>Pihak Kedua</strong> harus datang ke tempat kerja paling lambat 30 (Tiga puluh) menit sebelum jam kerja dimulai.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td><strong>Pihak Kedua</strong> harus mencatat kehadiran (Time Chard/Finger/Scan Barcode) setiap datang dan pulang kerja.</td>
        </tr>
        <tr>
            <td>3.</td>
            <td><strong>Pihak Kedua</strong> harus mengikuti pertemuan, pengarahan sebelum jam kerja dimulai bila di perlukan.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td><strong>Pihak Kedua</strong> dapat diijinkan pulang cepat apabila ada keluarga (Ayah kandung, Ibu kandung, Istri, Suami, Anak, Adik Kandung, Kakak Kandung) meninggal dunia, mendapat panggilan negara, atau urusan lain yang sangat mendesak dan dapat diterima alasannya dengan bukti dan seijin atasan serta disetujui oleh bagian personalia.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td>Dilarang merokok, main judi, membawa senjata tajam dan/atau senjata api, membawa minuman keras serta obat terlarang di area kerja, dan dilarang melakukan perbuatan yang melanggar ketentuan dalam peraturan perusahaan <strong>Pihak Pertama</strong>, melanggar norma kesusilaan serta perbuatan yang melanggar peraturan perundang-undangan yang berlaku.</td>
        </tr>
    </table>
    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">6.</td>
            <td>Dilarang tidur saat jam kerja berlangsung, makan di dalam area kerja, tidak melaksanakan kerja lembur yang sudah disepakati sebelumnya, atau pelanggaran berat lainnya berdasarkan peraturan perusahaan.</td>
        </tr>
        <tr>
            <td>7.</td>
            <td>Dilarang meninggalkan tempat kerja tanpa seijin atasan atau pimpinan perusahaan terlebih dahulu. Apabila <strong>Pihak Kedua</strong> meninggalkan pekerjaan tanpa izin <strong>Pihak Pertama</strong> atau pejabat setempat dengan surat keterangan/alasan yang tidak dapat diterima oleh <strong>Pihak Pertama</strong> maka <strong>Pihak Kedua</strong> dianggap mangkir.</td>
        </tr>
        <tr>
            <td>8.</td>
            <td>Dilarang melakukan kegiatan lain di tempat kerja yang tidak ada kaitannya dengan pekerjaan.</td>
        </tr>
        <tr>
            <td>9.</td>
            <td><strong>Pihak Kedua</strong> tidak di perkenankan mengikatkan diri dengan bentuk apapun dalam suatu hubungan kerja dengan pihak lain, tanpa seijin <strong>Pihak Pertama</strong></td>
        </tr>
        <tr>
            <td>10.</td>
            <td>Dengan berakhirnya masa kerja sesuai dengan Perjanjian Kerja Waktu Tertentu ini, maka kesepakatan kerja waktu tertentu ini telah putus dengan sendirinya (putus demi hukum) dan dengan putusnya hubungan kerja ini, <strong>Pihak Pertama</strong> tidak berkewajiban memberikan ganti rugi apapun kepada <strong>Pihak Kedua.</strong></td>
        </tr>
        <tr>
            <td>11.</td>
            <td>Selama dalam hubungan kerja, <strong>Pihak Kedua</strong> wajib mentaati ketentuan-ketentuan tata tertib, kedisiplinan dan kewajiban yang dibebankan kepadanya, sesuai dengan yang tercantum dalam Pasal VII perjanjian ini.</td>
        </tr>
    </table>

    
    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">12.</td>
            <td>Setiap pelanggaran terhadap ketentuan-ketentuan, tata tertib, kedisiplinan dan kewajiban yang dibebankan oleh <strong>Pihak Pertama</strong>, maka <strong>Pihak Kedua</strong> akan dikenakan sanksi sesuai dengan tingkat kesalahannya.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL IX<br>
        PENGUNDURAN DIRI
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Apabila <strong>Pihak Kedua</strong> hendak mengundurkan diri sebelum habis masa berlaku perjanjian kerja sebagaimana yang dimaksud dalam Pasal IV ayat 7 di atas, maka permohonan pengunduran diri harus diajukan paling lambat 30 hari sebelum tanggal pengunduran diri, dan <strong>Pihak Kedua</strong> tetap menjalankan pekerjaan sampai tanggal pengunduran diri.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Apabila surat pengunduran diri diajukan kurang dari 30 hari, maka surat keterangan kerja tidak akan di berikan kepada <strong>Pihak Kedua</strong> atau orang yang dikuasakan.</td>
        </tr>
        <tr>
            <td>3.</td>
            <td><strong>Pihak Kedua</strong> wajib mengembalikan semua atribut perusahaan dan / atau perlengkapan kerja termasuk pakaian seragam saat hari kerja terakhir batas pengunduran diri dan apabila tidak dilakukan maka sisa gaji akan di tahan sampai <strong>Pihak Kedua</strong> mengembalikan semua atribut perusahaan dan atau perlengkapan kerja yang dititipkan kepada <strong>Pihak Kedua.</strong></td>
        </tr>
    </table>

    <div class="article-title">
        PASAL X<br>
        SANKSI – SANKSI
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Apabila dikemudian hari diketahui ada data-data yang di berikan <strong>Pihak Kedua</strong> tidak benar atau di palsukan, baik yang tertera dalam biodata, dan data – data yang tertera dalam berkas lamaran, maupun data yang tertera dalam perjanjian ini, maka <strong>Pihak Kedua</strong> setuju dan bersedia menerima sanksi berupa diberhentikan secara tidak hormat dari perusahaan oleh <strong>Pihak Pertama</strong> dengan kehilangan hak guna menuntut sesuatu hak apapun, dan <strong>Pihak Pertama</strong> tidak di wajibkan untuk membayar upah selama sisa masa kontrak.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Apabila terjadi pemalsuan dokumen apapun terkait diri <strong>Pihak Kedua</strong>, maka <strong>Pihak Kedua</strong> setuju apabila <strong>Pihak Pertama</strong> menyerahkan proses penanganannya kepada pihak yang berwajib (Kepolisian) karena dianggap telah terjadi tindak pidana pemalsuan data yang dilakukan <strong>Pihak Kedua</strong></td>
        </tr>
    </table>
    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">3.</td>
            <td>Pelanggaran terhadap ketentuan pasal VII (Tujuh) dan pasal VIII (Delapan) diatas dapat mengakibatkan diakhirinya perjanjian ini secara sepihak oleh <strong>Pihak Pertama</strong>, dan <strong>Pihak Pertama</strong> tidak berkewajiban untuk membayar sisa kontrak.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Apabila <strong>Pihak Kedua</strong> sudah mendapatkan surat peringatan III dan ternyata masih melakukan pelanggaran lagi terhadap Perjanjian Kerja Waktu Tertentu maka <strong>Pihak Kedua</strong> akan diputus hubungan kerjanya secara sepihak oleh <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong> kehilangan hak guna menuntut sesuatu pembayaran apapun.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL XI<br>
        PENUTUP
    </div>

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">1.</td>
            <td>Berdasarkan pasal 1338 KUH perdata, Perjanjian kerja ini berlaku sebagai undang – undang bagi <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua.</strong></td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Apabila ada hal-hal khusus dalam perjanjian kerja ini yang telah di sepakati oleh <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong> dianggap menyimpang dari perjanjian kerja bersama atau peraturan perundang – undangan yang berlaku di bidang ketenagakerjaan, maka yang berlaku mengikat secara hukum adalah perjanjian kerja ini berdasarkan ketentuan sebagaimana yang dimaksud dalam ayat (1) pasal ini.</td>
        </tr>
    </table>

    

    <table style="width:100%;">
        <tr>
            <td style="width: 5%;">3.</td>
            <td>Demikian perjanjian kerja ini dibuat dan di tandatangani oleh kedua belah pihak di atas materai yang cukup dalam rangkap 1, serta pihak kedua memegang 1 (Satu) rangkap <em>copy</em> dengan kekuatan pembuktian sama secara hukum.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Apabila ada hal – hal yang belum diatur dalam pasal – pasal di atas maka akan diatur di kemudian hari dalam perjanjian tersendiri yang tidak terpisahkan dari perjanjian ini.</td>
        </tr>
    </table>

    <p style="margin-top: 20px;">Demikian kesepakatan hubungan kerja ini dibuat dengan sebenarnya tanpa paksaan dari pihak manapun dan tidak akan menuntut sesuatu apapun bila Perjanjian Kerja Waktu Tertentu ini berakhir dan masing masing pihak dalam keadaaan sehat jasmani dan rohani dan sah sejak ditandatangani oleh <strong>Pihak Pertama</strong> dan <strong>Pihak Kedua</strong>.</p>

    <div class="text-14" style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
        Bekasi, {{ $startDate }}
    </div>

    <table class="signature-table" style="width: 100%;">
        <tr>
            <td style="width: 40%; text-align: center;" class="text-13"><strong>PIHAK PERTAMA</strong></td>
            <td style="width: 20%;">&nbsp;</td>
            <td style="width: 40%; text-align: center;" class="text-13"><strong>PIHAK KEDUA</strong></td>
        </tr>
        <tr>
            <td style="height: 100px; text-align: center; vertical-align: bottom;">
                &nbsp;
            </td>
            <td style="height: 100px; vertical-align: middle; text-align: center;">
                <div class="text-10">
                    Materai<br>
                    Rp.10.000
                </div>
            </td>
            <td style="height: 100px; text-align: center; vertical-align: bottom;">
                &nbsp;
            </td>
        </tr>
        <tr>
            <td style="text-align: center;" class="text-13"><strong>({{ strtoupper($pihakPertama->name ?? 'Jumaga Tua Sinaga') }})</strong></td>
            <td style="text-align: center;">&nbsp;</td>
            <td style="text-align: center;" class="text-13"><strong>({{ strtoupper($worker->name ?? '-') }})</strong></td>
        </tr>
    </table>
</body>
</html>
