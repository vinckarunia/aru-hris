import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

interface Branch { id: number; name: string; }
interface Project { id: number; name: string; prefix: string; branches: Branch[]; }
interface Assignment { id: number; worker_id: number; project_id: number; branch_id: number; employee_id: string | null; position: string | null; hire_date: string; termination_date: string | null; status: string; worker: { id: number, name: string; nik_aru: string | null; } }

interface Props { assignment: Assignment; projects: Project[]; }

/**
 * Assignment Edit Component
 */
export default function Edit({ assignment, projects }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        project_id: assignment.project_id.toString(),
        branch_id: assignment.branch_id.toString(),
        employee_id: assignment.employee_id || '',
        position: assignment.position || '',
        hire_date: assignment.hire_date || '',
        termination_date: assignment.termination_date || '',
        status: assignment.status || 'active',
    });

    const selectedProject = projects.find(p => p.id.toString() === data.project_id);
    const availableBranches = selectedProject ? selectedProject.branches : [];
    const originalProjectId = assignment.project_id.toString();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('assignments.update', assignment.id));
    };

    return (
        <AdminLayout title={`Edit Penempatan - ${assignment.worker.name}`} header="Edit Penempatan">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Penempatan: {assignment.worker.name}</h2>
                </div>
                <Link href={route('assignments.show', assignment.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Batal
                </Link>
            </div>

            <form onSubmit={submit} className="space-y-6">

                {/* NIK ARU info banner */}
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                    <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                    <div className="text-sm font-medium space-y-1">
                        {assignment.worker.nik_aru && (
                            <p>NIK ARU saat ini: <span className="font-mono">{assignment.worker.nik_aru}</span></p>
                        )}
                        {data.termination_date
                            ? <p>Penempatan akan diakhiri — NIK ARU karyawan akan dikosongkan otomatis.</p>
                            : data.project_id !== originalProjectId
                                ? <p>Project berubah — NIK ARU baru akan di-generate berdasarkan prefix project yang dipilih.</p>
                                : <p>Project sama — NIK ARU tidak akan berubah.</p>
                        }
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <InputLabel htmlFor="project_id" value="Project" />
                            <select id="project_id" className="mt-1 block w-full border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md" value={data.project_id} onChange={e => { setData('project_id', e.target.value); setData('branch_id', ''); }} required>
                                <option value="">-- Pilih Project --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <InputError message={errors.project_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="branch_id" value="Cabang Spesifik" />
                            <select id="branch_id" className="mt-1 block w-full border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md disabled:opacity-50" value={data.branch_id} onChange={e => setData('branch_id', e.target.value)} disabled={!data.project_id} required>
                                <option value="">-- Pilih Cabang --</option>
                                {availableBranches.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <InputError message={errors.branch_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="position" value="Jabatan / Posisi" />
                            <TextInput id="position" type="text" className="mt-1 block w-full" value={data.position} onChange={e => setData('position', e.target.value)} required />
                            <InputError message={errors.position} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="employee_id" value="ID Karyawan di Client" />
                            <TextInput id="employee_id" type="text" className="mt-1 block w-full font-mono" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} />
                            <InputError message={errors.employee_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="hire_date" value="Tanggal Bergabung" />
                            <TextInput id="hire_date" type="date" className="mt-1 block w-full" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} required />
                            <InputError message={errors.hire_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="termination_date" value="Tanggal Keluar" />
                            <TextInput id="termination_date" type="date" className="mt-1 block w-full" value={data.termination_date} onChange={e => setData('termination_date', e.target.value)} />
                            <InputError message={errors.termination_date} className="mt-1" />
                        </div>
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="status" value="Status" />
                            <select id="status" className="mt-1 block w-full md:w-1/2 border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md" value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="active">Aktif</option>
                                <option value="contract expired">Kontrak Habis</option>
                                <option value="resign">Resign</option>
                                <option value="fired">Diberhentikan</option>
                                <option value="other">Lainnya</option>
                            </select>
                            <InputError message={errors.status} className="mt-1" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base bg-primary hover:bg-primary-dark">
                        Simpan Perubahan
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}