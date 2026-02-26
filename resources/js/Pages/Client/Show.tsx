import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

/**
 * Interfaces for the data structure based on eager loading.
 */
interface Department { id: number; client_id: number; name: string; }
interface Project { id: number; client_id: number; department_id: number; name: string; prefix: string; id_running_number: number; department?: Department; }
interface Client { id: number; full_name: string; short_name: string; departments: Department[]; projects: Project[]; }

interface Props {
    client: Client;
}

/**
 * Client Show Page Component
 *
 * Displays detailed information about a specific client, including
 * tabs to view and manage its Departments and view its Projects.
 */
export default function Show({ client }: Props) {
    const [activeTab, setActiveTab] = useState<'departments' | 'projects'>('departments');

    // --- State for Department Modal ---
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);

    // Initialize Inertia form hook for Department (client_id is pre-filled and hidden)
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        client_id: client.id.toString(),
        name: '',
    });

    const openAddModal = () => {
        setModalMode('add');
        setSelectedDept(null);
        reset('name'); // Reset only name, keep client_id
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (dept: Department) => {
        setModalMode('edit');
        setSelectedDept(dept);
        setData({ client_id: client.id.toString(), name: dept.name });
        clearErrors();
        setIsModalOpen(true);
    };

    const openDeleteModal = (dept: Department) => {
        setSelectedDept(dept);
        setIsDeleteModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset('name');
        clearErrors();
    };

    const submitDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            post(route('departments.store'), { onSuccess: () => closeModal() });
        } else {
            put(route('departments.update', selectedDept?.id), { onSuccess: () => closeModal() });
        }
    };

    const confirmDeleteDept = () => {
        if (selectedDept) {
            destroy(route('departments.destroy', selectedDept.id), { onSuccess: () => setIsDeleteModalOpen(false) });
        }
    };

    return (
        <AdminLayout title={`Detail Client - ${client.short_name}`} header="Detail Client">
            {/* Header Profile Client */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/30">
                        {client.short_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{client.full_name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:buildings-bold"></iconify-icon> Kode Client: {client.short_name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{client.departments.length} Departemen</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{client.projects.length} Project</span>
                        </div>
                    </div>
                </div>
                <div className="z-10">
                    <Link href={route('clients.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                    <button 
                        onClick={() => setActiveTab('departments')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'departments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <iconify-icon icon="solar:users-group-two-rounded-bold" width="18"></iconify-icon> Departemen
                    </button>
                    <button 
                        onClick={() => setActiveTab('projects')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <iconify-icon icon="solar:folder-with-files-bold" width="18"></iconify-icon> Daftar Project
                    </button>
                </div>

                {/* Tab Content: Departments */}
                {activeTab === 'departments' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Departemen {client.short_name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Kelola departemen yang berada di bawah perusahaan ini.</p>
                            </div>
                            <button onClick={openAddModal} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Tambah
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">No</th>
                                        <th className="px-6 py-4">Nama Departemen</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.departments.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Belum ada departemen.</td></tr>
                                    ) : (
                                        client.departments.map((dept, index) => (
                                            <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">{index + 1}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{dept.name}</td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button onClick={() => openEditModal(dept)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                                                    <button onClick={() => openDeleteModal(dept)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab Content: Projects */}
                {activeTab === 'projects' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Project {client.short_name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Daftar project yang saat ini berjalan untuk klien ini.</p>
                            </div>
                            <Link href={route('projects.index')} className="px-4 py-2 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                Kelola Project <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">No</th>
                                        <th className="px-6 py-4">Nama Project</th>
                                        <th className="px-6 py-4">Departemen</th>
                                        <th className="px-6 py-4">Prefix</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.projects.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Belum ada project untuk klien ini.</td></tr>
                                    ) : (
                                        client.projects.map((project, index) => (
                                            <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-6 py-4">{index + 1}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{project.name}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{project.department?.name || '-'}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500">{project.prefix}</span></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS FOR DEPARTMENT --- */}
            {/* Add/Edit Modal */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submitDept} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? `Tambah Departemen untuk ${client.short_name}` : 'Edit Departemen'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Nama Departemen" />
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: HR & Admin" />
                            <InputError message={errors.name} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button"className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Departemen?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus departemen <b>{selectedDept?.name}</b>? Project terkait bisa berisiko terhapus.</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDeleteDept} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}