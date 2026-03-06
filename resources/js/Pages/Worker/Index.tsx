import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

/**
 * Type definitions for Worker, Assignment, and Project entities.
 * These interfaces define the expected structure of data passed to the component.
 */
interface Client {
    id: number;
    name: string;
    full_name: string;
    short_name: string;
    projects?: Project[];
}

interface Project {
    id: number;
    client_id?: number;
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
    clients: Client[];
}

/**
 * Worker Index Page Component
 *
 * Displays a table list of all registered workers.
 * Provides links to view details, edit, and a modal for deletion.
 */
/** Number of workers displayed per page. */
const PER_PAGE = 10;

export default function Index({ workers, clients }: Props) {
    const { auth } = usePage<PageProps>().props;
    const isPic = auth.user.role === 'PIC';

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
    const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]); // For multi-select

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterClientId, setFilterClientId] = useState<string>('all');
    const [filterProjectId, setFilterProjectId] = useState<string>('all');

    const { delete: destroy, processing } = useForm();

    // Reset project filter if client changes
    const handleClientFilterChange = (clientId: string) => {
        setFilterClientId(clientId);
        setFilterProjectId('all');
        setCurrentPage(1);
    };

    const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) +
        (filterClientId !== 'all' ? 1 : 0) +
        (filterProjectId !== 'all' ? 1 : 0);

    // Derived lists for dropdowns based on selections
    const selectedClientObj = clients.find(c => c.id.toString() === filterClientId);
    const availableProjects = selectedClientObj?.projects || [];

    // Base Search logic + Filter logic
    const filteredWorkers = workers.filter(worker => {
        // Search Logic
        const matchesSearch = worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (worker.nik_aru && worker.nik_aru.toLowerCase().includes(searchQuery.toLowerCase()));

        // Find latest assignment for status & project filtering
        const latestAssignment = worker.assignments && worker.assignments.length > 0 ? worker.assignments[0] : null;

        // Filter Logic: Status
        let matchesStatus = true;
        if (filterStatus !== 'all') {
            const currentStatus = latestAssignment?.status || 'none';
            matchesStatus = currentStatus === filterStatus;
            // e.g 'active', 'resign', 'end_contract', 'none'
        }

        // Filter Logic: Project & Client context
        let matchesProjectContext = true;
        if (filterClientId !== 'all') {
            // If client filter is set, check if the worker's latest assignment belongs to *any* project in that client
            // Wait, the assignment model only gives project ID, not client ID, but we have `clients` array containing their projects.
            const isAssignedToClient = latestAssignment &&
                clients.find(c => c.id.toString() === filterClientId)?.projects?.some(p => p.id === latestAssignment.project_id);

            if (!isAssignedToClient) {
                matchesProjectContext = false;
            }

            // If project is ALSO specifically chosen
            if (matchesProjectContext && filterProjectId !== 'all') {
                if (latestAssignment?.project_id?.toString() !== filterProjectId) {
                    matchesProjectContext = false;
                }
            }
        } else if (filterProjectId !== 'all') {
            // If only project is selected (can happen if UI allows it differently, but just in case)
            matchesProjectContext = latestAssignment?.project_id?.toString() === filterProjectId;
        }

        return matchesSearch && matchesStatus && matchesProjectContext;
    });

    /** Handles sorting logic for regular and shift-clicks (multi-sort). */
    const handleSort = (key: string, e: React.MouseEvent) => {
        setSortConfigs(prevConfigs => {
            const existingIndex = prevConfigs.findIndex(config => config.key === key);
            let newConfigs = [...prevConfigs];

            if (e.shiftKey) {
                // Multi-column sorting
                if (existingIndex >= 0) {
                    if (newConfigs[existingIndex].direction === 'asc') {
                        newConfigs[existingIndex].direction = 'desc';
                    } else {
                        newConfigs.splice(existingIndex, 1);
                    }
                } else {
                    newConfigs.push({ key, direction: 'asc' });
                }
            } else {
                // Single column sorting
                if (existingIndex >= 0) {
                    if (newConfigs.length === 1 && newConfigs[0].direction === 'asc') {
                        newConfigs = [{ key, direction: 'desc' }];
                    } else if (newConfigs.length === 1 && newConfigs[0].direction === 'desc') {
                        newConfigs = [];
                    } else {
                        newConfigs = [{ key, direction: 'asc' }];
                    }
                } else {
                    newConfigs = [{ key, direction: 'asc' }];
                }
            }
            return newConfigs;
        });
    };

    /** Retrieves the value from a worker object based on a key path. */
    const getSortValue = (worker: Worker, key: string): any => {
        if (key === 'project_name') {
            const latestAssignment = worker.assignments && worker.assignments.length > 0 ? worker.assignments[0] : null;
            return latestAssignment?.project?.name || '';
        }
        return worker[key as keyof Worker] ?? '';
    };

    const sortedWorkers = [...filteredWorkers].sort((a, b) => {
        for (const config of sortConfigs) {
            let valA = getSortValue(a, config.key);
            let valB = getSortValue(b, config.key);

            if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return config.direction === 'asc' ? -1 : 1;
            if (valA > valB) return config.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    /** Slice of workers to display on the current page. */
    const paginatedWorkers = sortedWorkers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
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

    const handleSelectRow = (workerId: number) => {
        setSelectedWorkers(prev =>
            prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
        );
    };

    const handleSelectAll = () => {
        if (selectedWorkers.length === paginatedWorkers.length) {
            setSelectedWorkers([]);
        } else {
            setSelectedWorkers(paginatedWorkers.map(worker => worker.id));
        }
    };


    /** Calculates the age of a worker based on their birth date. */
    const calculateAge = (worker: Worker) => {
        const today = new Date();
        const birthDateObj = new Date(worker.birth_date);
        const age = today.getFullYear() - birthDateObj.getFullYear();
        return age;
    };

    /** Helper to render the sort indicator icon based on sort status. */
    const renderSortIndicator = (key: string) => {
        const configIndex = sortConfigs.findIndex(c => c.key === key);
        if (configIndex === -1) return <iconify-icon icon="solar:sort-vertical-linear" className="text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"></iconify-icon>;

        const isAsc = sortConfigs[configIndex].direction === 'asc';
        return (
            <div className="flex items-center gap-1 text-primary">
                <iconify-icon icon={isAsc ? 'solar:sort-from-bottom-to-top-bold' : 'solar:sort-from-top-to-bottom-bold'}></iconify-icon>
                {sortConfigs.length > 1 && <span className="text-xs font-bold">{configIndex + 1}</span>}
            </div>
        );
    };

    return (
        <AdminLayout title="Kelola Karyawan" header="Karyawan">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manajemen Karyawan</h2>
                    <p className="text-sm text-slate-500">Kelola karyawan yang terafiliasi dengan ARU</p>
                </div>
                {!isPic && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link
                            href={route('workers.import.index')}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
                        >
                            <iconify-icon icon="solar:import-linear" width="20"></iconify-icon> Import CSV
                        </Link>
                        <Link
                            href={route('workers.create')}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                        >
                            <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                            Tambah Karyawan Baru
                        </Link>
                    </div>
                )}
            </div>

            {/* Search Bar & Filters */}
            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-stretch gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
                    {/* Search */}
                    <div className="relative w-full md:w-96 flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <iconify-icon icon="solar:magnifer-linear" className="text-slate-400" width="20"></iconify-icon>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari karyawan berdasarkan nama atau NIK..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                        />
                    </div>
                    {/* Toggle Filters Button */}
                    <div className="w-full md:w-auto flex justify-end">
                        <SecondaryButton
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 h-10 px-4 transition-colors ${activeFilterCount > 0 ? 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/10' : ''
                                }`}
                        >
                            <iconify-icon icon="solar:filter-linear" width="18"></iconify-icon>
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="ml-1 inline-flex items-center justify-center bg-primary text-white text-xs font-bold h-4 w-4 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <iconify-icon
                                icon={isFilterOpen ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                                width="14"
                                className="ml-1 opacity-50"
                            ></iconify-icon>
                        </SecondaryButton>
                    </div>
                </div>

                {/* Filter Dropdown/Panel */}
                {isFilterOpen && (
                    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                            >
                                <option value="all">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="resign">Resign</option>
                                <option value="end_contract">Habis Kontrak</option>
                                <option value="none">Belum Ditempatkan</option>
                            </select>
                        </div>

                        {/* Client Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Client</label>
                            <select
                                value={filterClientId}
                                onChange={(e) => handleClientFilterChange(e.target.value)}
                                className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                            >
                                <option value="all">Semua Client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id.toString()}>{c.full_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Project Filter - Dependent on Client */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Project</label>
                            <select
                                value={filterProjectId}
                                onChange={(e) => { setFilterProjectId(e.target.value); setCurrentPage(1); }}
                                disabled={filterClientId === 'all'}
                                className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm disabled:bg-slate-50 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                <option value="all">
                                    {filterClientId === 'all' ? 'Pilih Client Terlebih Dahulu' : 'Semua Project'}
                                </option>
                                {availableProjects.map(p => (
                                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Workers Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-16">No</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('name', e)}
                                    title="Klik untuk mengurutkan (Tekan Shift untuk sortir multi-kolom)"
                                >
                                    <div className="flex items-center gap-2">
                                        Nama Lengkap
                                        {renderSortIndicator('name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('nik_aru', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        NIK ARU
                                        {renderSortIndicator('nik_aru')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('project_name', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Project
                                        {renderSortIndicator('project_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('phone', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Telepon
                                        {renderSortIndicator('phone')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-right">
                                    {!isPic && "Aksi"}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10">
                                        {workers.length === 0 ? (
                                            <EmptyState icon="solar:users-group-two-rounded-bold" message="Belum ada data karyawan." subMessage="Silakan tambahkan atau import data." />
                                        ) : (
                                            <EmptyState icon="solar:magnifer-linear" message="Data tidak ditemukan." subMessage="Coba gunakan kata kunci pencarian yang lain." />
                                        )}
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
                                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                                    <Link href={route('workers.show', worker.id)} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                        {worker.name}
                                                        <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                                    </Link>
                                                </div>
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
                                                            <Link href={route('projects.show', latestAssignment.project?.id)} className="hover:text-primary transition-colors">
                                                                {latestAssignment.project?.name || '-'}
                                                            </Link>
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
                                            <td className="py-4 px-6">
                                                {worker.phone}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!isPic && (
                                                    <>
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
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredWorkers.length}
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