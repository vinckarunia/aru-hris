import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

/** Number of items displayed per page. */
const PER_PAGE = 10;

/**
 * Represents the parent client of a branch.
 */
interface Client {
    id: string;
    full_name: string;
    short_name: string;
}

/**
 * Represents the branch whose detail is being viewed.
 */
interface Branch {
    id: string;
    client_id: string;
    name: string;
    client: Client;
}

/**
 * Represents a project associated with this branch.
 */
interface Project {
    id: string;
    name: string;
    prefix: string;
}

/**
 * Represents an assignment connecting a worker to a project within this branch.
 */
interface Assignment {
    id: string;
    project_id: string;
    status: string | null;
    position: string | null;
    project: { id: string; name: string } | null;
}

/**
 * Represents a worker with active assignment(s) in this branch.
 */
interface Worker {
    id: string;
    nik_aru: string | null;
    name: string;
    assignments: Assignment[];
}

/**
 * Props for the Branch Show component.
 */
interface Props {
    branch: Branch;
    projects: Project[];
    workers: Worker[];
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: string;
    direction: SortDirection;
}

/**
 * Branch Show Page Component
 *
 * Displays detail information about a specific branch, including:
 * - Its active projects (from the branch_project pivot)
 * - Its active workers (with at least one active assignment in this branch)
 *
 * @param {Props} props - Component props containing branch, projects, and workers data.
 * @returns {JSX.Element} The rendered Branch detail page.
 */
