import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

interface Branch { id: string; name: string; }
interface Project { id: string; name: string; prefix: string; branches: Branch[]; }
interface Assignment { id: string; worker_id: string; project_id: string; branches: Branch[]; employee_id: string | null; position: string | null; hire_date: string; termination_date: string | null; status: string; equipment_returned: boolean | null; worker: { id: string, name: string; nik_aru: string | null; } }

interface Props { assignment: Assignment; projects: Project[]; }

/**
 * Assignment Edit Component
 */
export default function Edit({ assignment, projects }: Props) {
    const { auth } = usePage<PageProps>().props;
    const isPic = auth.user.role === 'PIC';

    const { data, setData, put, processing, errors } = useForm({
        project_id: assignment.project_id.toString(),
        branch_ids: assignment.branches ? assignment.branches.map(b => b.id.toString()) : [] as string[],
        employee_id: assignment.employee_id || '',
        position: assignment.position || '',
        hire_date: assignment.hire_date || '',
        termination_date: assignment.termination_date || '',
        status: assignment.status || 'active',
        equipment_returned: assignment.equipment_returned,
        notes: '',
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
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {isPic ? 'Ajukan Perubahan Penempatan:' : 'Edit Penempatan:'} {assignment.worker.name}
                    </h2>
                </div>
                <Link href={route('assignments.show', assignment.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Batal
                </Link>
            </div>

            {isPic && (
                <div className="mb-4 p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-start gap-3 text-primary dark:text-primary-light">
                    <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                    <div className="text-sm font-medium space-y-1">
                        <p>Sebagai PIC, perubahan yang Anda buat di sini akan dikirim sebagai <strong>Pengajuan Perubahan Data (Data Request)</strong> kepada Admin.</p>
                        <p>Perubahan baru akan aktif setelah disetujui oleh Admin.</p>
                    </div>
                </div>
            )}

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
                            <InputLabel htmlFor="project_id">Pilih Project <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <select id="project_id" className="mt-1 block w-full border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md" value={data.project_id} onChange={e => { setData('project_id', e.target.value); setData('branch_ids', []); }} required>
                                <option value="">-- Pilih Project --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <InputError message={errors.project_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="branch_ids" value="Cabang Spesifik (Bisa Pilih >1)" />
                            <div className="mt-1 block w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-900 rounded-md shadow-sm xl:max-h-48 max-h-32 overflow-y-auto p-2">
                                {availableBranches.length > 0 ? (
                                    <div className="space-y-1">
                                        {availableBranches.map(b => (
                                            <label key={b.id} className={`flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-transparent transition-colors ${data.branch_ids.includes(b.id.toString()) || data.branch_ids.includes(b.id as never) ? 'bg-primary/5 border-primary/20' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-primary shadow-sm focus:border-primary focus:ring-primary h-4 w-4"
                                                    checked={data.branch_ids.includes(b.id.toString()) || data.branch_ids.includes(b.id as never)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setData('branch_ids', [...data.branch_ids, b.id.toString() as never]);
                                                        } else {
                                                            setData('branch_ids', data.branch_ids.filter((id: any) => id.toString() !== b.id.toString()));
                                                        }
                                                    }}
                                                    disabled={!data.project_id}
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{b.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 text-sm text-slate-500 text-center italic">
                                        {!data.project_id ? "Pilih project terlebih dahulu" : "Project ini belum memiliki cabang"}
                                    </div>
                                )}
                            </div>
                            <InputError message={errors.branch_ids} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="position" value="Jabatan / Posisi" />
                            <TextInput id="position" type="text" className="mt-1 block w-full" value={data.position} onChange={e => setData('position', e.target.value)} />
                            <InputError message={errors.position} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="employee_id" value="ID Karyawan di Client" />
                            <TextInput id="employee_id" type="text" className="mt-1 block w-full font-mono" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} />
                            <InputError message={errors.employee_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="hire_date">Tanggal Bergabung (Hire Date)</InputLabel>
                            <TextInput id="hire_date" type="date" className="mt-1 block w-full" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} />
                            <InputError message={errors.hire_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="termination_date" value="Tanggal Keluar" />
                            <TextInput id="termination_date" type="date" className="mt-1 block w-full" value={data.termination_date} onChange={e => setData('termination_date', e.target.value)} />
                            <InputError message={errors.termination_date} className="mt-1" />
                        </div>
                        <div className={`md:col-span-${isPic ? '1' : '2'}`}>
                            <InputLabel htmlFor="status" value="Status" />
                            <select id="status" className={`mt-1 block w-full ${!isPic && 'md:w-1/2'} border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md`} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="active">Aktif</option>
                                <option value="contract expired">Contract Expired</option>
                                <option value="project closed">Project Closed</option>
                                <option value="resign">Resign</option>
                                <option value="fired">Fraud</option>
                                <option value="other">Lainnya</option>
                            </select>
                            <InputError message={errors.status} className="mt-1" />
                        </div>

                        {data.status !== 'active' && (
                            <div className={`md:col-span-${isPic ? '1' : '2'} bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700`}>
                                <InputLabel value="Pengembalian Perangkat Kerja" className="mb-2" />
                                <div className="flex items-center gap-3">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors border ${data.equipment_returned === true || data.equipment_returned === 1 as any ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'}`}>
                                        <input type="radio" name="equipment" className="text-emerald-500 focus:ring-emerald-500" checked={data.equipment_returned === true || data.equipment_returned === 1 as any} onChange={() => setData('equipment_returned', true)} />
                                        <span className="text-sm font-semibold">Sudah</span>
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors border ${data.equipment_returned === false || data.equipment_returned === 0 as any ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'}`}>
                                        <input type="radio" name="equipment" className="text-red-500 focus:ring-red-500" checked={data.equipment_returned === false || data.equipment_returned === 0 as any} onChange={() => setData('equipment_returned', false)} />
                                        <span className="text-sm font-semibold">Belum</span>
                                    </label>
                                </div>
                                <InputError message={errors.equipment_returned} className="mt-1" />
                            </div>
                        )}
                        {isPic && (
                            <div className="md:col-span-2">
                                <InputLabel htmlFor="notes" value="Catatan / Alasan Perubahan" />
                                <textarea id="notes" className="mt-1 block w-full border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-md" rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Berikan alasan mengapa penempatan ini diubah..."></textarea>
                                <InputError message={errors.notes} className="mt-1" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base bg-primary hover:bg-primary-dark">
                        {isPic ? 'Ajukan Perubahan' : 'Simpan Perubahan'}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}