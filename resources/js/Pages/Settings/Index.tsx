import React, { useState } from 'react';
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

    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        settings: {
            app_name: settings.app_name !== undefined ? settings.app_name : 'ARU HRIS',
            company_name: settings.company_name !== undefined ? settings.company_name : '',
            company_email: settings.company_email !== undefined ? settings.company_email : '',
            company_phone: settings.company_phone !== undefined ? settings.company_phone : '',
            company_address: settings.company_address !== undefined ? settings.company_address : '',
        }
    });

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

    const handleSettingChange = (key: string, value: string) => {
        setData('settings', {
            ...data.settings,
            [key]: value
        });
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

                        <form onSubmit={submit} className="space-y-6 max-w-full">
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
                                <PrimaryButton disabled={processing} className="bg-primary hover:bg-primary-dark">
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
