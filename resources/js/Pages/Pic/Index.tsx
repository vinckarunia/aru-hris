import React, { useState } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

interface Project {
    id: number;
    name: string;
}

interface Pic {
    id: number;
    user_id: number;
    name: string;
    phone: string | null;
    user: User;
    projects: Project[];
}

interface PicIndexProps extends PageProps {
    pics: Pic[];
    availableUsers: User[];
    projects: Project[];
}

export default function PicIndex({ pics, availableUsers, projects }: PicIndexProps) {
    const { auth } = usePage<PageProps>().props;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedPic, setSelectedPic] = useState<Pic | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        user_id: '',
        phone: '',
        project_ids: [] as number[],
    });

    /** Opens modal for adding a new PIC. */
    const openCreateModal = () => {
        setModalMode('add');
        setSelectedPic(null);
        reset();
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** Opens modal for editing an existing PIC. */
    const openEditModal = (pic: Pic) => {
        setModalMode('edit');
        setSelectedPic(pic);
        setData({
            user_id: pic.user_id.toString(),
            phone: pic.phone || '',
            project_ids: pic.projects.map(proj => proj.id),
        });
        clearErrors();
        setIsCreateModalOpen(true);
    };

    /** Opens confirmation modal for deletion. */
    const openDeleteModal = (pic: Pic) => {
        setSelectedPic(pic);
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
        if (modalMode === 'add') post(route('pics.store'), { onSuccess: () => closeModal() });
        else put(route('pics.update', selectedPic?.id), { onSuccess: () => closeModal() });
    };

    /** Executes PIC deletion. */
    const confirmDelete = () => {
        if (selectedPic) destroy(route('pics.destroy', selectedPic.id), { onSuccess: () => setIsDeleteModalOpen(false) });
    };

    const handleProjectToggle = (projectId: number) => {
        const ids = [...data.project_ids];
        if (ids.includes(projectId)) {
            setData('project_ids', ids.filter(id => id !== projectId));
        } else {
            setData('project_ids', [...ids, projectId]);
        }
    };

    return (
        <AdminLayout title="Kelola PIC" header="PIC">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen PIC</h1>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                    Tambah PIC
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Nama</th>
                                <th className="px-6 py-4">No. Telepon</th>
                                <th className="px-6 py-4">Project yang Dikelola</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                            {pics.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500">Belum ada data PIC.</td>
                                </tr>
                            ) : pics.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{p.user?.name || p.name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{p.phone || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {p.projects.map(proj => (
                                                <Link
                                                    key={proj.id}
                                                    href={route('projects.show', proj.id)}
                                                    className="text-xs px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md font-medium text-primary hover:bg-primary/20 transition-colors"
                                                >
                                                    {proj.name}
                                                </Link>
                                            ))}
                                            {p.projects.length === 0 && <span className="text-slate-400 italic">Tidak ada project</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(p)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(p)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                            </button>
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
                        {modalMode === 'add' ? 'Tambah PIC' : 'Edit PIC'}
                    </h2>
                    <div className="space-y-4">
                        {modalMode === 'add' ? (
                            <div>
                                <label className="block text-sm font-medium mb-1">Akun User PIC</label>
                                <select value={data.user_id} onChange={e => setData('user_id', e.target.value)} required className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800">
                                    <option value="">-- Pilih User --</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                {availableUsers.length === 0 && <p className="text-orange-500 text-xs mt-1">Belum ada akun user dengan role PIC yang tersedia. Buat akun PIC di Manajemen User terlebih dahulu.</p>}
                                {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1">Akun User PIC</label>
                                <input type="text" value={selectedPic?.user?.name || selectedPic?.name || ''} disabled className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed text-slate-500" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">Nomor Telepon</label>
                            <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800" />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-4">
                            <label className="block text-sm font-medium mb-2">Assign Project (Opsional)</label>
                            <div className="max-h-40 overflow-y-auto border border-slate-200 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                                {projects.map(proj => (
                                    <label key={proj.id} className="flex items-center gap-2 mb-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.project_ids.includes(proj.id)}
                                            onChange={() => handleProjectToggle(proj.id)}
                                            className="rounded border-slate-300 text-primary"
                                        />
                                        <span className="text-sm cursor-pointer">{proj.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button" className="font-semibold transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus PIC?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus PIC <b>{selectedPic?.name}</b>?</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

        </AdminLayout>
    );
}
