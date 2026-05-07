<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Surat Tugas</title>
    <style>
        body {
            font-family: Tahoma, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
            padding-bottom: 10px;
        }
        .header-logo {
            width: 80px;
            text-align: center;
        }
        .header-text h1 {
            color: #0033cc;
            font-size: 20px;
            margin: 0;
            padding: 0;
        }
        .header-text p {
            margin: 2px 0 0 0;
            font-size: 10px;
        }
        .title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-top: 30px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        td {
            vertical-align: top;
            padding: 2px 0;
        }
        .label-col {
            width: 20%;
        }
        .colon-col {
            width: 5%;
        }
        .value-col {
            width: 75%;
        }
        .signature-section {
            margin-top: 50px;
        }
    </style>
</head>
<body>
    @php
        $logoBase64 = $logoPath && file_exists($logoPath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath)) : null;
        $signatureBase64 = $signaturePath && file_exists($signaturePath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($signaturePath)) : null;
    @endphp
    <table class="header-table">
        <tr>
            <td class="header-logo">
                @if($logoBase64)
                    <img src="{{ $logoBase64 }}" style="max-height: 60px; max-width: 80px; object-fit: contain;" alt="Logo">
                @else
                    <div style="font-size: 30px; font-weight: bold; color: #660033; font-style: italic;">A<span style="color: #000;">R</span></div>
                @endif
            </td>
            <td class="header-text" style="text-align: center; padding-left: 20px;">
                <h1>PT. ALFA REKA USAHA</h1>
                <p><strong>Recruiting, Selecting, Placement and Employee Management</strong></p>
                <p>Ruko Duta Permai Blok E No. 10 Jln. Raya Kalimalang, Jakasampurna, Bekasi 17145</p>
                <p>Phone : (021) 88952278, Fax.(021) 88852466 E-mail : <span style="color: blue; text-decoration: underline;">admin@alfarekausahapt.com</span></p>
            </td>
        </tr>
    </table>

    @php
        $pkwtNo = str_pad($contract->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $clientPrefix = $contract->assignment->project->client->short_name ?? 'CLIENT';
        $romanMonths = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $month = now()->month;
        $romanMonth = $romanMonths[$month] ?? 'I';
        $year = now()->year;
        $st_formatted = sprintf('%s/ARU-%s/ST/%s/%s', $pkwtNo, $clientPrefix, $romanMonth, $year);
    @endphp

    <p>Bekasi, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
    Ref. No. &nbsp;&nbsp;&nbsp;&nbsp;: {{ $st_formatted }}</p>

    <div class="title">SURAT TUGAS</div>

    <p style="margin-bottom: 15px;">Yang bertanda tangan di bawah ini selaku Pimpinan PT. Alfa Reka Usaha :</p>

    <table>
        <tr>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ $pihakPertama->name ?? 'Jumaga Tua Sinaga' }}</strong></td>
        </tr>
        <tr>
            <td class="label-col">Jabatan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $pihakPertama->position ?? 'Head of Operation' }}</td>
        </tr>
    </table>

    <p style="margin-top: 15px; margin-bottom: 15px;">Yang dengan ini bertindak atas nama PT. Alfa Reka Usaha, memutuskan surat perintah kerja terhadap karyawan PT. Alfa Reka Usaha yang tersebut di bawah ini :</p>

    <table>
        <tr>
            <td class="label-col">Nama</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ $worker->name ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td class="label-col">TTL</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->birth_place ?? '-' }}, {{ $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-' }}</td>
        </tr>
        <tr>
            <td class="label-col">No. Pegawai</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $worker->nik_aru ?? '-' }}</td>
        </tr>
    </table>

    <p style="margin-top: 15px; margin-bottom: 15px;">Jabatan serta lokasi kantor adalah sebagai berikut :</p>

    <table>
        <tr>
            <td class="label-col">Jabatan</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ $contract->assignment->position ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label-col">Lokasi</td>
            <td class="colon-col">:</td>
            <td class="value-col">{{ strtoupper($contract->assignment->project->client->full_name ?? '-') }} – {{ strtoupper($contract->assignment->branch->name ?? '-') }}</td>
        </tr>
        <tr>
            <td class="label-col">Masa Tugas</td>
            <td class="colon-col">:</td>
            <td class="value-col"><strong>{{ $contract->start_date ? \Carbon\Carbon::parse($contract->start_date)->translatedFormat('d F Y') : '-' }}</strong> sampai dengan <strong>{{ $contract->end_date ? \Carbon\Carbon::parse($contract->end_date)->translatedFormat('d F Y') : '-' }}</strong></td>
        </tr>
    </table>

    <p style="margin-top: 20px;">Demikian Surat Tugas ini diberikan untuk dilaksanakan dengan sebaik-baiknya.</p>
    <p>Atas kerjasamanya, diucapkan terima kasih.</p>

    <div class="signature-section">
        <p>Hormat kami,</p>
        @if($signatureBase64)
            <img src="{{ $signatureBase64 }}" style="max-height: 80px; max-width: 160px; object-fit: contain; margin: 4px 0;" alt="Tanda Tangan">
        @else
            <br><br><br><br>
        @endif
        <p><strong><u>{{ strtoupper($pihakPertama->name ?? 'Jumaga Tua Sinaga') }}</u></strong><br>
        {{ $pihakPertama->position ?? 'Head of Operation' }}</p>
    </div>
</body>
</html>
