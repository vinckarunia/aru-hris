import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
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
 * Represents a client company entity.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
}

/**
 * Represents a branch within a client company.
 */
interface Branch {
    id: number;
    client_id: number;
    name: string;
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
    client?: Client;
    branches?: Branch[];
    pics?: Pic[];
}

/**
 * @param {Props} props - The component props containing lists of projects, clients, and branches.
 */
/** Number of projects displayed per page. */
const PER_PAGE = 10;

// Defining Pic interface 
interface Pic {
    id: number;
    name: string;
}

/**
 * Props for the Project Index component.
 */
interface Props {
    projects: Project[];
    clients: Client[];
    branches: Branch[];
}

export default function Index({ projects, clients, branches, pics }: Props & { pics: Pic[] }) {
    const { auth } = usePage<any>().props;
    const isPic = auth.user.role === 'PIC';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [filterClientId, setFilterClientId] = useState<string>('all');

    const activeFilterCount = filterClientId !== 'all' ? 1 : 0;

    const filteredProjects = projects.filter((project: Project) => {
        // Search Logic
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.client && project.client.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Filter Logic
        let matchesFilter = true;
        if (filterClientId !== 'all') {
            matchesFilter = project.client_id.toString() === filterClientId;
        }

        return matchesSearch && matchesFilter;
    });

    // Form state initialized with an array for branch_ids and pic_ids
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        client_id: '',
        branch_ids: [] as number[],
        pic_ids: [] as number[],
        name: '',
        prefix: '',
    });

    // Filter available branches based on the currently selected client
    const availableBranches = branches.filter((d: Branch) => d.client_id.toString() === data.client_id);

    /**
     * Toggles a branch ID in the branch_ids state array.
     */
    const handleBranchToggle = (id: number) => {
        const currentIds = data.branch_ids;
        if (currentIds.includes(id)) {
            setData('branch_ids', currentIds.filter(deptId => deptId !== id));
        } else {
            setData('branch_ids', [...currentIds, id]);
        }
    };

    /**
     * Toggles a PIC ID in the pic_ids state array.
     */
    const handlePicToggle = (id: number) => {
        const currentIds = data.pic_ids;
        if (currentIds.includes(id)) {
            setData('pic_ids', currentIds.filter(picId => picId !== id));
        } else {
            setData('pic_ids', [...currentIds, id]);
        }
    };

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

    /** Retrieves the value from a project object based on a key path. */
    const getSortValue = (project: Project, key: string): any => {
        if (key === 'client_name') {
            return project.client?.full_name || '';
        }
        return project[key as keyof Project] ?? '';
    };

    /** Sorts the filtered projects based on sort configurations. */
    const sortedProjects = [...filteredProjects].sort((a, b) => {
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

    /** Slice of projects to display on the current page. */
    const paginatedProjects = sortedProjects.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    /** Global row offset for the current page. */
    const rowOffset = (currentPage - 1) * PER_PAGE;

    /** Opens modal for adding a new project. */
    const openCreateModal = () => {
        setModalMode('add');
        setSelectedProject(null);
        reset();
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** * Opens modal for editing an existing project.
     * @param {Project} project - The project to edit.
     */
    const openEditModal = (project: Project) => {
        setModalMode('edit');
        setSelectedProject(project);
        setData({
            client_id: project.client_id.toString(),
            branch_ids: project.branches?.map(d => d.id) || [],
            pic_ids: project.pics?.map((p: Pic) => p.id) || [],
            name: project.name,
            prefix: project.prefix
        });
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** Opens confirmation modal for deletion. */
    const openDeleteModal = (project: Project) => {
        setSelectedProject(project);
        setIsDeleteModalOpen(true);
    };

    /** Closes the form modal and resets state. */
    const closeModal = () => {
        setIsCreateModalOpen(false);
        reset();
        clearErrors();
    };

    /** Handles form submission for both create and update. */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') post(route('projects.store'), { onSuccess: () => closeModal() });
        else put(route('projects.update', selectedProject?.id), { onSuccess: () => closeModal() });
    };

    /** Executes project deletion. */
    const confirmDelete = () => {
        if (selectedProject) destroy(route('projects.destroy', selectedProject.id), { onSuccess: () => setIsDeleteModalOpen(false) });
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
        <AdminLayout title="Kelola Project" header="Project">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manajemen Project</h2>
                    <p className="text-sm text-slate-500">Kelola semua project dan area penempatan</p>
                </div>
                <div className="w-full sm:w-auto">
                    {!isPic && (
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                        >
                            <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                            Tambah Project
                        </button>
                    )}
                </div>
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
                            placeholder="Cari project berdasarkan nama, prefix, atau client..."
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
                                <span className="ml-1 inline-flex items-center justify-onPageChange bg-primary text-white text-xs font-bold h-4 w-4 rounded-full">
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
                        {/* Client Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Client</label>
                            <select
                                value={filterClientId}
                                onChange={(e) => { setFilterClientId(e.target.value); setCurrentPage(1); }}
                                className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                            >
                                <option value="all">Semua Client</option>
                                {clients.map((c: Client) => (
                                    <option key={c.id} value={c.id.toString()}>{c.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Project Data Table */}
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
                                        Nama Project
                                        {renderSortIndicator('name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('client_name', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Client & Cabang
                                        {renderSortIndicator('client_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('prefix', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Prefix
                                        {renderSortIndicator('prefix')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {filteredProjects.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">{projects.length === 0 ? 'Belum ada data project.' : 'Data project tidak ditemukan.'}</td></tr>
                            ) : (
                                paginatedProjects.map((project, index) => (
                                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4">{rowOffset + index + 1}</td>
                                        <td className="px-6 py-4">
                                            <Link href={route('projects.show', project.id)} className="font-bold hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                {project.name}
                                                <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">
                                                <Link href={route('clients.show', project.client_id)} className="text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                    <span className="font-medium">{project.client?.full_name}</span>
                                                </Link>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {/* Render all branches connected to this project */}
                                                {project.branches && project.branches.length > 0 ? (
                                                    project.branches.map((dept: Branch) => (
                                                        <span key={dept.id} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-500">
                                                            {dept.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500">{project.prefix}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {!isPic && (
                                                <>
                                                    <button onClick={() => openEditModal(project)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="20"></iconify-icon></button>
                                                    <button onClick={() => openDeleteModal(project)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredProjects.length}
                    itemsPerPage={PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Modal for Add / Edit Project */}
            <Modal show={isCreateModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah Project' : 'Edit Project'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="client_id" value="Perusahaan Client" />
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(e) => {
                                    setData('client_id', e.target.value);
                                    setData('branch_ids', []); // Reset checkbox when client changes
                                }}
                                className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                            >
                                <option value="" disabled>-- Pilih Client --</option>
                                {clients.map((c: Client) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <InputError message={errors.client_id} className="mt-2" />
                        </div>

                        {/* Checkbox Group for Multiple Branches */}
                        <div>
                            <InputLabel value="Cabang (Pilih minimal satu)" />
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                {availableBranches.length === 0 ? (
                                    <p className="text-xs text-slate-500 col-span-2 italic">Belum ada cabang untuk client ini.</p>
                                ) : (
                                    availableBranches.map((d: Branch) => (
                                        <label key={d.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={data.branch_ids.includes(d.id)}
                                                onChange={() => handleBranchToggle(d.id)}
                                                className="rounded text-primary focus:ring-primary dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {/* Validation error for branch_ids array */}
                            {errors.branch_ids && <p className="text-sm text-red-600 mt-2">{errors.branch_ids}</p>}
                            {Object.keys(errors).filter(key => key.startsWith('branch_ids.')).map((key) => (
                                <p key={key} className="text-sm text-red-600 mt-1">{errors[key as keyof typeof errors]}</p>
                            ))}
                        </div>

                        {/* Checkbox Group for Multiple PICs */}
                        <div>
                            <InputLabel value="PIC Project (Opsional)" />
                            <div className="mt-2 grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                                {pics && pics.length === 0 ? (
                                    <p className="text-xs text-slate-500 col-span-2 italic">Belum ada profil PIC terdaftar.</p>
                                ) : (
                                    pics && pics.map((pic: Pic) => (
                                        <label key={pic.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={data.pic_ids && data.pic_ids.includes(pic.id)}
                                                onChange={() => handlePicToggle(pic.id)}
                                                className="rounded text-primary focus:ring-primary dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{pic.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Nama Project" />
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="CONTOH: IT Support" />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="prefix" value="Prefix" />
                            <TextInput id="prefix" type="text" className="mt-1 block w-full uppercase" value={data.prefix} onChange={(e) => setData('prefix', e.target.value.toUpperCase())} placeholder="CONTOH: ITS-01" />
                            <InputError message={errors.prefix} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button" className="font-semibold transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus project <b>{selectedProject?.name}</b>?</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout >
    );
}