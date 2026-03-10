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
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

/**
 * Represents a branch within a client company.
 */
interface Branch {
    id: string;
    client_id: string;
    name: string;
}

/**
 * Represents a project that can be associated with multiple branches.
 */
interface Project {
    id: string;
    client_id: string;
    name: string;
    prefix: string;
    id_running_number: number;
    branches?: Branch[];
}
/**
 * Represents an assignment connecting a worker to a project/branch.
 */
interface Assignment {
    id: string;
    worker_id: string;
    project_id: string;
    branch_id: string;
    position: string | null;
    status: string | null;
    project: { id: string; name: string } | null;
    branch: { id: string; name: string } | null;
}

/**
 * Represents a worker affiliated with this client via an assignment.
 */
interface AffiliatedWorker {
    id: string;
    nik_aru: string | null;
    name: string;
    assignments: Assignment[];
}

/**
 * Represents a client company entity holding branches, projects, and workers.
 */
interface Client {
    id: string;
    full_name: string;
    short_name: string;
    branches: Branch[];
    projects: Project[];
}

/**
 * Props for the Client Show component.
 */
interface Props {
    client: Client;
    workers: AffiliatedWorker[];
}

/**
 * Client Show Page Component
 *
 * Displays detailed information about a specific client, including tabs to
 * view and manage its Branches, Projects (with Many-to-Many branches),
 * and Karyawan (workers affiliated via assignments).
 *
 * @param {Props} props - The component props containing the client and workers data.
 */
/** Number of items displayed per page in each tab table. */
const PER_PAGE = 10;

