import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

/**
 * Represents a department within a project.
 */
interface Department {
    id: number;
    name: string;
}

/**
 * Represents a worker's basic profile data.
 */
interface Worker {
    id: number;
    nik_aru: string | null;
    name: string;
}

/**
 * Represents a contract associated with an assignment.
 */
interface Contract {
    id: number;
    contract_type: string;
    pkwt_type: string | null;
    pkwt_number: number;
    start_date: string;
    end_date: string | null;
}

/**
 * Represents a single assignment record linking a worker to this project.
 */
interface Assignment {
    id: number;
    worker_id: number;
    employee_id: string | null;
    position: string | null;
    hire_date: string | null;
    termination_date: string | null;
    status: string | null;
    worker: Worker | null;
    department: Department | null;
    contracts: Contract[];
}

/**
 * Represents a client company.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
}

/**
 * Represents the full project data passed to this page.
 */
interface Project {
    id: number;
    client_id: number;
    name: string;
    prefix: string;
    id_running_number: number;
    client: Client | null;
    departments: Department[];
    assignments: Assignment[];
}

/**
 * Props for the Project Show component.
 */
interface Props {
    project: Project;
}

/**
 * Project Show Page Component
 *
 * Displays detailed information about a specific project, including a table of all
 * workers affiliated via their assignments. Each row links to the worker's detail page.
 *
 * @param {Props} props - The component props containing the project data.
 */
/** Number of assignments displayed per page. */
const PER_PAGE = 10;

export default function Show({ project }: Props) {
    const [currentPage, setCurrentPage] = useState<number>(1);

    /**
     * Deduplicate assignments so each worker appears only once.
     * The active assignment (no termination_date) is preferred;
     * otherwise the first-encountered record is kept.
     */
    const uniqueWorkerAssignments = Object.values(
        project.assignments.reduce((acc, a) => {
            const wid = a.worker_id;
            if (!acc[wid]) {
                acc[wid] = a;
            } else {
                const existingIsActive = acc[wid].termination_date === null;
                const currentIsActive = a.termination_date === null;
                if (!existingIsActive && currentIsActive) {
                    acc[wid] = a;
                }
            }
            return acc;
        }, {} as Record<number, Assignment>)
    );

    const activeCount = uniqueWorkerAssignments.filter(
        a => a.termination_date === null
    ).length;

    /** Slice of deduplicated assignments to display on the current page. */
    const paginatedAssignments = uniqueWorkerAssignments.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    /** Global row offset for the current page. */
    const rowOffset = (currentPage - 1) * PER_PAGE;

    return (
        <AdminLayout title={`Detail Project - ${project.name}`} header="Detail Project">
            {/* Header Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="flex items-center gap-5 z-10">
                    {/* Project Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-2xl shadow-lg shadow-primary/30">
                        <iconify-icon icon="solar:folder-with-files-bold" width="30"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500 font-medium">
                            {/* Client breadcrumb */}
                            {project.client && (
                                <Link
                                    href={route('clients.show', project.client_id)}
                                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                >
                                    <iconify-icon icon="solar:buildings-bold" width="15"></iconify-icon>
                                    {project.client.full_name}
                                </Link>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1">
                                <iconify-icon icon="solar:tag-bold" width="14"></iconify-icon>
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{project.prefix}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            {/* Department badges */}
                            <div className="flex flex-wrap gap-1">
                                {project.departments.map(dept => (
                                    <span key={dept.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md font-medium text-slate-500">
                                        {dept.name}
                                    </span>
                                ))}
                            </div>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{uniqueWorkerAssignments.length} Karyawan</span>
                            {activeCount > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="text-emerald-600 font-semibold">{activeCount} aktif</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="z-10 flex items-center gap-2">
                    {project.client && (
                        <Link
                            href={route('clients.show', project.client_id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                        >
                            <iconify-icon icon="solar:buildings-2-bold" width="18"></iconify-icon>
                            Lihat {project.client.short_name}
                        </Link>
                    )}
                    <Link
                        href={route('projects.index')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon>
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Workers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                {/* Section Header */}
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <iconify-icon icon="solar:user-id-bold" width="18" class="text-primary"></iconify-icon>
                            Daftar Karyawan
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{activeCount} aktif dari {uniqueWorkerAssignments.length} karyawan</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Nama Karyawan</th>
                                <th className="px-6 py-4">NIK ARU</th>
                                <th className="px-6 py-4">Departemen</th>
                                <th className="px-6 py-4">Posisi</th>
                                <th className="px-6 py-4">Kontrak</th>
                                <th className="px-6 py-4">Tgl Masuk</th>
                                <th className="px-6 py-4">Tgl Keluar</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {uniqueWorkerAssignments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10">
                                        <EmptyState icon="solar:user-id-bold" message="Belum ada karyawan terdaftar di project ini." />
                                    </td>
                                </tr>
                            ) : (
                                paginatedAssignments.map((assignment, idx) => (
                                    <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-400">{rowOffset + idx + 1}</td>
                                        <td className="px-6 py-4">
                                            {assignment.worker ? (
                                                <Link
                                                    href={route('workers.show', assignment.worker.id)}
                                                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors"
                                                >
                                                    {assignment.worker.name}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {assignment.worker?.nik_aru ? (
                                                <span className="font-mono text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                                                    {assignment.worker.nik_aru}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            {assignment.department ? (
                                                <span className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-500">
                                                    {assignment.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {assignment.position ?? <span className="text-slate-400 italic text-xs">-</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {assignment.contracts && assignment.contracts.length > 0 ? (() => {
                                                const c = assignment.contracts[0];
                                                const label = c.pkwt_type ?? c.contract_type;
                                                const isPkwtt = c.pkwt_type === 'PKWTT';
                                                return (
                                                    <span className="px-2 py-1 text-sm font-medium   text-slate-800 dark:text-slate-200">
                                                        {label} {!isPkwtt && c.pkwt_number ? `${c.pkwt_number}` : ''}
                                                    </span>
                                                );
                                            })() : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {assignment.hire_date
                                                ? new Date(assignment.hire_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-slate-400 italic">-</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {assignment.termination_date
                                                ? new Date(assignment.termination_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-emerald-600 font-medium">Aktif</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={assignment.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={uniqueWorkerAssignments.length}
                    itemsPerPage={PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </AdminLayout>
    );
}
