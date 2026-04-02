import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import axios from 'axios';

/**
 * Column option item from the backend.
 */
interface ColumnOption {
    key: string;
    label: string;
}

/**
 * Client entity with nested projects.
 */
interface Client {
    id: string;
    full_name: string;
    projects: { id: string; client_id: string; name: string }[];
}

/**
 * Props for the Report Index page.
 */
interface Props {
    clients: Client[];
    columnOptions: Record<string, ColumnOption[]>;
}

/** Human-readable category labels. */
const CATEGORY_LABELS: Record<string, string> = {
    worker: 'Karyawan',
    assignment: 'Penempatan',
    contract: 'Kontrak',
    compensation: 'Kompensasi',
};

/** Category icons. */
const CATEGORY_ICONS: Record<string, string> = {
    worker: 'solar:user-circle-linear',
    assignment: 'solar:folder-with-files-linear',
    contract: 'solar:document-linear',
    compensation: 'solar:wallet-money-linear',
};

const STATUS_OPTIONS = [
    { value: 'active', label: 'Aktif' },
    { value: 'contract expired', label: 'Kontrak Habis' },
    { value: 'resign', label: 'Resign' },
    { value: 'fired', label: 'PHK' },
    { value: 'other', label: 'Lainnya' },
];

/**
 * Report Index Page Component
 *
 * Provides a Query Builder interface for building custom HRIS reports.
 * Users can select columns, apply filters, preview data, and export as CSV/XLSX.
 */
