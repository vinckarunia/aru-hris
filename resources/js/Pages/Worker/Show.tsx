import React, { useState, FormEventHandler } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import WorkerLayout from '@/Layouts/WorkerLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';

/**
 * Interface for Family Member
 */
interface FamilyMember {
    id: string;
    worker_id: string;
    relationship_type: 'spouse' | 'child' | 'parent' | 'other relatives';
    name: string;
    birth_place: string | null;
    birth_date: string | null;
    nik: string | null;
    bpjs_number: string | null;
}

/**
 * Interface for a worker identity Document.
 *
 * The `type` field corresponds to a value from the backend `DocumentType` Enum.
 * To support a new document type, add a case to `app/Enums/DocumentType.php` and
 * a matching entry to the `DOCUMENT_TYPES` constant below — no other changes needed.
 */
interface Document {
    id: string;
    worker_id: string;
    /** Type key matching a DocumentType Enum case value (e.g. 'KK', 'KTP'). */
    type: string;
    file_path: string;
    verified_at: string | null;
    created_at: string | null;
}

/**
 * Defines all supported document types displayed on the Documents tab.
 *
 * ## Scalability
 * This constant mirrors the backend `DocumentType` PHP Enum.
 * To add a new document type:
 *   1. Add a new `case` to `app/Enums/DocumentType.php` (e.g. `case IJAZAH = 'IJAZAH'`).
 *   2. Add a matching entry here with the same `value`.
 * No other frontend changes are required.
 *
 * ## Cloud Storage Transition
 * Download URLs are served via the backend `documents.download` route, which resolves
 * the storage disk at runtime. Switching to cloud storage only requires changing
 * the `FILESYSTEM_DISK` environment variable — no frontend changes needed.
 */
/**
 * Maps document type values to Iconify icon names.
 * Falls back to a generic file icon for unknown types.
 */
const DOCUMENT_ICON_MAP: Record<string, string> = {
    KTP: 'solar:card-2-bold',
    KK: 'solar:users-group-two-rounded-bold',
};
const DEFAULT_DOC_ICON = 'solar:document-bold';

/**
 * Interface for Worker properties in the Show view.
 */
interface Worker {
    id: string; nik_aru: string | null; name: string; ktp_number: string; kk_number: string | null;
    birth_place: string | null; birth_date: string | null; gender: 'male' | 'female' | null; phone: string | null;
    education: string | null; religion: string | null; tax_status: string | null; address_ktp: string | null;
    address_domicile: string | null; mother_name: string | null; npwp: string | null; bpjs_kesehatan: string | null;
    bpjs_ketenagakerjaan: string | null; bank_name: string | null; bank_account_number: string | null;
    assignments?: any[];
    family_members?: FamilyMember[];
    documents?: Document[];
}

interface Props {
    worker: Worker;
    /** Active document types from system settings (filtered by enabled: true). */
    documentTypes: { value: string; label: string; enabled: boolean }[];
    /** Document upload constraints from system settings. */
    documentSettings: { max_size_kb: number; allowed_mimes: string };
}

/**
 * Reusable component to display a label and value pair nicely.
 */
const DetailItem = ({ label, value, isMono = false }: { label: string, value: string | null, isMono?: boolean }) => (
    <div className="border-b border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 dark:text-slate-200 ${isMono ? 'font-mono' : ''}`}>
            {value || '-'}
        </p>
    </div>
);

/**
 * Worker Show Page Component
 */
