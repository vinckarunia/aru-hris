import React, { useState, useMemo, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Transition, Dialog } from '@headlessui/react';
import InputError from '@/Components/InputError';
import { PageProps } from '@/types';

/** Reusable upload card for company assets (logo / signature). */
function AssetUploadCard({ label, type, currentUrl, icon }: {
    label: string;
    type: 'logo' | 'signature';
    currentUrl: string | null;
    icon: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFile = (file: File | null | undefined) => {
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        setSuccess(false);
        const fd = new FormData();
        fd.append('asset_type', type);
        fd.append('asset_file', file);
        router.post(route('settings.upload-asset'), fd, {
            forceFormData: true,
            onSuccess: () => { setUploading(false); setSuccess(true); },
            onError: () => { setUploading(false); },
            preserveScroll: true,
        });
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
                <iconify-icon icon={icon} width="18" className="text-primary"></iconify-icon>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
            </div>

            {/* Preview */}
            <div
                className="w-full h-28 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
                {preview
                    ? <img src={preview} alt={label} className="max-h-24 max-w-full object-contain" />
                    : <div className="flex flex-col items-center gap-1 text-slate-400">
                        <iconify-icon icon="solar:upload-bold" width="28"></iconify-icon>
                        <span className="text-xs">Klik atau seret file PNG/JPG ke sini</span>
                    </div>
                }
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
            />

            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-1.5 px-3 bg-primary/10 text-primary hover:bg-primary hover:text-white dark:bg-primary/20 dark:text-primary-light dark:hover:bg-primary dark:hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
                {uploading
                    ? <><iconify-icon icon="svg-spinners:ring-resize" width="14"></iconify-icon> Mengunggah...</>
                    : success
                        ? <><iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon> Berhasil!</>
                        : <><iconify-icon icon="solar:upload-bold" width="14"></iconify-icon> {preview ? 'Ganti Gambar' : 'Pilih Gambar'}</>
                }
            </button>
        </div>
    );
}

export default function Index({ settings, assetUrls, validationDigits, validationEnums }: {
    settings: Record<string, string | null>;
    assetUrls: { logo: string | null; signature: string | null };
    validationDigits: Record<string, number>;
    validationEnums: Record<string, { value: string; label: string; enabled: boolean }[]>;
}) {
    const user = usePage<PageProps>().props.auth.user;

    /** Document type entry stored in the document_types JSON setting. */
    interface DocType { value: string; label: string; enabled: boolean; }

    const rawDocTypes: DocType[] = useMemo(() => {
        const raw = settings.document_types;
        if (!raw) return [
            { value: 'KTP', label: 'Kartu Tanda Penduduk (KTP)', enabled: true },
            { value: 'KK', label: 'Kartu Keluarga (KK)', enabled: true },
        ];
        try { return JSON.parse(raw); } catch { return []; }
    }, [settings.document_types]);

    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        settings: {
            app_name: settings.app_name ?? 'ARU HRIS',
            company_name: settings.company_name ?? '',
            company_email: settings.company_email ?? '',
            company_phone: settings.company_phone ?? '',
            company_address: settings.company_address ?? '',
            document_max_size_kb: settings.document_max_size_kb ?? '5120',
            document_allowed_mimes: settings.document_allowed_mimes ?? 'pdf,jpg,jpeg,png',
            document_types: settings.document_types ?? JSON.stringify(rawDocTypes),
            reminder_contract_expiry_enabled: settings.reminder_contract_expiry_enabled ?? '1',
            reminder_contract_expiry_days: settings.reminder_contract_expiry_days ?? '30',
            reminder_bpjs_incomplete_enabled: settings.reminder_bpjs_incomplete_enabled ?? '1',
            validation_digits: settings.validation_digits ?? JSON.stringify(validationDigits),
            validation_enums: settings.validation_enums ?? JSON.stringify(validationEnums),
        }
    });

    const handleSettingChange = (key: string, value: string) => {
        setData('settings', { ...data.settings, [key]: value } as typeof data.settings);
    };

    const [docTypes, setDocTypes] = useState<DocType[]>(rawDocTypes);
    const [newDocValue, setNewDocValue] = useState('');
    const [newDocLabel, setNewDocLabel] = useState('');

    /** All MIME checkboxes available in settings. */
    const MIME_OPTIONS = [
        { key: 'pdf', label: 'PDF' },
        { key: 'jpg,jpeg', label: 'JPG / JPEG' },
        { key: 'png', label: 'PNG' },
    ];

    const currentMimes = (data.settings as any).document_allowed_mimes ?? 'pdf,jpg,jpeg,png';
    const currentMaxKb = Number((data.settings as any).document_max_size_kb ?? 5120);

    // Validation digits state
    const [vDigits, setVDigits] = useState<Record<string, number>>(validationDigits);
    const syncVDigits = (updated: Record<string, number>) => {
        setVDigits(updated);
        handleSettingChange('validation_digits', JSON.stringify(updated));
    };

    // Validation enums state
    type EnumItem = { value: string; label: string; enabled: boolean };
    const [vEnums, setVEnums] = useState<Record<string, EnumItem[]>>(validationEnums);
    const syncVEnums = (updated: Record<string, EnumItem[]>) => {
        setVEnums(updated);
        handleSettingChange('validation_enums', JSON.stringify(updated));
    };
    const [newEnumValue, setNewEnumValue] = useState<Record<string, string>>({});
    const [newEnumLabel, setNewEnumLabel] = useState<Record<string, string>>({});

    const addEnumItem = (category: string) => {
        const val = (newEnumValue[category] || '').trim();
        const lbl = (newEnumLabel[category] || '').trim();
        if (!val || !lbl) return;
        const items = vEnums[category] || [];
        if (items.some(i => i.value === val)) return;
        syncVEnums({ ...vEnums, [category]: [...items, { value: val, label: lbl, enabled: true }] });
        setNewEnumValue({ ...newEnumValue, [category]: '' });
        setNewEnumLabel({ ...newEnumLabel, [category]: '' });
    };
    const removeEnumItem = (category: string, value: string) => {
        const items = vEnums[category].filter(i => i.value !== value);
        if (items.length === 0) return;
        syncVEnums({ ...vEnums, [category]: items });
    };

    // Drag-to-reorder state
    const [dragCategory, setDragCategory] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const handleDragStart = (category: string, index: number) => {
        setDragCategory(category);
        setDragIndex(index);
    };
    const handleDragOver = (e: React.DragEvent, category: string, index: number) => {
        e.preventDefault();
        if (dragCategory !== category || dragIndex === null || dragIndex === index) return;
        const items = [...(vEnums[category] || [])];
        const [moved] = items.splice(dragIndex, 1);
        items.splice(index, 0, moved);
        setVEnums({ ...vEnums, [category]: items });
        setDragIndex(index);
    };
    const handleDragEnd = (category: string) => {
        handleSettingChange('validation_enums', JSON.stringify(vEnums));
        setDragCategory(null);
        setDragIndex(null);
    };

    /** Toggle a MIME extension group on/off */
    const toggleMime = (keys: string) => {
        const parts = currentMimes.split(',').map((s: string) => s.trim()).filter(Boolean);
        const keyArr = keys.split(',');
        const allPresent = keyArr.every((k: string) => parts.includes(k));
        let next: string[];
        if (allPresent) {
            next = parts.filter((p: string) => !keyArr.includes(p));
        } else {
            next = Array.from(new Set([...parts, ...keyArr]));
        }
        handleSettingChange('document_allowed_mimes', next.join(','));
    };

    const isMimeActive = (keys: string) => {
        const parts = currentMimes.split(',').map((s: string) => s.trim());
        return keys.split(',').every((k: string) => parts.includes(k));
    };

    /** Sync docTypes → JSON string into form data */
    const syncDocTypes = (updated: DocType[]) => {
        setDocTypes(updated);
        handleSettingChange('document_types', JSON.stringify(updated));
    };

    const addDocType = () => {
        const val = newDocValue.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
        const lbl = newDocLabel.trim();
        if (!val || !lbl) return;
        if (docTypes.some(d => d.value === val)) return;
        syncDocTypes([...docTypes, { value: val, label: lbl, enabled: true }]);
        setNewDocValue('');
        setNewDocLabel('');
    };

    const toggleDocType = (value: string) => {
        syncDocTypes(docTypes.map(d => d.value === value ? { ...d, enabled: !d.enabled } : d));
    };

    const removeDocType = (value: string) => {
        syncDocTypes(docTypes.filter(d => d.value !== value));
    };

    // Reset Data Form
    const {
        data: resetDataForm,
        setData: setResetDataForm,
        post: postResetData,
        processing: processingResetData,
        errors: errorsResetData,
        reset: clearResetData
    } = useForm({
        password: '',
    });

    // Factory Reset System Form
    const {
        data: factoryResetForm,
        setData: setFactoryResetForm,
        post: postFactoryReset,
        processing: processingFactoryReset,
        errors: errorsFactoryReset,
        reset: clearFactoryReset
    } = useForm({
        password: '',
        confirmation: '',
    });

    const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
    const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('settings.update'));
    };


    const openResetDataModal = () => setIsResetDataModalOpen(true);
    const closeResetDataModal = () => {
        setIsResetDataModalOpen(false);
        clearResetData();
    };

    const openFactoryResetModal = () => setIsFactoryResetModalOpen(true);
    const closeFactoryResetModal = () => {
        setIsFactoryResetModalOpen(false);
        clearFactoryReset();
    };

    const submitResetData = (e: React.FormEvent) => {
        e.preventDefault();
        postResetData(route('settings.reset-data'), {
            onSuccess: () => closeResetDataModal(),
        });
    };

    const submitFactoryReset = (e: React.FormEvent) => {
        e.preventDefault();
        if (factoryResetForm.confirmation !== 'RESET') {
            return; // Prevent accidental submissions if manually bypassed
        }
        postFactoryReset(route('settings.reset-system'), {
            onSuccess: () => closeFactoryResetModal(),
        });
    };

    return (
        <AdminLayout title="Pengaturan Sistem" header="Pengaturan Sistem">
            <Head title="Pengaturan Sistem" />

            <div className="py-2 pb-16">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* General Settings Section */}
                    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                        <header className="mb-6">
                            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <iconify-icon icon="solar:settings-bold" width="24" className="text-primary"></iconify-icon>
                                Pengaturan Global
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Perbarui informasi dan pengaturan sistem secara global.
                            </p>
                        </header>

                        <form id="global-settings-form" onSubmit={submit} className="space-y-6 max-w-full">
                            <div>
                                <InputLabel htmlFor="app_name" value="Nama Aplikasi" />
                                <TextInput
                                    id="app_name"
                                    className="mt-1 block w-full"
                                    value={data.settings.app_name ?? ''}
                                    onChange={(e) => handleSettingChange('app_name', e.target.value)}
                                    required
                                />
                                <InputError className="mt-2" message={errors?.['settings.app_name']} />
                            </div>

                            <div>
                                <InputLabel htmlFor="company_name" value="Nama Perusahaan" />
                                <TextInput
                                    id="company_name"
                                    className="mt-1 block w-full"
                                    value={data.settings.company_name ?? ''}
                                    onChange={(e) => handleSettingChange('company_name', e.target.value)}
                                />
                                <InputError className="mt-2" message={errors?.['settings.company_name']} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="company_email" value="Email Perusahaan" />
                                    <TextInput
                                        id="company_email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        value={data.settings.company_email ?? ''}
                                        onChange={(e) => handleSettingChange('company_email', e.target.value)}
                                    />
                                    <InputError className="mt-2" message={errors?.['settings.company_email']} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="company_phone" value="Telp Perusahaan" />
                                    <TextInput
                                        id="company_phone"
                                        className="mt-1 block w-full no-spinner"
                                        value={data.settings.company_phone ?? ''}
                                        onChange={(e) => handleSettingChange('company_phone', e.target.value)}
                                    />
                                    <InputError className="mt-2" message={errors?.['settings.company_phone']} />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="company_address" value="Alamat Perusahaan" />
                                <TextInput
                                    id="company_address"
                                    className="mt-1 block w-full"
                                    value={data.settings.company_address ?? ''}
                                    onChange={(e) => handleSettingChange('company_address', e.target.value)}
                                />
                                <InputError className="mt-2" message={errors?.['settings.company_address']} />
                            </div>


                            <div className="flex items-center gap-4">
                                <PrimaryButton disabled={processing} className="bg-primary hover:bg-primary-dark dark:bg-primary dark:hover:bg-primary-dark dark:text-white">
                                    Simpan Pengaturan
                                </PrimaryButton>

                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Tersimpan.
                                    </p>
                                </Transition>
                            </div>
                        </form>
                    </div>

                    {/* Document Settings Section */}
                    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                        <header className="mb-6">
                            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <iconify-icon icon="solar:folder-open-bold" width="24" className="text-primary"></iconify-icon>
                                Pengaturan Dokumen
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Konfigurasi jenis dokumen, format file, dan batas ukuran. Perubahan berlaku segera setelah disimpan.
                            </p>
                        </header>

                        <div className="space-y-8">
                            {/* Max file size */}
                            <div>
                                <InputLabel htmlFor="doc_max_size" value="Ukuran Maksimum File" />
                                <div className="flex items-center gap-3 mt-1">
                                    <input
                                        id="doc_max_size"
                                        type="number"
                                        min={512}
                                        max={20480}
                                        step={512}
                                        value={currentMaxKb}
                                        onChange={e => handleSettingChange('document_max_size_kb', e.target.value)}
                                        className="w-36 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm"
                                    />
                                    <span className="text-sm font-medium text-slate-500">KB</span>
                                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                                        ≈ {(currentMaxKb / 1024).toFixed(1)} MB
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Minimal 512 KB, Maksimal 20480 KB (20 MB). 1 MB = 1024 KB.</p>
                            </div>

                            {/* Allowed MIME types */}
                            <div>
                                <InputLabel value="Format File yang Diizinkan" />
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {MIME_OPTIONS.map(opt => (
                                        <label key={opt.key} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-semibold select-none ${isMimeActive(opt.key)
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={isMimeActive(opt.key)}
                                                onChange={() => toggleMime(opt.key)}
                                            />
                                            <iconify-icon icon={isMimeActive(opt.key) ? 'solar:check-circle-bold' : 'solar:circle-linear'} width="16"></iconify-icon>
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Document types */}
                            <div>
                                <InputLabel value="Jenis Dokumen" />
                                <p className="text-xs text-slate-400 mb-3">Jenis yang tidak aktif tidak akan ditampilkan di tab Dokumen karyawan. Jenis baru yang ditambahkan otomatis lolos validasi upload.</p>

                                <div className="space-y-2 mb-4">
                                    {docTypes.map(dt => (
                                        <div key={dt.value} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => toggleDocType(dt.value)}
                                                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${dt.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                                                    }`}
                                                title={dt.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                                            >
                                                <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${dt.enabled ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${dt.enabled ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>{dt.label}</p>
                                                <p className="text-xs font-mono text-slate-400">{dt.value}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDocType(dt.value)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="Hapus jenis dokumen"
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add new doc type */}
                                <div className="flex gap-2 items-end p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kode (contoh: IJAZAH)</label>
                                        <input
                                            type="text"
                                            value={newDocValue}
                                            onChange={e => setNewDocValue(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                                            placeholder="IJAZAH"
                                            className="w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm font-mono"
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Tampilan</label>
                                        <input
                                            type="text"
                                            value={newDocLabel}
                                            onChange={e => setNewDocLabel(e.target.value)}
                                            placeholder="Ijazah Pendidikan"
                                            className="w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addDocType}
                                        disabled={!newDocValue.trim() || !newDocLabel.trim()}
                                        className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                                    >
                                        <iconify-icon icon="solar:add-circle-bold" width="16"></iconify-icon> Tambah
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <PrimaryButton type="submit" form="global-settings-form" disabled={processing} className="dark:bg-primary dark:hover:bg-primary-dark dark:text-white">
                                    Simpan Semua Pengaturan
                                </PrimaryButton>
                                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Tersimpan.</p>
                                </Transition>
                            </div>
                        </div>
                    </div>

                    {/* Reminder Settings Section */}
                    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                        <header className="mb-6">
                            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <iconify-icon icon="solar:bell-bing-bold" width="24" className="text-primary"></iconify-icon>
                                Pengaturan Reminder
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Atur notifikasi peringatan sistem. Reminder dievaluasi setiap hari secara otomatis.
                            </p>
                        </header>

                        <div className="space-y-8">
                            {/* Contract Expiry */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Reminder Kontrak Berakhir</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Peringatan saat kontrak karyawan akan segera habis.</p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={data.settings.reminder_contract_expiry_days}
                                            onChange={e => handleSettingChange('reminder_contract_expiry_days', e.target.value)}
                                            className="w-20 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm"
                                        />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">hari sebelumnya</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleSettingChange('reminder_contract_expiry_enabled', data.settings.reminder_contract_expiry_enabled === '1' ? '0' : '1')}
                                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${data.settings.reminder_contract_expiry_enabled === '1' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${data.settings.reminder_contract_expiry_enabled === '1' ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* BPJS Incomplete */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Reminder BPJS</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Peringatan bila karyawan dengan penempatan aktif belum memiliki nomor BPJS Kesehatan/Ketenagakerjaan.</p>
                                </div>
                                <div className="shrink-0 flex items-center pr-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSettingChange('reminder_bpjs_incomplete_enabled', data.settings.reminder_bpjs_incomplete_enabled === '1' ? '0' : '1')}
                                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${data.settings.reminder_bpjs_incomplete_enabled === '1' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${data.settings.reminder_bpjs_incomplete_enabled === '1' ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Email Integration Note */}
                            <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20 dark:border-primary/30 flex gap-3">
                                <iconify-icon icon="solar:info-circle-bold-duotone" width="24" className="text-primary shrink-0"></iconify-icon>
                                <div>
                                    <h4 className="text-sm font-bold text-primary-dark dark:text-primary-light">Integrasi Email (SMTP)</h4>
                                    <p className="text-xs text-primary dark:text-primary-light/80 mt-1">
                                        Saat ini reminder hanya dikirimkan ke Dashboard. Untuk mengaktifkan pengiriman notifikasi via email kepada Admin/PIC, silakan tim developer mengonfigurasi fitur <strong>EmailChannel</strong> dan kredensial SMTP di server.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <PrimaryButton onClick={submit} disabled={processing} className="dark:bg-primary dark:hover:bg-primary-dark dark:text-white">
                                    Simpan Pengaturan
                                </PrimaryButton>
                                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Tersimpan.</p>
                                </Transition>
                            </div>
                        </div>
                    </div>

                    {/* Validation Settings Section (Super Admin Only) */}
                    {user.role === 'SUPER_ADMIN' && (
                        <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                            <header className="mb-6">
                                <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <iconify-icon icon="solar:shield-check-bold" width="24" className="text-primary"></iconify-icon>
                                    Pengaturan Validasi
                                </h2>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Konfigurasi panjang digit dan opsi dropdown untuk formulir karyawan.
                                </p>
                            </header>

                            <div className="space-y-8">
                                {/* Digit Lengths */}
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <iconify-icon icon="solar:hashtag-bold" width="16" className="text-primary"></iconify-icon>
                                        Panjang Digit Identitas
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">Jumlah digit yang wajib diisi untuk setiap field nomor identitas.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { key: 'ktp', label: 'Nomor KTP (NIK)' },
                                            { key: 'kk', label: 'Nomor KK' },
                                            { key: 'npwp', label: 'Nomor NPWP' },
                                            { key: 'bpjs_kes', label: 'BPJS Kesehatan' },
                                            { key: 'bpjs_tk', label: 'BPJS Ketenagakerjaan' },
                                            { key: 'prefix_max', label: 'Prefix Project (maks. karakter)' },
                                        ].map(field => (
                                            <div key={field.key} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{field.label}</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={50}
                                                        value={vDigits[field.key] ?? 16}
                                                        onChange={e => syncVDigits({ ...vDigits, [field.key]: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                                                        className="w-20 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm font-mono text-center"
                                                    />
                                                    <span className="text-xs text-slate-400">digit</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Enum Options */}
                                {[
                                    { key: 'religion', label: 'Pilihan Agama', icon: 'solar:moon-bold' },
                                    { key: 'education', label: 'Pilihan Pendidikan', icon: 'solar:square-academic-cap-bold' },
                                ].map(cat => (
                                    <div key={cat.key}>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                            <iconify-icon icon={cat.icon} width="16" className="text-primary"></iconify-icon>
                                            {cat.label}
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-3">Seret item untuk mengubah urutan tampilan di dropdown.</p>
                                        <div className="space-y-2 mb-4">
                                            {(vEnums[cat.key] || []).map((item, idx) => (
                                                <div
                                                    key={item.value}
                                                    draggable
                                                    onDragStart={() => handleDragStart(cat.key, idx)}
                                                    onDragOver={(e) => handleDragOver(e, cat.key, idx)}
                                                    onDragEnd={() => handleDragEnd(cat.key)}
                                                    className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl cursor-grab active:cursor-grabbing transition-all ${dragCategory === cat.key && dragIndex === idx ? 'opacity-50 scale-95' : ''}`}
                                                >
                                                    <iconify-icon icon="solar:hamburger-menu-linear" width="18" className="text-slate-400 shrink-0"></iconify-icon>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate text-slate-800 dark:text-white">{item.label}</p>
                                                        <p className="text-xs font-mono text-slate-400">{item.value}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEnumItem(cat.key, item.value)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Hapus opsi"
                                                    >
                                                        <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Add new item */}
                                        <div className="flex gap-2 items-end p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                            <div className="flex-1">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nilai</label>
                                                <input
                                                    type="text"
                                                    value={newEnumValue[cat.key] || ''}
                                                    onChange={e => setNewEnumValue({ ...newEnumValue, [cat.key]: e.target.value })}
                                                    placeholder="Nilai"
                                                    className="w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm font-mono"
                                                />
                                            </div>
                                            <div className="flex-[2]">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Tampilan</label>
                                                <input
                                                    type="text"
                                                    value={newEnumLabel[cat.key] || ''}
                                                    onChange={e => setNewEnumLabel({ ...newEnumLabel, [cat.key]: e.target.value })}
                                                    placeholder="Label"
                                                    className="w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => addEnumItem(cat.key)}
                                                disabled={!(newEnumValue[cat.key] || '').trim() || !(newEnumLabel[cat.key] || '').trim()}
                                                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                                            >
                                                <iconify-icon icon="solar:add-circle-bold" width="16"></iconify-icon> Tambah
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex items-center gap-4 pt-2">
                                    <PrimaryButton type="submit" form="global-settings-form" disabled={processing} className="dark:bg-primary dark:hover:bg-primary-dark dark:text-white">
                                        Simpan Pengaturan Validasi
                                    </PrimaryButton>
                                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Tersimpan.</p>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Company Assets Section */}
                    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                        <header className="mb-6">
                            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <iconify-icon icon="solar:gallery-bold" width="24" className="text-primary"></iconify-icon>
                                Aset Perusahaan
                            </h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Unggah logo dan tanda tangan + cap perusahaan.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo */}
                            <AssetUploadCard
                                label="Logo Perusahaan"
                                type="logo"
                                currentUrl={assetUrls.logo}
                                icon="solar:buildings-bold"
                            />
                            {/* Signature */}
                            <AssetUploadCard
                                label="Tanda Tangan & Cap"
                                type="signature"
                                currentUrl={assetUrls.signature}
                                icon="solar:pen-bold"
                            />
                        </div>
                    </div>

                    {/* Danger Zone Section */}
                    {user.role === "SUPER_ADMIN" && (
                        <div className="bg-white dark:bg-slate-800 overflow-hidden shadow sm:rounded-2xl border border-red-200 dark:border-red-900/30 p-8">
                            <header className="mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                                <h2 className="text-lg font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <iconify-icon icon="solar:danger-triangle-bold-duotone" width="24"></iconify-icon>
                                    Danger Zone
                                </h2>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Tindakan di bawah ini bersifat destruktif dan tidak dapat diurungkan. Pastikan Anda tahu apa yang Anda lakukan.
                                </p>
                            </header>

                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                                    <div className="max-w-xl">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Reset Data Operasional</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Menghapus semua data Client, Branch, Project, Pekerja, Kontrak, dsb. Data User/PIC dan pengaturan sistem tetap dipertahankan.
                                        </p>
                                    </div>
                                    <DangerButton onClick={openResetDataModal} className="shrink-0">
                                        Reset Data Operasional
                                    </DangerButton>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <div className="max-w-xl">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Factory Reset System</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Menghapus <strong>seluruh database dan file yang diunggah</strong> dan hanya menyisakan satu akun Super Admin. Anda perlu mengetikkan "RESET" untuk mengeksekusi ini.
                                        </p>
                                    </div>
                                    <DangerButton onClick={openFactoryResetModal} className="shrink-0 bg-red-700 hover:bg-red-800 focus:bg-red-800 focus:ring-red-800">
                                        Factory Reset System
                                    </DangerButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Reset Data */}
            <Transition show={isResetDataModalOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={closeResetDataModal}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-slate-900 dark:text-white flex items-center gap-2"
                                    >
                                        <iconify-icon icon="solar:danger-circle-bold" width="24" className="text-red-500"></iconify-icon>
                                        Konfirmasi Reset Data
                                    </Dialog.Title>

                                    <form onSubmit={submitResetData} className="mt-4">
                                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                                            Apakah Anda yakin ingin menghapus semua data operasional? Tindakan ini <strong>tidak dapat diurungkan</strong>. Silakan masukkan password Anda untuk konfirmasi.
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="password_data" value="Password Super Admin" />
                                            <TextInput
                                                id="password_data"
                                                type="password"
                                                className="mt-1 block w-full"
                                                value={resetDataForm.password}
                                                onChange={(e) => setResetDataForm('password', e.target.value)}
                                                autoFocus
                                            />
                                            <InputError message={errorsResetData.password} className="mt-2" />
                                        </div>

                                        <div className="mt-6 flex justify-end gap-3">
                                            <SecondaryButton onClick={closeResetDataModal} disabled={processingResetData}>Batal</SecondaryButton>
                                            <DangerButton type="submit" disabled={processingResetData || !resetDataForm.password}>
                                                Ya, Hapus Data
                                            </DangerButton>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Modal Factory Reset */}
            <Transition show={isFactoryResetModalOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={closeFactoryResetModal}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-red-500/20">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-slate-900 dark:text-white flex items-center gap-2"
                                    >
                                        <iconify-icon icon="solar:skull-bold-duotone" width="28" className="text-red-600"></iconify-icon>
                                        Konfirmasi Factory Reset
                                    </Dialog.Title>

                                    <form onSubmit={submitFactoryReset} className="mt-4">
                                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 mb-6 space-y-3">
                                            <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg font-medium border border-red-100 dark:border-red-800/50">
                                                PERINGATAN KRITIS: Anda akan menghapus seluruh database, file unggahan, dan menimpan HANYA pengguna Super Admin terkait.
                                            </p>
                                            <p>
                                                Untuk melanjutkan, masukkan password Anda dan ketik <strong>RESET</strong> pada kolom di bawah.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <InputLabel htmlFor="password_system" value="Password Super Admin" />
                                                <TextInput
                                                    id="password_system"
                                                    type="password"
                                                    className="mt-1 block w-full"
                                                    value={factoryResetForm.password}
                                                    onChange={(e) => setFactoryResetForm('password', e.target.value)}
                                                    autoFocus
                                                />
                                                <InputError message={errorsFactoryReset.password} className="mt-2" />
                                            </div>

                                            <div>
                                                <InputLabel htmlFor="confirmation_text" value="Ketik 'RESET'" />
                                                <TextInput
                                                    id="confirmation_text"
                                                    type="text"
                                                    className="mt-1 block w-full focus:border-red-500 focus:ring-red-500 font-mono tracking-widest uppercase"
                                                    value={factoryResetForm.confirmation}
                                                    onChange={(e) => setFactoryResetForm('confirmation', e.target.value.toUpperCase())}
                                                    placeholder="RESET"
                                                    autoComplete="off"
                                                />
                                                <InputError message={errorsFactoryReset.confirmation} className="mt-2" />
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-end gap-3">
                                            <SecondaryButton onClick={closeFactoryResetModal} disabled={processingFactoryReset}>Batal</SecondaryButton>
                                            <DangerButton
                                                type="submit"
                                                disabled={processingFactoryReset || !factoryResetForm.password || factoryResetForm.confirmation !== 'RESET'}
                                                className="bg-red-700 hover:bg-red-800"
                                            >
                                                {processingFactoryReset ? 'Memproses Reset...' : 'Factory Reset System'}
                                            </DangerButton>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

        </AdminLayout>
    );
}
