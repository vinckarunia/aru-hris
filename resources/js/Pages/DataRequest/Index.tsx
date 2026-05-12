import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import AdminLayout from '@/Layouts/AdminLayout';
import WorkerLayout from '@/Layouts/WorkerLayout';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface Worker {
    id: string;
    name: string;
    nik_aru?: string;
}

interface Project {
    id: string;
    name: string;
}

interface DataRequest {
    id: string;
    worker_id: string;
    project_id: string;
    requested_by: number;
    requested_fields: string[];
    requested_data: Record<string, string | null>;
    notes: string | null;
    status: 'pending' | 'approved' | 'rejected';
    pic_status: 'pending' | 'approved' | 'rejected' | null;
    reviewed_by: number | null;
    review_notes: string | null;
    reviewed_at: string | null;
    pic_reviewed_by: number | null;
    pic_reviewed_at: string | null;
    created_at: string;
    worker: Worker;
    project: Project;
    requester: { id: string; name: string; role?: string };
    reviewer: { id: string; name: string } | null;
    pic_reviewer: { id: string; name: string } | null;
}

interface PaginatedData {
    data: DataRequest[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface DataRequestIndexProps extends PageProps {
    dataRequests: PaginatedData;
    filters?: { sort: string; direction: string; status?: string; type?: string; search?: string; project_id?: string; requester_id?: string; per_page?: number };
    filterOptions?: {
        projects?: Project[];
        requesters?: { id: number; name: string }[];
    };
}

export default function DataRequestIndex({ dataRequests, filters, filterOptions }: DataRequestIndexProps) {
    const { auth } = usePage<PageProps>().props;
    const isWorker = auth.user.role === 'WORKER';
    const isPic = auth.user.role === 'PIC';
    const Layout = isWorker ? WorkerLayout : AdminLayout;

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingRequest, setReviewingRequest] = useState<DataRequest | null>(null);

    const { data, setData, put, processing, errors, reset } = useForm<{
        status: 'approved' | 'rejected';
        review_notes: string;
    }>({
        status: 'approved',
        review_notes: '',
    });

    const handleSort = (field: string) => {
        let newDirection = 'asc';
        if (filters?.sort === field && filters?.direction === 'asc') {
            newDirection = 'desc';
        }
        router.get(route('data-requests.index'), { ...filters, sort: field, direction: newDirection }, { preserveState: true, preserveScroll: true });
    };

    const handleFilterChange = (field: string, value: string) => {
        router.get(route('data-requests.index'), { ...filters, [field]: value }, { preserveState: true, preserveScroll: true });
    };

    /** Navigate to a specific page */
    const goToPage = (url: string | null) => {
        if (url) router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const [searchQuery, setSearchQuery] = useState(filters?.search || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery !== (filters?.search || '')) {
                router.get(route('data-requests.index'), { ...filters, search: searchQuery }, { preserveState: true, preserveScroll: true });
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, filters]);

    const openReviewModal = (req: DataRequest) => {
        setReviewingRequest(req);
        setData({
            status: 'approved',
            review_notes: '',
        });
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewingRequest) return;

        put(route('data-requests.review', reviewingRequest.id), {
            onSuccess: () => {
                setIsReviewModalOpen(false);
                setReviewingRequest(null);
                reset();
            },
        });
    };

    const closeModal = () => {
        setIsReviewModalOpen(false);
        setReviewingRequest(null);
        reset();
    };

    // --- Bulk Selection ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<'approved' | 'rejected'>('approved');
    const [bulkNotes, setBulkNotes] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // --- Post-Approval Popup ---
    const [isPostApprovalOpen, setIsPostApprovalOpen] = useState(false);
    const [postApprovalData, setPostApprovalData] = useState<any>(null);  // single
    const [postApprovalList, setPostApprovalList] = useState<any[]>([]); // bulk
    /** Prevents the flash-driven useEffect from re-opening the popup after user dismissal */
    const postApprovalDismissed = useRef(false);

    // Detect flash props for post-approval popup
    const flash = (usePage().props as any).flash || {};
    useEffect(() => {
        if (postApprovalDismissed.current) return;
        if (flash.post_approval) {
            setPostApprovalData(flash.post_approval);
            setPostApprovalList([]);
            setIsPostApprovalOpen(true);
        } else if (flash.post_approval_list && flash.post_approval_list.length > 0) {
            setPostApprovalList(flash.post_approval_list);
            setPostApprovalData(null);
            setIsPostApprovalOpen(true);
        }
    }, [flash.post_approval, flash.post_approval_list]);