export default function Show({ client, workers }: Props) {
    const [activeTab, setActiveTab] = useState<'branches' | 'projects' | 'workers'>('branches');

    /** Resets all tab pages to 1 and switches the active tab. */
    const switchTab = (tab: 'branches' | 'projects' | 'workers') => {
        setDeptPage(1);
        setProjPage(1);
        setWorkerPage(1);
        setActiveTab(tab);
    };

    // Pagination states for each tab
    const [deptPage, setDeptPage] = useState<number>(1);
    const [projPage, setProjPage] = useState<number>(1);
    const [workerPage, setWorkerPage] = useState<number>(1);

    // Sorting states
    const [deptSortConfigs, setDeptSortConfigs] = useState<SortConfig[]>([]);
    const [projSortConfigs, setProjSortConfigs] = useState<SortConfig[]>([]);
    const [workerSortConfigs, setWorkerSortConfigs] = useState<SortConfig[]>([]);

    const handleSort = (
        key: string,
        e: React.MouseEvent,
        configs: SortConfig[],
        setConfigs: React.Dispatch<React.SetStateAction<SortConfig[]>>
    ) => {
        e.preventDefault();
        if (e.shiftKey) {
            setConfigs((prev) => {
                const existingIndex = prev.findIndex((config) => config.key === key);
                if (existingIndex !== -1) {
                    const currentDirection = prev[existingIndex].direction;
                    if (currentDirection === 'asc') {
                        const newConfigs = [...prev];
                        newConfigs[existingIndex] = { key, direction: 'desc' };
                        return newConfigs;
                    } else {
                        return prev.filter((config) => config.key !== key);
                    }
                } else {
                    return [...prev, { key, direction: 'asc' }];
                }
            });
        } else {
            setConfigs((prev) => {
                if (prev.length === 1 && prev[0].key === key) {
                    if (prev[0].direction === 'asc') {
                        return [{ key, direction: 'desc' }];
                    } else {
                        return [];
                    }
                }
                return [{ key, direction: 'asc' }];
            });
        }
    };

    const getSortValue = (obj: any, key: string) => {
        if (!obj) return '';

        // Handle nested keys if needed (e.g. client.name)
        if (key.includes('.')) {
            const keys = key.split('.');
            let val = obj;
            for (const k of keys) {
                if (val === null || val === undefined) return '';
                val = val[k];
            }
            return (val || '').toString().toLowerCase();
        }

        // Custom keys for Workers with assignments
        switch (key) {
            case 'project_name':
                return obj.assignments && obj.assignments.length > 0
                    ? (obj.assignments[0].project?.name || '').toLowerCase()
                    : '';
            case 'position':
                return obj.assignments && obj.assignments.length > 0
                    ? (obj.assignments[obj.assignments.length - 1].position || '').toLowerCase()
                    : '';
            case 'status':
                return obj.assignments && obj.assignments.length > 0
                    ? (obj.assignments[obj.assignments.length - 1].status || '').toLowerCase()
                    : '';
            default:
                return (obj[key] || '').toString().toLowerCase();
        }
    };

    const sortData = <T,>(data: T[], configs: SortConfig[]) => {
        if (configs.length === 0) return data;

        return [...data].sort((a, b) => {
            for (const config of configs) {
                const aValue = getSortValue(a, config.key);
                const bValue = getSortValue(b, config.key);

                if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const renderSortIndicator = (key: string, configs: SortConfig[]) => {
        const index = configs.findIndex((config) => config.key === key);
        if (index === -1) return null;

        const isAsc = configs[index].direction === 'asc';
        const icon = isAsc ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear";

        return (
            <span className="inline-flex items-center ml-1 space-x-0.5">
                <iconify-icon icon={icon} width="14"></iconify-icon>
                {configs.length > 1 && (
                    <span className="text-xs font-bold bg-primary/10 text-primary w-3.5 h-3.5 rounded-full flex items-center justify-center">
                        {index + 1}
                    </span>
                )}
            </span>
        );
    };

    // Sliced arrays for display
    const sortedBranches = sortData(client.branches, deptSortConfigs);
    const sortedProjs = sortData(client.projects, projSortConfigs);
    const sortedWorkers = sortData(workers, workerSortConfigs);

    const paginatedDepts = sortedBranches.slice((deptPage - 1) * PER_PAGE, deptPage * PER_PAGE);
    const paginatedProjs = sortedProjs.slice((projPage - 1) * PER_PAGE, projPage * PER_PAGE);
    const paginatedWorkers = sortedWorkers.slice((workerPage - 1) * PER_PAGE, workerPage * PER_PAGE);

    // Row offsets per tab
    const deptOffset = (deptPage - 1) * PER_PAGE;
    const projOffset = (projPage - 1) * PER_PAGE;
    const workerOffset = (workerPage - 1) * PER_PAGE;
    // ==========================================
    // STATE & FORM FOR DEPARTMENT
    // ==========================================
    const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
    const [isDeptDeleteModalOpen, setIsDeptDeleteModalOpen] = useState<boolean>(false);
    const [deptModalMode, setDeptModalMode] = useState<'add' | 'edit'>('add');
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const deptForm = useForm({
        client_id: client.id.toString(),
        name: ''
    });
    /** Opens the modal to add a new department. */
    const openAddDept = () => {
        setDeptModalMode('add');
        setSelectedBranch(null);
        deptForm.reset('name');
        deptForm.clearErrors();
        setIsDeptModalOpen(true);
    };
    /** Opens the modal to edit an existing department. */
    const openEditBranch = (branch: Branch) => {
        setDeptModalMode('edit');
        setSelectedBranch(branch);
        deptForm.setData({ client_id: client.id.toString(), name: branch.name });
        deptForm.clearErrors();
        setIsDeptModalOpen(true);
    };
    /** Closes the department modal. */
    const closeDeptModal = () => {
        setIsDeptModalOpen(false);
        deptForm.reset('name');
        deptForm.clearErrors();
    };
    /** Submits the department form (Create/Update). */
    const submitDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (deptModalMode === 'add') deptForm.post(route('branches.store'), { onSuccess: () => closeDeptModal() });
        else deptForm.put(route('branches.update', selectedBranch?.id), { onSuccess: () => closeDeptModal() });
    };
    // ==========================================
    // STATE & FORM FOR PROJECT
    // ==========================================
    const [isProjModalOpen, setIsProjModalOpen] = useState<boolean>(false);
    const [isProjDeleteModalOpen, setIsProjDeleteModalOpen] = useState<boolean>(false);
    const [projModalMode, setProjModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProj, setSelectedProj] = useState<Project | null>(null);
    const projForm = useForm({
        client_id: client.id.toString(),
        branch_ids: [] as string[],
        name: '',
        prefix: ''
    });
    /**
     * Toggles a branch ID in the project form's branch_ids state array.
     *
     * @param {number} id - The ID of the branch to toggle.
     */
    const handleProjBranchToggle = (id: string) => {
        const currentIds = projForm.data.branch_ids;
        if (currentIds.includes(id)) {
            projForm.setData('branch_ids', currentIds.filter(branchId => branchId !== id));
        } else {
            projForm.setData('branch_ids', [...currentIds, id]);
        }
    };
    /** Opens the modal to add a new project. */
    const openAddProj = () => {
        setProjModalMode('add');
        setSelectedProj(null);
        projForm.reset('branch_ids', 'name', 'prefix');
        projForm.clearErrors();
        setIsProjModalOpen(true);
    };
    /** Opens the modal to edit an existing project. */
    const openEditProj = (proj: Project) => {
        setProjModalMode('edit');
        setSelectedProj(proj);
        projForm.setData({
            client_id: client.id.toString(),
            branch_ids: proj.branches?.map(d => d.id) || [],
            name: proj.name,
            prefix: proj.prefix
        });
        projForm.clearErrors();
        setIsProjModalOpen(true);
    };
    /** Closes the project modal. */
    const closeProjModal = () => {
        setIsProjModalOpen(false);
        projForm.reset('branch_ids', 'name', 'prefix');
        projForm.clearErrors();
    };
    /** Submits the project form (Create/Update). */
    const submitProj = (e: React.FormEvent) => {
        e.preventDefault();
        if (projModalMode === 'add') projForm.post(route('projects.store'), { onSuccess: () => closeProjModal() });
        else projForm.put(route('projects.update', selectedProj?.id), { onSuccess: () => closeProjModal() });
    };
    // Compute total active workers count
    const activeWorkerCount = workers.filter(w =>
        w.assignments.some(a => a.status?.toLowerCase() === 'active' || a.status?.toLowerCase() === 'aktif')
    ).length;
    return (
        <AdminLayout title={`Detail Client - ${client.short_name}`} header="Detail Client">
            {/* Header Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/30">
                        {client.short_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{client.full_name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:buildings-bold"></iconify-icon> Kode Client: {client.short_name}</span>
                        </div>
                    </div>
                </div>
                <div className="z-10">
                    <Link href={route('clients.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>
            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                    <button onClick={() => switchTab('branches')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'branches' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:users-group-two-rounded-bold" width="18"></iconify-icon> Cabang
                        {client.branches.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">{client.branches.length}</span>
                        )}
                    </button>
                    <button onClick={() => switchTab('projects')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:folder-with-files-bold" width="18"></iconify-icon> Project
                        {client.projects.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">{client.projects.length}</span>
                        )}
                    </button>
                    <button onClick={() => switchTab('workers')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'workers' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:user-id-bold" width="18"></iconify-icon>
                        Karyawan
                        {workers.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">{workers.length}</span>
                        )}
                    </button>
                </div>
                {/* Tab: Branches */}
                {activeTab === 'branches' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div><h3 className="font-semibold text-slate-800 dark:text-white">Cabang {client.short_name}</h3></div>
                            <button onClick={openAddDept} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Tambah
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">No</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('name', e, deptSortConfigs, setDeptSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Nama Cabang
                                                {renderSortIndicator('name', deptSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.branches.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-6"><EmptyState icon="solar:users-group-two-rounded-bold" message="Belum ada cabang." /></td></tr>
                                    ) : paginatedDepts.map((dept, idx) => (
                                        <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4">{deptOffset + idx + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{dept.name}</td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button onClick={() => openEditBranch(dept)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                                                <button onClick={() => { setSelectedBranch(dept); setIsDeptDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            totalItems={client.branches.length}
                            itemsPerPage={PER_PAGE}
                            currentPage={deptPage}
                            onPageChange={setDeptPage}
                        />
                    </div>
                )}
                {/* Tab: Projects */}
                {activeTab === 'projects' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div><h3 className="font-semibold text-slate-800 dark:text-white">Project {client.short_name}</h3></div>
                            <button onClick={openAddProj} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Tambah Project Baru
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">No</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('name', e, projSortConfigs, setProjSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Nama Project
                                                {renderSortIndicator('name', projSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4">Departemen</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('prefix', e, projSortConfigs, setProjSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Prefix
                                                {renderSortIndicator('prefix', projSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.projects.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-6"><EmptyState icon="solar:folder-with-files-bold" message="Belum ada project untuk client ini." /></td></tr>
                                    ) : paginatedProjs.map((proj, idx) => (
                                        <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4">{projOffset + idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <Link href={route('projects.show', proj.id)} className="font-bold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                    {proj.name}
                                                    <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                <div className="flex flex-wrap gap-1">
                                                    {proj.branches && proj.branches.length > 0 ? (
                                                        proj.branches.map(dept => (
                                                            <span key={dept.id} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-500">
                                                                {dept.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500">{proj.prefix}</span></td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button onClick={() => openEditProj(proj)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                                                <button onClick={() => { setSelectedProj(proj); setIsProjDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            totalItems={client.projects.length}
                            itemsPerPage={PER_PAGE}
                            currentPage={projPage}
                            onPageChange={setProjPage}
                        />
                    </div>
                )}
                {/* Tab: Workers (Karyawan) */}
                {activeTab === 'workers' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Karyawan Aktif {client.short_name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Total {activeWorkerCount} karyawan aktif</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">No</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('name', e, workerSortConfigs, setWorkerSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Nama Karyawan
                                                {renderSortIndicator('name', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('nik_aru', e, workerSortConfigs, setWorkerSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                NIK ARU
                                                {renderSortIndicator('nik_aru', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('project_name', e, workerSortConfigs, setWorkerSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Project
                                                {renderSortIndicator('project_name', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('position', e, workerSortConfigs, setWorkerSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Posisi
                                                {renderSortIndicator('position', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none group" onClick={(e) => handleSort('status', e, workerSortConfigs, setWorkerSortConfigs)}>
                                            <div className="flex items-center gap-1">
                                                Status
                                                {renderSortIndicator('status', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {workers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10">
                                                <EmptyState icon="solar:user-id-bold" message="Belum ada karyawan terdaftar di client ini." />
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedWorkers.map((worker, idx) => {
                                            // Use the most recent assignment for display
                                            const latestAssignment = worker.assignments[worker.assignments.length - 1] ?? null;
                                            return (
                                                <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 text-slate-400">{workerOffset + idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <Link href={route('workers.show', worker.id)} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                            {worker.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {worker.nik_aru ? (
                                                            <span className="font-mono text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                                                                {worker.nik_aru}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {worker.assignments.map(a => (
                                                                <Link
                                                                    key={a.id}
                                                                    href={route('projects.show', a.project_id)}
                                                                    className="text-xs px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md font-medium text-primary hover:bg-primary/20 transition-colors"
                                                                >
                                                                    {a.project?.name ?? '-'}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                        {latestAssignment?.position ?? <span className="text-slate-400 italic text-xs">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={latestAssignment?.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link href={route('workers.show', worker.id)} className="p-2 text-primary hover:bg-primary/10 rounded-lg inline-flex items-center transition-colors">
                                                            <iconify-icon icon="solar:eye-bold" width="18"></iconify-icon>
                                                        </Link>
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
                            currentPage={workerPage}
                            onPageChange={setWorkerPage}
                        />
                    </div>
                )}
            </div>
            {/* ========================================== */}
            {/* BRANCH MODALS */}
            {/* ========================================== */}
            <Modal show={isDeptModalOpen} onClose={closeDeptModal} maxWidth="md">
                <form onSubmit={submitDept} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{deptModalMode === 'add' ? `Tambah Cabang` : 'Edit Cabang'}</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="dept_name" value="Nama Cabang" />
                            <TextInput id="dept_name" type="text" className="mt-1 block w-full" value={deptForm.data.name} onChange={(e) => deptForm.setData('name', e.target.value)} placeholder="Contoh: Jakarta Barat" />
                            <InputError message={deptForm.errors.name} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeDeptModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={deptForm.processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {deptForm.processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
            <Modal show={isDeptDeleteModalOpen} onClose={() => setIsDeptDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Cabang?</h2>
                    <div className="flex justify-center gap-3 mt-6">
                        <SecondaryButton onClick={() => setIsDeptDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={() => { if (selectedBranch) deptForm.delete(route('branches.destroy', selectedBranch.id), { onSuccess: () => setIsDeptDeleteModalOpen(false) }) }} disabled={deptForm.processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
            {/* ========================================== */}
            {/* PROJECT MODALS */}
            {/* ========================================== */}
            <Modal show={isProjModalOpen} onClose={closeProjModal} maxWidth="md">
                <form onSubmit={submitProj} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{projModalMode === 'add' ? `Tambah Project` : 'Edit Project'}</h2>
                    <div className="space-y-4">
                        {/* Checkbox Group for Multiple Branches */}
                        <div>
                            <InputLabel value="Cabang (Pilih minimal satu)" />
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                {client.branches.length === 0 ? (
                                    <p className="text-xs text-slate-500 col-span-2 italic">Harap buat cabang terlebih dahulu.</p>
                                ) : (
                                    client.branches.map(d => (
                                        <label key={d.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={projForm.data.branch_ids.includes(d.id)}
                                                onChange={() => handleProjBranchToggle(d.id)}
                                                className="rounded text-primary focus:ring-primary dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {projForm.errors.branch_ids && <p className="text-sm text-red-600 mt-2">{projForm.errors.branch_ids}</p>}
                            {Object.keys(projForm.errors).filter(key => key.startsWith('branch_ids.')).map((key) => (
                                <p key={key} className="text-sm text-red-600 mt-1">{projForm.errors[key as keyof typeof projForm.errors]}</p>
                            ))}
                        </div>
                        <div>
                            <InputLabel htmlFor="proj_name" value="Nama Project" />
                            <TextInput id="proj_name" type="text" className="mt-1 block w-full" value={projForm.data.name} onChange={(e) => projForm.setData('name', e.target.value)} placeholder="Contoh: IT Support" />
                            <InputError message={projForm.errors.name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="proj_prefix" value="Prefix" />
                            <TextInput id="proj_prefix" type="text" className="mt-1 block w-full uppercase" value={projForm.data.prefix} onChange={(e) => projForm.setData('prefix', e.target.value.toUpperCase())} placeholder="Contoh: ITS-01" />
                            <InputError message={projForm.errors.prefix} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeProjModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={projForm.processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {projForm.processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
            <Modal show={isProjDeleteModalOpen} onClose={() => setIsProjDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus project <b>{selectedProj?.name}</b>?</p>
                    <div className="flex justify-center gap-3 mt-6">
                        <SecondaryButton onClick={() => setIsProjDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={() => { if (selectedProj) projForm.delete(route('projects.destroy', selectedProj.id), { onSuccess: () => setIsProjDeleteModalOpen(false) }) }} disabled={projForm.processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}