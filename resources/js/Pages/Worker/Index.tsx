import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

/**
 * Type definitions for Worker, Assignment, and Project entities.
 * These interfaces define the expected structure of data passed to the component.
 */
interface Project {
    id: number;
    name: string;
}

interface Assignment {
    id: number;
    project_id: number;
    status: string;
    hire_date: string;
    termination_date: string | null;
    project?: Project;
    contracts?: Contract[];
}

interface Contract {
    id: number;
    contract_type: string;
    pkwt_type: string | null;
    pkwt_number: number;
    start_date: string;
    end_date: string | null;
}

interface Worker {
    id: number;
    nik_aru: string | null;
    name: string;
    ktp_number: string;
    birth_date: string;
    phone: string | null;
    gender: 'male' | 'female' | null;
    assignments?: Assignment[];
}

/**
 * Props for the Worker Index component.
 */
interface Props {
    workers: Worker[];
}

/**
 * Worker Index Page Component
 *
 * Displays a table list of all registered workers.
 * Provides links to view details, edit, and a modal for deletion.
 */
/** Number of workers displayed per page. */
const PER_PAGE = 10;

export default function Index({ workers }: Props) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const { delete: destroy, processing } = useForm();

    /** Slice of workers to display on the current page. */
    const paginatedWorkers = workers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    /** Global row offset for the current page (e.g. page 2 starts at 11). */
    const rowOffset = (currentPage - 1) * PER_PAGE;

    /** Opens confirmation modal for deletion. */
    const openDeleteModal = (worker: Worker) => {
        setSelectedWorker(worker);
        setIsDeleteModalOpen(true);
    };

    /** Executes worker deletion. */
    const confirmDelete = () => {
        if (selectedWorker) {
            destroy(route('workers.destroy', selectedWorker.id), {
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };


    /** Calculates the age of a worker based on their birth date. */
    const calculateAge = (worker: Worker) => {
        const today = new Date();
        const birthDateObj = new Date(worker.birth_date);
        const age = today.getFullYear() - birthDateObj.getFullYear();
        return age;
    };

    return (
        <AdminLayout title="Kelola Data Karyawan" header="Data Karyawan">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Karyawan</h2>
                    <p className="text-sm text-slate-500">Kelola database induk seluruh karyawan yang terafiliasi dengan ARU.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={route('workers.import.index')}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:import-linear" width="20"></iconify-icon> Import Excel
                    </Link>
                    <Link
                        href={route('workers.create')}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Karyawan
                    </Link>
                </div>
            </div>

            {/* Workers Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Nama Lengkap</th>
                                <th className="px-6 py-4">NIK ARU</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Telepon</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {workers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10">
                                        <EmptyState icon="solar:users-group-two-rounded-bold" message="Belum ada data karyawan." subMessage="Silakan tambahkan atau import data." />
                                    </td>
                                </tr>
                            ) : (
                                paginatedWorkers.map((worker, index) => {
                                    const latestAssignment = worker.assignments && worker.assignments.length > 0 ? worker.assignments[0] : null;
                                    const isActive = latestAssignment && !latestAssignment.termination_date && latestAssignment.status === 'active';

                                    return (
                                        <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">{rowOffset + index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{worker.name}</div>
                                                <div className="text-xs text-slate-400 capitalize">{worker.gender === 'male' ? 'Laki-laki' : worker.gender === 'female' ? 'Perempuan' : '-'}</div>
                                                <div className="text-xs text-slate-400 capitalize">{calculateAge(worker)}<span> Tahun</span></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {worker.nik_aru ? (
                                                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-mono text-xs font-bold">{worker.nik_aru}</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Belum ada</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {latestAssignment ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {latestAssignment.project?.name || '-'}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 items-center">
                                                            <StatusBadge status={latestAssignment.status} />
                                                            {latestAssignment.contracts && latestAssignment.contracts.length > 0 && (() => {
                                                                const c = latestAssignment.contracts[0];
                                                                const label = c.pkwt_type ?? c.contract_type;
                                                                const isPkwtt = c.pkwt_type === 'PKWTT';
                                                                return (
                                                                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold border ${isPkwtt
                                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                                                                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 uppercase'
                                                                        }`}>
                                                                        {label}{!isPkwtt && c.pkwt_number ? `${c.pkwt_number}` : ''}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">- Belum ditempatkan -</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">{worker.phone || '-'}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Link
                                                    href={route('workers.show', worker.id)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-block"
                                                    title="Lihat Profil"
                                                >
                                                    <iconify-icon icon="solar:user-id-bold" width="20"></iconify-icon>
                                                </Link>
                                                <Link
                                                    href={route('workers.edit', worker.id)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-block"
                                                    title="Edit Data"
                                                >
                                                    <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                                </Link>
                                                <button
                                                    onClick={() => openDeleteModal(worker)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={workers.length}
                    itemsPerPage={PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Karyawan?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Yakin menghapus data karyawan <b>{selectedWorker?.name}</b>? Data assignment dan dokumen terkait juga akan ikut terhapus.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}