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
 * Represents a client company entity.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
}

/**
 * Represents a department within a client company.
 */
interface Department {
    id: number;
    client_id: number;
    name: string;
}

/**
 * Represents a project that can be associated with multiple departments.
 */
interface Project {
    id: number;
    client_id: number;
    name: string;
    prefix: string;
    id_running_number: number;
    client?: Client;
    departments?: Department[];
}

/**
 * Props for the Project Index component.
 */
interface Props {
    projects: Project[];
    clients: Client[];
    departments: Department[];
}

/**
 * Project Index Page Component
 *
 * Displays a table of projects and provides a Single Page Application (SPA) experience
 * for creating, updating, and deleting projects, including Many-to-Many department assignments.
 *
 * @param {Props} props - The component props containing lists of projects, clients, and departments.
 */
export default function Index({ projects, clients, departments }: Props) {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Form state initialized with an array for department_ids
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        client_id: '',
        department_ids: [] as number[],
        name: '',
        prefix: '',
    });

    // Filter available departments based on the currently selected client
    const availableDepartments = departments.filter(d => d.client_id.toString() === data.client_id);

    /**
     * Toggles a department ID in the department_ids state array.
     *
     * @param {number} id - The ID of the department to toggle.
     */
    const handleDepartmentToggle = (id: number) => {
        const currentIds = data.department_ids;
        if (currentIds.includes(id)) {
            setData('department_ids', currentIds.filter(deptId => deptId !== id));
        } else {
            setData('department_ids', [...currentIds, id]);
        }
    };

    /** Opens modal for adding a new project. */
    const openAddModal = () => {
        setModalMode('add');
        setSelectedProject(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    /** * Opens modal for editing an existing project.
     * @param {Project} project - The project to edit.
     */
    const openEditModal = (project: Project) => {
        setModalMode('edit');
        setSelectedProject(project);
        setData({
            client_id: project.client_id.toString(),
            department_ids: project.departments?.map(d => d.id) || [],
            name: project.name,
            prefix: project.prefix
        });
        clearErrors();
        setIsModalOpen(true);
    };

    /** Opens confirmation modal for deletion. */
    const openDeleteModal = (project: Project) => {
        setSelectedProject(project);
        setIsDeleteModalOpen(true);
    };

    /** Closes the form modal and resets state. */
    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        clearErrors();
    };

    /** Handles form submission for both create and update. */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') post(route('projects.store'), { onSuccess: () => closeModal() });
        else put(route('projects.update', selectedProject?.id), { onSuccess: () => closeModal() });
    };

    /** Executes project deletion. */
    const confirmDelete = () => {
        if (selectedProject) destroy(route('projects.destroy', selectedProject.id), { onSuccess: () => setIsDeleteModalOpen(false) });
    };

    return (
        <AdminLayout title="Kelola Project" header="Data Project">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Project</h2>
                    <p className="text-sm text-slate-500">Kelola daftar project dari berbagai client.</p>
                </div>
                <button onClick={openAddModal} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon> Tambah Project
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
                                <th className="px-6 py-4">Client & Departemen</th>
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
                                        <td className="px-6 py-4">
                                            <Link href={route('projects.show', project.id)} className="font-bold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                {project.name}
                                                <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">
                                                <Link href={route('clients.show', project.client_id)} className="text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                    <span className="font-medium">{project.client?.full_name}</span>
                                                </Link>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {/* Render all departments connected to this project */}
                                                {project.departments && project.departments.length > 0 ? (
                                                    project.departments.map(dept => (
                                                        <span key={dept.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-500">
                                                            {dept.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">-</span>
                                                )}
                                            </div>
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

            {/* Modal for Add / Edit Project */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah Project' : 'Edit Project'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="client_id" value="Perusahaan Client" />
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(e) => {
                                    setData('client_id', e.target.value);
                                    setData('department_ids', []); // Reset checkbox when client changes
                                }}
                                className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                            >
                                <option value="" disabled>-- Pilih Client --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <InputError message={errors.client_id} className="mt-2" />
                        </div>

                        {/* Checkbox Group for Multiple Departments */}
                        <div>
                            <InputLabel value="Departemen (Pilih minimal satu)" />
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                {availableDepartments.length === 0 ? (
                                    <p className="text-xs text-slate-500 col-span-2 italic">Belum ada departemen untuk client ini.</p>
                                ) : (
                                    availableDepartments.map(d => (
                                        <label key={d.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={data.department_ids.includes(d.id)}
                                                onChange={() => handleDepartmentToggle(d.id)}
                                                className="rounded text-primary focus:ring-primary dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {/* Validation error for department_ids array */}
                            {errors.department_ids && <p className="text-sm text-red-600 mt-2">{errors.department_ids}</p>}
                            {/* Detailed errors if any specific array index fails (e.g. department_ids.0) */}
                            {Object.keys(errors).filter(key => key.startsWith('department_ids.')).map((key) => (
                                <p key={key} className="text-sm text-red-600 mt-1">{errors[key as keyof typeof errors]}</p>
                            ))}
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Nama Project" />
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="CONTOH: IT Support" />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="prefix" value="Prefix" />
                            <TextInput id="prefix" type="text" className="mt-1 block w-full uppercase" value={data.prefix} onChange={(e) => setData('prefix', e.target.value.toUpperCase())} placeholder="CONTOH: ITS-01" />
                            <InputError message={errors.prefix} className="mt-2" />
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
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <p className="text-sm text-slate-500 mb-6">Yakin menghapus project <b>{selectedProject?.name}</b>?</p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}