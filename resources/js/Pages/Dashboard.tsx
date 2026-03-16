import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';


/**
 * Interface representing an idle worker structure.
 */
interface IdleWorker {
    id: string;
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
    id: string;
    hire_date: string;
    worker: { id: string; name: string };
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
        idle_workers: IdleWorker[];
        pending_edit_requests: number;
        unverified_documents: Array<{
            id: number;
            type: string;
            created_at: string;
            worker: { id: string; name: string } | null;
        }>;
    };
    charts: {
        worker_distribution: Array<{ name: string; value: number }>;
        employment_demographics: Array<{ status: string; count: number }>;
    };
    recent_assignments: RecentAssignment[];
}

interface DashboardReminderItem {
    id: number;
    title: string;
    message: string;
    status: 'pending' | 'critical' | 'done';
}

interface DashboardReminderGroup {
    label: string;
    count: number;
    items: DashboardReminderItem[];
}

/**
 * Props for the Dashboard component.
 */
interface Props {
    auth: {
        user: {
            id: number;
            name: string;
            role: string;
        };
    };
    dashboardData: DashboardData;
    remindersSummary: Record<string, DashboardReminderGroup>;
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
export default function Dashboard({ auth, dashboardData, remindersSummary }: Props) {
    const { quick_stats, alerts, charts, recent_assignments } = dashboardData;
    const isPic = auth.user.role === 'PIC';

    return (
        <AdminLayout title="Dashboard" header="Dashboard">
            <Head title="Dashboard Overview" />

            <div className="space-y-6">
                {/* FR-DASH-01: Quick Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link href={route('workers.index')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    {isPic ? "Karyawan Project Anda" : "Total Karyawan Aktif"}
                                </p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{quick_stats.active_workers}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                <iconify-icon icon="solar:users-group-rounded-bold" width="24"></iconify-icon>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {isPic ? "Karyawan dengan penempatan aktif di project Anda" : "Karyawan dengan penempatan aktif"}
                        </p>
                    </Link>

                    {!isPic && (
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
                    )}

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
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {isPic ? "Project Anda dengan penempatan aktif" : "Terdapat penempatan aktif"}
                        </p>
                    </Link>

                    {!isPic && (
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
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Charts & Data Grid */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Charts */}
                        <div className={`grid grid-cols-1 ${isPic ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6`}>

                            {/* Worker Distribution */}
                            {!isPic && (
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
                            )}

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

                        {/* Operational Alerts */}
                        {(alerts.pending_edit_requests > 0 || alerts.unverified_documents.length > 0) && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-rose-100 dark:border-rose-900/30">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <iconify-icon icon="solar:danger-triangle-bold" className="text-rose-500"></iconify-icon>
                                    Tindakan Diperlukan
                                </h3>
                                <div className="space-y-4">
                                    {/* Pending Edit Requests Alert */}
                                    {alerts.pending_edit_requests > 0 && (
                                        <Link href={route('edit-requests.index')} className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 rounded-xl transition-colors border border-amber-200 dark:border-amber-500/30 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                    <iconify-icon icon="solar:document-text-bold" width="20"></iconify-icon>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Pengajuan Perubahan Data</h4>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400/80">Menunggu review HR Admin</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                                                    {alerts.pending_edit_requests}
                                                </span>
                                                <iconify-icon icon="solar:alt-arrow-right-line-duotone" className="text-amber-500" width="20"></iconify-icon>
                                            </div>
                                        </Link>
                                    )}

                                    {/* Unverified Documents Alert */}
                                    {alerts.unverified_documents.length > 0 && (
                                        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <iconify-icon icon="solar:shield-warning-bold" className="text-rose-500" width="20"></iconify-icon>
                                                <h4 className="font-semibold text-rose-900 dark:text-rose-100 text-sm">Dokumen Menunggu Verifikasi</h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {alerts.unverified_documents.map(doc => (
                                                    <li key={doc.id}>
                                                        {doc.worker ? (
                                                            <Link href={route('workers.show', doc.worker.id)} className="flex items-center justify-between group p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-semibold text-rose-900 dark:text-rose-100 group-hover:text-rose-700 dark:group-hover:text-rose-300">
                                                                        {doc.worker.name}
                                                                    </span>
                                                                    <span className="text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider font-medium">
                                                                        {doc.type}
                                                                    </span>
                                                                </div>
                                                                <iconify-icon icon="solar:eye-bold" className="text-rose-400 group-hover:text-rose-600 transition-colors"></iconify-icon>
                                                            </Link>
                                                        ) : (
                                                            <div className="flex items-center justify-between p-2">
                                                                <span className="text-sm text-slate-500 italic">Pekerja telah dihapus</span>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions (Admin Only) */}
                        {!isPic && (
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
                        )}

                        {/* Reminders Summary Panel (Admin Only) */}
                        {!isPic && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-900/30">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                        <iconify-icon icon="solar:bell-bing-bold"></iconify-icon>
                                        Ringkasan Reminder
                                    </h3>
                                    <Link href={route('reminders.index')} className="text-sm font-semibold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors">
                                        Lihat Semua
                                    </Link>
                                </div>

                                <div className="space-y-6">
                                    {Object.values(remindersSummary).map((group, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                                                    {group.label}
                                                </h4>
                                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                                    {group.count}
                                                </span>
                                            </div>

                                            {group.items.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {group.items.map((item) => (
                                                        <li key={item.id} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl text-sm border border-amber-200/50 dark:border-amber-800/30 shadow-sm flex flex-col gap-1">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                                {item.title}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                                {item.message}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="bg-white/50 dark:bg-slate-800/30 p-4 rounded-xl text-center border border-dashed border-amber-200 dark:border-amber-800/30">
                                                    <p className="text-sm text-slate-500 italic">Tidak ada reminder aktif.</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
