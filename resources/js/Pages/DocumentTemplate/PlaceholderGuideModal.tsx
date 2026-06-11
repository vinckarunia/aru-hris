import React from 'react';
import Modal from '@/Components/Modal';

interface Props {
    show: boolean;
    onClose: () => void;
}

export default function PlaceholderGuideModal({ show, onClose }: Props) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <iconify-icon icon="solar:info-circle-linear" width="24" className="text-primary"></iconify-icon>
                        Panduan Placeholder
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <iconify-icon icon="solar:close-circle-linear" width="24"></iconify-icon>
                    </button>
                </div>
                
                <div className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-slate-800 dark:text-blue-400" role="alert">
                    <span className="font-medium">Cara Penggunaan:</span> Ketik kode di bawah ini persis seperti yang tertulis di dalam file Microsoft Word (.docx).
                </div>
                
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200">Penomoran Dokumen</div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-3 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded mb-2">
                        <div className="flex justify-between items-center mb-1">
                            <code className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1 rounded font-bold">[NOMOR_SURAT]</code>
                            <span className="text-right text-blue-700 dark:text-blue-300 font-medium">Auto Format</span>
                        </div>
                        <span className="text-xs text-blue-600/80 dark:text-blue-300/80 italic">
                            Pilih salah satu: Gunakan tag di atas untuk format penomoran standar sistem (otomatis disesuaikan jenis dokumen), <b>ATAU</b> rakit manual dengan komponen di bawah ini.
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NO_URUT_KONTRAK]</code><span>Misal: 001 (Urutan)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PKWT_KE]</code><span>Misal: 001 (PKWT ke-N)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[BULAN_ROMAWI]</code><span>Misal: V, X, XII</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TAHUN_KONTRAK]</code><span>Misal: 2026</span>
                    </div>

                    <div className="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200">Data Karyawan</div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NAMA_KARYAWAN]</code><span>Nama Lengkap</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[KTP]</code><span>No KTP / NIK</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NIK_ARU]</code><span>NIK Internal ARU</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[GENDER]</code><span>Jenis Kelamin</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TEMPAT_LAHIR]</code><span>Tempat Lahir</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TANGGAL_LAHIR]</code><span>Tanggal Lahir</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PENDIDIKAN]</code><span>Pendidikan Akhir</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[AGAMA]</code><span>Agama</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[STATUS_PAJAK]</code><span>Status PTKP (TK/0)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[STATUS_PERNIKAHAN]</code><span>Menikah / Belum Menikah</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[EMAIL]</code><span>Alamat Email</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PHONE]</code><span>Nomor Handphone</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[ALAMAT]</code><span>Alamat KTP</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[ALAMAT_DOMISILI]</code><span>Alamat Domisili</span>
                    </div>

                    <div className="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200">Penempatan & Kontrak</div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[JABATAN]</code><span>Jabatan</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[CLIENT]</code><span>Nama Client</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[CLIENT]</code><span>Nama Client</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[ALAMAT_CLIENT]</code><span>Alamat Client</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[CABANG]</code><span>Nama Cabang</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PROJECT]</code><span>Nama Project</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[EMPLOYEE_ID]</code><span>ID Karyawan Client</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TANGGAL_DIBUAT]</code><span>Tgl Surat Dibuat</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PIHAK_ARU_NAMA]</code><span>Nama Pihak ARU (Penandatangan)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[PIHAK_ARU_JABATAN]</code><span>Jabatan Pihak ARU</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[MULAI_KONTRAK]</code><span>Tgl Mulai Kontrak</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[AKHIR_KONTRAK]</code><span>Tgl Berakhir Kontrak</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[DURASI_KONTRAK]</code><span>Durasi (Misal: 12 BULAN)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TANGGAL_HIRE]</code><span>Tgl Hire/Masuk</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TANGGAL_KELUAR]</code><span>Tgl Keluar (Paklaring)</span>
                    </div>

                    <div className="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200">Kompensasi</div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-3 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded mb-2">
                        <div className="flex justify-between items-center mb-1">
                            <code className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1 rounded font-bold">[RINCIAN_KOMPENSASI]</code>
                            <span className="text-right text-blue-700 dark:text-blue-300 font-medium">Auto List (&gt; Rp 0)</span>
                        </div>
                        <span className="text-xs text-blue-600/80 dark:text-blue-300/80 italic">
                            Pilih salah satu: Gunakan tag di atas untuk membuat daftar kompensasi otomatis, <b>ATAU</b> gunakan tag spesifik di bawah ini jika ingin format manual.
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[GAJI_POKOK]</code><span>Gaji Pokok (Format Rp)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[TUNJANGAN]</code><span>Total Tunjangan</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[UANG_MAKAN]</code><span>Tunjangan Makan</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[UANG_TRANSPORT]</code><span>Tunjangan Transport</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[UANG_KEHADIRAN]</code><span>Tunjangan Kehadiran</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[INSENTIF_KINERJA]</code><span>Insentif Kinerja</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[LEMBUR_WEEKDAY]</code><span>Lembur Weekday</span>
                    </div>
                    <div className="flex justify-between pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[LEMBUR_WEEKEND]</code><span>Lembur Weekend/Libur</span>
                    </div>

                    <div className="text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200">Data Administrasi</div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NO_KK]</code><span>No Kartu Keluarga</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NAMA_IBU]</code><span>Nama Ibu Kandung</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NPWP]</code><span>Nomor NPWP</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[BPJS_KES]</code><span>No BPJS Kesehatan</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[BPJS_TK]</code><span>No BPJS Ketenagakerjaan</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[BANK]</code><span>Nama Bank</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 px-1 rounded">[NO_REKENING]</code><span>No Rekening</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
