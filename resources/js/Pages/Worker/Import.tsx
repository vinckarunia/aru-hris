import React, { useState, useRef, useCallback, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Link } from '@inertiajs/react';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Represents a client containing multiple projects. */
interface Client {
    id: number;
    full_name: string;
}

/** Represents a department within a project. */
interface Department {
    id: number;
    name: string;
    client_id: number;
}

/** Represents a project with its associated departments. */
interface Project {
    id: number;
    name: string;
    prefix: string;
    client_id: number;
    departments: Department[];
}

/** A single mappable database column option. */
interface DbColumnOption {
    key: string;
    label: string;
}

/** A group of related database column options. */
interface DbColumnGroup {
    group: string;
    options: DbColumnOption[];
}

/** Global settings for the import (client, project, department, rates, etc). */
interface GlobalSettings {
    client_id: number | null;
    project_id: number | null;
    department_id: number | null;
    salary_rate: string;
    allowance_rate: string;
    overtime_rate: string;
    contract_type: string;
}

/** Per-row validation result from the backend. */
interface ConflictDiff {
    field: string;
    label: string;
    existing: string;
    incoming: string;
}

interface ConflictData {
    existing_id: number;
    existing_name: string;
    existing_ktp: string;
    diffs: ConflictDiff[];
    has_changes: boolean;
}

interface ValidationResult {
    row_number: number;
    errors: string[];
    conflict: ConflictData | null;
    preview: {
        name: string | null;
        ktp_number: string | null;
        status: string;
        hire_date: string | null;
    };
}

/** Validation summary from the backend. */
interface ValidationSummary {
    total: number;
    valid: number;
    errors: number;
    conflicts: number;
}

/** Import progress data from the backend (Redis). */
interface ProgressData {
    processed: number;
    total: number;
    failed: number;
    status: 'processing' | 'completed' | 'failed';
    failed_file_path: string | null;
    updated_at: string;
}

/** Props passed from ImportController::index(). */
interface Props {
    clients: Client[];
    projects: Project[];
    dbColumns: DbColumnGroup[];
}

// ============================================================================
// RATE OPTIONS
// ============================================================================

/** Available time unit options for salary, allowance, and overtime rates. */
const RATE_OPTIONS = [
    { value: 'hourly', label: 'Per Jam' },
    { value: 'daily', label: 'Per Hari' },
    { value: 'monthly', label: 'Per Bulan' },
    { value: 'yearly', label: 'Per Tahun' },
];

