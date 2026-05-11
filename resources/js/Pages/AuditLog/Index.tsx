import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

/**
 * Module tabs for filtering audit log entries.
 */
const MODULE_TABS = [
    { key: 'all', label: 'Semua', icon: 'solar:layers-minimalistic-linear' },
    { key: 'worker', label: 'Karyawan', icon: 'solar:users-group-two-rounded-linear' },
    { key: 'assignment', label: 'Penempatan', icon: 'solar:user-check-linear' },
    { key: 'contract', label: 'Kontrak', icon: 'solar:document-text-linear' },
    { key: 'data_request', label: 'Data Request', icon: 'solar:file-check-linear' },
    { key: 'import', label: 'Import', icon: 'solar:cloud-upload-linear' },
    { key: 'document', label: 'Dokumen', icon: 'solar:folder-with-files-linear' },
    { key: 'settings', label: 'Settings', icon: 'solar:settings-linear' },
    { key: 'auth', label: 'Auth', icon: 'solar:lock-linear' },
    { key: 'client', label: 'Client', icon: 'solar:buildings-linear' },
    { key: 'project', label: 'Project', icon: 'solar:folder-with-files-linear' },
    { key: 'branch', label: 'Cabang', icon: 'solar:map-point-linear' },
    { key: 'user', label: 'User', icon: 'solar:users-group-rounded-linear' },
    { key: 'pic', label: 'PIC', icon: 'solar:user-id-linear' },
    { key: 'internal_employee', label: 'Internal', icon: 'solar:shield-user-linear' },
    { key: 'family_member', label: 'Keluarga', icon: 'solar:users-group-two-rounded-linear' },
];

/**
 * Action badge color mapping for visual differentiation.
 */
const ACTION_COLORS: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    approve: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    reject: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    import: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    export: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    login: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    logout: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    settings: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    upload: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    download: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    email: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
};

const ACTION_LABELS: Record<string, string> = {
    create: 'Tambah',
    update: 'Ubah',
    delete: 'Hapus',
    approve: 'Setujui',
    reject: 'Tolak',
    import: 'Import',
    export: 'Export',
    login: 'Login',
    logout: 'Logout',
    settings: 'Pengaturan',
    upload: 'Upload',
    download: 'Download',
    email: 'Email',
};

/**
 * AuditLog Index Page
 *
 * Displays a paginated, filterable table of audit log entries
 * with module tabs, search bar, action/date filters, and expandable metadata.
 */
export default function Index({ logs, filters }: any) {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [searchTimeout, setSearchTimeout] = useState<any>(null);

    /** Apply filters by navigating with query params */
    const applyFilter = (updates: Record<string, string>) => {
        const newFilters = { ...filters, ...updates, page: '1' };
        // Remove empty values
        Object.keys(newFilters).forEach(k => { if (!newFilters[k] || newFilters[k] === 'all' && k === 'action') delete newFilters[k]; });
        // Keep module=all as explicit
        if (updates.module === 'all') newFilters.module = 'all';
        router.get(route('audit-logs.index'), newFilters, { preserveState: true, preserveScroll: true });
    };

    /** Debounced search handler */
    const handleSearch = (value: string) => {
        if (searchTimeout) clearTimeout(searchTimeout);
        setSearchTimeout(setTimeout(() => applyFilter({ search: value }), 400));
    };

    /** Navigate to a specific page */
    const goToPage = (url: string | null) => {
        if (url) router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    /** Format timestamp to localized string */
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    return (
        <AdminLayout title="Audit Log" header="Audit Log">
            <Head title="Audit Log" />

            {/* Module Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {MODULE_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => applyFilter({ module: tab.key })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${filters.module === tab.key
                            ? 'bg-primary text-white shadow-sm shadow-primary/30'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <iconify-icon icon={tab.icon} width="14"></iconify-icon>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <iconify-icon icon="solar:magnifer-linear" width="18" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></iconify-icon>
                        </div>
                        <input
                            type="text"
                            defaultValue={filters.search}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Cari deskripsi atau nama user..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Action Filter */}
                    <div className="w-40">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aksi</label>
                        <select
                            value={filters.action}
                            onChange={e => applyFilter({ action: e.target.value })}
                            className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary"
                        >
                            <option value="">Semua Aksi</option>
                            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="w-40">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dari</label>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={e => applyFilter({ date_from: e.target.value })}
                            className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Date To */}
                    <div className="w-40">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sampai</label>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={e => applyFilter({ date_to: e.target.value })}
                            className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-40">Waktu</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">User</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Aksi</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Modul</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                                <iconify-icon icon="solar:list-check-linear" width="32" className="text-slate-400"></iconify-icon>
                                            </div>
                                            <p className="text-slate-500 font-medium">Belum ada log aktivitas.</p>
                                            <p className="text-xs text-slate-400">Log akan muncul saat ada perubahan data di sistem.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.data.map((log: any) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{formatTime(log.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate block max-w-[140px]">
                                                {log.user?.name || <span className="italic text-slate-400">Sistem</span>}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 capitalize">{log.module.replace('_', ' ')}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate">{log.description}</td>
                                        <td className="px-4 py-3 text-center">
                                            {log.metadata && (
                                                <button
                                                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary"
                                                    title="Lihat Detail"
                                                >
                                                    <iconify-icon icon={expandedRow === log.id ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} width="16"></iconify-icon>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedRow === log.id && log.metadata && (
                                        <tr>
                                            <td colSpan={6} className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                                                <div className="max-h-60 overflow-y-auto">
                                                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {logs.last_page > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-xs text-slate-500">
                            Menampilkan {logs.from}–{logs.to} dari {logs.total} log
                        </p>
                        <div className="flex items-center gap-1">
                            {logs.links.map((link: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => goToPage(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${link.active
                                        ? 'bg-primary text-white shadow-sm'
                                        : link.url
                                            ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                            : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                        }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
