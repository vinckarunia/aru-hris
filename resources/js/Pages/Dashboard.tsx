import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * Interface representing the expiring contract structure.
 */
interface ExpiringContract {
    id: number;
    end_date: string;
    assignment: {
        id: number;
        worker: {
            id: number;
            name: string;
        };
        project: {
            id: number;
            name: string;
            client: { short_name: string };
        };
    };
}

/**
 * Interface representing an idle worker structure.
 */
interface IdleWorker {
    id: number;
    nik_aru: string;
    name: string;
    assignments: Array<{
        termination_date: string;
    }>;
}

/**
 * Interface for the recent assignment structure.
 */
interface RecentAssignment {
    id: number;
    hire_date: string;
    worker: { id: number; name: string };
    project: { name: string; client: { short_name: string } };
    branch: { name: string };
}

/**
 * Interface for the aggregated dashboard data.
 */
interface DashboardData {
    quick_stats: {
        active_workers: number;
        active_clients: number;
        ongoing_projects: number;
        idle_workers: number;
    };
    alerts: {
        expiring_contracts: ExpiringContract[];
        idle_workers: IdleWorker[];
    };
    charts: {
        worker_distribution: Array<{ name: string; value: number }>;
        employment_demographics: Array<{ status: string; count: number }>;
    };
    recent_assignments: RecentAssignment[];
}

/**
 * Props for the Dashboard component.
 */
interface Props {
    dashboardData: DashboardData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FCA5A5', '#FCD34D'];

/**
 * Format a date string into Indonesian locale.
 *
 * @param {string} dateString
 * @returns {string} Formatted date.
 */
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * Calculate the idle duration in days from the termination date to now.
 *
 * @param {string | undefined} terminationDate
 * @returns {number | string} Duration in days or unknown.
 */
const calculateIdleDuration = (terminationDate?: string) => {
    if (!terminationDate) return 'Tidak Diketahui';
    const termination = new Date(terminationDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - termination.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Dashboard Component
 *
 * Renders the HR Admin Dashboard with quick statistics, alerts, charts, and data grids.
 * Data is fetched server-side through the DashboardController.
 *
 * @param {Props} props - Component properties containing dashboardData
 * @returns {JSX.Element} The rendered React component.
 */
export default function Dashboard({ dashboardData }: Props) {
    const { quick_stats, alerts, charts, recent_assignments } = dashboardData;

    return (
        <AdminLayout title="Dashboard" header="Dashboard">
            <Head title="Dashboard Overview" />

            <div className="space-y-6">

                {/* FR-DASH-01: Quick Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link href={route('workers.index')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Karyawan Aktif</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{quick_stats.active_workers}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                <iconify-icon icon="solar:users-group-rounded-bold" width="24"></iconify-icon>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Karyawan dengan penempatan aktif</p>
                    </Link>

                    <Link href={route('clients.index')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Client Aktif</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{quick_stats.active_clients}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                <iconify-icon icon="solar:city-bold" width="24"></iconify-icon>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Memiliki project sedang berjalan</p>
                    </Link>

                    <Link href={route('projects.index')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Project Berjalan</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{quick_stats.ongoing_projects}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
                                <iconify-icon icon="solar:folder-bold" width="24"></iconify-icon>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Terdapat penempatan aktif</p>
                    </Link>

                    <Link href={route('workers.index')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Karyawan Idle</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{quick_stats.idle_workers}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                <iconify-icon icon="solar:user-block-bold" width="24"></iconify-icon>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Karyawan tanpa penempatan</p>
                    </Link>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Charts & Data Grid */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Worker Distribution */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <iconify-icon icon="solar:pie-chart-2-bold" className="text-primary"></iconify-icon>
                                    Distribusi Karyawan (Client)
                                </h3>
                                <div className="h-64">
                                    {charts.worker_distribution.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={charts.worker_distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {charts.worker_distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 italic">
                                            Tidak ada data distribusi.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Employment Status Demographics */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <iconify-icon icon="solar:chart-square-bold" className="text-primary"></iconify-icon>
                                    Demografi Status Pekerjaan
                                </h3>
                                <div className="h-64">
                                    {charts.employment_demographics.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={charts.employment_demographics}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 12 }} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                <Bar dataKey="count" name="Jumlah" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {charts.employment_demographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 italic">
                                            Tidak ada data demografi.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Data Grid */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <iconify-icon icon="solar:history-bold" className="text-primary"></iconify-icon>
                                    Penempatan Terbaru
                                </h3>
                                <Link href={route('workers.index')} className="text-sm text-primary hover:underline font-semibold">Lihat Semua</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3">Nama Karyawan</th>
                                            <th className="px-6 py-3">Client</th>
                                            <th className="px-6 py-3">Project</th>
                                            <th className="px-6 py-3">Tgl Mulai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                        {recent_assignments.length > 0 ? (
                                            recent_assignments.map((assignment) => (
                                                <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <Link href={route('workers.show', assignment.worker.id)} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                            {assignment.worker.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-3">{assignment.project?.client?.short_name || '-'}</td>
                                                    <td className="px-6 py-3">{assignment.project?.name || '-'}</td>
                                                    <td className="px-6 py-3">{formatDate(assignment.hire_date)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                                    Belum ada histori penempatan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* Actionable Alerts & Quick Actions */}
                    <div className="space-y-6">

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <iconify-icon icon="solar:electric-plug-bold" className="text-primary"></iconify-icon>
                                Akses Cepat
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <Link href={route('workers.create')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                        <iconify-icon icon="solar:user-plus-bold" width="20"></iconify-icon>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Tambah Karyawan Baru</h4>
                                    </div>
                                </Link>
                                <Link href={route('workers.index')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <iconify-icon icon="solar:document-add-bold" width="20"></iconify-icon>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Buat Penempatan</h4>
                                    </div>
                                </Link>
                                <Link href={route('clients.index')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <iconify-icon icon="solar:buildings-bold" width="20"></iconify-icon>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Tambah Client/Project</h4>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Actionable Alerts */}
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 shadow-sm border border-red-100 dark:border-red-900/50">
                            <h3 className="font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                                <iconify-icon icon="solar:danger-triangle-bold"></iconify-icon>
                                Perhatian Segera
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Kontrak Segera Berakhir (≤ 30 Hari)</h4>
                                    {alerts.expiring_contracts.length > 0 ? (
                                        <ul className="space-y-2">
                                            {alerts.expiring_contracts.map((contract) => (
                                                <li key={contract.id} className="bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/50 flex justify-between items-center">
                                                    <div>
                                                        <Link href={route('workers.show', contract.assignment.worker.id)} className="font-bold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                            {contract.assignment.worker.name}
                                                        </Link>
                                                        <p className="text-xs text-slate-500 mt-0.5">{contract.assignment.project.client.short_name} - {contract.assignment.project.name}</p>
                                                    </div>
                                                    <span className="text-red-600 dark:text-red-400 font-semibold text-xs whitespace-nowrap bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-md">
                                                        {formatDate(contract.end_date)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic px-2">Tidak ada kontrak yang akan segera berakhir.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
