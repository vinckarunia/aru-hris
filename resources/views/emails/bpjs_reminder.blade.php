<x-mail::message>
# Halo, {{ $worker->name }}

Pendaftaran BPJS Anda telah berhasil kami proses dan daftarkan ke sistem.

Berikut adalah informasi kepesertaan Anda:

@if(!empty($worker->bpjs_kesehatan))
**No. BPJS Kesehatan:** {{ $worker->bpjs_kesehatan }}
@endif

@if(!empty($worker->bpjs_ketenagakerjaan))
**No. BPJS Ketenagakerjaan:** {{ $worker->bpjs_ketenagakerjaan }}
@endif

Terima kasih,
**PT. Alfa Reka Usaha**
**Kompleks Ruko Duta Permai Blok E/10, RT.09 RW.01, Kel. Jakasampurna, Bekasi**
</x-mail::message>
