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
**{{ config('app.name') }}**
</x-mail::message>