    // Determine which rows are reviewable (can be selected)
    const isReviewable = (req: DataRequest) => {
        if (isPic && req.pic_status === 'pending') return true;
        if (!isWorker && !isPic && req.pic_status === 'approved' && req.status === 'pending') return true;
        return false;
    };

    const reviewableIds = dataRequests.data.filter(isReviewable).map(r => r.id);
    const allSelected = reviewableIds.length > 0 && reviewableIds.every(id => selectedIds.includes(id));

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(reviewableIds);
        }
    };

    const openBulkConfirm = (action: 'approved' | 'rejected') => {
        setBulkAction(action);
        setBulkNotes('');
        setIsBulkConfirmOpen(true);
    };

    const submitBulkReview = () => {
        setBulkProcessing(true);
        router.post(route('data-requests.bulk-review'), {
            ids: selectedIds,
            status: bulkAction,
            review_notes: bulkNotes,
        }, {
            onSuccess: () => {
                setIsBulkConfirmOpen(false);
                setSelectedIds([]);
                setBulkProcessing(false);
            },
            onError: () => setBulkProcessing(false),
        });
    };

    // Format human readable field names
    const formatFields = (fields: string[] | undefined) => {
        if (!fields || fields.length === 0) return '-';
        return fields.map(f => fieldLabels[f] || (f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))).join(', ');
    };

    const fieldLabels: Record<string, string> = {
        name: 'Nama Lengkap',
        ktp_number: 'Nomor KTP (NIK)',
        kk_number: 'Nomor Kartu Keluarga',
        mother_name: 'Nama Ibu Kandung',
        birth_place: 'Tempat Lahir',
        birth_date: 'Tanggal Lahir',
        gender: 'Jenis Kelamin',
        religion: 'Agama',
        education: 'Pendidikan',
        phone: 'Nomor HP/WhatsApp',
        address_ktp: 'Alamat KTP',
        address_domicile: 'Alamat Domisili',
        tax_status: 'Status Pajak (PTKP)',
        npwp: 'NPWP',
        bpjs_kesehatan: 'BPJS Kesehatan',
        bpjs_ketenagakerjaan: 'BPJS Ketenagakerjaan',
        bank_name: 'Nama Bank',
        bank_account_number: 'Nomor Rekening',
    };

    /** Action labels for _action field display */
    const actionLabels: Record<string, string> = {
        add_family: 'Tambah Keluarga',
        update_family: 'Ubah Keluarga',
        delete_family: 'Hapus Keluarga',
        upload_document: 'Upload Dokumen',
        delete_document: 'Hapus Dokumen',
        create_assignment: 'Buat Penempatan Baru',
        update_assignment: 'Ubah Penempatan',
        delete_assignment: 'Hapus Penempatan',
        create_contract: 'Buat Kontrak Baru',
        update_contract: 'Ubah Kontrak',
        delete_contract: 'Hapus Kontrak',
        bulk_import_update_worker: 'Import Massal',
    };

    /** Labels for assignment/contract/compensation fields */
    const allFieldLabels: Record<string, string> = {
        ...fieldLabels,
        project_id: 'Project',
        branch_ids: 'Cabang',
        worker_id: 'Karyawan',
        assignment_id: 'Penempatan',
        contract_id: 'Kontrak',
        position: 'Jabatan',
        hire_date: 'Tanggal Bergabung',
        termination_date: 'Tanggal Berakhir',
        status: 'Status',
        employee_id: 'ID Karyawan Client',
        contract_type: 'Jenis Kontrak',
        pkwt_type: 'Status Ketenagakerjaan',
        pkwt_number: 'PKWT Ke-',
        start_date: 'Tanggal Mulai',
        end_date: 'Tanggal Berakhir',
        duration_months: 'Durasi (Bulan)',
        evaluation_notes: 'Catatan Evaluasi',
        base_salary: 'Gaji Pokok',
        salary_rate: 'Hitungan Gaji',
        meal_allowance: 'Uang Makan',
        transport_allowance: 'Uang Transport',
        allowance: 'Tunjangan',
        attendance_allowance: 'Uang Kehadiran',
        performance_bonus: 'Insentif Kinerja',
        allowance_rate: 'Hitungan Tunjangan',
        overtime_weekday_rate: 'Rate Lembur Weekday',
        overtime_holiday_rate: 'Rate Lembur Weekend',
        overtime_rate: 'Hitungan Lembur',
        type: 'Hubungan',
        relationship: 'Hubungan',
    };

    /** Enum labels for known enum values */
    const enumLabels: Record<string, Record<string, string>> = {
        contract_type: { 'Kontrak': 'Kontrak', 'Harian': 'Harian', 'Part-time': 'Part-time' },
        salary_rate: { hourly: 'Per Jam', daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' },
        allowance_rate: { hourly: 'Per Jam', daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' },
        overtime_rate: { hourly: 'Per Jam', daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' },
        gender: { male: 'Laki-laki', female: 'Perempuan' },
        status: { active: 'Aktif', 'contract expired': 'Contract Expired', resign: 'Resign', fired: 'Fraud', 'project closed': 'Project Closed', other: 'Lainnya' },
    };

    /** Keys to hide from the detail modal */
    const hiddenKeys = new Set(['_action', '_resolved_labels', '_contract', 'worker_id', 'family_id', 'document_id']);

    /** Render a value with label resolution and enum mapping */
    const renderFieldValue = (key: string, value: any, resolvedLabels?: Record<string, string>) => {
        if (value === null || value === undefined || value === '') return '-';
        // Use resolved label for FK IDs
        if (resolvedLabels && resolvedLabels[key]) return resolvedLabels[key];
        // Use enum label if available
        if (enumLabels[key] && enumLabels[key][String(value)]) return enumLabels[key][String(value)];
        // Format currency fields
        if (['base_salary', 'meal_allowance', 'transport_allowance', 'allowance', 'attendance_allowance', 'performance_bonus', 'overtime_weekday_rate', 'overtime_holiday_rate'].includes(key) && !isNaN(Number(value))) {
            return 'Rp ' + Number(value).toLocaleString('id-ID');
        }
        if (typeof value === 'object') {
            return <pre className="text-xs max-h-40 overflow-y-auto whitespace-pre-wrap mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
        }
        return String(value);
    };

    return (
        <Layout title="Data Request" header="Data Request">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manajemen Pengajuan Perubahan</h2>
                </div>
            </div>
            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-stretch gap-4">
                <div className="flex w-full md:w-auto gap-4 flex-col sm:flex-row flex-1">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <iconify-icon icon="solar:magnifer-linear" className="text-slate-400"></iconify-icon>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari nama / NIK ARU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {(!isWorker && filterOptions?.projects) && (
                            <select
                                value={filters?.project_id || ''}
                                onChange={e => handleFilterChange('project_id', e.target.value)}
                                className="py-2 pl-3 pr-8 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Semua Project</option>
                                {filterOptions.projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                        {(auth.user.role === 'SUPER_ADMIN' || auth.user.role === 'ADMIN_ARU') && filterOptions?.requesters && (
                            <select
                                value={filters?.requester_id || ''}
                                onChange={e => handleFilterChange('requester_id', e.target.value)}
                                className="py-2 pl-3 pr-8 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Semua Requester</option>
                                {filterOptions.requesters.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={filters?.status || ''}
                            onChange={e => handleFilterChange('status', e.target.value)}
                            className="py-2 pl-3 pr-8 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">Semua Status</option>
                            <option value="pending">Menunggu Review</option>
                            <option value="approved">Disetujui</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6">
                    <button
                        onClick={() => handleFilterChange('type', 'new_data')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${filters?.type === 'new_data' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Data Karyawan Baru
                    </button>
                    <button
                        onClick={() => handleFilterChange('type', 'data_change')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${(!filters?.type || filters.type === 'data_change') ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Perubahan Data
                    </button>
                    <button
                        onClick={() => handleFilterChange('type', 'status_change')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${filters?.type === 'status_change' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Perubahan Status
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                {!isWorker && reviewableIds.length > 0 && (
                                    <th className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('created_at')}>
                                    <div className="flex items-center gap-1">Tanggal {filters?.sort === 'created_at' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('worker_name')}>
                                    <div className="flex items-center gap-1">Karyawan {filters?.sort === 'worker_name' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4">NIK ARU</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Data yang Ingin Diubah</th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-1">Status {filters?.sort === 'status' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                            {dataRequests.data.length === 0 ? (
                                <tr>
                                    <td colSpan={!isWorker && reviewableIds.length > 0 ? 8 : 7} className="py-8 text-center text-slate-500">Belum ada history request edit.</td>
                                </tr>
                            ) : dataRequests.data.map((req) => (
                                <tr key={req.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.includes(req.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                    {!isWorker && reviewableIds.length > 0 && (
                                        <td className="px-4 py-4 w-10">
                                            {isReviewable(req) ? (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(req.id)}
                                                    onChange={() => toggleSelect(req.id)}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800"
                                                />
                                            ) : <span className="block w-4"></span>}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                        {new Date(req.created_at).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4">
                                        {(auth.user.role !== 'WORKER' && req.worker?.id) ? (
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                <Link href={route('workers.show', req.worker.id)} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                    {req.worker?.name || 'Tidak diketahui'}
                                                    <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {req.worker?.name || req.requested_data?.name || 'Tidak diketahui'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {req.worker?.nik_aru ? (
                                            <span className="font-mono text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                                                {req.worker.nik_aru}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {req.project?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.requested_data?._action ? (
                                            <div className="max-w-xs truncate">
                                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                                    {actionLabels[req.requested_data._action as string] || req.requested_data._action}:
                                                </span>
                                                {' '}
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {req.requested_data.name || req.requested_data.type || ''}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="max-w-xs truncate" title={formatFields(req.requested_data ? Object.keys(req.requested_data) : req.requested_fields)}>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">Update Profil:</span> {formatFields(req.requested_data ? Object.keys(req.requested_data) : req.requested_fields)}
                                            </div>
                                        )}
                                        {req.notes && (
                                            <div className="max-w-xs truncate text-xs text-slate-500 mt-1" title={req.notes}>
                                                <span className="italic">"{req.notes}"</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {req.status === 'pending' ? (
                                                req.pic_status === 'pending' ? (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-max bg-amber-100 text-amber-700">
                                                        <iconify-icon icon="solar:clock-circle-linear" width="14"></iconify-icon>
                                                        Menunggu Review PIC
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-max bg-sky-100 text-sky-700">
                                                        <iconify-icon icon="solar:clock-circle-linear" width="14"></iconify-icon>
                                                        Menunggu Review Admin
                                                    </span>
                                                )
                                            ) : req.status === 'approved' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-max bg-emerald-100 text-emerald-700">
                                                    <iconify-icon icon="solar:check-circle-linear" width="14"></iconify-icon>
                                                    Disetujui Admin
                                                </span>
                                            ) : req.pic_status === 'rejected' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-max bg-rose-100 text-rose-700">
                                                    <iconify-icon icon="solar:close-circle-linear" width="14"></iconify-icon>
                                                    Ditolak PIC
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-max bg-rose-100 text-rose-700">
                                                    <iconify-icon icon="solar:close-circle-linear" width="14"></iconify-icon>
                                                    Ditolak Admin
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {((req.pic_status === 'pending' && isPic) || (req.pic_status === 'approved' && req.status === 'pending' && !isWorker && !isPic)) ? (
                                            <button
                                                onClick={() => openReviewModal(req)}
                                                className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                            >
                                                Review
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openReviewModal(req)}
                                                className="text-slate-500 hover:text-slate-700 text-xs transition-colors underline"
                                            >
                                                Lihat Detail
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <p className="text-xs text-slate-500">
                            Menampilkan {dataRequests.from ?? 0}–{dataRequests.to ?? 0} dari {dataRequests.total} request
                        </p>
                        <select
                            value={filters?.per_page || 10}
                            onChange={(e) => router.get(route('data-requests.index'), { ...filters, per_page: Number(e.target.value), page: 1 }, { preserveState: true, preserveScroll: true })}
                            className="py-1 pl-2 pr-7 rounded-lg border-slate-300 text-xs shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            {[10, 25, 50, 100].map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    {dataRequests.last_page > 1 && (
                        <div className="flex items-center gap-1">
                            {dataRequests.links.map((link: any, i: number) => (
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
                    )}
                </div>
            </div>

            {/* Review Modal */}
            <Modal show={isReviewModalOpen} onClose={closeModal} maxWidth="2xl">
                {reviewingRequest && (
                    <div className="bg-white dark:bg-slate-900 flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {((reviewingRequest.pic_status === 'pending' && isPic) || (reviewingRequest.pic_status === 'approved' && reviewingRequest.status === 'pending' && !isWorker && !isPic)) ? 'Review Request Perubahan' : 'Detail Request'}
                            </h3>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 mb-1">Karyawan</p>
                                    <p className="font-medium dark:text-white">{reviewingRequest.worker?.name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">NIK ARU</p>
                                    <p className="font-medium dark:text-white font-mono text-sm">{reviewingRequest.worker?.nik_aru || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Project Terkait</p>
                                    <p className="font-medium dark:text-white">{reviewingRequest.project?.name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Tanggal Diajukan</p>
                                    <p className="font-medium dark:text-white">{new Date(reviewingRequest.created_at).toLocaleString('id-ID')}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Status</p>
                                    <p className="font-medium capitalize dark:text-white">{reviewingRequest.status}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-semibold mb-3 dark:text-slate-500 uppercase">Perubahan Data</h4>
                                {reviewingRequest.requested_data?._action && reviewingRequest.requested_data._action !== 'bulk_import_update_worker' ? (
                                    <div className="mb-4 bg-white dark:bg-slate-900 rounded-lg p-4 border border-indigo-100 dark:border-indigo-900/30">
                                        <div className="font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                            <iconify-icon icon="solar:document-text-bold" class="text-primary"></iconify-icon>
                                            {actionLabels[reviewingRequest.requested_data._action as string] || reviewingRequest.requested_data._action}
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 text-sm">
                                            {Object.entries(reviewingRequest.requested_data)
                                                .filter(([k]) => !hiddenKeys.has(k))
                                                .map(([k, v]) => (
                                                    <div key={k} className="grid grid-cols-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 items-start">
                                                        <span className="text-slate-500">{allFieldLabels[k] || k.replace(/_/g, ' ')}</span>
                                                        <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 break-words">
                                                            {renderFieldValue(k, v, (reviewingRequest.requested_data as any)?._resolved_labels)}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                        {/* Render bundled contract data if present */}
                                        {(reviewingRequest.requested_data as any)?._contract && (
                                            <div className="mt-4">
                                                <div className="font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                                    <iconify-icon icon="solar:document-text-bold" class="text-emerald-500"></iconify-icon>
                                                    Kontrak Pertama
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 text-sm">
                                                    {Object.entries((reviewingRequest.requested_data as any)._contract).map(([k, v]: [string, any]) => (
                                                        <div key={k} className="grid grid-cols-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 items-start">
                                                            <span className="text-slate-500">{allFieldLabels[k] || k.replace(/_/g, ' ')}</span>
                                                            <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 break-words">
                                                                {renderFieldValue(k, v)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                                            {Object.keys(fieldLabels).map((key) => {
                                                const oldVal = (reviewingRequest.worker as any)?.[key];
                                                const submittedVal = reviewingRequest.requested_data?.[key];
                                                // Handle both missing field in requested_data or intentionally null vs empty string
                                                const newVal = submittedVal !== undefined ? submittedVal : oldVal;

                                                const formattedOldVal = (oldVal === 'male' ? 'Laki-laki' : oldVal === 'female' ? 'Perempuan' : oldVal) || '-';
                                                const formattedNewVal = (newVal === 'male' ? 'Laki-laki' : newVal === 'female' ? 'Perempuan' : newVal) || '-';
                                                const isChanged = oldVal !== newVal;

                                                return (
                                                    <div key={key} className={`flex flex-col p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border ${isChanged ? 'border-amber-200 dark:border-amber-900/50 ring-1 ring-amber-100 dark:ring-amber-900/30' : 'border-slate-100 dark:border-slate-800'}`}>
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            {fieldLabels[key]}
                                                            {isChanged && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] lowercase leading-none">Berubah</span>}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            {isChanged ? (
                                                                <>
                                                                    <div className="flex-1 p-2 rounded-md bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                                                                        <div className="text-[10px] text-slate-400 mb-0.5 uppercase">Lama</div>
                                                                        <div className="text-sm text-rose-700 dark:text-rose-400 line-through opacity-80 break-words">
                                                                            {formattedOldVal}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-slate-300 dark:text-slate-600 shrink-0">
                                                                        <iconify-icon icon="solar:arrow-right-linear" width="20"></iconify-icon>
                                                                    </div>
                                                                    <div className="flex-1 p-2 rounded-md bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                                                        <div className="text-[10px] text-slate-400 mb-0.5 uppercase">Baru</div>
                                                                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 break-words">
                                                                            {formattedNewVal}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 p-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                                                                    <div className="text-[10px] text-slate-400 mb-0.5 uppercase">Saat Ini</div>
                                                                    <div className="text-sm text-slate-700 dark:text-slate-300 font-medium break-words">
                                                                        {formattedOldVal}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* For new_data: show assignment detail + contract if bundled */}
                                        {(() => {
                                            const d = reviewingRequest.requested_data as any;
                                            const assignmentFields = ['project_id', 'branch_ids', 'position', 'hire_date', 'employee_id'];
                                            const hasAssignment = assignmentFields.some(f => d?.[f] !== undefined && d[f] !== null && d[f] !== '');
                                            if (!hasAssignment && !d?._contract) return null;
                                            return (
                                                <>
                                                    {hasAssignment && (
                                                        <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg p-4 border border-indigo-100 dark:border-indigo-900/30">
                                                            <div className="font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                                                <iconify-icon icon="solar:buildings-bold" class="text-primary"></iconify-icon>
                                                                Detail Penempatan
                                                            </div>
                                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 text-sm">
                                                                {assignmentFields.filter(f => d?.[f] !== undefined).map(f => (
                                                                    <div key={f} className="grid grid-cols-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 items-start">
                                                                        <span className="text-slate-500">{allFieldLabels[f] || f.replace(/_/g, ' ')}</span>
                                                                        <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 break-words">
                                                                            {renderFieldValue(f, d[f], d?._resolved_labels)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {d?._contract && (
                                                        <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/30">
                                                            <div className="font-medium text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                                                <iconify-icon icon="solar:document-text-bold" class="text-emerald-500"></iconify-icon>
                                                                Kontrak Pertama
                                                            </div>
                                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 text-sm">
                                                                {Object.entries(d._contract).map(([k, v]: [string, any]) => (
                                                                    <div key={k} className="grid grid-cols-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 items-start">
                                                                        <span className="text-slate-500">{allFieldLabels[k] || k.replace(/_/g, ' ')}</span>
                                                                        <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200 break-words">
                                                                            {renderFieldValue(k, v)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                                {reviewingRequest.requested_data?._action === 'bulk_import_update_worker' && (
                                    <div className="mt-2 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-100 dark:border-slate-700 text-sm">
                                        <h5 className="font-semibold text-slate-700 dark:text-slate-400 mb-3 text-xs uppercase tracking-wider">Update Data Relasional (Kontrak, Komp., Keluarga)</h5>
                                        {Object.entries(reviewingRequest.requested_data).filter(([k]) => !Object.keys(fieldLabels).includes(k) && !hiddenKeys.has(k)).map(([k, v]) => {
                                            const renderValue = (val: any) => {
                                                if (val === null || val === undefined || val === '') return '-';
                                                if (typeof val === 'object') {
                                                    return <pre className="text-[10px] sm:text-xs max-h-40 overflow-y-auto whitespace-pre-wrap mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{JSON.stringify(val, null, 2)}</pre>;
                                                }
                                                return String(val);
                                            };

                                            return (
                                                <div key={k} className="grid grid-cols-1 md:grid-cols-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 items-start gap-1 md:gap-4">
                                                    <span className="text-slate-500 capitalize font-medium">{k.replace(/_/g, ' ')}</span>
                                                    <span className="col-span-1 md:col-span-2 text-slate-800 dark:text-slate-200 break-words">{renderValue(v)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <h4 className="text-sm font-semibold mb-1 dark:text-slate-500">
                                    Keterangan / Alasan dari {reviewingRequest.requester?.role === 'PIC' ? 'PIC' : 'Karyawan'}:
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-white whitespace-pre-line italic">
                                    {reviewingRequest.notes || 'Tidak ada keterangan tambahan.'}
                                </p>
                            </div>

                            {(reviewingRequest.pic_status !== 'pending' && reviewingRequest.requester?.role !== 'PIC') && (
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-sm mt-4">
                                    <h4 className="text-sm font-semibold mb-2 dark:text-slate-500 uppercase">Status & Catatan PIC</h4>
                                    <p className="text-slate-500 mb-1">Direview oleh: <span className="font-medium text-slate-800 dark:text-slate-200">{(reviewingRequest as any).pic_reviewer?.name || '-'}</span> pada {reviewingRequest.pic_reviewed_at ? new Date(reviewingRequest.pic_reviewed_at).toLocaleString('id-ID') : '-'}</p>
                                    <p className="text-slate-500 mb-1">Keputusan: <span className={`font-semibold capitalize ${reviewingRequest.pic_status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>{reviewingRequest.pic_status}</span></p>
                                </div>
                            )}

                            {reviewingRequest.status !== 'pending' && (
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-sm mt-4">
                                    <h4 className="text-sm font-semibold mb-2 dark:text-slate-500 uppercase">Status & Catatan Admin</h4>
                                    <p className="text-slate-500 mb-1">Direview oleh: <span className="font-medium text-slate-800 dark:text-slate-200">{reviewingRequest.reviewer?.name || '-'}</span> pada {reviewingRequest.reviewed_at ? new Date(reviewingRequest.reviewed_at).toLocaleString('id-ID') : '-'}</p>
                                    <p className="text-slate-500 mb-1">Keputusan: <span className={`font-semibold capitalize ${reviewingRequest.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>{reviewingRequest.status}</span></p>
                                    <h4 className="font-semibold text-slate-700 mt-2 dark:text-slate-500">Catatan Reviewer:</h4>
                                    <p className="text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-white p-2 rounded mt-1 italic">{reviewingRequest.review_notes || '-'}</p>
                                </div>
                            )}

                            {((reviewingRequest.pic_status === 'pending' && isPic) || (reviewingRequest.pic_status === 'approved' && reviewingRequest.status === 'pending' && !isWorker && !isPic)) && (
                                <form id="reviewRequestForm" onSubmit={handleReviewSubmit} className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 dark:text-slate-500">Keputusan PIC</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="approved" checked={data.status === 'approved'} onChange={() => setData('status', 'approved')} className="text-emerald-600 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-emerald-700">Setujui</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="rejected" checked={data.status === 'rejected'} onChange={() => setData('status', 'rejected')} className="text-rose-600 focus:ring-rose-500" />
                                                <span className="text-sm font-semibold text-rose-700">Tolak</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-500">Catatan Review</label>
                                        <textarea
                                            value={data.review_notes}
                                            onChange={e => setData('review_notes', e.target.value)}
                                            rows={3}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                                            placeholder="Tambahkan pesan untuk karyawan..."
                                        />
                                    </div>
                                    {data.status === 'approved' && (
                                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                                            <iconify-icon icon="solar:info-circle-linear" width="16" className="mt-0.5 shrink-0"></iconify-icon>
                                            <p>Catatan: Menyetujui request ini akan <strong>secara otomatis</strong> mengeksekusi dan memperbarui data Karyawan pada database profil menggunakan data forms yang baru di-inputkan di atas.</p>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
                            <SecondaryButton onClick={closeModal}>Tutup</SecondaryButton>
                            {((reviewingRequest.pic_status === 'pending' && isPic) || (reviewingRequest.pic_status === 'approved' && reviewingRequest.status === 'pending' && !isWorker && !isPic)) && (
                                <PrimaryButton type="submit" form="reviewRequestForm" disabled={processing}>Kirim</PrimaryButton>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk Confirmation Modal */}
            <Modal show={isBulkConfirmOpen} onClose={() => setIsBulkConfirmOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {bulkAction === 'approved' ? 'Setujui' : 'Tolak'} {selectedIds.length} Request?
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Anda akan {bulkAction === 'approved' ? 'menyetujui' : 'menolak'} <strong>{selectedIds.length}</strong> data request sekaligus. Tindakan ini tidak dapat dibatalkan.
                    </p>
                    {bulkAction === 'approved' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2 mb-4">
                            <iconify-icon icon="solar:info-circle-linear" width="16" className="mt-0.5 shrink-0"></iconify-icon>
                            <p>Menyetujui request akan <strong>secara otomatis</strong> mengeksekusi perubahan data untuk semua karyawan terkait.</p>
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-slate-400">Catatan Review (opsional)</label>
                        <textarea
                            value={bulkNotes}
                            onChange={e => setBulkNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                            placeholder="Tambahkan catatan..."
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsBulkConfirmOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton
                            onClick={submitBulkReview}
                            disabled={bulkProcessing}
                            className={bulkAction === 'approved' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/30' : '!bg-rose-600 hover:!bg-rose-700 shadow-rose-500/30'}
                        >
                            {bulkProcessing ? 'Memproses...' : (bulkAction === 'approved' ? `Setujui ${selectedIds.length} Request` : `Tolak ${selectedIds.length} Request`)}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Post-Approval Popup */}
            <Modal show={isPostApprovalOpen} onClose={() => { postApprovalDismissed.current = true; setIsPostApprovalOpen(false); }} maxWidth="lg">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <iconify-icon icon="solar:check-circle-bold" width="24"></iconify-icon>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Disetujui!</h3>
                            <p className="text-sm text-slate-500">Lanjutkan dengan langkah berikut:</p>
                        </div>
                    </div>

                    {/* Single approval */}
                    {postApprovalData && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-white">{postApprovalData.worker_name}</p>
                                        {postApprovalData.nik_aru && <p className="text-xs font-mono text-slate-500">{postApprovalData.nik_aru}</p>}
                                    </div>
                                    {postApprovalData.bpjs_missing && (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                                            <iconify-icon icon="solar:danger-triangle-bold" width="14"></iconify-icon> BPJS Belum Lengkap
                                        </span>
                                    )}
                                </div>
                            </div>

                            {postApprovalData.bpjs_missing && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                    <iconify-icon icon="solar:danger-triangle-bold" width="18" className="mt-0.5 shrink-0"></iconify-icon>
                                    <p><strong>Pengingat:</strong> Mohon segera daftarkan BPJS Kesehatan dan/atau BPJS Ketenagakerjaan untuk karyawan ini.</p>
                                </div>
                            )}

                            {postApprovalData.assignment_id && postApprovalData.request_type === 'new_data' && !postApprovalData.has_contract && (
                                <div className="flex justify-end gap-3 pt-2">
                                    <SecondaryButton onClick={() => { postApprovalDismissed.current = true; setIsPostApprovalOpen(false); }}>Nanti Saja</SecondaryButton>
                                    <Link
                                        href={route('contracts.create', { assignment_id: postApprovalData.assignment_id })}
                                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                                    >
                                        Isi Detail Kontrak
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bulk approval list */}
                    {postApprovalList.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{postApprovalList.length} karyawan berhasil diproses:</p>
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {postApprovalList.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{item.worker_name}</p>
                                            {item.nik_aru && <p className="text-xs font-mono text-slate-500">{item.nik_aru}</p>}
                                            {item.bpjs_missing && (
                                                <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 items-center gap-1">
                                                    <iconify-icon icon="solar:danger-triangle-bold" width="12"></iconify-icon> BPJS Belum Lengkap
                                                </span>
                                            )}
                                        </div>
                                        {item.assignment_id && item.request_type === 'new_data' && !item.has_contract && (
                                            <Link
                                                href={route('contracts.create', { assignment_id: item.assignment_id })}
                                                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                                            >
                                                Buat Kontrak <iconify-icon icon="solar:arrow-right-linear" width="14"></iconify-icon>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!postApprovalData && postApprovalList.length === 0 && (
                        <p className="text-sm text-slate-500">Data berhasil diperbarui.</p>
                    )}

                    <div className="flex justify-end pt-4">
                        <SecondaryButton onClick={() => { postApprovalDismissed.current = true; setIsPostApprovalOpen(false); }}>Tutup</SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Floating Action Bar for Bulk Selection */}
            {
                selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
                        <span className="text-sm font-medium">
                            <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs font-bold mr-1.5">{selectedIds.length}</span>
                            dipilih
                        </span>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <button
                            onClick={() => openBulkConfirm('approved')}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <iconify-icon icon="solar:check-circle-bold" width="16"></iconify-icon> Setujui Semua
                        </button>
                        <button
                            onClick={() => openBulkConfirm('rejected')}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <iconify-icon icon="solar:close-circle-bold" width="16"></iconify-icon> Tolak Semua
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                )
            }
        </Layout >
    );
}
