import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function Show({ contract }: any) {
    const { delete: destroy, processing } = useForm();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

    const formatRp = (value: string | number | null) => {
        if (!value) return 'Tidak ada';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
    };

    const translateRate = (rate: string | null | undefined) => {
        const rates: Record<string, string> = {
            yearly: 'Tahun',
            monthly: 'Bulan',
            daily: 'Hari',
            hourly: 'Jam'
        };
        return rate && rates[rate] ? rates[rate] : rate;
    };

    const confirmDelete = () => {
        destroy(route('contracts.destroy', contract.id));
    };

    return (
        <AdminLayout title={`Detail Kontrak - ${contract.assignment.worker.name}`} header="Detail Kontrak">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {contract.contract_type === 'Harian'
                            ? 'Harian'
                            : contract.pkwt_type === 'PKWTT'
                                ? 'PKWTT'
                                : `PKWT-${contract.pkwt_number}`
                        }: {contract.assignment.worker.name}
                    </h2>
                    <p className="text-sm text-slate-500">{contract.assignment.project.name} - {contract.assignment.branch.name}</p>
                </div>
                <div className="flex gap-3">
                    <Link href={route('assignments.show', contract.assignment.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                    <Link href={route('contracts.edit', contract.id)} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Edit Kontrak
                    </Link>
                    <button onClick={() => setIsDeleteModalOpen(true)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl font-bold transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon> Hapus
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-10">
                {/* Contract Info */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <iconify-icon icon="solar:document-text-bold" width="24"></iconify-icon>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Data Kontrak</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-slate-500 mb-1">Jenis Kontrak</p><p className="font-semibold text-slate-800 dark:text-white">{contract.contract_type}</p></div>
                            <div><p className="text-xs text-slate-500 mb-1">Status Karyawan</p><p className="font-semibold text-slate-800 dark:text-white">{contract.pkwt_type || '-'}</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-slate-500 mb-1">Tanggal Mulai</p><p className="font-semibold text-slate-800 dark:text-white">{contract.start_date}</p></div>
                            <div><p className="text-xs text-slate-500 mb-1">Tanggal Berakhir</p><p className="font-semibold text-slate-800 dark:text-white">{contract.end_date || '-'}</p></div>
                        </div>
                        {contract.evaluation_notes && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 mb-1">Catatan Evaluasi:</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{contract.evaluation_notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Compensations */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3 relative z-10">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Rincian Gaji & Tunjangan</h3>
                    </div>

                    <div className="space-y-5 relative z-10">
                        <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Gaji Pokok</p>
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{formatRp(contract.compensation?.base_salary)}</p>
                            </div>
                            <span className="px-3 py-1 bg-white dark:bg-slate-800 text-emerald-600 rounded-lg text-xs font-bold shadow-sm uppercase">/ {translateRate(contract.compensation?.salary_rate)}</span>
                        </div>

                        {(Number(contract.compensation?.meal_allowance) > 0 || Number(contract.compensation?.transport_allowance) > 0) && (
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-slate-500 mb-1">Uang Makan/{translateRate(contract.compensation?.allowance_rate)}</p><p className="font-semibold text-slate-800 dark:text-white font-mono">{formatRp(contract.compensation?.meal_allowance)}</p></div>
                                <div><p className="text-xs text-slate-500 mb-1">Uang Transport/{translateRate(contract.compensation?.allowance_rate)}</p><p className="font-semibold text-slate-800 dark:text-white font-mono">{formatRp(contract.compensation?.transport_allowance)}</p></div>
                            </div>
                        )}

                        {(Number(contract.compensation?.overtime_weekday_rate) > 0 || Number(contract.compensation?.overtime_holiday_rate) > 0) && (
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-slate-500 mb-1">Lembur Weekday/{translateRate(contract.compensation?.overtime_rate)}</p><p className="font-semibold text-slate-800 dark:text-white font-mono">{formatRp(contract.compensation?.overtime_weekday_rate)}</p></div>
                                <div><p className="text-xs text-slate-500 mb-1">Lembur Weekend & Libur/{translateRate(contract.compensation?.overtime_rate)}</p><p className="font-semibold text-slate-800 dark:text-white font-mono">{formatRp(contract.compensation?.overtime_holiday_rate)}</p></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Kontrak?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus kontrak beserta data rincian gajinya? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}