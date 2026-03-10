import React, { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

export default function UserManagementIndex({ users, filters }: PageProps<{ users: User[], filters: { role: string, sort: string, direction: string } }>) {
    const { auth } = usePage<PageProps>().props;
    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN';

    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'ADMIN_ARU',
    });

    /** Opens modal for adding a new project. */
    const openCreateModal = () => {
        setModalMode('add');
        setSelectedUser(null);
        reset();
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** * Opens modal for editing an existing project.
     * @param {Project} project - The project to edit.
     */
    const openEditModal = (user: User) => {
        setModalMode('edit');
        setSelectedUser(user);
        setData({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
            password_confirmation: '',
        });
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** Opens confirmation modal for deletion. */
    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    /** Closes the form modal and resets state. */
    const closeModal = () => {
        setIsCreateModalOpen(false);
        reset();
        clearErrors();
    };

    /** Handles form submission for both create and update. */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') post(route('users.store'), { onSuccess: () => closeModal() });
        else put(route('users.update', selectedUser?.id), { onSuccess: () => closeModal() });
    };

    /** Executes project deletion. */
    const confirmDelete = () => {
        if (selectedUser) destroy(route('users.destroy', selectedUser.id), { onSuccess: () => setIsDeleteModalOpen(false) });
    };

    const handleSort = (field: string) => {
        let newDirection = 'asc';
        if (filters.sort === field && filters.direction === 'asc') {
            newDirection = 'desc';
        }
        router.get(route('users.index'), { ...filters, sort: field, direction: newDirection }, { preserveState: true, preserveScroll: true });
    };

    const handleRoleTab = (role: string) => {
        router.get(route('users.index'), { ...filters, role }, { preserveState: true, preserveScroll: true });
    };

    const translateRole = (role: string | null | undefined) => {
        const rates: Record<string, string> = {
            'SUPER_ADMIN': 'SUPER ADMIN',
            'ADMIN_ARU': 'ARU',
            'PIC': 'PIC',
            'WORKER': 'KARYAWAN'
        };
        return role && rates[role] ? rates[role] : role;
    };

    return (
        <AdminLayout title="Kelola User" header="User">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen User Sistem</h1>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                    Tambah User
                </button>
            </div>

            <div className="flex mb-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                {['SUPER_ADMIN', 'ADMIN_ARU', 'PIC', 'WORKER'].map((role) => (
                    <button
                        key={role}
                        onClick={() => handleRoleTab(role)}
                        className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${filters.role === role ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'}`}
                    >
                        {translateRole(role)}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">Nama {filters?.sort === 'name' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-1">Email {filters?.sort === 'email' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none" onClick={() => handleSort('role')}>
                                    <div className="flex items-center gap-1">Role {filters?.sort === 'role' ? (filters.direction === 'asc' ? <iconify-icon icon="solar:sort-from-bottom-to-top-bold" width="16"></iconify-icon> : <iconify-icon icon="solar:sort-from-top-to-bottom-bold" width="16"></iconify-icon>) : <iconify-icon icon="solar:sort-vertical-linear" width="16" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400"></iconify-icon>}</div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                                        {u.name}
                                        {u.id === auth.user.id && <span className="ml-2 inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Anda</span>}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            u.role === 'ADMIN_ARU' ? 'bg-blue-100 text-blue-700' :
                                                u.role === 'PIC' ? 'bg-yellow-100 text-yellow-700' :
                                                    u.role === 'WORKER' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {translateRole(u.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                                                disabled={u.role === 'SUPER_ADMIN' && !isSuperAdmin}
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </button>
                                            {u.id !== auth.user.id && u.role !== 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={() => openDeleteModal(u)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal show={isCreateModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah User' : 'Edit User'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Nama Lengkap" />
                            <TextInput
                                id="name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div>
                            <InputLabel htmlFor="role" value="Role" />
                            <select value={data.role} onChange={e => setData('role', e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                                <option value="ADMIN_ARU">ARU</option>
                                <option value="PIC">PIC</option>
                                <option value="WORKER">KARYAWAN</option>
                            </select>
                            <InputError message={errors.role} />
                        </div>
                        <div>
                            <InputLabel htmlFor="password" value="Password" />
                            <TextInput
                                id="password"
                                type="password"
                                className="mt-1 block w-full"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required={modalMode === 'add'}
                            />
                            <InputError message={errors.password} />
                        </div>
                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Konfirmasi Password" />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                className="mt-1 block w-full"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required={modalMode === 'add'}
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={closeModal} type="button" className="font-semibold transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                            <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus User?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus user <b>{selectedUser?.name}</b>?</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

        </AdminLayout>
    );
}
