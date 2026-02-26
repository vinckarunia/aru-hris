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

interface Department { id: number; client_id: number; name: string; }
interface Project { id: number; client_id: number; department_id: number; name: string; prefix: string; id_running_number: number; department?: Department; }
interface Client { id: number; full_name: string; short_name: string; departments: Department[]; projects: Project[]; }
interface Props { client: Client; }

export default function Show({ client }: Props) {
    const [activeTab, setActiveTab] = useState<'departments' | 'projects'>('departments');

    // --- State & Form for Department ---
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isDeptDeleteModalOpen, setIsDeptDeleteModalOpen] = useState(false);
    const [deptModalMode, setDeptModalMode] = useState<'add' | 'edit'>('add');
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);

    const deptForm = useForm({ client_id: client.id.toString(), name: '' });

    // --- State & Form for Project ---
    const [isProjModalOpen, setIsProjModalOpen] = useState(false);
    const [isProjDeleteModalOpen, setIsProjDeleteModalOpen] = useState(false);
    const [projModalMode, setProjModalMode] = useState<'add' | 'edit'>('add');
    const [selectedProj, setSelectedProj] = useState<Project | null>(null);

    const projForm = useForm({ client_id: client.id.toString(), department_id: '', name: '', prefix: '' });

    // --- Handlers for Department ---
    const openAddDept = () => { setDeptModalMode('add'); setSelectedDept(null); deptForm.reset('name'); deptForm.clearErrors(); setIsDeptModalOpen(true); };
    const openEditDept = (dept: Department) => { setDeptModalMode('edit'); setSelectedDept(dept); deptForm.setData({ client_id: client.id.toString(), name: dept.name }); deptForm.clearErrors(); setIsDeptModalOpen(true); };
    const closeDeptModal = () => { setIsDeptModalOpen(false); deptForm.reset('name'); deptForm.clearErrors(); };
    const submitDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (deptModalMode === 'add') deptForm.post(route('departments.store'), { onSuccess: () => closeDeptModal() });
        else deptForm.put(route('departments.update', selectedDept?.id), { onSuccess: () => closeDeptModal() });
    };

    // --- Handlers for Project ---
    const openAddProj = () => { setProjModalMode('add'); setSelectedProj(null); projForm.reset('department_id', 'name', 'prefix'); projForm.clearErrors(); setIsProjModalOpen(true); };
    const openEditProj = (proj: Project) => { setProjModalMode('edit'); setSelectedProj(proj); projForm.setData({ client_id: client.id.toString(), department_id: proj.department_id.toString(), name: proj.name, prefix: proj.prefix }); projForm.clearErrors(); setIsProjModalOpen(true); };
    const closeProjModal = () => { setIsProjModalOpen(false); projForm.reset('department_id', 'name', 'prefix'); projForm.clearErrors(); };
    const submitProj = (e: React.FormEvent) => {
        e.preventDefault();
        if (projModalMode === 'add') projForm.post(route('projects.store'), { onSuccess: () => closeProjModal() });
        else projForm.put(route('projects.update', selectedProj?.id), { onSuccess: () => closeProjModal() });
    };

    return (
        <AdminLayout title={`Detail Client - ${client.short_name}`} header="Detail Klien">
            {/* Header Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/30">
                        {client.short_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{client.full_name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><iconify-icon icon="solar:buildings-bold"></iconify-icon> Prefix: {client.short_name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{client.departments.length} Departemen</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{client.projects.length} Project</span>
                        </div>
                    </div>
                </div>
                <div className="z-10">
                    <Link href={route('clients.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                        <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                    </Link>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                    <button onClick={() => setActiveTab('departments')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'departments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <iconify-icon icon="solar:users-group-two-rounded-bold" width="18"></iconify-icon> Departemen
                    </button>
                    <button onClick={() => setActiveTab('projects')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <iconify-icon icon="solar:folder-with-files-bold" width="18"></iconify-icon> Daftar Project
                    </button>
                </div>

                {/* Tab: Departments */}
                {activeTab === 'departments' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div><h3 className="font-semibold text-slate-800 dark:text-white">Departemen {client.short_name}</h3></div>
                            <button onClick={openAddDept} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Tambah
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr><th className="px-6 py-4">No</th><th className="px-6 py-4">Nama Departemen</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.departments.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Belum ada departemen.</td></tr> : client.departments.map((dept, idx) => (
                                        <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4">{idx + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{dept.name}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => openEditDept(dept)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                                                <button onClick={() => { setSelectedDept(dept); setIsDeptDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Projects */}
                {activeTab === 'projects' && (
                    <div className="p-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div><h3 className="font-semibold text-slate-800 dark:text-white">Project {client.short_name}</h3></div>
                            <button onClick={openAddProj} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm">
                                <iconify-icon icon="solar:add-circle-bold" width="18"></iconify-icon> Tambah Project Baru
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                                    <tr><th className="px-6 py-4">No</th><th className="px-6 py-4">Nama Project</th><th className="px-6 py-4">Departemen</th><th className="px-6 py-4">Prefix</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    {client.projects.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Belum ada project untuk klien ini.</td></tr> : client.projects.map((proj, idx) => (
                                        <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4">{idx + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{proj.name}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{proj.department?.name}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500">{proj.prefix}</span></td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => openEditProj(proj)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                                                <button onClick={() => { setSelectedProj(proj); setIsProjDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- DEPT MODALS --- */}
            <Modal show={isDeptModalOpen} onClose={closeDeptModal} maxWidth="md">
                <form onSubmit={submitDept} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{deptModalMode === 'add' ? `Tambah Departemen` : 'Edit Departemen'}</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="dept_name" value="Nama Departemen" />
                            <TextInput id="dept_name" type="text" className="mt-1 block w-full" value={deptForm.data.name} onChange={(e) => deptForm.setData('name', e.target.value)} placeholder="Contoh: HR & Admin" />
                            <InputError message={deptForm.errors.name} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeDeptModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={deptForm.processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {deptForm.processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={isDeptDeleteModalOpen} onClose={() => setIsDeptDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Departemen?</h2>
                    <div className="flex justify-center gap-3 mt-6">
                        <SecondaryButton onClick={() => setIsDeptDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={() => { if(selectedDept) deptForm.delete(route('departments.destroy', selectedDept.id), { onSuccess: () => setIsDeptDeleteModalOpen(false) }) }} disabled={deptForm.processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* --- PROJECT MODALS --- */}
            <Modal show={isProjModalOpen} onClose={closeProjModal} maxWidth="md">
                <form onSubmit={submitProj} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{projModalMode === 'add' ? `Tambah Project` : 'Edit Project'}</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="proj_department_id" value="Pilih Departemen" />
                            <select id="proj_department_id" value={projForm.data.department_id} onChange={(e) => projForm.setData('department_id', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm dark:bg-slate-900 dark:border-slate-700">
                                <option value="" disabled>-- Pilih Departemen --</option>
                                {client.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {client.departments.length === 0 && <p className="text-xs text-amber-500 mt-1">Harap buat departemen terlebih dahulu.</p>}
                            <InputError message={projForm.errors.department_id} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="proj_name" value="Nama Project" />
                            <TextInput id="proj_name" type="text" className="mt-1 block w-full" value={projForm.data.name} onChange={(e) => projForm.setData('name', e.target.value)} placeholder="Contoh: IT Support" />
                            <InputError message={projForm.errors.name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="proj_prefix" value="Prefix (Unik)" />
                            <TextInput id="proj_prefix" type="text" className="mt-1 block w-full uppercase" value={projForm.data.prefix} onChange={(e) => projForm.setData('prefix', e.target.value.toUpperCase())} placeholder="Contoh: ITS-01" />
                            <InputError message={projForm.errors.prefix} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeProjModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={projForm.processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {projForm.processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={isProjDeleteModalOpen} onClose={() => setIsProjDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Project?</h2>
                    <div className="flex justify-center gap-3 mt-6">
                        <SecondaryButton onClick={() => setIsProjDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={() => { if(selectedProj) projForm.delete(route('projects.destroy', selectedProj.id), { onSuccess: () => setIsProjDeleteModalOpen(false) }) }} disabled={projForm.processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}