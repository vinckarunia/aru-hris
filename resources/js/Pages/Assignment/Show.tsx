import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';

interface Assignment {
    id: number; worker_id: number; employee_id: string | null; position: string | null;
    hire_date: string; termination_date: string | null; status: string;
    worker: { id: number; name: string; nik_aru: string; };
    project: { id: number; name: string; prefix: string; };
    branch: { id: number; name: string; };
    contracts?: any[];
}

interface Props { assignment: Assignment; }

export default function Show({ assignment }: Props) {
    const isActive = !assignment.termination_date && assignment.status === 'active';

    return (
        <AdminLayout title={`Detail Penempatan - ${assignment.worker.name}`} header="Detail Penempatan">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 mb-6 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="z-10">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                        {assignment.position} di {assignment.project.name}
                    </h2>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1"><iconify-icon icon="solar:user-bold"></iconify-icon> {assignment.worker.name}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><iconify-icon icon="solar:buildings-bold"></iconify-icon> Cabang: {assignment.branch.name}</span>
                    </div>
                </div>
                <div className="z-10 flex gap-3">
                    <Link href={route('assignments.edit', assignment.id)} className="px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-semibold flex items-center gap-2 text-sm transition-colors">
                        <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Edit Info
                    </Link>
                    <Link href={route('workers.show', assignment.worker_id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 gap-6">

                {/* Detail Assignments */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white">Status Penempatan</h3>
                            <StatusBadge status={assignment.status} />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="border-b border-slate-50 dark:border-slate-700/50 pb-3">
                                <p className="text-xs text-slate-400 font-medium mb-1">ID Karyawan Client</p>
                                <p className="font-mono text-sm text-slate-800 dark:text-slate-200">{assignment.employee_id || '-'}</p>
                            </div>
                            <div className="border-b border-slate-50 dark:border-slate-700/50 pb-3">
                                <p className="text-xs text-slate-400 font-medium mb-1">Tanggal Bergabung</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{assignment.hire_date}</p>
                            </div>
                            <div className="border-b border-slate-50 dark:border-slate-700/50 pb-3">
                                <p className="text-xs text-slate-400 font-medium mb-1">Tanggal Berakhir</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{assignment.termination_date || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contracts */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <iconify-icon icon="solar:document-text-bold" className="text-primary"></iconify-icon> Riwayat Kontrak
                            </h3>
                            <Link href={route('contracts.create', { assignment_id: assignment.id })} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Buat Kontrak Baru
                            </Link>
                        </div>

                        <div className="p-6 flex-1">
                            {assignment.contracts && assignment.contracts.length > 0 ? (
                                <div className="space-y-4">
                                    {assignment.contracts.map((contract: any) => (
                                        <div key={contract.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                                                    <iconify-icon icon="solar:file-check-bold" width="24"></iconify-icon>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {contract.contract_type === 'Harian'
                                                            ? 'Harian'
                                                            : contract.pkwt_type === 'PKWTT'
                                                                ? 'PKWTT'
                                                                : `PKWT-${contract.pkwt_number}`
                                                        }
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full uppercase">
                                                            {contract.contract_type}
                                                        </span>
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Periode: {contract.start_date} s/d {contract.end_date || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link href={route('contracts.show', contract.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                                                Lihat Detail
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center h-full py-4">
                                    <EmptyState icon="solar:document-text-bold" message="Belum ada kontrak yang dibuat." subMessage="Klik tombol di atas untuk menambahkan kontrak dan rincian gaji." />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}