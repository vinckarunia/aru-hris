import React, { useState, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';

/**
 * Grouped array definition for all mappable database columns.
 * Supports workers, assignments, contracts, compensations, and family members.
 * Updated to match full ERD structure and Contract/Harian logic.
 */
const DB_COLUMNS = [
    {
        group: 'Data Karyawan (Utama)',
        options: [
            { key: 'ktp_number', label: 'NIK KTP (Wajib)' },
            { key: 'name', label: 'Nama Lengkap (Wajib)' },
            { key: 'nik_aru', label: 'NIK ARU' },
            { key: 'gender', label: 'Jenis Kelamin (L/P)' },
            { key: 'birth_place', label: 'Tempat Lahir' },
            { key: 'birth_date', label: 'Tanggal Lahir' },
            { key: 'phone', label: 'No Handphone' },
            { key: 'education', label: 'Pendidikan Terakhir' },
            { key: 'religion', label: 'Agama' },
            { key: 'tax_status', label: 'Status Pajak/Tanggungan' },
        ]
    },
    {
        group: 'Data Karyawan (Alamat & Dokumen)',
        options: [
            { key: 'address_ktp', label: 'Alamat Sesuai KTP' },
            { key: 'address_domicile', label: 'Alamat Sesuai Domisili' },
            { key: 'kk_number', label: 'No Kartu Keluarga' },
            { key: 'mother_name', label: 'Nama Ibu Kandung' },
            { key: 'npwp', label: 'Nomor NPWP' },
            { key: 'bpjs_kesehatan', label: 'No BPJS Kesehatan' },
            { key: 'bpjs_ketenagakerjaan', label: 'No BPJS Ketenagakerjaan' },
            { key: 'bank_name', label: 'Nama Bank' },
            { key: 'bank_account_number', label: 'Nomor Rekening' },
        ]
    },
    {
        group: 'Data Penempatan',
        options: [
            { key: 'nik_tlj', label: 'NIK Client' },
            { key: 'position', label: 'Jabatan (Position)' },
            { key: 'hire_date', label: 'Tanggal Masuk (Hire Date)' },
            { key: 'termination_date', label: 'Tanggal Keluar (Termination Date)' },
            { key: 'status', label: 'Status' },
        ]
    },
    {
        group: 'Data Kontrak (PKWT/PKWTT/Harian)',
        options: [
            { key: 'raw_contract_type', label: 'Jenis Kontrak (Kontrak / Harian)' },
            { key: 'pkwt_1_start', label: 'PKWT 1 - Mulai' },
            { key: 'pkwt_1_end', label: 'PKWT 1 - Selesai' },
            { key: 'pkwt_2_start', label: 'PKWT 2 - Mulai' },
            { key: 'pkwt_2_end', label: 'PKWT 2 - Selesai' },
            { key: 'pkwt_3_start', label: 'PKWT 3 - Mulai' },
            { key: 'pkwt_3_end', label: 'PKWT 3 - Selesai' },
            { key: 'pkwt_4_start', label: 'PKWT 4 - Mulai' },
            { key: 'pkwt_4_end', label: 'PKWT 4 - Selesai' },
            { key: 'pkwt_5_start', label: 'PKWT 5 - Mulai' },
            { key: 'pkwt_5_end', label: 'PKWT 5 - Selesai' },
            { key: 'pkwt_6_start', label: 'PKWT 6 - Mulai' },
            { key: 'pkwt_6_end', label: 'PKWT 6 - Selesai' },
            { key: 'pkwt_7_start', label: 'PKWT 7 - Mulai' },
            { key: 'pkwt_7_end', label: 'PKWT 7 - Selesai' },
            { key: 'pkwt_8_start', label: 'PKWT 8 - Mulai' },
            { key: 'pkwt_8_end', label: 'PKWT 8 - Selesai' },
            { key: 'pkwtt_start', label: 'PKWTT - Mulai' },
            { key: 'evaluation_notes', label: 'Catatan Evaluasi Kontrak' },
        ]
    },
    {
        group: 'Data Kompensasi (Gaji & Rate)',
        options: [
            { key: 'base_salary', label: 'Gaji Pokok' },
            { key: 'salary_rate', label: 'Tipe Gaji (Monthly/Daily/Hourly)' },
            { key: 'meal_allowance', label: 'Tunjangan Makan' },
            { key: 'transport_allowance', label: 'Tunjangan Transport' },
            { key: 'allowance_rate', label: 'Tipe Tunjangan (Daily/Monthly)' },
            { key: 'overtime_weekday', label: 'Rate Lembur (Weekday)' },
            { key: 'overtime_holiday', label: 'Rate Lembur (Weekend/Libur)' },
            { key: 'overtime_rate', label: 'Tipe Lembur (Hourly/Daily)' },
        ]
    },
    {
        group: 'Data Keluarga (Pasangan)',
        options: [
            { key: 'spouse_name', label: 'Nama Istri / Suami' },
            { key: 'spouse_birth_place', label: 'Tempat Lahir (Pasangan)' },
            { key: 'spouse_birth_date', label: 'Tanggal Lahir (Pasangan)' },
            { key: 'spouse_nik', label: 'NIK (Pasangan)' },
            { key: 'spouse_bpjs', label: 'No BPJS (Pasangan)' },
        ]
    },
    {
        group: 'Data Keluarga (Anak 1)',
        options: [
            { key: 'child_1_name', label: 'Nama Anak 1' },
            { key: 'child_1_birth_place', label: 'Tempat Lahir (Anak 1)' },
            { key: 'child_1_birth_date', label: 'Tanggal Lahir (Anak 1)' },
            { key: 'child_1_nik', label: 'NIK (Anak 1)' },
            { key: 'child_1_bpjs', label: 'No BPJS (Anak 1)' },
        ]
    },
    {
        group: 'Data Keluarga (Anak 2)',
        options: [
            { key: 'child_2_name', label: 'Nama Anak 2' },
            { key: 'child_2_birth_place', label: 'Tempat Lahir (Anak 2)' },
            { key: 'child_2_birth_date', label: 'Tanggal Lahir (Anak 2)' },
            { key: 'child_2_nik', label: 'NIK (Anak 2)' },
            { key: 'child_2_bpjs', label: 'No BPJS (Anak 2)' },
        ]
    },
    {
        group: 'Data Keluarga (Anak 3)',
        options: [
            { key: 'child_3_name', label: 'Nama Anak 3' },
            { key: 'child_3_birth_place', label: 'Tempat Lahir (Anak 3)' },
            { key: 'child_3_birth_date', label: 'Tanggal Lahir (Anak 3)' },
            { key: 'child_3_nik', label: 'NIK (Anak 3)' },
            { key: 'child_3_bpjs', label: 'No BPJS (Anak 3)' },
        ]
    }
];

/**
 * BulkImport Page Component
 *
 * Handles the UI for uploading a CSV file, previewing its data, 
 * mapping CSV headers to database columns directly within the table headers, 
 * and dispatching the background import job.
 *
 * @returns {JSX.Element} The rendered bulk import page.
 */
export default function BulkImport() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    
    // Preview States
    const [filePath, setFilePath] = useState<string | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<string[][]>([]);
    
    // Mapping State: Stores { db_column_key: csv_header_index }
    const [mapping, setMapping] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    /**
     * Handles the file input change event.
     * Uploads the selected CSV file to the backend to retrieve headers and sample data for preview.
     * Attempts to automatically map column names if they closely match.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event containing the selected file.
     */
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            setIsUploading(true);
            try {
                const response = await axios.post('/import/workers/preview', formData);
                setFilePath(response.data.file_path);
                setCsvHeaders(response.data.headers);
                setPreviewData(response.data.preview_data);
                
                // Perform automatic smart mapping based on header strings
                const autoMap: Record<string, number> = {};
                DB_COLUMNS.forEach(group => {
                    group.options.forEach(col => {
                        const headerMatch = col.key.replace(/_/g, ' ');
                        const foundIndex = response.data.headers.findIndex((h: string) => 
                            h.toLowerCase().includes(headerMatch)
                        );
                        if (foundIndex !== -1 && !Object.values(autoMap).includes(foundIndex)) {
                            autoMap[col.key] = foundIndex;
                        }
                    });
                });
                setMapping(autoMap);

            } catch (error) {
                alert('Failed to read the file. Please ensure it is a valid CSV format.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    /**
     * Updates the mapping state when a user selects a database column for a specific CSV column.
     * Ensures strict 1-to-1 mapping by removing previous associations to prevent duplicates.
     *
     * @param {number} csvIndex - The array index of the CSV column being mapped.
     * @param {string} dbKey - The selected database column key, or an empty string to unmap.
     */
    const handleColumnMap = (csvIndex: number, dbKey: string) => {
        setMapping(prev => {
            const newMapping = { ...prev };
            
            // 1. Find and remove any DB key currently mapped to this specific CSV column
            const existingKeyForThisIndex = Object.keys(newMapping).find(k => newMapping[k] === csvIndex);
            if (existingKeyForThisIndex) {
                delete newMapping[existingKeyForThisIndex];
            }

            // 2. If a valid DB column is selected, assign it
            // (Note: In JS objects, assigning a new value to an existing key automatically overwrites the old value, 
            // ensuring a DB column is never mapped to two different CSV columns).
            if (dbKey) {
                newMapping[dbKey] = csvIndex;
            }
            
            return newMapping;
        });
    };

    /**
     * Submits the file path and finalized mapping to the backend to start the background import job.
     */
    const handleProcessImport = async () => {
        if (!filePath) return;
        
        setIsProcessing(true);
        try {
            await axios.post('/import/workers/process', {
                file_path: filePath,
                mapping: mapping
            });
            setMessage('The import process is running in the background. You may leave this page.');
        } catch (error) {
            alert('Failed to start the import process. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Helper to get the DB key mapped to a specific CSV index.
     * * @param {number} index - The CSV column index.
     * @returns {string} The mapped database key, or an empty string if unmapped.
     */
    const getMappedDbKeyForIndex = (index: number): string => {
        return Object.keys(mapping).find(key => mapping[key] === index) || '';
    };

    return (
        <AdminLayout title="Bulk Import Data" header="Bulk Import Karyawan">
            {message && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
                    <iconify-icon icon="solar:check-circle-bold" width="24"></iconify-icon>
                    <span className="font-medium text-sm">{message}</span>
                </div>
            )}
            <div className="mb-2 max-w-fit z-10">
                <Link href={route('workers.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

            {!csvHeaders.length ? (
                // --- STEP 1: UPLOAD BOX ---
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card flex flex-col items-center justify-center text-center py-20">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-glow">
                        <iconify-icon icon="solar:cloud-upload-linear" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Master Data</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md">Silakan upload file master data dari sistem lama. <br></br> Pastikan file berformat .csv untuk diproses.</p>
                    
                    <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                    />
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
                </div>
            ) : (
                // --- STEP 2: INLINE MAPPING & PREVIEW ---
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card flex flex-col h-[calc(100vh-12rem)]">
                    {/* Header Controls */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Mapping Kolom Database</h3>
                            <p className="text-xs text-slate-500 mt-1">Cocokkan kolom dari file CSV Anda dengan kolom di database sistem.</p>
                        </div>
                        <button 
                            onClick={handleProcessImport}
                            disabled={isProcessing}
                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
                        >
                            {isProcessing ? (
                                <><iconify-icon icon="svg-spinners:180-ring" width="18"></iconify-icon> Memproses...</>
                            ) : (
                                <><iconify-icon icon="solar:database-bold" width="18"></iconify-icon> Mulai Import</>
                            )}
                        </button>
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                {/* Row 1: Mapping Dropdowns */}
                                <tr>
                                    {csvHeaders.map((header, idx) => {
                                        const currentMappedKey = getMappedDbKeyForIndex(idx);
                                        const isMapped = currentMappedKey !== '';
                                        
                                        return (
                                            <th key={`map-${idx}`} className={`p-3 border-b border-r border-slate-100 dark:border-slate-700 min-w-[200px] ${isMapped ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                                <select
                                                    value={currentMappedKey}
                                                    onChange={(e) => handleColumnMap(idx, e.target.value)}
                                                    className={`w-full rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all border ${isMapped ? 'bg-white dark:bg-slate-800 border-primary/30 text-primary font-semibold' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                                                >
                                                    <option value="" className="text-slate-400 font-normal">-- Abaikan Kolom Ini --</option>
                                                    
                                                    {DB_COLUMNS.map((group, groupIdx) => (
                                                        <optgroup key={`group-${groupIdx}`} label={group.group} className="text-slate-900 dark:text-white font-bold italic">
                                                            {group.options.map(col => {
                                                                const isMappedElsewhere = mapping[col.key] !== undefined && mapping[col.key] !== idx;
                                                                return (
                                                                    <option 
                                                                        key={col.key} 
                                                                        value={col.key}
                                                                        className={isMappedElsewhere ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-700 dark:text-slate-300 font-medium'}
                                                                    >
                                                                        {col.label} {isMappedElsewhere ? '(Sudah Digunakan)' : ''}
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
                                        <th key={`header-${i}`} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {header || `Kolom Kosong ${i + 1}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                {previewData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} className={`px-4 py-2.5 border-r border-slate-100 dark:border-slate-700 last:border-r-0 max-w-[300px] truncate ${getMappedDbKeyForIndex(cellIndex) ? 'bg-primary/[0.02] dark:bg-primary/[0.05]' : ''}`} title={cell}>
                                                {cell || <span className="text-slate-300 italic">-</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Header Controls */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
                        <div>
                            <p className="text-xs text-slate-500 mt-1">Menampilkan 5 baris pertama sebagai pratinjau.</p>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}