export default function Index({ clients, columnOptions }: Props) {
    // Selected column keys
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    // Filters
    const [filters, setFilters] = useState<{
        client_id: string;
        project_id: string;
        status: string;
        hire_date_from: string;
        hire_date_to: string;
        only_latest: boolean;
    }>({
        client_id: '',
        project_id: '',
        status: '',
        hire_date_from: '',
        hire_date_to: '',
        only_latest: false,
    });

    // Preview state
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [hasPreview, setHasPreview] = useState(false);

    // Export state
    const [isExporting, setIsExporting] = useState(false);

    // Collapsed categories
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    /**
     * Toggle a column selection on/off.
     */
    const toggleColumn = (key: string) => {
        setSelectedColumns((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    };

    /**
     * Select or deselect all columns in a category.
     */
    const toggleCategory = (category: string) => {
        const categoryKeys = columnOptions[category].map((c) => c.key);
        const allSelected = categoryKeys.every((k) => selectedColumns.includes(k));
        if (allSelected) {
            setSelectedColumns((prev) => prev.filter((k) => !categoryKeys.includes(k)));
        } else {
            setSelectedColumns((prev) => [...new Set([...prev, ...categoryKeys])]);
        }
    };

    /**
     * Toggle category collapse/expand.
     */
    const toggleCategoryCollapse = (category: string) => {
        setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
    };

    /**
     * Get the list of projects filtered by the selected client.
     */
    const getFilteredProjects = () => {
        if (!filters.client_id) return [];
        const client = clients.find((c) => c.id === filters.client_id);
        return client?.projects ?? [];
    };

    /**
     * Handle client filter change with cascading reset.
     */
    const handleClientChange = (clientId: string) => {
        setFilters((prev) => ({ ...prev, client_id: clientId, project_id: '' }));
    };

    /**
     * Build the request payload for preview/export.
     */
    const buildPayload = (format?: string) => {
        const payload: any = {
            columns: selectedColumns,
            filters: {},
        };
        if (filters.client_id) payload.filters.client_id = filters.client_id;
        if (filters.project_id) payload.filters.project_id = filters.project_id;
        if (filters.status) payload.filters.status = filters.status;
        if (filters.hire_date_from) payload.filters.hire_date_from = filters.hire_date_from;
        if (filters.hire_date_to) payload.filters.hire_date_to = filters.hire_date_to;
        if (filters.only_latest) payload.filters.only_latest = filters.only_latest;
        if (format) payload.format = format;
        return payload;
    };

    /**
     * Fetch preview data from the backend.
     */
    const handlePreview = async () => {
        if (selectedColumns.length === 0) return;
        setIsPreviewLoading(true);
        try {
            const response = await axios.post(route('reports.preview'), buildPayload());
            setPreviewHeaders(response.data.headers);
            setPreviewRows(response.data.rows);
            setHasPreview(true);
        } catch (error) {
            console.error('Preview failed:', error);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    /**
     * Export data as CSV or XLSX via file download.
     */
    const handleExport = async (format: 'csv' | 'xlsx') => {
        if (selectedColumns.length === 0) return;
        setIsExporting(true);
        try {
            const response = await axios.post(route('reports.export'), buildPayload(format), {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            const fileName =
                contentDisposition?.split('filename=')[1]?.replace(/"/g, '') ??
                `laporan_hris.${format}`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Select all columns across all categories.
     */
    const selectAllColumns = () => {
        const allKeys = Object.values(columnOptions).flatMap((cols) => cols.map((c) => c.key));
        setSelectedColumns(allKeys);
    };

    /**
     * Deselect all columns.
     */
    const clearAllColumns = () => {
        setSelectedColumns([]);
    };

    const totalAvailableColumns = Object.values(columnOptions).reduce(
        (acc, cols) => acc + cols.length,
        0,
    );

    return (
        <AdminLayout title="Laporan" header="Laporan">
            <Head title="Laporan" />

            <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 rounded-2xl p-6 border border-primary/10 dark:border-primary/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary-gradient flex items-center justify-center text-white shadow-glow shrink-0">
                            <iconify-icon icon="solar:document-text-linear" width="26"></iconify-icon>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Query Builder
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Pilih kolom data, terapkan filter, dan ekspor laporan dalam format CSV
                                atau Excel.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Panel: Column Selection */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Column Selection Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                        <iconify-icon
                                            icon="solar:checklist-minimalistic-linear"
                                            width="18"
                                            className="text-primary"
                                        ></iconify-icon>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-white">
                                            Pilih Kolom
                                        </h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            {selectedColumns.length} dari {totalAvailableColumns} kolom
                                            dipilih
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={selectAllColumns}
                                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                                    >
                                        Pilih Semua
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <button
                                        onClick={clearAllColumns}
                                        className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        Hapus Semua
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {Object.entries(columnOptions).map(([category, columns]) => {
                                    const categoryKeys = columns.map((c) => c.key);
                                    const selectedCount = categoryKeys.filter((k) =>
                                        selectedColumns.includes(k),
                                    ).length;
                                    const allSelected = selectedCount === columns.length;
                                    const isCollapsed = collapsedCategories[category];

                                    return (
                                        <div
                                            key={category}
                                            className="border border-slate-100 dark:border-slate-700/50 rounded-xl overflow-hidden"
                                        >
                                            {/* Category Header */}
                                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/80">
                                                <button
                                                    onClick={() =>
                                                        toggleCategoryCollapse(category)
                                                    }
                                                    className="flex items-center gap-3 flex-1 min-w-0"
                                                >
                                                    <iconify-icon
                                                        icon={
                                                            CATEGORY_ICONS[category] ??
                                                            'solar:widget-linear'
                                                        }
                                                        width="20"
                                                        className="text-primary shrink-0"
                                                    ></iconify-icon>
                                                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                                        {CATEGORY_LABELS[category] ?? category}
                                                    </span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                        ({selectedCount}/{columns.length})
                                                    </span>
                                                    <iconify-icon
                                                        icon="solar:alt-arrow-down-linear"
                                                        width="14"
                                                        className={`text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                                                    ></iconify-icon>
                                                </button>
                                                <button
                                                    onClick={() => toggleCategory(category)}
                                                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${allSelected
                                                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'text-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                                                        }`}
                                                >
                                                    {allSelected
                                                        ? 'Hapus Semua'
                                                        : 'Pilih Semua'}
                                                </button>
                                            </div>

                                            {/* Column Checkboxes */}
                                            <div
                                                className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[600px]'}`}
                                            >
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-3">
                                                    {columns.map((col) => (
                                                        <label
                                                            key={col.key}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all group ${selectedColumns.includes(col.key)
                                                                ? 'bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedColumns.includes(
                                                                    col.key,
                                                                )}
                                                                onChange={() =>
                                                                    toggleColumn(col.key)
                                                                }
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 transition-colors"
                                                            />
                                                            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors truncate">
                                                                {col.label}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Filters + Actions */}
                    <div className="space-y-6">
                        {/* Filter Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                                    <iconify-icon
                                        icon="solar:filter-linear"
                                        width="18"
                                        className="text-amber-500"
                                    ></iconify-icon>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">
                                        Filter
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Opsional, untuk mempersempit data
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Client Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                                        Client
                                    </label>
                                    <select
                                        id="filter-client"
                                        value={filters.client_id}
                                        onChange={(e) => handleClientChange(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-sm focus:ring-primary focus:border-primary transition-colors"
                                    >
                                        <option value="">Semua Client</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Project Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                                        Project
                                    </label>
                                    <select
                                        id="filter-project"
                                        value={filters.project_id}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                project_id: e.target.value,
                                            }))
                                        }
                                        disabled={!filters.client_id}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-sm focus:ring-primary focus:border-primary transition-colors disabled:opacity-50"
                                    >
                                        <option value="">Semua Project</option>
                                        {getFilteredProjects().map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                                        Status Penempatan
                                    </label>
                                    <select
                                        id="filter-status"
                                        value={filters.status}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                status: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-sm focus:ring-primary focus:border-primary transition-colors"
                                    >
                                        <option value="">Semua Status</option>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                                        Tanggal Masuk (Range)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            id="filter-hire-date-from"
                                            value={filters.hire_date_from}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    hire_date_from: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-sm focus:ring-primary focus:border-primary transition-colors"
                                            placeholder="Dari"
                                        />
                                        <input
                                            type="date"
                                            id="filter-hire-date-to"
                                            value={filters.hire_date_to}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    hire_date_to: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-sm focus:ring-primary focus:border-primary transition-colors"
                                            placeholder="Sampai"
                                        />
                                    </div>
                                </div>

                                {/* Only Latest Checkbox */}
                                <div className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        id="filter-only-latest"
                                        checked={filters.only_latest}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                only_latest: e.target.checked,
                                            }))
                                        }
                                        className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary dark:border-slate-600 dark:bg-slate-700"
                                    />
                                    <label htmlFor="filter-only-latest" className="text-sm text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                                        Hanya tampilkan penempatan/kontrak terbaru
                                    </label>
                                </div>

                                {/* Reset Filters */}
                                <button
                                    onClick={() =>
                                        setFilters({
                                            client_id: '',
                                            project_id: '',
                                            status: '',
                                            hire_date_from: '',
                                            hire_date_to: '',
                                            only_latest: false,
                                        })
                                    }
                                    className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <iconify-icon icon="solar:restart-linear" width="16"></iconify-icon>
                                    Reset Filter
                                </button>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                                    <iconify-icon
                                        icon="solar:download-minimalistic-linear"
                                        width="18"
                                        className="text-emerald-500"
                                    ></iconify-icon>
                                </div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">
                                    Aksi
                                </h3>
                            </div>
                            <div className="p-6 space-y-3">
                                {/* Preview Button */}
                                <button
                                    id="btn-preview"
                                    onClick={handlePreview}
                                    disabled={selectedColumns.length === 0 || isPreviewLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPreviewLoading ? (
                                        <>
                                            <iconify-icon
                                                icon="solar:refresh-linear"
                                                width="18"
                                                className="animate-spin"
                                            ></iconify-icon>
                                            Memuat Preview...
                                        </>
                                    ) : (
                                        <>
                                            <iconify-icon icon="solar:eye-linear" width="18"></iconify-icon>
                                            Preview Data
                                        </>
                                    )}
                                </button>

                                {/* Export CSV Button */}
                                <button
                                    id="btn-export-csv"
                                    onClick={() => handleExport('csv')}
                                    disabled={selectedColumns.length === 0 || isExporting}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                                >
                                    <iconify-icon icon="solar:file-text-linear" width="18"></iconify-icon>
                                    Export CSV
                                </button>

                                {/* Export XLSX Button */}
                                <button
                                    id="btn-export-xlsx"
                                    onClick={() => handleExport('xlsx')}
                                    disabled={selectedColumns.length === 0 || isExporting}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                                >
                                    <iconify-icon
                                        icon="solar:document-text-linear"
                                        width="18"
                                    ></iconify-icon>
                                    Export Excel (XLSX)
                                </button>

                                {selectedColumns.length === 0 && (
                                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1">
                                        Pilih minimal 1 kolom untuk melanjutkan
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Table */}
                {hasPreview && (
                    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                                    <iconify-icon
                                        icon="solar:eye-linear"
                                        width="18"
                                        className="text-blue-500"
                                    ></iconify-icon>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">
                                        Preview Data
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Menampilkan maksimal 50 baris pertama
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                                {previewRows.length} baris
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            {previewRows.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-12">
                                                #
                                            </th>
                                            {previewHeaders.map((header, i) => (
                                                <th
                                                    key={i}
                                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                                                >
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {previewRows.map((row, rowIndex) => (
                                            <tr
                                                key={rowIndex}
                                                className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                                                    {rowIndex + 1}
                                                </td>
                                                {row.map((cell, cellIndex) => (
                                                    <td
                                                        key={cellIndex}
                                                        className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                                                        title={cell ?? ''}
                                                    >
                                                        {cell ?? (
                                                            <span className="text-slate-300 dark:text-slate-600 italic">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-16 text-center">
                                    <iconify-icon
                                        icon="solar:inbox-linear"
                                        width="48"
                                        className="text-slate-300 dark:text-slate-600"
                                    ></iconify-icon>
                                    <p className="text-slate-400 dark:text-slate-500 mt-3 text-sm">
                                        Tidak ada data yang sesuai dengan filter yang dipilih.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
