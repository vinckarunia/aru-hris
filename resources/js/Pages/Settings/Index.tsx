import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Transition, Dialog } from '@headlessui/react';
import InputError from '@/Components/InputError';
import { PageProps } from '@/types';

export default function Index({ settings }: { settings: Record<string, string | null> }) {
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
