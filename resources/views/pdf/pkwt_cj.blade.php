<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PKWT Document</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
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
        $issueDate    = now();
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
    <div class="doc-subtitle">NO. : {{ $pkwt_formatted }}</div>

    {{-- NIK perusahaan (tempat penempatan) milik worker, top-right --}}
    <div style="text-align: right; font-size: 12px; margin-bottom: 10px;">
        NIK : {{ $worker->nik_aru ?? '-' }}
    </div>

    <p style="margin-bottom: 12px;">Yang bertanda tangan dibawah ini :</p>

    {{-- PIHAK PERTAMA (internal employee) --}}
    <table>
        <tr>
            <td class="num-col">1.</td>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ strtoupper($pihakPertama->name ?? 'Jumaga Tua Sinaga') }}</strong></td>
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
            <td class="value-col"><strong>{{ $pihakPertama->position ?? 'Head of Operation' . ' PT. Alfa Reka Usaha' }}</strong></td>
        </tr>
    </table>

    <p style="margin-top: 12px; margin-bottom: 12px;">
        Yang dalam perjanjian ini karena jabatannya mewakili pengusaha sah bertindak untuk dan atas nama PT. Alfa Reka Usaha,
        yang selanjutnya disebut <strong>Pihak Pertama (I)</strong>.
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
            <td class="label-col">Tempat &amp; tgl. lahir</td>
            <td class="colon-col">:</td>
            <td class="value-col">
                {{ $worker->birth_place ?? '-' }}, {{ $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-' }}
            </td>
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
            <td class="value-col">{{ $worker->gender === 'male' ? 'Laki-laki' : ($worker->gender === 'female' ? 'Perempuan' : '-') }}</td>
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
            <td class="value-col">{{ strtoupper($worker->tax_status ?? '-') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label-col">Alamat</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($worker->address_domicile ?? $worker->address_ktp ?? '-') }}</td>
        </tr>
    </table>

    <p style="margin-top: 12px; margin-bottom: 12px;">
        Yang dalam perjanjian ini bertindak untuk dan atas nama dirinya sendiri, dan selanjutnya disebut <strong>Pihak Kedua (II)</strong>.
    </p>

    <p style="margin-bottom: 12px;">
        Pada hari ini, tanggal {{ $startDate }}, masing – masing
        Pihak Pertama dan Pihak Kedua saat membuat dan menandatangani perjanjian kerja ini menyatakan dirinya 
        dalam keadaan kondisi sehat jasmani dan rohani, serta tidak dalam keadaan terpaksa atau dibawah tekanan 
        oleh siapapun juga, sehingga patut secara hukum membuat kesepakatan serta mengikatkan diri dalam bentuk
        Perjanjian Kerja Waktu Tertentu (PKWT) yang diatur dalam pasal – pasal sebagai berikut:
    </p>

    <div class="article-title">
        PASAL I<br>
        NAMA PERJANJIAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Perjanjian kerja ini disebut <strong>Perjanjian Kerja Waktu Tertentu</strong>, dan disingkat : <strong>PKWT</strong></td>
        </tr>
        <tr>
            <td class="num-col">2.</td>
            <td>Pihak pertama dan pihak kedua sepakat perjanjian kerja ini di dasarkan pada jangka waktu tertentu.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL II<br>
        PENEMPATAN KERJA
    </div>

    <table>
        <tr>
            <td class="num-col">1.&nbsp;</td>
            <td>
                Dalam perjanjian kerja ini pihak pertama setuju untuk mempekerjakan pihak kedua pada PT. Alfa Reka Usaha untuk jangka waktu tertentu dengan maksud menjalankan pekerjaan dengan penempatan awal pada :
                <table style="margin-top: 5px;">
                    <tr>
                        <td style="width: 32%;">A. Jabatan Awal</td>
                        <td style="width: 4%;">:</td>
                        <td>{{ strtoupper($contract->assignment->position ?? '-') }}</td>
                    </tr>
                    <tr>
                        <td>B. Status Hubungan Kerja</td>
                        <td>:</td>
                        <td>{{ $contract->pkwt_type ?? $contract->contract_type ?? '-' }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.&nbsp;</td>
            <td>
                Atas dasar pemenuhan kebutuhan kerja dan keseimbangan kebutuhan sumber daya manusia pada unit kerja tertentu,
                maka pihak pertama berhak melakukan mutasi kerja terhadap pihak kedua dalam lingkungan PT. Alfa Reka Usaha
                selama perjanjian kerja ini masih berlaku.
            </td>
        </tr>
        <tr>
            <td class="num-col">3.&nbsp;</td>
            <td>Pihak Kedua menyatakan sanggup dan bersedia melaksanakan mutasi sebagaimana dimaksud dalam ayat (2) pasal ini.</td>
        </tr>
        <tr>
            <td class="num-col">4.&nbsp;</td>
            <td>
                Apabila dikemudian hari pihak kedua menolak mutasi ke unit kerja tertentu sebagaimana dimaksud dalam ayat (2) pasal
                ini, maka pihak pertama dapat memutuskan hubungan kerja dengan pihak kedua dengan cara mengakhiri perjanjian kerja
                ini secara sepihak tanpa kewajiban membayar ganti rugi sisa kontrak kerja yang masih berlaku.
            </td>
        </tr>
        <tr>
            <td class="num-col">5.&nbsp;</td>
            <td>
                Yang dimaksud sebagai Tenaga Kerja Jasa dalam kesepakatan kerja ini adalah Tenaga Kerja dalam waktu tertentu yang
                dipekerjakan dan ditempatkan oleh Pihak I di
                <strong>{{ strtoupper($contract->assignment->project->client->full_name ?? '-') }}
                - {{ strtoupper($contract->assignment->branches->pluck('name')->implode(', ') ?: '-') }}</strong>
            </td>
        </tr>
        <tr>
            <td class="num-col">6.&nbsp;</td>
            <td>Pihak II berkewajiban melaksanakan tugas pekerjaan yang ditetapkan dengan sebaik – baiknya.</td>
        </tr>
        <tr>
            <td class="num-col">7.&nbsp;</td>
            <td>Pihak II saat memasuki lokasi kerja, dan pada saat bekerja harus memakai tanda pengenal yang disediakan Pihak I.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL III<br>
        MASA BERLAKUNYA PERJANJIAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.&nbsp;</td>
            <td>
                Kesepakatan kerja ini dibuat untuk jangka waktu <strong>{{ $durationText }}</strong>,
                terhitung mulai dari tanggal <strong>{{ $startDate }}</strong> sampai
                dengan <strong>{{ $endDate }}</strong>
            </td>
        </tr>
        <tr>
            <td class="num-col">2.&nbsp;</td>
            <td>Apabila dipandang perlu oleh pihak pertama, perjanjian kerja ini dapat diperpanjang sesuai dengan kesepakatan.</td>
        </tr>
        <tr>
            <td class="num-col">3.&nbsp;</td>
            <td>
                Salah satu pihak dilarang memaksakan kehendak terhadap pihak lainnya untuk memperpanjang perjanjian kerja ini
                setelah berakhirnya masa berlaku sebagaimana dimaksud dalam ayat satu (1) pasal ini.
            </td>
        </tr>
        <tr>
            <td class="num-col">4.&nbsp;</td>
            <td>
                Dengan alasan apapun selama perjanjian kerja ini berlangsung, pihak kedua dilarang keras memaksakan kehendak
                untuk menuntut agar diangkat menjadi pekerja tetap.
            </td>
        </tr>
        <tr>
            <td class="num-col">5.&nbsp;</td>
            <td>
                Pemberitahuan akan berakhirnya masa berlaku perjanjian kerja ini dilakukan paling lambat 7 hari sebelumnya oleh salah
                satu pihak kepada pihak lainnya dalam perjanjian ini.
            </td>
        </tr>
        <tr>
            <td class="num-col">6.&nbsp;</td>
            <td>
                Apabila Perjanjian  kerja ini berakhir masa berlakunya sebagaimana dimaksud dalam ayat (1) pasal ini dan tidak
                diadakan perpanjangan, Maka hubungan kerja antara pihak pertama dan pihak kedua dinyatakan berakhir demi hukum.
            </td>
        </tr>
        <tr>
            <td class="num-col">7.&nbsp;</td>
            <td>
                Apabila pihak kedua mengakhiri hubungan kerja sebelum habis masa berlaku perjanjian kerja ini sebagaimana dimaksud
                dalam ayat (1) pasal ini, maka pihak kedua wajib memberikan ganti rugi sisa masa kontrak yang masih berlaku.
            </td>
        </tr>
        <tr>
            <td class="num-col">8.&nbsp;</td>
            <td>Apabila pihak kedua berhenti bekerja sebelum masa PKWT berakhir maka pihak pertama tidak berkewajiban membayar sisa kontrak sesuai PP 35 tahun 2021</td>
        </tr>
        <tr>
            <td class="num-col">9.&nbsp;</td>
            <td>
                Apabila putusnya hubungan kerja karena berakhirnya masa berlaku perjanjian kerja ini sebagaimana dimaksud dalam
                ayat (1) pasal ini, pihak kedua berhak atas uang kompensasi sesuai PP 35 tahun 2021.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL  IV<br>
        SEBAB LAIN YANG MENGAKIBATKAN BERAKHIRNYA PERJANJIAN
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Perjanjian  ini sewaktu – waktu dapat diakhiri karena terjadinya force majeur / over macht (Keadaan Memaksa /
                Keadaan Mendesak) seperti faktor bencana alam., Kebakaran, kerusuhan sosial politik, peperangan, kebijakan
                pemerintah di bidang moneter dan bidang lain yang berdampak buruk pada finansial (kondisi Keuangan) perusahaan,
                serta akibat turunnya kapasitas produksi maupun akibat pengurangan atau pencabutan order dari customer yang
                disebabkan oleh alasan  apapun.
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>
                Perjanjian kerja ini sewaktu – waktu dapat diakhiri oleh pihak pertama karena berdasarkan penilaian bahwa pihak kedua
                tidak dapat menunjukkan kemajuan selama menjalankan tugas pekerjaan  yang menjadi tanggung  jawabnya.
            </td>
        </tr>
        <tr>
            <td>3.</td>
            <td>
                Perjanjian  kerja ini dapat diakhiri, karena  pihak  kedua masih  melakukan  pelanggaran  dalam  masa berlaku Surat
                peringatan  ketiga.
            </td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Perjanjian kerja ini dapat diakhiri sewaktu – waktu oleh pihak pertama karena masa proyek berakhir atau tidak diperpanjang lagi.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td>
                Apabila hubungan kerja antara pihak pertama dengan pihak kedua putus sebagai akibat langsung dan tidak langsung dari
                sebab – sebab sebagaimana dimaksud dalam ayat (1)  pasal ini, maka pihak pertama tidak berkewajiban memberikan,
                uang penghargaan masa kerja, uang ganti rugi sisa masa kontrak, uang pisah, kepada pihak kedua / Keluarganya,
                kecuali sisa gaji bulan berjalan.
            </td>
        </tr>
        <tr>
            <td>6.</td>
            <td>
                Apabila perjanjian kerja ini hendak diakhiri oleh karena salah satu faktor penyebab sebagaimana dimaksud dalam ayat
                (1) atau ayat (2) pasal ini, maka pihak pertama wajib memberitahukan 7 (Tujuh) hari  sebelum  tanggal Jatuh tempo
                pengakhiran yang sudah ditetapkan oleh pihak pertama
            </td>
        </tr>
        <tr>
            <td>7</td>
            <td>
                Dalam Hal Pihak II tidak masuk kerja/mangkir selama 3 (tiga) hari berturut-turut, maka Pihak kedua (II)  tersebut
                dinyatakan mengundurkan diri secara sepihak dan tidak ada lagi hubungan kerja dengan Pihak I
            </td>
        </tr>
        <tr>
            <td>8</td>
            <td>
                Apabila selama dalam menjalin hubungan kerja, ternyata Pihak II telah memberikan keterangan-keterangan yang tidak
                benar (dipalsukan), baik sewaktu memasukan data lamaran, pada wawancara ataupun selama melaksanakan hubungan
                kerja, maka Pihak I berhak mengadakan pemutusan hubungan kerja. Dan pada pelaksanaan pemutusan hubungan kerja
                dilakukan sesuai prosedur Undang-undang No. 13 Tahun 2003
            </td>
        </tr>
        <tr>
            <td>9.</td>
            <td>Setiap pelanggaran terhadap ketentuan-ketentuan, tata tertib, kedisiplinan dan kewajiban yang dibebankan oleh Perusahaan, maka Pihak II akan dikenakan sanksi</td>
        </tr>
        <tr>
            <td>10.</td>
            <td>
                Dalam hal terjadinya pemutusan hubungan kerja, karena keinginan Pihak II atau karena kesalahan atau pelanggaran oleh
                Pihak II seperti tidak disiplin walaupun sudah diberi teguran berulang-ulang, mencuri, merusak milik perusahaan dengan
                sengaja, mabok, memakai obat-obaten terlarang, membawa senjata, Pihak I tidak berkewajiban membayar sisa masa
                kontrak yang diperjanjikan
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL V<br>
        HAK PIHAK KEDUA
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Sebagai imbalan atas jasa Pihak II  kepada Pihak I, upah diberikan berdasarkan pembayaran bulanan, yang dibayarkan
                setiap tanggal 25 bulan berjalan dengan rincian sebagai berikut :
                @php
                    $compItems = collect([
                        ['label' => 'Upah Pokok', 'value' => $upahPokok, 'always' => true],
                        ['label' => 'Tunjangan Allowance', 'value' => $tunjanganAllowance],
                        ['label' => 'Uang Makan', 'value' => $uangMakan],
                        ['label' => 'Uang Transport', 'value' => $uangTransport],
                        ['label' => 'Uang Kehadiran', 'value' => $uangKehadiran],
                        ['label' => 'Insentif Kinerja', 'value' => $insentifKinerja],
                    ])->filter(fn($i) => ($i['always'] ?? false) || ($i['value'] ?? 0) > 0)->values();
                @endphp
                <table style="margin-top: 8px; margin-bottom: 8px; margin-left: 10px; width: 80%;">
                    @foreach($compItems as $idx => $item)
                    <tr>
                        <td style="width: 45%;">{{ chr(97 + $idx) }}.&nbsp; {{ $item['label'] }}</td>
                        <td style="width: 5%;">:</td>
                        <td>Rp. {{ number_format($item['value'], 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </table>
                Apabila Pihak II tidak masuk kerja, upah dipotong dengan perhitungan pemotongan upah per-hari yaitu 1 (satu) bulan
                upah pokok dibagi 25 hari kerja, kecuali ijin sakit dengan dilengkapi surat keterangan dokter dan cuti (Prosedural), upah
                tetap dibayarkan.
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>
                Pihak I mengikut-sertakan Program BPJS kepada Pihak II melalui PT. BPJS dan termasuk Paket Jaminan Pemeliharaan
                Kesehatan.
            </td>
        </tr>
        <tr>
            <td>3.</td>
            <td>
                Pihak I akan memberikan Tunjangan Hari Raya kepada Pihak II sesuai dengan ketentuan Undang-undang Ketenaga-
                Kerjaan yang berlaku dan akan diberikan paling lambat 2 (dua) minggu sebelum hari raya keagamaan.
            </td>
        </tr>
        <tr>
            <td>4.</td>
            <td>
                Pihak I berhak tidak memberikan Tunjangan Hari Raya terhadap pihak ke II. Dalam hal berakhirnya perjanjian kerja
                ini sebelum Hari Raya.  (Permenaker No 6 tahun 2016).
            </td>
        </tr>
        <tr>
            <td>5.</td>
            <td>
                Pihak II wajib menanggung Pajak Penghasilan (PPh) Pasal 21 yang akan  dipungut oleh  Pihak I sebagai Pemberi Kerja
                sesuai dengan Undang-undang No. 36 Tahun 2008 mengenai Pajak Penghasilan.
            </td>
        </tr>
        <tr>
            <td>6.</td>
            <td>
                Pihak II yang bekerja melebihi dari 7 jam sehari atau 40 jam dalam satu minggu yang ditetapkan, maka diperhitungkan
                sebagai kerja tertentu sesuai dengan peraturan yang berlaku di perusahaan. Dan dari hari libur resmi yang
                ditetapkan oleh Pemerintah, Pihak II masuk kerja maka akan dibayarkan upah lembur.
            </td>
        </tr>
        <tr>
            <td>7.</td>
            <td>
                Ijin-ijin meninggalkan tugas tanpa mengurangi upah adalah :
                <div class="indent-list">
                    a)&nbsp; Sakit dibuktikan dengan Surat Keterangan Dokter<br>
                    b)&nbsp; Keluarga inti meninggal<br>
                    c)&nbsp; Anak Khitanan/Baptis<br>
                    d)&nbsp; Tugas Negara<br>
                    e)&nbsp; Menikah
                </div>
            </td>
        </tr>
        <tr>
            <td>8.</td>
            <td>
                Ijin-ijin meninggalkan tugas yang dikategorikan dikenai pemotongan upah :
                <div class="indent-list">
                    a)&nbsp; Ijin untuk kepentingan sendiri di luar urusan pekerjaan.<br>
                    b)&nbsp; Tidak masuk kerja tanpa pemberitahuan (alfa)<br>
                    c)&nbsp; Tidak masuk kerja dengan alasan sakit tanpa surat keterangan dokter
                </div>
            </td>
        </tr>
        <tr>
            <td>9.</td>
            <td>
                Hak Cuti Tahunan Karyawan :
                <div class="indent-list">
                    a.&nbsp; Diberikan kepada karyawan yang sudah bekerja minimal 1 tahun kerja terus menerus<br>
                    b.&nbsp; Diajukan paling lambat 1 minggu sebelumnya.<br>
                    c.&nbsp; Jika cuti tidak diambil maka tidak dapat digantikan dengan uang  dan hak cuti akan hangus dengan sendirinya.<br>
                    d.&nbsp; Jika karyawan yang mengajukan cuti sebelum masa kerja 1 tahun terus menerus dan mendapat ijin dari
                           pimpinannya di lokasi kerja, maka akan dilakukan pemotongan upah secara proporsional
                </div>
            </td>
        </tr>
        <tr>
            <td>10.</td>
            <td>Pihak II akan menerima dari pihak I uang kompensasi pada saat kontrak kerja berakhir atau kontraknya berakhir atas permintaan pihak pertama sesuai dengan ketentuan pemerintah.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VI<br>
        KEWAJIBAN PIHAK KEDUA
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Pihak kedua menyanggupi untuk melaksanakan pekerjaan yang menjadi tugas dan tanggung jawabnya dengan baik
                sesuai standard dan prosedur kerja yang sudah di tetapkan oleh perusahaan pihak pertama
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Pihak kedua bersedia dan sanggup mentatati segala bentuk peraturan, baik perjanjian kerja bersama maupun tata tertib lainnya yang berlaku di PT. ALFA REKA USAHA</td>
        </tr>
        <tr>
            <td>3.</td>
            <td>Pihak Kedua bersedia mematuhi segala perintah yang layak dari atasan / Pimpinan perusahaan</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Pihak Kedua bertanggung jawab terhadap tugas dan pekerjaan yang di berikan oleh pihak pertama dan / atau atasannya.</td>
        </tr>
        <tr>
            <td>5.</td>
            <td>Pihak kedua dilarang melakukan pekerjaan yang menyimpang dari tugas dan tanggungjawab yang melekat pada jabatan yang disebutkan sesuai Pasal II ayat 1 pada perjanjian ini.</td>
        </tr>
        <tr>
            <td>6.</td>
            <td>Pihak kedua sanggup dan bersedia menjalankan pekerjaan lembur apabila perusahaan / atasan memerintahkan untuk kerja lembur.</td>
        </tr>
        <tr>
            <td>7.</td>
            <td>Pihak kedua sanggup memahami segala prosedur dan standard kerja yang ditetapkan perusahaan, serta menjaga alat kerja dan aset milik perusahaan</td>
        </tr>
        <tr>
            <td>8.</td>
            <td>Pihak kedua wajib memberitahukan setiap perubahan alamat, status keluarga, dengan menyerahkan bukti yang sah kepada pihak pertama</td>
        </tr>
        <tr>
            <td>9.</td>
            <td>Pihak kedua bersedia dan sanggup menjalani mutasi dan / atau promosi, atau demosi dalam lingkungan PT. ALFA REKA USAHA bila di perlukan.</td>
        </tr>
        <tr>
            <td>10.</td>
            <td>Wajib memakai alat pelindung diri (APD), menggunakannya dengan cara yang benar sesuai yang di tentukan oleh pihak pertama.</td>
        </tr>
        <tr>
            <td>11.</td>
            <td>
                Apabila pihak kedua tidak menjalankan kewajiban sebagaimana dimaksud dalam ayat (1s/d 10) secara baik dan benar,
                maka pihak kedua siap menerima sanksi pemutusan hubungan kerja secara sepihak dari pihak pertama, dengan
                kehilangan hak guna untuk sesuata apapun atau pembayaran apapun, kecuali sisa gaji bulan berjalan
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VII<br>
        TATA TERTIB
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Pihak Kedua harus datang ke tempat kerja paling lambat 15 (Lima Belas) menit sebelum jam kerja dimulai.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Pihak Kedua harus mencatat kehadiran (Time Chard / Finger) setiap datang dan pulang kerja.</td>
        </tr>
        <tr>
            <td>3.</td>
            <td>Pihak Kedua harus mengikuti pertemuan (Meeting) pagi / sebelum jam kerja dimulai bila di perlukan.</td>
        </tr>
        <tr>
            <td>4.</td>
            <td>
                Pihak Kedua dapat diijinkan pulang cepat apabila ada keluarga (Ayah kandung, Ibu kandung, Istri, Suami, Anak,
                adik Kandung, kakak kandung) meninggal dunia, mendapat panggilan negara, atau urusan lain yang sangat
                mendesak dan dapat diterima alasannya dengan bukti dan seijin atasan serta disetujui oleh bagian personalia.
            </td>
        </tr>
        <tr>
            <td>5.</td>
            <td>
                Dilarang merokok, main judi, membawa senjata tajam dan / atau senjata api, membawa minuman keras serta obat –
                obat terlarang di area pabrik, dan dilarang melakukan perbuatan yang melanggar ketentuan dalam peraturan
                perusahaan PT. ALFA REKA USAHA, melanggar norma kesusilaan serta perbuatan – perbuatan yang melanggar
                peraturan perundangan yang berlaku.
            </td>
        </tr>
        <tr>
            <td>6.</td>
            <td>
                Dilarang tidur saat jam kerja berlangsung, makan di dalam area kerja, tidak melaksanakan kerja lembur yang sudah
                disepakati sebelumnya, atau pelanggaran berat lainnya berdasarkan peraturan perusahaan / Perjanjian kerja bersama.
            </td>
        </tr>
        <tr>
            <td>7.</td>
            <td>
                Dilarang meninggalkan tempat kerja tanpa seijin atasan atau pimpinan perusahaan terlebih dahulu. Setiap Pihak II
                yang meninggalkan pekerjaan tanpa izin Pihak I atau pejabat setempat dengan surat keterangan/alasan yang tidak
                dapat diterima oleh Pihak I dianggap mangkir.
            </td>
        </tr>
        <tr>
            <td>8.</td>
            <td>Dilarang melakukan kegiatan lain di tempat kerja yang tidak ada kaitannya dengan pekerjaan.</td>
        </tr>
        <tr>
            <td>9.</td>
            <td>
                Pihak Kedua tidak di perkenankan mengikatkan diri dengan bentuk apapun dalam suatu hubungan kerja dengan
                pihak lain, tanpa seijin pihak pertama atau pimpinan PT. ALFA REKA USAHA.
            </td>
        </tr>
        <tr>
            <td>10.</td>
            <td>
                Dengan berakhirnya masa kerja sesuai dengan perjanjian Kesepakatan Untuk Waktu Tertentu ini, maka kesepakatan
                kerja waktu tertentu ini akan putus dengan sendirinya (putus demi hukum) dan dengan putusnya hubungan kerja ini,
                Pihak I tidak berkewajiban memberikan ganti rugi ataupun pesangon.
            </td>
        </tr>
        <tr>
            <td>11.</td>
            <td>
                Selama dalam hubungan kerja, Pihak II wajib mentaati ketentuan-ketentuan tata tertib, kedisiplinan dan kewajiban
                yang dibebankan kepadanya, sesuai dengan yang tercantum dalam peraturan perusahaan dan perundangan lainnya.
            </td>
        </tr>
        <tr>
            <td>12.</td>
            <td>Setiap pelanggaran terhadap ketentuan-ketentuan, tata tertib, kedisiplinan dan kewajiban yang dibebankan oleh Perusahaan, maka Pihak II akan dikenakan sanksi.</td>
        </tr>
    </table>

    <div class="article-title">
        PASAL VIII<br>
        PENGUNDURAN DIRI
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Apabila pihak kedua hendak mengundurkan diri sebelum habis masa berlaku perjanjian kerja sebagaimana yang
                dimaksud dalam ayat satu (1) pasal III di atas, maka permohonan pengunduran diri harus diajukan paling lambat 30
                hari sebelum tanggal pengunduran diri, dan pihak kedua tetap menjalankan pekerjaan sampai tanggal pengunduran
                diri.
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>
                Apabila surat pengunduran diri diajukan kurang dari 30 hari, maka surat keterangan kerja tidak akan di berikan
                kepada pihak kedua atau orang yang dikuasakan, dan gaji gantungan untuk bulan berjalan akan ditahan (Dipending)
                pembayarannya.
            </td>
        </tr>
        <tr>
            <td>3.</td>
            <td>
                Pihak kedua wajib menyerahkan semua atribut perusahaan dan / atau perlengkapan kerja termasuk pakaian seragan
                saat hari kerja terakhir batas pengunduran diri.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL IX<br>
        SANKSI – SANKSI
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>
                Apabila dikemudian hari diketahui ada data-data yang di berikan pihak kedua tidak benar atau di palsukan, baik yang
                tertera dalam biodata, dan data – data yang tertera dalam berkas lamaran, maupun data yang tertera dalam perjanjian ini,
                maka pihak kedua setuju dan bersedia menerima sanksi berupa diberhentikan secara tidak hormat dari perusahaan oleh
                pihak pertama dengan kehilangan hak guna menuntut sesuatu hak apapun, dan pihak pertama tidak di wajibkan untuk
                membayar upah selama sisa masa kontrak.
            </td>
        </tr>
        <tr>
            <td>2.</td>
            <td>
                Apabila terjadi pelmasuan dokumen apapun terkait diri pihak kedua, maka pihak kedua setuju apabila pihak pertama
                menyerahkan proses penanganannya kepada pihak yang berwajib (Kepolisian) karena dianggap telah terjadi tindak
                pidana pemalsuan data yang dilakukan pihak kedua
            </td>
        </tr>
        <tr>
            <td>3.</td>
            <td>
                Jika pihak kedua melakukan tindakan pidana, kelalaian bekerja yang menyebabkan kerusakan, kerugian moril dan
                material kepada perusahaan, maka harus mengganti rugi dengan seketika kerugian yang timbul tersebut baik dengan cara
                pemotongan upah dan pembayaran sekaligus.
            </td>
        </tr>
        <tr>
            <td>4.</td>
            <td>
                Pelanggaran terhadap ketentuan pasal VI (Enam) dan pasal VII (Tujuh) diatas dapat mengakibatkan diakhirinya
                perjanjian ini secara sepihak oleh pihak pertama, dan pihak kedua kehilangan hak guna menuntut kompensasi sesuatu
                pembayaran apapun.
            </td>
        </tr>
        <tr>
            <td>5.</td>
            <td>
                Apabila pihak kedua sudah mendapatkan surat peringatan III dan ternyata masih melakukan pelanggaran lagi terhadap
                perjanjian kerja bersama, dan / atau Perjanjian Kerja Waktu Tertentu ini dan / atau peraturan tata tertib lainnya, yang
                berlaku di PT. ALFA REKA USAHA atau melakukan pelanggaran berat berdasarkan perjanjian kerja bersama, maka
                perjanjian kerja ini dicabut kesepakatan kerjanya secara sepihak oleh pihak pertama dan pihak kedua kehilangan hak guna
                menuntut sesuatu pembayaran apapun, termasuk jika masih ada sisa kontrak kerja yang masih berlaku, kecuali hak atas
                sisa upah untuk bulan berjalan.
            </td>
        </tr>
    </table>

    <div class="article-title">
        PASAL X<br>
        PENUTUP
    </div>

    <table>
        <tr>
            <td class="num-col">1.</td>
            <td>Berdasarkan pasal 1338 KUH perdata, Perjanjian kerja ini berlaku sebagai undang – undang bagi pihak pertama dan pihak kedua.</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>
                Apabila ada hal-hal khusus dalam perjanjian ini yang telah di sepakati oleh pihak pertama dan pihak kedua
                dianggap menyimpang dari perjanjian kerja bersama atau peraturan perundang – undangan yang berlaku di bidang
                ketenagakerjaan, maka yang berlaku mengikat secara hukum adalah perjanjian kerja ini berdasarkan ketentuan
                sebagaimana yang dimaksud dalam ayat (1) pasal ini.
            </td>
        </tr>
        <tr>
            <td>3.</td>
            <td>
                Demikian perjanjian kerja ini dibuat dan di tandatangani oleh kedua belah pihak di atas materai yang cukup, serta masing
                – masing pihak memegang 1 (Satu) rangkap, yang asli di pegang oleh pihak pertama (I) dan Photo Copy di pegang oleh
                pihak kedua (II) dengan kekuatan pembuktian sama secara hukum.
            </td>
        </tr>
        <tr>
            <td>4.</td>
            <td>Apabila ada hal – hal yang belum diatur dalam pasal – pasal diatas maka akan diatur di kemudian hari dalam perjanjian tersendiri yang tidak terpisahkan dari perjanjian ini.</td>
        </tr>
    </table>

    <p style="margin-top: 15px;">
        Demikian kesepakatan hubungan kerja ini dibuat dengan sebenarnya tanpa paksaan dari pihak manapun dan tidak akan menuntut
        sesuatu apapun bila Kesepakatan Hubungan Kerja ini berakhir dan masing masing pihak dalam keadaan sehat jasmani dan rohani
        di buat rangkap 2 (dua) dan masing-masing mempunyai kekuatan hukum yang sama dan berlaku dan sah sejak ditandatangani
        oleh Pihak I dan Pihak II.
    </p>

    <div class="sign-city-date">
        Bekasi, {{ $startDate }}
    </div>

    <table class="signature-table">
        <tr>
            <td style="width: 40%;" class="sign-party-label"><strong>PIHAK I (PERTAMA)</strong></td>
            <td style="width: 20%;">&nbsp;</td>
            <td style="width: 40%;" class="sign-party-label"><strong>PIHAK II (KEDUA)</strong></td>
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
                <strong>({{ strtoupper($pihakPertama->name ?? 'Jumaga Tua Sinaga') }})</strong>
            </td>
            <td>&nbsp;</td>
            <td class="sign-party-name">
                <strong>({{ strtoupper($worker->name ?? '-') }})</strong>
            </td>
        </tr>
    </table>

    <div class="doc-footer">pkwt aru {{ $footerYear }}</div>
</body>
</html>
