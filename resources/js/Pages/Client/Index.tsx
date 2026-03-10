import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Pagination from '@/Components/Pagination';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

/**
 * Interface for the Client data structure.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
    created_at: string;
}

/**
 * Represents a project that can be associated with multiple branches.
 */
interface Project {
    id: number;
    client_id: number;
    name: string;
    prefix: string;
    id_running_number: number;
}

/**
 * Represents an assignment connecting a worker to a project/branch.
 */
interface Assignment {
    id: number;
    worker_id: number;
    project_id: number;
    branch_id: number;
    position: string | null;
    status: string | null;
    project: { id: number; name: string } | null;
    branch: { id: number; name: string } | null;
}

/**
 * Represents a worker affiliated with this client via an assignment.
 */
interface AffiliatedWorker {
    id: number;
    assignments: Assignment[];
}

/**
 * Props for the Client Index component.
 */
interface Props {
    clients: Client[];
    projects: Project[];
    workers: AffiliatedWorker[];
}

/**
 * Client Index Page Component
 *
 * Displays a table of clients and provides a Single Page Application (SPA) experience
 * for creating, updating, and deleting clients using Modals.
 *
 * @param {Props} props - The component props containing the list of clients.
 * @returns {JSX.Element} The rendered Client management page.
 */
/** Number of clients displayed per page. */
const PER_PAGE = 10;

