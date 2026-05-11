<x-mail::message>
# Halo, {{ $worker->name }}

Dengan ini kami informasikan bahwa kontrak kerja Anda telah disetujui.

**Detail Kontrak:**

- **Jenis Kontrak:** {{ $contract->contract_type }} {{ $contract->pkwt_type ? '(' . $contract->pkwt_type . ($contract->pkwt_number ? ' #' . $contract->pkwt_number : '') . ')' : '' }}
- **Project:** {{ $assignment->project->name ?? '-' }}
- **Jabatan:** {{ $assignment->position ?? '-' }}
- **Periode:** {{ $contract->start_date ? \Carbon\Carbon::parse($contract->start_date)->translatedFormat('d F Y') : '-' }} s/d {{ $contract->end_date ? \Carbon\Carbon::parse($contract->end_date)->translatedFormat('d F Y') : '-' }}

Silakan hubungi PIC atau Admin untuk informasi lebih lanjut mengenai kontrak kerja Anda.

Terima kasih,
**PT. Alfa Reka Usaha**
**Kompleks Ruko Duta Permai Blok E/10, RT.09 RW.01, Kel. Jakasampurna, Bekasi**
</x-mail::message>
