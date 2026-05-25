<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Paklaring (Surat Keterangan Kerja)</title>
    <style>
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #000;
            margin-bottom: 30px;
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
            font-family: Arial, Helvetica, sans-serif;
        }
        .header-text p {
            margin: 2px 0 0 0;
            font-size: 10px;
            font-family: Arial, Helvetica, sans-serif;
        }
        .title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-top: 20px;
            margin-bottom: 0px;
        }
        .subtitle {
            font-size: 14px;
            text-align: center;
            margin-top: 0px;
            margin-bottom: 30px;
        }
        .content {
            margin: 0 20px;
            text-align: justify;
        }
        table.employee-info {
            width: 80%;
            margin-left: 40px;
            margin-top: 20px;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        table.employee-info td {
            vertical-align: top;
            padding: 4px 0;
            font-weight: bold;
        }
        .label-col {
            width: 25%;
        }
        .colon-col {
            width: 5%;
        }
        .value-col {
            width: 70%;
        }
        .dates-section {
            text-align: center;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .signature-section {
            margin-top: 40px;
            margin-left: 20px;
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
                    <img src="{{ $logoBase64 }}" width="80" alt="Logo">
                @else
                    <div style="font-size: 30px; font-weight: bold; color: #660033; font-style: italic; font-family: Arial, sans-serif;">A<span style="color: #000;">R</span></div>
                @endif
            </td>
            <td class="header-text" style="text-align: center; padding-left: 20px;">
                <h1>PT. ALFA REKA USAHA</h1>
                <p><strong>Recruiting, Selecting, Placement and Employee Management</strong></p>
                <p>Ruko Duta Permai Blok E No. 10 Jln. Raya Kalimalang, Jakasampurna, Bekasi 17145</p>
                <p>Phone : (021) 88952278, Fax.(021) 88852466 E-mail : <span style="color: blue; text-decoration: underline;">aru_pt@yahoo.com</span> , <span style="color: blue; text-decoration: underline;">admncgv@gmail.com</span></p>
            </td>
        </tr>
    </table>

    <div class="title">SURAT KETERANGAN</div>
    <div class="subtitle">No. : {{ $nomorSurat }}</div>

    <div class="content">
        <p>Yang bertanda tangan di bawah ini menerangkan bahwa :</p>

        <table class="employee-info">
            <tr>
                <td class="label-col">Nama</td>
                <td class="colon-col">:</td>
                <td class="value-col">{{ $worker->name ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label-col">NIK</td>
                <td class="colon-col">:</td>
                <td class="value-col">{{ $assignment->nik_aru ?: ($worker->nik_aru ?: ($assignment->employee_id ?: '-')) }}</td>
            </tr>
            <tr>
                <td class="label-col">Divisi / Sect.</td>
                <td class="colon-col">:</td>
                <td class="value-col">{{ $assignment->position ?? '-' }}</td>
            </tr>
        </table>

        <div class="dates-section">
            <p>Telah bekerja pada perusahaan kami <strong>PT. Alfa Reka Usaha</strong> terhitung sejak tanggal :</p>
            <p style="margin-top: 15px;">{{ $assignment->hire_date ? \Carbon\Carbon::parse($assignment->hire_date)->translatedFormat('d F Y') : '-' }} sampai dengan {{ $assignment->termination_date ? \Carbon\Carbon::parse($assignment->termination_date)->translatedFormat('d F Y') : '-' }}</p>
        </div>

        @php
            // Just use the first branch for location if multiple
            $branchName = $assignment->branches->first()->name ?? '-';
            $clientFullName = $assignment->project->client->full_name ?? ($assignment->project->client->name ?? '-');
            $clientAddress = $assignment->project->client->address ?? '-';
            
            $nextDay = $assignment->termination_date ? \Carbon\Carbon::parse($assignment->termination_date)->addDay()->translatedFormat('d F Y') : '-';
            $alasan = $grade === 'A' ? 'masa kerja telah berakhir' : 'Mengundurkan diri';
        @endphp

        <p>Dan kami tempatkan di {{ strtoupper($clientFullName) }} yang beralamat di {{ $clientAddress }}.</p>
        
        <p>Terhitung mulai tanggal {{ $nextDay }} yang bersangkutan telah berhenti bekerja di perusahaan kami karena <strong>{{ $alasan }}</strong>.</p>

        @if($grade === 'A')
        <p>Selama masa kerjanya yang bersangkutan telah menunjukan dedikasi yang tinggi serta menjalankan tugas dan tanggung jawab dengan baik. Perusahaan mengucapkan terima kasih atas kontribusi dan dedikasi yang telah diberikan selama bekerja bersama kami. Semoga kesuksesan selalu menyertai di masa depan.</p>
        @endif

        <p style="margin-top: 20px;">Demikian Surat Keterangan ini diberikan untuk dapat dipergunakan sebagai mana mestinya.</p>
    </div>

    <div class="signature-section">
        <p>Bekasi, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}</p>
        @if($signatureBase64)
            <img src="{{ $signatureBase64 }}" width="160" style="margin: 5px 0;" alt="Tanda Tangan">
        @else
            <br><br><br><br>
        @endif
        <p style="margin-top: 5px;"><u>{{ $pihakPertama->name ?? 'Jumaga Tua Sinaga' }}</u><br>
        {{ $pihakPertama->position ?? 'Head of Operation' }}</p>
    </div>
</body>
</html>
