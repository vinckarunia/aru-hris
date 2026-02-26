import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

/**
 * Interface for the Client relationship data.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
}

/**
 * Interface for the Project data structure.
 */
interface Project {
    id: number;
    client_id: number;
    name: string;
    prefix: string;
    created_at: string;
    client?: Client; // Optional because it's loaded via relationship
}

/**
 * Props for the Project Index component.
 */
interface Props {
    projects: Project[];
    clients: Client[];
}

/**
 * Project Index Page Component
 *
 * Displays a table of projects and provides a Single Page Application (SPA) experience
 * for creating, updating, and deleting projects using Modals.
 *
 * @param {Props} props - The component props containing the list of projects and clients.
 * @returns {JSX.Element} The rendered Project management page.
 */
export default function Index({ projects, clients }: Props) {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Initialize Inertia form hook
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        client_id: '',
        name: '',
        prefix: '',
    });

    /**
     * Opens the modal in "add" mode and resets form state.
     */
    const openAddModal = () => {
        setModalMode('add');
        setSelectedProject(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the modal in "edit" mode and populates form with project data.
     *
     * @param {Project} project - The project object to edit.
     */
    const openEditModal = (project: Project) => {
        setModalMode('edit');
        setSelectedProject(project);
        setData({
            client_id: project.client_id.toString(),
            name: project.name,
            prefix: project.prefix,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the confirmation modal for deleting a project.
     *
     * @param {Project} project - The project object to delete.
     */
    const openDeleteModal = (project: Project) => {
        setSelectedProject(project);
        setIsDeleteModalOpen(true);
    };

    /**
     * Closes the form modal and resets all errors/states.
     */
    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        clearErrors();
    };

    /**
     * Handles the submission of the add/edit project form.
     *
     * @param {React.FormEvent} e - The form submission event.
     */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            post(route('projects.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            put(route('projects.update', selectedProject?.id), {
                onSuccess: () => closeModal(),
            });
        }
    };

    /**
     * Executes the deletion of the selected project.
     */
    const confirmDelete = () => {
        if (selectedProject) {
            destroy(route('projects.destroy', selectedProject.id), {
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };

    return (
        <AdminLayout title="Kelola Project" header="Data Project">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Project</h2>
                    <p className="text-sm text-slate-500">Kelola daftar project yang dikerjakan bersama Client.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                    Tambah Project
                </button>
            </div>

            {/* Project Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Nama Project</th>
                                <th className="px-6 py-4">Perusahaan Client</th>
                                <th className="px-6 py-4">Prefix ID</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                        Belum ada data project. Silakan tambahkan baru.
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project, index) => (
                                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{project.name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {project.client?.full_name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {project.prefix}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={() => openEditModal(project)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </button>
                                            <button 
                                                onClick={() => openDeleteModal(project)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Add / Edit Project */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah Project Baru' : 'Edit Data Project'}
                    </h2>

                    <div className="space-y-4">
                        {/* Dropdown Client */}
                        <div>
                            <InputLabel htmlFor="client_id" value="Pilih Client" />
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(e) => setData('client_id', e.target.value)}
                                className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary dark:focus:border-primary focus:ring-primary dark:focus:ring-primary rounded-md shadow-sm"
                            >
                                <option value="" disabled>-- Pilih Perusahaan Client --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.full_name} ({client.short_name})
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.client_id} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Nama Project" />
                            <TextInput
                                id="name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="CONTOH: IT Support"
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="prefix" value="Prefix ID Project" />
                            <TextInput
                                id="prefix"
                                type="text"
                                className="mt-1 block w-full uppercase"
                                value={data.prefix}
                                onChange={(e) => setData('prefix', e.target.value.toUpperCase())}
                                placeholder="CONTOH: ABC"
                            />
                            <p className="text-xs text-slate-500 mt-1">Kode unik project untuk format ID Pekerja.</p>
                            <InputError message={errors.prefix} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal for Delete Confirmation */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Apakah Anda yakin ingin menghapus project <b>{selectedProject?.name}</b>? Semua data Departemen dan Pekerja yang ada di dalam project ini berisiko terhapus.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>
                            Ya, Hapus
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}