/** Available contract type options. */
const CONTRACT_TYPE_OPTIONS = [
    { value: '', label: '-- Dari CSV --' },
    { value: 'Kontrak', label: 'Kontrak (PKWT)' },
    { value: 'Harian', label: 'Harian' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Import Wizard Page Component
 *
 * A 4-step wizard for importing CSV master data into the HRIS:
 * 1. Upload CSV file
 * 2. Column mapping with global settings
 * 3. Validation preview with error details
 * 4. Background processing with real-time progress
 *
 * @param {Props} props - Projects and DB columns from the backend.
 * @returns {JSX.Element} The rendered import wizard page.
 */
export default function Import({ clients, projects, dbColumns }: Props) {
    // ---- Step Management ----
    const [currentStep, setCurrentStep] = useState<number>(1);
    const steps = [
        { num: 1, label: 'Upload File', icon: 'solar:cloud-upload-linear' },
        { num: 2, label: 'Mapping & Pengaturan', icon: 'solar:settings-linear' },
        { num: 3, label: 'Validasi', icon: 'solar:check-read-linear' },
        { num: 4, label: 'Proses Import', icon: 'solar:database-bold' },
    ];

    // ---- Upload State ----
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<string[][]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);

    // ---- Mapping & Global Settings State ----
    const [mapping, setMapping] = useState<Record<string, number>>({});
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
        client_id: null,
        project_id: null,
        department_id: null,
        salary_rate: 'monthly',
        allowance_rate: 'daily',
        overtime_rate: 'hourly',
        contract_type: '',
    });

    // ---- Validation State ----
    const [isValidating, setIsValidating] = useState<boolean>(false);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
    const [showOnlyErrors, setShowOnlyErrors] = useState<boolean>(false);
    const [rowActions, setRowActions] = useState<Record<string, 'update' | 'skip'>>({});
    const [expandedConflicts, setExpandedConflicts] = useState<Set<number>>(new Set());

    // ---- Processing State ----
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ========================================================================
    // STEP 1: FILE UPLOAD
    // ========================================================================

    /**
     * Handles file selection from the file input or drag-and-drop.
     * Uploads the file to the backend and receives headers + preview data.
     *
     * @param {File} file - The selected CSV file.
     */
    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            alert('Hanya file berformat CSV (.csv) yang didukung.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Ukuran file maksimal 10MB.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const response = await axios.post(route('workers.import.upload'), formData);
            setSessionId(response.data.session_id);
            setCsvHeaders(response.data.headers);
            setPreviewData(response.data.preview_data);
            setTotalRows(response.data.total_rows);
            setMapping(response.data.auto_mapping || {});
            setCurrentStep(2);
        } catch (error: any) {
            const msg = error?.response?.data?.errors?.file?.[0]
                || error?.response?.data?.message
                || 'Gagal mengunggah file. Pastikan format CSV valid.';
            alert(msg);
        } finally {
            setIsUploading(false);
        }
    }, []);

    /** File input change handler. */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
    };

    /** Drag-and-drop handlers. */
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
    };

    // ========================================================================
    // STEP 2: MAPPING & GLOBAL SETTINGS
    // ========================================================================

    /**
     * Updates the column mapping state. Ensures strict 1-to-1 mapping.
     *
     * @param {number} csvIndex - The CSV column index being mapped.
     * @param {string} dbKey - The database field key, or empty to unmap.
     */
    const handleColumnMap = (csvIndex: number, dbKey: string) => {
        setMapping(prev => {
            const newMapping = { ...prev };
            // Remove any existing mapping for this CSV index
            const existingKey = Object.keys(newMapping).find(k => newMapping[k] === csvIndex);
            if (existingKey) delete newMapping[existingKey];
            // Assign new mapping
            if (dbKey) newMapping[dbKey] = csvIndex;
            return newMapping;
        });
    };

    /** Get the DB key mapped to a specific CSV column index. */
    const getMappedDbKey = (index: number): string => {
        return Object.keys(mapping).find(key => mapping[key] === index) || '';
    };

    /** Get projects filtered by the selected client. */
    const filteredProjects = globalSettings.client_id
        ? projects.filter(p => p.client_id === globalSettings.client_id)
        : projects;

    /** Get departments filtered by the selected project. */
    const filteredDepartments = projects.find(p => p.id === globalSettings.project_id)?.departments || [];

    // ========================================================================
    // STEP 3: VALIDATION
    // ========================================================================

    /**
     * Sends mapping and global settings to the backend for validation.
     * Receives per-row validation results.
     */
    const handleValidate = async () => {
        if (!sessionId) return;

        // Only require global project/department if not mapped from CSV columns
        const hasProjectMapping = mapping['project_name'] !== undefined;
        const hasDeptMapping = mapping['department_name'] !== undefined;

        if (!hasProjectMapping && !globalSettings.project_id) {
            alert('Silakan pilih Project di pengaturan global, atau mapping kolom "Nama Project" dari CSV.');
            return;
        }
        if (!hasDeptMapping && !globalSettings.department_id) {
            alert('Silakan pilih Departemen di pengaturan global, atau mapping kolom "Nama Departemen" dari CSV.');
            return;
        }

        // If they mapped the project/department name but didn't pick global Project/Department ID,
        // they MUST pick a Client to allow auto-creation.
        if ((hasProjectMapping && !globalSettings.project_id && !globalSettings.client_id) ||
            (hasDeptMapping && !globalSettings.department_id && !globalSettings.client_id)) {
            alert('Jika Anda melakukan mapping nama Project/Departemen dari CSV, silakan pilih setidaknya "Client" di Pengaturan Global agar sistem dapat membuatkannya secara otomatis jika tidak ditemukan.');
            return;
        }

        setIsValidating(true);
        try {
            const response = await axios.post(route('workers.import.validate'), {
                session_id: sessionId,
                mapping,
                global_settings: globalSettings,
            });
            setValidationResults(response.data.results);
            setValidationSummary(response.data.summary);
            // Auto-set all conflicts to 'skip' by default
            const actions: Record<string, 'update' | 'skip'> = {};
            response.data.results.forEach((r: ValidationResult) => {
                if (r.conflict) {
                    actions[String(r.row_number)] = 'skip';
                }
            });
            setRowActions(actions);
            setCurrentStep(3);
        } catch (error: any) {
            const msg = error?.response?.data?.message
                || error?.response?.data?.errors
                || 'Terjadi kesalahan saat validasi.';
            alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsValidating(false);
        }
    };

    // ========================================================================
    // STEP 4: PROCESSING
    // ========================================================================

    /**
     * Dispatches the import job and starts polling for progress.
     */
    const handleProcess = async () => {
        if (!sessionId) return;

        setIsProcessing(true);
        try {
            await axios.post(route('workers.import.process'), {
                session_id: sessionId,
                mapping,
                global_settings: globalSettings,
                row_actions: rowActions,
            });
            setCurrentStep(4);
            startProgressPolling();
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Gagal memulai proses import.');
            setIsProcessing(false);
        }
    };

    /** Starts polling the progress endpoint every 1.5 seconds. */
    const startProgressPolling = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        progressIntervalRef.current = setInterval(async () => {
            if (!sessionId) return;
            try {
                const response = await axios.get(route('workers.import.progress', { sessionId }));
                setProgress(response.data);

                if (response.data.status === 'completed' || response.data.status === 'failed') {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    setIsProcessing(false);
                }
            } catch {
                // Silently retry
            }
        }, 1500);
    };

    /** Cleanup interval on unmount. */
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <AdminLayout title="Import Data Karyawan" header="Import Data">
            {/* Back Button */}
            <div className="mb-4">
                <Link
                    href={route('workers.index')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors inline-flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center mb-8 gap-1">
                {steps.map((step, i) => (
                    <React.Fragment key={step.num}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentStep === step.num
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : currentStep > step.num
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}>
                            {currentStep > step.num ? (
                                <iconify-icon icon="solar:check-circle-bold" width="18"></iconify-icon>
                            ) : (
                                <iconify-icon icon={step.icon} width="18"></iconify-icon>
                            )}
                            <span className="hidden sm:inline">{step.label}</span>
                            <span className="sm:hidden">{step.num}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-8 h-0.5 rounded ${currentStep > step.num ? 'bg-emerald-300' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* ================================================================
                STEP 1: UPLOAD
            ================================================================ */}
            {currentStep === 1 && (
                <div
                    className={`bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center py-20 ${isDragging
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-glow'
                        : 'border-slate-200 dark:border-slate-700 shadow-card'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-5 shadow-glow">
                        <iconify-icon icon="solar:cloud-upload-linear" width="40"></iconify-icon>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Master Data CSV</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md">
                        Seret dan lepas file CSV ke area ini, atau klik tombol di bawah untuk memilih file.
                        <br />Ukuran maksimal 10MB.
                    </p>

                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    <div className="flex gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isUploading ? (
                                <>
                                    <iconify-icon icon="svg-spinners:180-ring" width="20"></iconify-icon>
                                    Membaca File...
                                </>
                            ) : (
                                <>
                                    <iconify-icon icon="solar:folder-with-files-bold" width="20"></iconify-icon>
                                    Pilih File CSV
                                </>
                            )}
                        </button>
                        <a
                            href={route('workers.import.template')}
                            className="px-6 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold transition-all flex items-center gap-2"
                        >
                            <iconify-icon icon="solar:download-linear" width="20"></iconify-icon>
                            Download Template
                        </a>
                    </div>
                </div>
            )}

            {/* ================================================================
                STEP 2: MAPPING & GLOBAL SETTINGS
            ================================================================ */}
            {currentStep === 2 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card flex flex-col h-[calc(100vh-16rem)]">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Mapping Kolom & Pengaturan</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Cocokkan kolom CSV dengan kolom database. Atur pengaturan global di panel bawah tabel.
                                <span className="ml-2 text-primary font-semibold">{totalRows} baris terdeteksi</span>
                            </p>
                        </div>
                        <button
                            onClick={handleValidate}
                            disabled={isValidating}
                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
                        >
                            {isValidating ? (
                                <><iconify-icon icon="svg-spinners:180-ring" width="18"></iconify-icon> Memvalidasi...</>
                            ) : (
                                <><iconify-icon icon="solar:check-read-linear" width="18"></iconify-icon> Validasi Data</>
                            )}
                        </button>
                    </div>

                    {/* Scrollable Mapping Table */}
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                {/* Row 1: Mapping Dropdowns */}
                                <tr>
                                    {csvHeaders.map((_, idx) => {
                                        const currentKey = getMappedDbKey(idx);
                                        const isMapped = currentKey !== '';
                                        return (
                                            <th key={`map-${idx}`} className={`p-3 border-b border-r border-slate-100 dark:border-slate-700 min-w-[200px] ${isMapped ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                                <select
                                                    value={currentKey}
                                                    onChange={(e) => handleColumnMap(idx, e.target.value)}
                                                    className={`w-full rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all border ${isMapped
                                                        ? 'bg-white dark:bg-slate-800 border-primary/30 text-primary font-semibold'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                                        }`}
                                                >
                                                    <option value="">-- Abaikan Kolom Ini --</option>
                                                    {dbColumns.map((group, gIdx) => (
                                                        <optgroup key={gIdx} label={group.group}>
                                                            {group.options.map(col => {
                                                                const usedElsewhere = mapping[col.key] !== undefined && mapping[col.key] !== idx;
                                                                return (
                                                                    <option key={col.key} value={col.key} className={usedElsewhere ? 'text-slate-400' : ''}>
                                                                        {col.label}{usedElsewhere ? ' (Sudah Digunakan)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </th>
                                        );
                                    })}
                                </tr>
                                {/* Row 2: Original CSV Headers */}
                                <tr>
                                    {csvHeaders.map((header, i) => (
                                        <th key={`h-${i}`} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {header || `Kolom ${i + 1}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                {previewData.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={`px-4 py-2.5 border-r border-slate-100 dark:border-slate-700 last:border-r-0 max-w-[300px] truncate ${getMappedDbKey(cIdx) ? 'bg-primary/[0.02] dark:bg-primary/[0.05]' : ''}`} title={cell}>
                                                {cell || <span className="text-slate-300 italic">-</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Global Settings Panel (Below Table) */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl shrink-0">
                        <div className="flex items-center gap-2 mb-4">
                            <iconify-icon icon="solar:settings-bold" width="18" className="text-primary"></iconify-icon>
                            <h4 className="text-sm font-bold text-slate-700 dark:text-white">Pengaturan Global</h4>
                            <span className="text-[11px] text-slate-400 ml-1">Parameter default yang diterapkan ke seluruh baris data</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                            {/* Client */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Client {((mapping['project_name'] !== undefined || mapping['department_name'] !== undefined) && !globalSettings.project_id && !globalSettings.department_id) ? <span className="text-red-500">*</span> : ''}
                                </label>
                                <select
                                    value={globalSettings.client_id ?? ''}
                                    onChange={(e) => {
                                        const cid = e.target.value ? Number(e.target.value) : null;
                                        setGlobalSettings(prev => ({ ...prev, client_id: cid, project_id: null, department_id: null }));
                                    }}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    <option value="">-- Pilih Client --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                </select>
                            </div>

                            {/* Project */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Project {mapping['project_name'] !== undefined ? <span className="text-emerald-500 normal-case">(dari CSV)</span> : <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={globalSettings.project_id ?? ''}
                                    onChange={(e) => {
                                        const pid = e.target.value ? Number(e.target.value) : null;
                                        setGlobalSettings(prev => ({ ...prev, project_id: pid, department_id: null }));
                                    }}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    <option value="">-- Pilih Project --</option>
                                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            {/* Department (cascading) */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Departemen {mapping['department_name'] !== undefined ? <span className="text-emerald-500 normal-case">(dari CSV)</span> : <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={globalSettings.department_id ?? ''}
                                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, department_id: e.target.value ? Number(e.target.value) : null }))}
                                    disabled={!globalSettings.project_id}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary disabled:opacity-50"
                                >
                                    <option value="">-- Pilih Dept --</option>
                                    {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            {/* Salary Rate */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Satuan Gaji</label>
                                <select
                                    value={globalSettings.salary_rate}
                                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, salary_rate: e.target.value }))}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    {RATE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>

                            {/* Allowance Rate */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Satuan Tunjangan</label>
                                <select
                                    value={globalSettings.allowance_rate}
                                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, allowance_rate: e.target.value }))}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    {RATE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>

                            {/* Overtime Rate */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Satuan Lembur</label>
                                <select
                                    value={globalSettings.overtime_rate}
                                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, overtime_rate: e.target.value }))}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    {RATE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>

                            {/* Contract Type */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Kontrak</label>
                                <select
                                    value={globalSettings.contract_type}
                                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, contract_type: e.target.value }))}
                                    className="w-full text-sm rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary"
                                >
                                    {CONTRACT_TYPE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                STEP 3: VALIDATION PREVIEW
            ================================================================ */}
            {currentStep === 3 && validationSummary && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 text-sky-500 rounded-xl flex items-center justify-center">
                                    <iconify-icon icon="solar:document-text-bold" width="24"></iconify-icon>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{validationSummary.total}</p>
                                    <p className="text-xs text-slate-500 font-medium">Total Baris</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center">
                                    <iconify-icon icon="solar:check-circle-bold" width="24"></iconify-icon>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-emerald-600">{validationSummary.valid}</p>
                                    <p className="text-xs text-slate-500 font-medium">Valid & Siap Import</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-xl flex items-center justify-center">
                                    <iconify-icon icon="solar:copy-bold" width="24"></iconify-icon>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-amber-600">{validationSummary.conflicts}</p>
                                    <p className="text-xs text-slate-500 font-medium">Duplikat (Konflik)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl flex items-center justify-center">
                                    <iconify-icon icon="solar:danger-triangle-bold" width="24"></iconify-icon>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600">{validationSummary.errors}</p>
                                    <p className="text-xs text-slate-500 font-medium">Bermasalah</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Validation Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                        {/* Table Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-white">Detail Validasi Per Baris</h3>
                                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyErrors}
                                        onChange={(e) => setShowOnlyErrors(e.target.checked)}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    Tampilkan hanya yang error
                                </label>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <iconify-icon icon="solar:arrow-left-linear" width="16"></iconify-icon> Perbaiki Mapping
                                </button>
                                {validationSummary.conflicts > 0 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const actions: Record<string, 'update' | 'skip'> = {};
                                                validationResults.forEach(r => { if (r.conflict) actions[String(r.row_number)] = 'update'; });
                                                setRowActions(actions);
                                            }}
                                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <iconify-icon icon="solar:refresh-bold" width="16"></iconify-icon> Update Semua Konflik
                                        </button>
                                        <button
                                            onClick={() => {
                                                const actions: Record<string, 'update' | 'skip'> = {};
                                                validationResults.forEach(r => { if (r.conflict) actions[String(r.row_number)] = 'skip'; });
                                                setRowActions(actions);
                                            }}
                                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <iconify-icon icon="solar:skip-next-bold" width="16"></iconify-icon> Skip Semua Konflik
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleProcess}
                                    disabled={isProcessing || (validationSummary.valid === 0 && Object.values(rowActions).filter(a => a === 'update').length === 0)}
                                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <iconify-icon icon="solar:database-bold" width="18"></iconify-icon>
                                    Mulai Import ({validationSummary.valid + Object.values(rowActions).filter(a => a === 'update').length} baris)
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-auto max-h-[calc(100vh-28rem)]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 w-16">Baris</th>
                                        <th className="px-4 py-3">Nama</th>
                                        <th className="px-4 py-3">KTP</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Tgl Masuk</th>
                                        <th className="px-4 py-3">Hasil</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {validationResults
                                        .filter(r => !showOnlyErrors || r.errors.length > 0 || r.conflict)
                                        .map(r => {
                                            const isConflict = r.conflict !== null && r.errors.length === 0;
                                            const isExpanded = expandedConflicts.has(r.row_number);
                                            const action = rowActions[String(r.row_number)];
                                            return (
                                                <React.Fragment key={r.row_number}>
                                                    <tr className={`transition-colors cursor-pointer ${r.errors.length > 0
                                                        ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : isConflict
                                                            ? 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                                        }`}
                                                        onClick={() => {
                                                            if (isConflict) {
                                                                setExpandedConflicts(prev => {
                                                                    const next = new Set(prev);
                                                                    next.has(r.row_number) ? next.delete(r.row_number) : next.add(r.row_number);
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.row_number}</td>
                                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.preview.name || '-'}</td>
                                                        <td className="px-4 py-3 font-mono text-xs">{r.preview.ktp_number || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.preview.status === 'active'
                                                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700'
                                                                }`}>
                                                                {r.preview.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">{r.preview.hire_date || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            {r.errors.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {r.errors.map((err, eIdx) => (
                                                                        <div key={eIdx} className="flex items-start gap-1 text-red-500 text-xs">
                                                                            <iconify-icon icon="solar:close-circle-bold" width="14" className="mt-0.5 shrink-0"></iconify-icon>
                                                                            <span>{err}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : isConflict ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                                                                        <iconify-icon icon="solar:copy-bold" width="14"></iconify-icon>
                                                                        Duplikat — {r.conflict!.diffs.length} perbedaan
                                                                    </span>
                                                                    <select
                                                                        value={action || 'skip'}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            setRowActions(prev => ({ ...prev, [String(r.row_number)]: e.target.value as 'update' | 'skip' }));
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className={`text-[11px] rounded-lg px-2 py-1 pr-6 border font-semibold ${action === 'update'
                                                                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                                            }`}
                                                                    >
                                                                        <option value="skip">Lewati</option>
                                                                        <option value="update">Update</option>
                                                                    </select>
                                                                    <iconify-icon icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width="14" className="text-slate-400"></iconify-icon>
                                                                </div>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                                                                    <iconify-icon icon="solar:check-circle-bold" width="16"></iconify-icon> Valid
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {/* Expanded conflict diff table */}
                                                    {isConflict && isExpanded && r.conflict!.diffs.length > 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="p-0">
                                                                <div className="bg-amber-50/80 dark:bg-amber-900/10 border-y border-amber-200 dark:border-amber-800/30 px-8 py-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <iconify-icon icon="solar:document-medicine-bold" width="16" className="text-amber-600"></iconify-icon>
                                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                                                            Perbandingan: {r.conflict!.existing_name} (ID: {r.conflict!.existing_id})
                                                                        </span>
                                                                    </div>
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                                                                                <th className="text-left py-1.5 w-1/4">Field</th>
                                                                                <th className="text-left py-1.5 w-[37.5%]">Data Saat Ini (Database)</th>
                                                                                <th className="text-left py-1.5 w-[37.5%]">Data Baru (CSV)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {r.conflict!.diffs.map((d, dIdx) => (
                                                                                <tr key={dIdx} className="border-t border-amber-200/50 dark:border-amber-800/20">
                                                                                    <td className="py-2 font-semibold text-slate-600 dark:text-slate-300">{d.label}</td>
                                                                                    <td className="py-2 text-red-600 dark:text-red-400 line-through opacity-70">{d.existing}</td>
                                                                                    <td className="py-2 text-emerald-600 dark:text-emerald-400 font-medium">{d.incoming}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                STEP 4: PROCESSING & RESULTS
            ================================================================ */}
            {currentStep === 4 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card p-8">
                    <div className="max-w-xl mx-auto text-center">
                        {/* Status Icon */}
                        {(!progress || progress.status === 'processing') && (
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6 shadow-glow animate-pulse">
                                <iconify-icon icon="svg-spinners:blocks-shuffle-3" width="40"></iconify-icon>
                            </div>
                        )}
                        {progress?.status === 'completed' && (
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                                <iconify-icon icon="solar:check-circle-bold" width="40"></iconify-icon>
                            </div>
                        )}
                        {progress?.status === 'failed' && (
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                                <iconify-icon icon="solar:danger-triangle-bold" width="40"></iconify-icon>
                            </div>
                        )}

                        {/* Title */}
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            {!progress || progress.status === 'processing'
                                ? 'Sedang Memproses Import...'
                                : progress.status === 'completed'
                                    ? 'Import Selesai!'
                                    : 'Import Gagal'
                            }
                        </h2>

                        {progress && (
                            <>
                                {/* Progress Bar */}
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mt-6 mb-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${progress.status === 'completed' ? 'bg-emerald-500' : progress.status === 'failed' ? 'bg-red-500' : 'bg-primary'
                                            }`}
                                        style={{ width: `${progress.total > 0 ? (progress.processed / progress.total * 100) : 0}%` }}
                                    ></div>
                                </div>

                                {/* Stats */}
                                <p className="text-sm text-slate-500 mb-6">
                                    {progress.processed} dari {progress.total} baris diproses
                                    {progress.failed > 0 && (
                                        <span className="text-red-500 font-medium"> • {progress.failed} gagal</span>
                                    )}
                                </p>

                                {/* Summary Cards */}
                                {progress.status === 'completed' && (
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{progress.total}</p>
                                            <p className="text-xs text-slate-500">Total</p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                                            <p className="text-2xl font-bold text-emerald-600">{progress.total - progress.failed}</p>
                                            <p className="text-xs text-slate-500">Berhasil</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                                            <p className="text-2xl font-bold text-red-600">{progress.failed}</p>
                                            <p className="text-xs text-slate-500">Gagal</p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {progress.status === 'completed' && (
                                    <div className="flex justify-center gap-3">
                                        {progress.failed > 0 && progress.failed_file_path && (
                                            <a
                                                href={route('workers.import.download-failures', { sessionId })}
                                                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                                            >
                                                <iconify-icon icon="solar:download-bold" width="18"></iconify-icon>
                                                Download Baris Gagal
                                            </a>
                                        )}
                                        <Link
                                            href={route('workers.index')}
                                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
                                        >
                                            <iconify-icon icon="solar:users-group-two-rounded-bold" width="18"></iconify-icon>
                                            Lihat Data Karyawan
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
