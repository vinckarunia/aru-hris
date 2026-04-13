import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

/**
 * Interface representing the full internal employee data for the Show view.
 */
interface InternalEmployee {
    id: string;
    nik_aru: string | null;
    name: string;
    ktp_number: string;
    kk_number: string | null;
    birth_place: string | null;
    birth_date: string | null;
    gender: string | null;
    phone: string | null;
    education: string | null;
    religion: string | null;
    tax_status: string | null;
    address_ktp: string | null;
    address_domicile: string | null;
    mother_name: string | null;
    npwp: string | null;
    bpjs_kesehatan: string | null;
    bpjs_ketenagakerjaan: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    position: string | null;
    department: string | null;
    join_date: string | null;
    status: string;
    created_at: string | null;
}

interface Props {
    employee: InternalEmployee;
}

/**
 * Reusable component to display a label and value pair nicely.
 */
function DetailItem({ label, value, isMono = false }: { label: string; value: string | null; isMono?: boolean }) {
    return (
        <div>
            <dt className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</dt>
            <dd className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${isMono ? 'font-mono' : ''}`}>
                {value || <span className="text-slate-300 dark:text-slate-600 italic">Belum diisi</span>}
            </dd>
        </div>
    );
}

/**
 * Internal Employee Show Page Component
 *
 * Displays all information about an internal employee in a structured card layout.
 */
export default function Show({ employee }: Props) {
    /** Helper to format date nicely */
    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    /** Extracts initials from a given full name. */
    const getInitials = (name: string): string => {
        const names = name.split(' ');
        if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    /** Returns CSS classes for status badge. */
    const statusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700';
            case 'inactive':
                return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700';
            case 'resign':
                return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700';
            default:
                return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const translateStatus = (status: string) => {
        const map: Record<string, string> = { active: 'Aktif', inactive: 'Non-Aktif', resign: 'Resign' };
        return map[status] || status;
    };

    return (
        <AdminLayout title={`Detail Karyawan Internal - ${employee.name}`} header="Karyawan Internal">
            {/* Header Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="flex items-center gap-5 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/30 shrink-0">
                        {getInitials(employee.name)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{employee.name}</h2>
                            {employee.gender === 'male' ? <iconify-icon icon="ph:gender-male-bold" style={{ color: '#3b82f6' }} width="20"></iconify-icon> : employee.gender === 'female' ? <iconify-icon icon="ph:gender-female-bold" style={{ color: '#ec4899' }} width="20"></iconify-icon> : null}
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusBadgeClass(employee.status)} ml-1`}>
                                {translateStatus(employee.status)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center"><iconify-icon icon="solar:id-color-bold" className="mr-1"></iconify-icon> NIK ARU: {employee.nik_aru || 'Belum Ada'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center"><iconify-icon icon="solar:shield-user-bold" className="mr-1"></iconify-icon> {employee.department} {employee.position ? `— ${employee.position}` : ''}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:phone-bold"></iconify-icon> {employee.phone || '-'}</span>
                        </div>
                    </div>
                </div>
                <div className="z-10 flex gap-3">
                    <Link
                        href={route('internal-employees.edit', employee.id)}
                        className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Edit Profil
                    </Link>
                    <Link
                        href={route('internal-employees.index')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>

            {/* Content Tabs area */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden mb-10">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-hide">
                    <button className="px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 border-primary text-primary">
                        <iconify-icon icon="solar:user-id-bold" width="18"></iconify-icon> Profil Lengkap
                    </button>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 gap-8">
                    {/* Kepegawaian Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <iconify-icon icon="solar:shield-user-bold" width="24"></iconify-icon>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Informasi Kepegawaian</h3>
                        </div>
                        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <DetailItem label="Tanggal Masuk Kerja" value={formatDate(employee.join_date)} />
                            <DetailItem label="Status Kepegawaian" value={translateStatus(employee.status)} />
                        </div>
                    </div>

                    {/* Profile Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <iconify-icon icon="solar:card-2-bold" width="24"></iconify-icon>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Identitas Pribadi</h3>
                        </div>
                        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <DetailItem label="Nomor KTP (NIK)" value={employee.ktp_number} isMono />
                            <DetailItem label="Nomor Kartu Keluarga" value={employee.kk_number} isMono />
                            <DetailItem label="Tempat, Tanggal Lahir" value={`${employee.birth_place || '-'}, ${formatDate(employee.birth_date)}`} />
                            <DetailItem label="Agama" value={employee.religion} />
                            <DetailItem label="Pendidikan Terakhir" value={employee.education} />
                            <DetailItem label="Nama Ibu Kandung" value={employee.mother_name} />
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-emerald-500">
                            <iconify-icon icon="solar:map-point-bold" width="24"></iconify-icon>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Kontak & Lokasi</h3>
                        </div>
                        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <DetailItem label="Alamat KTP" value={employee.address_ktp} />
                            <DetailItem label="Alamat Domisili" value={employee.address_domicile} />
                        </div>
                    </div>

                    {/* Administration Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Administrasi & Bank</h3>
                        </div>
                        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <DetailItem label="Status Pajak (PTKP)" value={employee.tax_status} />
                            <DetailItem label="NPWP" value={employee.npwp} isMono />
                            <DetailItem label="BPJS Kesehatan" value={employee.bpjs_kesehatan} isMono />
                            <DetailItem label="BPJS Ketenagakerjaan" value={employee.bpjs_ketenagakerjaan} isMono />
                            <DetailItem label="Informasi Rekening Bank" value={employee.bank_name ? `${employee.bank_name} - ${employee.bank_account_number}` : null} isMono />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
