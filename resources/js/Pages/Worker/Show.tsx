import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

/**
 * Interface for Worker properties in the Show view.
 */
interface Worker {
    id: number; nik_aru: string | null; name: string; ktp_number: string; kk_number: string | null;
    birth_place: string | null; birth_date: string | null; gender: 'male' | 'female' | null; phone: string | null;
    education: string | null; religion: string | null; tax_status: string | null; address_ktp: string | null;
    address_domicile: string | null; mother_name: string | null; npwp: string | null; bpjs_kesehatan: string | null;
    bpjs_ketenagakerjaan: string | null; bank_name: string | null; bank_account_number: string | null;
    assignments?: any[]; // For future implementation
}

interface Props { worker: Worker; }

/**
 * Reusable component to display a label and value pair nicely.
 */
const DetailItem = ({ label, value, isMono = false }: { label: string, value: string | null, isMono?: boolean }) => (
    <div className="border-b border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 dark:text-slate-200 ${isMono ? 'font-mono' : ''}`}>
            {value || '-'}
        </p>
    </div>
);

/**
 * Worker Show Page Component
 *
 * Displays the comprehensive profile of a worker. Acts as the central hub
 * for a worker's data, including future modules like Assignments and Contracts.
 */
export default function Show({ worker }: Props) {
    const [activeTab, setActiveTab] = useState<'profile' | 'assignments'>('profile');

    /** Helper to format date nicely */
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <AdminLayout title={`Profil Pekerja - ${worker.name}`} header="Detail Pekerja">
            {/* Header Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex items-center gap-5 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/30 border-4 border-white dark:border-slate-800">
                        {worker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{worker.name}</h2>
                            {worker.gender === 'male' ? <iconify-icon icon="ph:gender-male-bold" style={{ color: '#3b82f6' }} width="20"></iconify-icon> : worker.gender === 'female' ? <iconify-icon icon="ph:gender-female-bold" style={{ color: '#ec4899' }} width="20"></iconify-icon> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center"><iconify-icon icon="solar:id-color-bold"></iconify-icon> NIK ARU: {worker.nik_aru || 'Belum Ada'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:phone-bold"></iconify-icon> {worker.phone || '-'}</span>
                        </div>
                    </div>
                </div>
                <div className="z-10 flex gap-3">
                    <Link href={route('workers.edit', worker.id)} className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Edit Profil
                    </Link>
                    <Link href={route('workers.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden mb-10">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                    <button onClick={() => setActiveTab('profile')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:user-id-bold" width="18"></iconify-icon> Profil Lengkap
                    </button>
                    <button onClick={() => setActiveTab('assignments')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:briefcase-bold" width="18"></iconify-icon> Penempatan & Kontrak
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        
                        {/* Identitas Utama */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-primary">
                                <iconify-icon icon="solar:card-2-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Identitas Pribadi</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <DetailItem label="Nomor KTP (NIK)" value={worker.ktp_number} isMono />
                                <DetailItem label="Nomor Kartu Keluarga" value={worker.kk_number} isMono />
                                <DetailItem label="Tempat, Tanggal Lahir" value={`${worker.birth_place || '-'}, ${formatDate(worker.birth_date)}`} />
                                <DetailItem label="Agama" value={worker.religion} />
                                <DetailItem label="Pendidikan Terakhir" value={worker.education} />
                                <DetailItem label="Nama Ibu Kandung" value={worker.mother_name} />
                            </div>
                        </div>

                        {/* Kontak & Domisili */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                <iconify-icon icon="solar:map-point-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Kontak & Lokasi</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 h-[calc(100%-2.5rem)]">
                                <DetailItem label="Alamat KTP" value={worker.address_ktp} />
                                <DetailItem label="Alamat Domisili" value={worker.address_domicile} />
                            </div>
                        </div>

                        {/* Administrasi & Finansial */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-amber-500">
                                <iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Administrasi & Bank</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <DetailItem label="Status Pajak (PTKP)" value={worker.tax_status} />
                                <DetailItem label="NPWP" value={worker.npwp} isMono />
                                <DetailItem label="BPJS Kesehatan" value={worker.bpjs_kesehatan} isMono />
                                <DetailItem label="BPJS Ketenagakerjaan" value={worker.bpjs_ketenagakerjaan} isMono />
                                <DetailItem label="Informasi Rekening Bank" value={worker.bank_name ? `${worker.bank_name} - ${worker.bank_account_number}` : null} isMono />
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="p-6">
                        <div className="flex justify-end mb-4">
                            <Link href={route('assignments.create', { worker_id: worker.id })} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm shadow-primary/30 flex items-center gap-2">
                                <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Penempatan Baru
                            </Link>
                        </div>

                        {/* Nantinya di sini kita bisa me-mapping daftar assignment yang dimiliki oleh worker */}
                        {worker.assignments && worker.assignments.length > 0 ? (
                            <div className="space-y-4">
                                {worker.assignments.map((assign: any) => (
                                    <div key={assign.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{assign.position || 'Tidak ada jabatan'}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{assign.project?.name} - {assign.department?.name}</p>
                                        </div>
                                        <Link href={route('assignments.show', assign.id)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary transition-colors">
                                            Lihat Detail & Kontrak
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                <p className="text-slate-500 mb-2">Pekerja ini belum ditempatkan di project mana pun.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}