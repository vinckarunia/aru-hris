import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

interface Department { id: number; name: string; }
interface Project { id: number; name: string; prefix: string; departments: Department[]; }
interface Worker { id: number; name: string; nik_aru: string | null; }

interface Props { worker: Worker; projects: Project[]; }

/**
 * Assignment Create Component
 * Form to assign a worker to a specific project and department.
 */
export default function Create({ worker, projects }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        worker_id: worker.id,
        project_id: '',
        department_id: '',
        employee_id: '',
        position: '',
        hire_date: '',
        termination_date: '',
        status: 'active',
    });

    // Dependent dropdown logic
    const selectedProject = projects.find(p => p.id.toString() === data.project_id);
    const availableDepartments = selectedProject ? selectedProject.departments : [];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('assignments.store'));
    };

    return (
        <AdminLayout title={`Tambah Penempatan - ${worker.name}`} header="Penempatan Baru">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Penempatan: {worker.name}</h2>
                    <p className="text-sm text-slate-500">Form penempatan karyawan ke Project & Departemen.</p>
                </div>
                <Link href={route('workers.show', worker.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                <div className="text-sm font-medium">
                    Sistem akan otomatis men-generate NIK ARU berdasarkan Prefix Project saat assignment disimpan.
                    {worker.nik_aru && (
                        <span className="ml-1">
                            NIK ARU sebelumnya (<span className="font-mono">{worker.nik_aru}</span>) akan digantikan oleh NIK baru sesuai project yang dipilih.
                        </span>
                    )}
                </div>
            </div>
            {Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/30 flex items-start gap-3 text-red-600 dark:text-red-400 shadow-sm">
                    <iconify-icon icon="solar:danger-triangle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                    <div className="text-sm font-medium w-full text-red-800 dark:text-red-300">
                        {errors.termination_date}
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Project Selection */}
                        <div>
                            <InputLabel htmlFor="project_id" value="Pilih Project" />
                            <select id="project_id" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" value={data.project_id} onChange={e => { setData('project_id', e.target.value); setData('department_id', ''); }} required>
                                <option value="">-- Pilih Project --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.prefix})</option>)}
                            </select>
                            <InputError message={errors.project_id} className="mt-1" />
                        </div>

                        {/* Department Selection */}
                        <div>
                            <InputLabel htmlFor="department_id" value="Pilih Departemen Spesifik" />
                            <select id="department_id" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50" value={data.department_id} onChange={e => setData('department_id', e.target.value)} disabled={!data.project_id} required>
                                <option value="">-- Pilih Departemen --</option>
                                {availableDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {availableDepartments.length === 0 && data.project_id && <p className="text-xs text-red-500 mt-1">Project ini belum memiliki departemen.</p>}
                            <InputError message={errors.department_id} className="mt-1" />
                        </div>

                        {/* Job Details */}
                        <div>
                            <InputLabel htmlFor="position" value="Jabatan / Posisi" />
                            <TextInput id="position" type="text" className="mt-1 block w-full" value={data.position} onChange={e => setData('position', e.target.value)} placeholder="Contoh: IT Support" required />
                            <InputError message={errors.position} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="employee_id" value="ID Karyawan di Client (Opsional)" />
                            <TextInput id="employee_id" type="text" className="mt-1 block w-full font-mono" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} placeholder="Nomor Induk internal perusahaan client" />
                            <InputError message={errors.employee_id} className="mt-1" />
                        </div>

                        {/* Dates & Status */}
                        <div>
                            <InputLabel htmlFor="hire_date" value="Tanggal Bergabung (Hire Date)" />
                            <TextInput id="hire_date" type="date" className="mt-1 block w-full" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} required />
                            <InputError message={errors.hire_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="termination_date" value="Tanggal Berakhir / Keluar" />
                            <TextInput id="termination_date" type="date" className="mt-1 block w-full" value={data.termination_date} onChange={e => setData('termination_date', e.target.value)} />
                            <p className="text-xs text-slate-500 mt-1">Kosongkan jika karyawan masih aktif di project ini.</p>
                            <InputError message={errors.termination_date} className="mt-1" />
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel htmlFor="status" value="Status Penempatan" />
                            <select id="status" className="mt-1 block w-full md:w-1/2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="active">Aktif</option>
                                <option value="contract expired">Habis Kontrak</option>
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
                        {processing ? 'Menyimpan...' : 'Simpan Penempatan'}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}