export default function Show({ worker, documentTypes, documentSettings }: Props) {
    const { auth } = usePage<PageProps>().props;
    const isWorker = auth.user.role === 'WORKER';
    const isPic = auth.user.role === 'PIC';
    const Layout = isWorker ? WorkerLayout : AdminLayout;

    /** Only active document types are shown in the Documents tab. */
    const activeDocTypes = documentTypes.filter(dt => dt.enabled);
    // Added 'family' to the activeTab state
    const [activeTab, setActiveTab] = useState<'profile' | 'assignments' | 'family' | 'documents'>('profile');

    // Modals State for Family Members
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingFamily, setEditingFamily] = useState<FamilyMember | null>(null);

    // Form setup for Family Members
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        worker_id: worker.id,
        relationship_type: 'spouse' as 'spouse' | 'child' | 'parent' | 'other relatives',
        name: '',
        birth_place: '',
        birth_date: '',
        nik: '',
        bpjs_number: '',
    });

    // --- Document State ---
    const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false);
    const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
    const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
    const [uploadingDocType, setUploadingDocType] = useState<string>('');

    /** Form for document upload (uses multipart, so we use a raw form ref) */
    const {
        data: docData,
        setData: setDocData,
        post: postDoc,
        delete: deleteDoc,
        processing: docProcessing,
        errors: docErrors,
        reset: resetDoc,
    } = useForm<{ type: string; file: File | null }>({ type: '', file: null });

    /** Helper to format date nicely */
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    /** Dictionary for Relationship Type translation */
    const relationshipLabel = {
        'spouse': 'Suami / Istri',
        'child': 'Anak',
        'parent': 'Orang Tua',
        'other relatives': 'Kerabat Lainnya'
    };

    // --- Modal Handlers ---
    const openCreateModal = () => {
        setEditingFamily(null);
        reset();
        clearErrors();
        setData({
            worker_id: worker.id,
            relationship_type: 'spouse',
            name: '',
            birth_place: '',
            birth_date: '',
            nik: '',
            bpjs_number: '',
        });
        setIsFamilyModalOpen(true);
    };

    const openEditModal = (member: FamilyMember) => {
        setEditingFamily(member);
        setData({
            worker_id: worker.id,
            relationship_type: member.relationship_type,
            name: member.name,
            birth_place: member.birth_place || '',
            birth_date: member.birth_date || '',
            nik: member.nik || '',
            bpjs_number: member.bpjs_number || '',
        });
        clearErrors();
        setIsFamilyModalOpen(true);
    };

    const openDeleteModal = (member: FamilyMember) => {
        setEditingFamily(member);
        setIsDeleteModalOpen(true);
    };

    const closeModals = () => {
        setIsFamilyModalOpen(false);
        setIsDeleteModalOpen(false);
        setTimeout(() => {
            reset();
            setEditingFamily(null);
        }, 300);
    };

    // --- Submit Handlers ---
    const submitFamily: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingFamily) {
            put(route('family-members.update', editingFamily.id), {
                onSuccess: () => closeModals(),
            });
        } else {
            post(route('family-members.store'), {
                onSuccess: () => closeModals(),
            });
        }
    };

    const deleteFamily: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingFamily) return;
        destroy(route('family-members.destroy', editingFamily.id), {
            onSuccess: () => closeModals(),
        });
    };

    /**
     * Extracts initials from a given full name.
     * Takes the first letter of the first and second names, or the first two letters of a single name.
     *
     * @param {string} name - The full name of the user.
     * @returns {string} The user's initials in uppercase.
     */
    const getInitials = (name: string): string => {
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <Layout title={`Profil Karyawan - ${worker.name}`} header="Detail Karyawan">
            {/* Header Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="flex items-center gap-5 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/30">
                        {getInitials(worker.name)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{worker.name}</h2>
                            {worker.gender === 'male' ? <iconify-icon icon="ph:gender-male-bold" style={{ color: '#3b82f6' }} width="20"></iconify-icon> : worker.gender === 'female' ? <iconify-icon icon="ph:gender-female-bold" style={{ color: '#ec4899' }} width="20"></iconify-icon> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center"><iconify-icon icon="solar:id-color-bold"></iconify-icon> NIK ARU: {worker.nik_aru || 'Belum Ada'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:phone-bold"></iconify-icon> {worker.phone || '-'}</span>
                        </div>
                    </div>
                </div>
                <div className="z-10 flex gap-3">
                    {/* DISPLAY EDIT REQUEST BUTTON ONLY FOR WORKERS */}
                    {isWorker && (
                        <Link href={route('edit-requests.create')} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white shadow-sm shadow-primary/30 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                            <iconify-icon icon="solar:pen-new-square-bold" width="18"></iconify-icon> Ajukan Perubahan Data
                        </Link>
                    )}

                    {/* BUKAN WORKER TAMPILKAN TOMBOL EDIT BIASA */}
                    {!isWorker && (
                        <Link href={route('workers.edit', worker.id)} className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                            <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Edit Profil
                        </Link>
                    )}

                    {/* Untuk WORKER tidak perlu tombol kembali karena ini satu-satunya halaman mereka */}
                    {!isWorker && (
                        <Link href={route('workers.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                            <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                        </Link>
                    )}
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden mb-10">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-hide">
                    <button onClick={() => setActiveTab('profile')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:user-id-bold" width="18"></iconify-icon> Profil Lengkap
                    </button>
                    <button onClick={() => setActiveTab('family')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'family' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:users-group-rounded-bold" width="18"></iconify-icon> Data Keluarga
                    </button>
                    <button onClick={() => setActiveTab('documents')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:folder-open-bold" width="18"></iconify-icon> Dokumen
                    </button>
                    <button onClick={() => setActiveTab('assignments')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <iconify-icon icon="solar:suitcase-bold" width="18"></iconify-icon> Penempatan & Kontrak
                    </button>
                </div>

                {/* Tab: Profile */}
                {activeTab === 'profile' && (
                    <div className="p-6 md:p-8 grid grid-cols-1 gap-8">
                        {/* Profile Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-primary">
                                <iconify-icon icon="solar:card-2-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Identitas Pribadi</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <DetailItem label="Nomor KTP (NIK)" value={worker.ktp_number} isMono />
                                <DetailItem label="Nomor Kartu Keluarga" value={worker.kk_number} isMono />
                                <DetailItem label="Tempat, Tanggal Lahir" value={`${worker.birth_place || '-'}, ${formatDate(worker.birth_date)}`} />
                                <DetailItem label="Agama" value={worker.religion} />
                                <DetailItem label="Pendidikan Terakhir" value={worker.education} />
                                <DetailItem label="Nama Ibu Kandung" value={worker.mother_name} />
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                <iconify-icon icon="solar:map-point-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Kontak & Lokasi</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 h-[calc(100%-2.5rem)]">
                                <DetailItem label="Alamat KTP" value={worker.address_ktp} />
                                <DetailItem label="Alamat Domisili" value={worker.address_domicile} />
                            </div>
                        </div>

                        {/* Administration Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-amber-500">
                                <iconify-icon icon="solar:wallet-bold" width="24"></iconify-icon>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Administrasi & Bank</h3>
                            </div>
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <DetailItem label="Status Pajak (PTKP)" value={worker.tax_status} />
                                <DetailItem label="NPWP" value={worker.npwp} isMono />
                                <DetailItem label="BPJS Kesehatan" value={worker.bpjs_kesehatan} isMono />
                                <DetailItem label="BPJS Ketenagakerjaan" value={worker.bpjs_ketenagakerjaan} isMono />
                                <DetailItem label="Informasi Rekening Bank" value={worker.bank_name ? `${worker.bank_name} - ${worker.bank_account_number}` : null} isMono />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Family */}
                {activeTab === 'family' && (
                    <div className="p-6">
                        <div className="flex justify-end mb-4">
                            <button onClick={openCreateModal} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm shadow-primary/30 flex items-center gap-2">
                                <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Data Keluarga
                            </button>
                        </div>

                        {worker.family_members && worker.family_members.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {worker.family_members.map((member) => (
                                    <div key={member.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-lg">{member.name}</h4>
                                                <span className="px-2.5 py-1 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg text-xs font-bold">
                                                    {relationshipLabel[member.relationship_type]}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 mt-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <iconify-icon icon="solar:calendar-bold" className="text-slate-400"></iconify-icon>
                                                    {member.birth_place || '-'}, {formatDate(member.birth_date)}
                                                </p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <iconify-icon icon="solar:card-2-bold" className="text-slate-400"></iconify-icon>
                                                    NIK: <span className="font-mono">{member.nik || '-'}</span>
                                                </p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <iconify-icon icon="solar:health-bold" className="text-slate-400"></iconify-icon>
                                                    BPJS: <span className="font-mono">{member.bpjs_number || '-'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <button onClick={() => openEditModal(member)} className="flex-1 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:text-primary hover:border-primary transition-colors">
                                                Edit
                                            </button>
                                            <button onClick={() => openDeleteModal(member)} className="flex-1 py-2 text-sm font-semibold text-red-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-800 transition-colors">
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon="solar:users-group-rounded-bold" message="Belum ada data keluarga yang ditambahkan." subMessage="Klik tombol di atas untuk menambahkan." />
                        )}
                    </div>
                )}

                {/* Tab: Documents */}
                {activeTab === 'documents' && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {activeDocTypes.map((docType) => {
                                const existing = worker.documents?.find(d => d.type === docType.value);
                                const icon = DOCUMENT_ICON_MAP[docType.value] ?? DEFAULT_DOC_ICON;
                                return (
                                    <div key={docType.value} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/30">
                                        {/* Header */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <iconify-icon icon={icon} width="22"></iconify-icon>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{docType.label}</h4>
                                                {existing?.verified_at ? (
                                                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                        <iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon> Terverifikasi
                                                    </span>
                                                ) : existing ? (
                                                    <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                                                        <iconify-icon icon="solar:clock-circle-bold" width="14"></iconify-icon> Menunggu Verifikasi
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Belum ada dokumen</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* File Info */}
                                        {existing ? (
                                            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                                                <iconify-icon icon="solar:file-bold" width="18" className="text-primary shrink-0"></iconify-icon>
                                                <span className="truncate text-slate-600 dark:text-slate-300 flex-1 font-mono text-xs">
                                                    {existing.file_path.split('/').pop()}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-400">
                                                <iconify-icon icon="solar:file-broken" width="18"></iconify-icon>
                                                <span className="text-xs">Belum ada file diunggah</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {existing && (
                                                <a
                                                    href={route('documents.download', existing.id)}
                                                    className="flex-1 py-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <iconify-icon icon="solar:download-bold" width="16"></iconify-icon> Unduh
                                                </a>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setUploadingDocType(docType.value);
                                                    setDocData('type', docType.value);
                                                    setDocData('file', null);
                                                    setIsDocUploadModalOpen(true);
                                                }}
                                                className="flex-1 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <iconify-icon icon="solar:upload-bold" width="16"></iconify-icon>
                                                {existing ? 'Ganti' : 'Upload'}
                                            </button>
                                            {existing && (
                                                <button
                                                    onClick={() => {
                                                        setDeletingDocument(existing);
                                                        setIsDocDeleteModalOpen(true);
                                                    }}
                                                    className="flex py-2 px-3 text-sm items-center font-semibold text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                                                </button>
                                            )}
                                            {/* Verify / Unverify — only for Admin & PIC (non-workers) */}
                                            {!isWorker && existing && (
                                                <button
                                                    onClick={() => router.put(route('documents.verify', existing.id))}
                                                    title={existing.verified_at ? 'Batalkan Verifikasi' : 'Verifikasi Dokumen'}
                                                    className={`flex py-2 px-3 text-sm items-center font-semibold rounded-xl border transition-colors ${existing.verified_at
                                                        ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400'
                                                        : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                                                        }`}
                                                >
                                                    <iconify-icon
                                                        icon={existing.verified_at ? 'solar:close-circle-bold' : 'solar:check-circle-bold'}
                                                        width="16"
                                                    ></iconify-icon>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab: Assignments */}
                {activeTab === 'assignments' && (
                    <div className="p-6">
                        {!isWorker && (
                            <div className="flex justify-end mb-4">
                                <Link href={route('assignments.create', { worker_id: worker.id })} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm shadow-primary/30 flex items-center gap-2">
                                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Penempatan Baru
                                </Link>
                            </div>
                        )}

                        {worker.assignments && worker.assignments.length > 0 ? (
                            <div className="space-y-4">
                                {worker.assignments.map((assign: any) => {
                                    return (
                                        <div key={assign.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{assign.position || 'Tidak ada jabatan'}</h4>
                                                    <StatusBadge status={assign.status} />
                                                </div>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                                                    <iconify-icon icon="solar:buildings-bold" className="mr-1"></iconify-icon>
                                                    {assign.project?.name} - {assign.branch?.name}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                                    <iconify-icon icon="solar:calendar-bold-duotone"></iconify-icon>
                                                    {assign.hire_date} s/d {assign.termination_date || 'Sekarang'}
                                                </p>
                                            </div>
                                            {!isWorker && (
                                                <Link href={route('assignments.show', assign.id)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary transition-colors text-center whitespace-nowrap">
                                                    Lihat Detail & Kontrak
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState icon="solar:suitcase-bold" message="Karyawan ini belum ditempatkan di project mana pun." subMessage="Klik tombol di atas untuk menambahkan penempatan baru." />
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Upload Document */}
            <Modal show={isDocUploadModalOpen} onClose={() => { setIsDocUploadModalOpen(false); resetDoc(); }} maxWidth="md">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        postDoc(route('documents.store', worker.id), {
                            forceFormData: true,
                            onSuccess: () => { setIsDocUploadModalOpen(false); resetDoc(); },
                        });
                    }}
                    className="p-6 dark:bg-slate-800"
                >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        Upload Dokumen
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        {documentTypes.find(t => t.value === uploadingDocType)?.label}
                    </p>

                    <input type="hidden" value={docData.type} readOnly />

                    <div className="mb-5">
                        <InputLabel htmlFor="doc_file" value="Pilih File (PDF, JPG, PNG — maks. 5 MB)" />
                        <input
                            id="doc_file"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setDocData('file', e.target.files?.[0] ?? null)}
                            className="mt-2 block w-full text-sm text-slate-600 dark:text-slate-300
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-xl file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20 cursor-pointer"
                        />
                        <InputError message={docErrors.file as string} className="mt-2" />
                        <InputError message={docErrors.type as string} className="mt-1" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => { setIsDocUploadModalOpen(false); resetDoc(); }}>Batal</SecondaryButton>
                        <PrimaryButton disabled={docProcessing || !docData.file} className="bg-primary hover:bg-primary-dark text-white dark:bg-primary dark:hover:bg-primary-dark dark:text-white">
                            {docProcessing ? 'Mengunggah...' : 'Upload Dokumen'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: Delete Document Confirmation */}
            <Modal show={isDocDeleteModalOpen} onClose={() => { setIsDocDeleteModalOpen(false); setDeletingDocument(null); }} maxWidth="sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!deletingDocument) return;
                        deleteDoc(route('documents.destroy', deletingDocument.id), {
                            onSuccess: () => { setIsDocDeleteModalOpen(false); setDeletingDocument(null); },
                        });
                    }}
                    className="p-6 dark:bg-slate-800 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <iconify-icon icon="solar:trash-bin-trash-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        Hapus Dokumen?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        File <strong>{documentTypes.find(t => t.value === deletingDocument?.type)?.label}</strong> akan dihapus secara permanen.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => { setIsDocDeleteModalOpen(false); setDeletingDocument(null); }}>Batal</SecondaryButton>
                        <DangerButton disabled={docProcessing}>Hapus</DangerButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Create / Edit Family */}
            <Modal show={isFamilyModalOpen} onClose={closeModals} maxWidth="2xl">
                <form onSubmit={submitFamily} className="p-6 dark:bg-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {editingFamily ? 'Edit Data Keluarga' : 'Tambah Data Keluarga'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="name" value="Nama Lengkap" />
                            <TextInput id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1 block w-full" required placeholder="Masukkan Nama Lengkap" />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel htmlFor="relationship_type" value="Hubungan Keluarga" />
                            <select
                                id="relationship_type"
                                value={data.relationship_type}
                                onChange={(e) => setData('relationship_type', e.target.value as any)}
                                className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                            >
                                <option value="spouse">Suami / Istri</option>
                                <option value="child">Anak</option>
                                <option value="parent">Orang Tua</option>
                                <option value="other relatives">Kerabat Lainnya</option>
                            </select>
                            <InputError message={errors.relationship_type} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="birth_place" value="Tempat Lahir" />
                            <TextInput id="birth_place" value={data.birth_place} onChange={(e) => setData('birth_place', e.target.value)} className="mt-1 block w-full" placeholder="Contoh: Jakarta" />
                            <InputError message={errors.birth_place} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="birth_date" value="Tanggal Lahir" />
                            <TextInput id="birth_date" type="date" value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} className="mt-1 block w-full" />
                            <InputError message={errors.birth_date} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="nik" value="Nomor Induk Kependudukan (NIK)" />
                            <TextInput id="nik" type="text" value={data.nik} maxLength={16} onChange={(e) => setData('nik', e.target.value.replace(/\D/g, ''))} className="mt-1 block w-full font-mono" placeholder="16 Digit Angka" />
                            <InputError message={errors.nik} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="bpjs_number" value="Nomor BPJS" />
                            <TextInput id="bpjs_number" type="text" value={data.bpjs_number} maxLength={13} onChange={(e) => setData('bpjs_number', e.target.value.replace(/\D/g, ''))} className="mt-1 block w-full font-mono" placeholder="13 digit" />
                            <InputError message={errors.bpjs_number} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModals}>Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-primary hover:bg-primary-dark text-white dark:bg-primary/80 dark:hover:bg-primary/90">
                            {processing ? 'Menyimpan...' : (editingFamily ? 'Simpan Perubahan' : 'Tambah Data')}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Delete Confirmation */}
            <Modal show={isDeleteModalOpen} onClose={closeModals} maxWidth="sm">
                <form onSubmit={deleteFamily} className="p-6 dark:bg-slate-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <iconify-icon icon="solar:trash-bin-trash-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        Hapus {editingFamily?.name}?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Tindakan ini tidak dapat dibatalkan. Data keluarga akan dihapus secara permanen dari sistem.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={closeModals}>Batal</SecondaryButton>
                        <DangerButton disabled={processing}>Hapus</DangerButton>
                    </div>
                </form>
            </Modal>

        </Layout>
    );
}