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

interface Client { id: number; full_name: string; short_name: string; }
interface Department { id: number; client_id: number; name: string; }
interface Project { id: number; client_id: number; department_id: number; name: string; prefix: string; id_running_number: number; client?: Client; department?: Department; }

interface Props { projects: Project[]; clients: Client[]; departments: Department[]; }

export default function Index({ projects, clients, departments }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        client_id: '',
        department_id: '',
        name: '',
        prefix: '',
    });

    // Filter departemen berdasarkan klien yang dipilih
    const availableDepartments = departments.filter(d => d.client_id.toString() === data.client_id);

    const openAddModal = () => { setModalMode('add'); setSelectedProject(null); reset(); clearErrors(); setIsModalOpen(true); };
    const openEditModal = (project: Project) => { setModalMode('edit'); setSelectedProject(project); setData({ client_id: project.client_id.toString(), department_id: project.department_id.toString(), name: project.name, prefix: project.prefix }); clearErrors(); setIsModalOpen(true); };
    const openDeleteModal = (project: Project) => { setSelectedProject(project); setIsDeleteModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); reset(); clearErrors(); };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') post(route('projects.store'), { onSuccess: () => closeModal() });
        else put(route('projects.update', selectedProject?.id), { onSuccess: () => closeModal() });
    };

    const confirmDelete = () => {
        if (selectedProject) destroy(route('projects.destroy', selectedProject.id), { onSuccess: () => setIsDeleteModalOpen(false) });
    };

    return (
        <AdminLayout title="Kelola Project" header="Data Project">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Project</h2>
                    <p className="text-sm text-slate-500">Kelola daftar project dari berbagai klien.</p>
                </div>
                <button onClick={openAddModal} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Project
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Nama Project</th>
                                <th className="px-6 py-4">Klien & Departemen</th>
                                <th className="px-6 py-4">Prefix</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {projects.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Belum ada data project.</td></tr>
                            ) : (
                                projects.map((project, index) => (
                                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{project.name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">{project.client?.full_name}</div>
                                            <div className="text-xs text-slate-400 mt-0.5"><iconify-icon icon="solar:users-group-two-rounded-linear"></iconify-icon> {project.department?.name}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500">{project.prefix}</span></td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEditModal(project)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="20"></iconify-icon></button>
                                            <button onClick={() => openDeleteModal(project)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{modalMode === 'add' ? 'Tambah Project' : 'Edit Project'}</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="client_id" value="Perusahaan Klien" />
                            <select id="client_id" value={data.client_id} onChange={(e) => { setData('client_id', e.target.value); setData('department_id', ''); }} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm">
                                <option value="" disabled>-- Pilih Klien --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <InputError message={errors.client_id} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="department_id" value="Departemen" />
                            <select id="department_id" value={data.department_id} onChange={(e) => setData('department_id', e.target.value)} disabled={!data.client_id} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm disabled:opacity-50">
                                <option value="" disabled>-- Pilih Departemen --</option>
                                {availableDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {availableDepartments.length === 0 && data.client_id && <p className="text-xs text-amber-500 mt-1">Klien ini belum memiliki departemen.</p>}
                            <InputError message={errors.department_id} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="name" value="Nama Project" />
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Contoh: IT Support" />
                            <InputError message={errors.name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="prefix" value="Prefix (Unik)" />
                            <TextInput id="prefix" type="text" className="mt-1 block w-full uppercase" value={data.prefix} onChange={(e) => setData('prefix', e.target.value.toUpperCase())} placeholder="Contoh: ITS-01" />
                            <InputError message={errors.prefix} className="mt-2" />
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

            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin hapus project <b>{selectedProject?.name}</b>?</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}