export default function Show({ branch, projects, workers }: Props) {
    const [activeTab, setActiveTab] = useState<'projects' | 'workers'>('projects');
    const [projPage, setProjPage] = useState<number>(1);
    const [workerPage, setWorkerPage] = useState<number>(1);
    const [projSortConfigs, setProjSortConfigs] = useState<SortConfig[]>([]);
    const [workerSortConfigs, setWorkerSortConfigs] = useState<SortConfig[]>([]);

    /** Resets pagination on tab switch. */
    const switchTab = (tab: 'projects' | 'workers') => {
        setProjPage(1);
        setWorkerPage(1);
        setActiveTab(tab);
    };

    /**
     * Handles sort toggling for a given column key.
     *
     * @param key - The column key to sort by.
     * @param e - The mouse event (Shift key enables multi-sort).
     * @param setConfigs - State setter for the sort config array.
     */
    const handleSort = (
        key: string,
        e: React.MouseEvent,
        setConfigs: React.Dispatch<React.SetStateAction<SortConfig[]>>
    ) => {
        e.preventDefault();
        if (e.shiftKey) {
            setConfigs((prev) => {
                const idx = prev.findIndex((c) => c.key === key);
                if (idx !== -1) {
                    const next = [...prev];
                    if (next[idx].direction === 'asc') {
                        next[idx] = { key, direction: 'desc' };
                        return next;
                    } else {
                        return prev.filter((c) => c.key !== key);
                    }
                }
                return [...prev, { key, direction: 'asc' }];
            });
        } else {
            setConfigs((prev) => {
                if (prev.length === 1 && prev[0].key === key) {
                    return prev[0].direction === 'asc'
                        ? [{ key, direction: 'desc' }]
                        : [];
                }
                return [{ key, direction: 'asc' }];
            });
        }
    };

    /**
     * Resolves a sortable value from an object by key, supporting nested paths.
     *
     * @param obj - The data object.
     * @param key - The key path (supports dot notation).
     * @returns A comparable string or number value.
     */
    const getSortValue = (obj: any, key: string): any => {
        if (!obj) return '';
        if (key.includes('.')) {
            return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : ''), obj) ?? '';
        }
        return obj[key] ?? '';
    };

    /**
     * Sorts an array by the provided sort configurations.
     *
     * @param data - The array to sort.
     * @param configs - Sort configuration array.
     * @returns A new sorted array.
     */
    const sortData = <T,>(data: T[], configs: SortConfig[]): T[] => {
        if (configs.length === 0) return data;
        return [...data].sort((a, b) => {
            for (const c of configs) {
                const av = getSortValue(a, c.key).toString().toLowerCase();
                const bv = getSortValue(b, c.key).toString().toLowerCase();
                if (av < bv) return c.direction === 'asc' ? -1 : 1;
                if (av > bv) return c.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    /**
     * Renders a sort direction indicator icon for the given column.
     *
     * @param key - The column key.
     * @param configs - The current sort config array.
     */
    const renderSortIndicator = (key: string, configs: SortConfig[]) => {
        const idx = configs.findIndex((c) => c.key === key);
        if (idx === -1) return null;
        return (
            <span className="inline-flex items-center ml-1 space-x-0.5">
                <iconify-icon
                    icon={configs[idx].direction === 'asc' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                    width="14"
                />
                {configs.length > 1 && (
                    <span className="text-xs font-bold bg-primary/10 text-primary w-3.5 h-3.5 rounded-full flex items-center justify-center">
                        {idx + 1}
                    </span>
                )}
            </span>
        );
    };

    const sortedProjs = sortData(projects, projSortConfigs);
    const sortedWorkers = sortData(workers, workerSortConfigs);
    const paginatedProjs = sortedProjs.slice((projPage - 1) * PER_PAGE, projPage * PER_PAGE);
    const paginatedWorkers = sortedWorkers.slice((workerPage - 1) * PER_PAGE, workerPage * PER_PAGE);
    const projOffset = (projPage - 1) * PER_PAGE;
    const workerOffset = (workerPage - 1) * PER_PAGE;

    return (
        <AdminLayout title={`Cabang - ${branch.name}`} header="Detail Cabang">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/30">
                        <iconify-icon icon="solar:point-on-map-bold" width="30" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{branch.name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium flex-wrap">
                            <Link
                                href={route('clients.show', branch.client.id)}
                                className="flex items-center gap-1.5 hover:text-primary transition-colors"
                            >
                                <iconify-icon icon="solar:buildings-bold" />
                                {branch.client.full_name}
                            </Link>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5">
                                <iconify-icon icon="solar:folder-with-files-bold" />
                                {projects.length} Project
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5">
                                <iconify-icon icon="solar:users-group-two-rounded-bold" />
                                {workers.length} Karyawan Aktif
                            </span>
                        </div>
                    </div>
                </div>
                <div className="z-10">
                    <Link
                        href={route('clients.show', branch.client.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:arrow-left-linear" width="18" />
                        Kembali ke {branch.client.short_name}
                    </Link>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => switchTab('projects')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <iconify-icon icon="solar:folder-with-files-bold" width="18" />
                        Project
                        {projects.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                                {projects.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => switchTab('workers')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'workers' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <iconify-icon icon="solar:user-id-bold" width="18" />
                        Karyawan Aktif
                        {workers.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                                {workers.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab: Projects */}
                {activeTab === 'projects' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-semibold text-slate-800 dark:text-white">
                                Project di Cabang {branch.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Daftar project yang terafiliasi dengan cabang ini.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 w-16">No</th>
                                        <th
                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none"
                                            onClick={(e) => handleSort('name', e, setProjSortConfigs)}
                                        >
                                            <div className="flex items-center gap-1">
                                                Nama Project
                                                {renderSortIndicator('name', projSortConfigs)}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none"
                                            onClick={(e) => handleSort('prefix', e, setProjSortConfigs)}
                                        >
                                            <div className="flex items-center gap-1">
                                                Prefix
                                                {renderSortIndicator('prefix', projSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {projects.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10">
                                                <EmptyState
                                                    icon="solar:folder-with-files-bold"
                                                    message="Belum ada project yang terafiliasi dengan cabang ini."
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedProjs.map((proj, idx) => (
                                            <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 text-slate-400">{projOffset + idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={route('projects.show', proj.id)}
                                                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-1.5 group"
                                                    >
                                                        {proj.name}
                                                        <iconify-icon
                                                            icon="solar:arrow-right-up-linear"
                                                            width="14"
                                                            className="text-slate-400 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                                                        />
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {proj.prefix}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={route('projects.show', proj.id)}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg inline-flex items-center transition-colors"
                                                    >
                                                        <iconify-icon icon="solar:eye-bold" width="18" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            totalItems={projects.length}
                            itemsPerPage={PER_PAGE}
                            currentPage={projPage}
                            onPageChange={setProjPage}
                        />
                    </div>
                )}

                {/* Tab: Workers (Karyawan Aktif) */}
                {activeTab === 'workers' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-semibold text-slate-800 dark:text-white">
                                Karyawan Aktif di Cabang {branch.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Total {workers.length} karyawan dengan penugasan aktif di cabang ini.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 w-16">No</th>
                                        <th
                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none"
                                            onClick={(e) => handleSort('name', e, setWorkerSortConfigs)}
                                        >
                                            <div className="flex items-center gap-1">
                                                Nama Karyawan
                                                {renderSortIndicator('name', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none"
                                            onClick={(e) => handleSort('nik_aru', e, setWorkerSortConfigs)}
                                        >
                                            <div className="flex items-center gap-1">
                                                NIK ARU
                                                {renderSortIndicator('nik_aru', workerSortConfigs)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4">Project</th>
                                        <th className="px-6 py-4">Posisi</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {workers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10">
                                                <EmptyState
                                                    icon="solar:user-id-bold"
                                                    message="Belum ada karyawan aktif di cabang ini."
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedWorkers.map((worker, idx) => {
                                            const latestAssignment = worker.assignments[worker.assignments.length - 1] ?? null;
                                            return (
                                                <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 text-slate-400">{workerOffset + idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <Link
                                                            href={route('workers.show', worker.id)}
                                                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-colors"
                                                        >
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
                                                            {worker.assignments.map((a) => (
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
                                                        {latestAssignment?.position ?? (
                                                            <span className="text-slate-400 italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={latestAssignment?.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            href={route('workers.show', worker.id)}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg inline-flex items-center transition-colors"
                                                        >
                                                            <iconify-icon icon="solar:eye-bold" width="18" />
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
        </AdminLayout>
    );
}