export default function Index({ clients, projects, workers }: Props) {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [filterHasActive, setFilterHasActive] = useState<string>('all'); // 'all', 'yes', 'no'

    // Initialize Inertia form hook with new schema
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        full_name: '',
        short_name: '',
    });

    const activeFilterCount = filterHasActive !== 'all' ? 1 : 0;

    // Filter AND Search logic combined
    const filteredClients = clients.filter(client => {
        // Search logic
        const matchesSearch = client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.short_name.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter logic: Has Active Projects
        let matchesFilter = true;
        if (filterHasActive !== 'all') {
            const hasActiveProject = projects.some(p => p.client_id === client.id); // Or check workers if "active" means workers active. Let's stick to "has ANY projects" = active project
            matchesFilter = filterHasActive === 'yes' ? hasActiveProject : !hasActiveProject;
        }

        return matchesSearch && matchesFilter;
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

    /** Retrieves the value from a client object based on a key path. */
    const getSortValue = (client: Client, key: string): any => {
        if (key === 'project_count') {
            return projects.filter(project => project.client_id === client.id).length;
        }
        if (key === 'worker_count') {
            const clientProjectIds = new Set(
                projects
                    .filter(p => p.client_id === client.id)
                    .map(p => p.id)
            );
            return workers.filter(w =>
                w.assignments.some(a =>
                    a.project !== null &&
                    clientProjectIds.has(a.project_id) &&
                    (a.status?.toLowerCase() === 'active' || a.status?.toLowerCase() === 'aktif')
                )
            ).length;
        }
        return client[key as keyof Client] ?? '';
    };

    /** Sorts the filtered clients based on sort configurations. */
    const sortedClients = [...filteredClients].sort((a, b) => {
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

    /** Slice of clients to display on the current page. */
    const paginatedClients = sortedClients.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    /** Global row offset for the current page. */
    const rowOffset = (currentPage - 1) * PER_PAGE;

    /**
     * Opens the modal in "add" mode and resets form state.
     */
    const openAddModal = () => {
        setModalMode('add');
        setSelectedClient(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the modal in "edit" mode and populates form with client data.
     *
     * @param {Client} client - The client object to edit.
     */
    const openEditModal = (client: Client) => {
        setModalMode('edit');
        setSelectedClient(client);
        setData({
            full_name: client.full_name,
            short_name: client.short_name,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the confirmation modal for deleting a client.
     *
     * @param {Client} client - The client object to delete.
     */
    const openDeleteModal = (client: Client) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    /**
     * Closes the form modal and resets all errors/states.
     */
    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        clearErrors();
    };

    /**
     * Handles the submission of the add/edit client form.
     *
     * @param {React.FormEvent} e - The form submission event.
     */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            post(route('clients.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            put(route('clients.update', selectedClient?.id), {
                onSuccess: () => closeModal(),
            });
        }
    };

    /**
     * Executes the deletion of the selected client.
     */
    const confirmDelete = () => {
        if (selectedClient) {
            destroy(route('clients.destroy', selectedClient.id), {
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
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
        <AdminLayout title="Kelola Client" header="Client">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manajemen Client</h2>
                    <p className="text-sm text-slate-500">Kelola perusahaan client yang bekerja sama dengan ARU.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                    Tambah Client
                </button>
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
                            placeholder="Cari client berdasarkan nama atau kode..."
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
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status Kepemilikan Project</label>
                            <select
                                value={filterHasActive}
                                onChange={(e) => { setFilterHasActive(e.target.value); setCurrentPage(1); }}
                                className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                            >
                                <option value="all">Semua Client</option>
                                <option value="yes">Memiliki Project</option>
                                <option value="no">Belum Punya Project</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Client Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-16">No</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('full_name', e)}
                                    title="Klik untuk mengurutkan (Tekan Shift untuk sortir multi-kolom)"
                                >
                                    <div className="flex items-center gap-2">
                                        Nama Client
                                        {renderSortIndicator('full_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('short_name', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Kode
                                        {renderSortIndicator('short_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('project_count', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Project
                                        {renderSortIndicator('project_count')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('worker_count', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Karyawan Aktif
                                        {renderSortIndicator('worker_count')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                        {clients.length === 0 ? 'Belum ada data client. Silakan tambahkan baru.' : 'Data client tidak ditemukan.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedClients.map((client, index) => (
                                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">{rowOffset + index + 1}</td>
                                        <td className="px-6 py-4">
                                            <Link href={route('clients.show', client.id)} className="font-bold hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                {client.full_name}
                                                <iconify-icon icon="solar:arrow-right-up-outline" width="16" className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-primary"></iconify-icon>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {client.short_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 font-semibold text-slate-800 dark:text-slate-200">
                                                {projects.filter(project => project.client_id === client.id).length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 font-semibold text-slate-800 dark:text-slate-200">
                                                {(() => {
                                                    // Get all project IDs belonging to this client.
                                                    const clientProjectIds = new Set(
                                                        projects
                                                            .filter(p => p.client_id === client.id)
                                                            .map(p => p.id)
                                                    );
                                                    // Count workers with at least one active assignment in those projects.
                                                    return workers.filter(w =>
                                                        w.assignments.some(a =>
                                                            a.project !== null &&
                                                            clientProjectIds.has(a.project_id) &&
                                                            (a.status?.toLowerCase() === 'active' || a.status?.toLowerCase() === 'aktif')
                                                        )
                                                    ).length;
                                                })()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(client)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredClients.length}
                    itemsPerPage={PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Modal for Add / Edit Client */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah Client Baru' : 'Edit Data Client'}
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="full_name" value="Nama Lengkap Client" />
                            <TextInput
                                id="full_name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="CONTOH: PT. ABC Indonesia Tbk."
                            />
                            <InputError message={errors.full_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="short_name" value="Kode Client" />
                            <TextInput
                                id="short_name"
                                type="text"
                                className="mt-1 block w-full uppercase"
                                value={data.short_name}
                                onChange={(e) => setData('short_name', e.target.value.toUpperCase())}
                                placeholder="CONTOH: ABC"
                            />
                            <InputError message={errors.short_name} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal for Delete Confirmation */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Client?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Apakah Anda yakin ingin menghapus client <b>{selectedClient?.full_name}</b>? Semua data Project yang terikat dengan client ini akan ikut terhapus.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>
                            Ya, Hapus
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}