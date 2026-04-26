import React, { useRef, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

interface Branch { id: string; name: string; }
interface Project { id: string; name: string; prefix: string; branches: Branch[]; }
interface Worker { id: string; name: string; nik_aru: string | null; }

interface Props { worker: Worker; projects: Project[]; }

/**
 * Assignment Create Component
 * Form to assign a worker to a specific project and branch AND create the first contract in one step.
 */
export default function Create({ worker, projects }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        worker_id: worker.id,
        project_id: '',
        branch_ids: [] as string[],
        employee_id: '',
        position: '',
        hire_date: '',
        termination_date: '',
        status: 'active',
        // Contract Data
        contract_type: 'Kontrak',
        pkwt_type: 'PKWT',
        pkwt_number: '',
        start_date: '',
        end_date: '',
        duration_months: '',
        evaluation_notes: '',
        // Compensation Data
        base_salary: '',
        salary_rate: 'monthly',
        meal_allowance: '',
        transport_allowance: '',
        allowance: '',
        attendance_allowance: '',
        performance_bonus: '',
        allowance_rate: 'daily',
        overtime_weekday_rate: '',
        overtime_holiday_rate: '',
        overtime_rate: 'hourly',
    });

    // Dependent dropdown logic
    const selectedProject = projects.find(p => p.id.toString() === data.project_id);
    const availableBranches = selectedProject ? selectedProject.branches : [];

    /** Tracks which field was last edited to prevent loops between duration ↔ end_date. */
    const lastEditedBy = useRef<'dates' | 'duration' | null>(null);

    /** Effect A: manual end_date change → auto-calculate duration_months */
    useEffect(() => {
        if (lastEditedBy.current === 'duration') { lastEditedBy.current = null; return; }
        if (data.start_date && data.end_date && data.pkwt_type === 'PKWT' && data.contract_type !== 'Harian') {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            if (end >= start) {
                const e = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
                let months = (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
                if (e.getDate() < start.getDate()) months -= 1;
                lastEditedBy.current = 'dates';
                setData('duration_months', Math.max(months, 0).toString());
            } else {
                lastEditedBy.current = 'dates';
                setData('duration_months', '0');
            }
        } else if (!data.end_date) {
            lastEditedBy.current = 'dates';
            setData('duration_months', '');
        }
    }, [data.start_date, data.end_date, data.pkwt_type, data.contract_type]);

    /** Effect B: duration_months change → auto-calculate end_date */
    useEffect(() => {
        if (lastEditedBy.current === 'dates') { lastEditedBy.current = null; return; }
        if (data.start_date && data.duration_months && data.pkwt_type === 'PKWT' && data.contract_type !== 'Harian') {
            const months = parseInt(data.duration_months, 10);
            if (!isNaN(months) && months > 0) {
                const start = new Date(data.start_date);
                const endDate = new Date(start.getFullYear(), start.getMonth() + months, start.getDate() - 1);
                const yyyy = endDate.getFullYear();
                const mm = String(endDate.getMonth() + 1).padStart(2, '0');
                const dd = String(endDate.getDate()).padStart(2, '0');
                lastEditedBy.current = 'duration';
                setData('end_date', `${yyyy}-${mm}-${dd}`);
            }
        }
    }, [data.duration_months, data.start_date, data.pkwt_type, data.contract_type]);

    /** Auto-sync hire_date → start_date when hire_date changes */
    useEffect(() => {
        if (data.hire_date && !data.start_date) {
            setData('start_date', data.hire_date);
        }
    }, [data.hire_date]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('assignments.store'));
    };

    const handleNumberInput = (field: any, value: string) => {
        setData(field, value.replace(/\D/g, ''));
    };

    return (
        <AdminLayout title={`Tambah Penempatan - ${worker.name}`} header="Penempatan Baru">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Penempatan: {worker.name}</h2>
                    <p className="text-sm text-slate-500">Form penempatan karyawan ke Project & Cabang beserta kontrak pertama.</p>
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
                        {errors.termination_date || 'Gagal menyimpan. Periksa isian form yang berwarna merah.'}
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                {/* Assignment Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <iconify-icon icon="solar:buildings-bold" className="text-primary" width="20"></iconify-icon>
                        <h3 className="font-bold text-slate-800 dark:text-white">Detail Penempatan</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Project Selection */}
                        <div>
                            <InputLabel htmlFor="project_id">Pilih Project <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <select id="project_id" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" value={data.project_id} onChange={e => { setData('project_id', e.target.value); setData('branch_ids', []); }} required>
                                <option value="">-- Pilih Project --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.prefix})</option>)}
                            </select>
                            <InputError message={errors.project_id} className="mt-1" />
                        </div>

                        {/* Branch Selection */}
                        <div>
                            <InputLabel htmlFor="branch_ids">Pilih Cabang (Bisa Pilih &gt;1) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
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

                        {/* Job Details */}
                        <div>
                            <InputLabel htmlFor="position" value="Jabatan / Posisi" />
                            <TextInput id="position" type="text" className="mt-1 block w-full" value={data.position} onChange={e => setData('position', e.target.value)} placeholder="Contoh: IT Support" />
                            <InputError message={errors.position} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="employee_id" value="ID Karyawan di Client" />
                            <TextInput id="employee_id" type="text" className="mt-1 block w-full font-mono" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} placeholder="Nomor Induk internal perusahaan client" />
                            <InputError message={errors.employee_id} className="mt-1" />
                        </div>

                        {/* Dates & Status */}
                        <div>
                            <InputLabel htmlFor="hire_date">Tanggal Bergabung (Hire Date) {data.contract_type !== 'Harian' && <span className="text-red-500 font-bold ml-1">*</span>}</InputLabel>
                            <TextInput id="hire_date" type="date" className="mt-1 block w-full" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} required={data.contract_type !== 'Harian'} />
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
                                <option value="contract expired">Contract Expired</option>
                                <option value="project closed">Project Closed</option>
                                <option value="resign">Resign</option>
                                <option value="fired">Fraud</option>
                                <option value="other">Lainnya</option>
                            </select>
                            <InputError message={errors.status} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Contract Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <iconify-icon icon="solar:document-text-bold" className="text-primary" width="20"></iconify-icon>
                        <h3 className="font-bold text-slate-800 dark:text-white">Kontrak Pertama</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <InputLabel htmlFor="contract_type" value="Jenis Kontrak" />
                            <select id="contract_type" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700" value={data.contract_type} onChange={e => { const t = e.target.value; setData('contract_type', t); if (t === 'Harian') setData('pkwt_type', ''); else if (!data.pkwt_type) setData('pkwt_type', 'PKWT'); }}>
                                <option value="Kontrak">Contract</option>
                                <option value="Harian">Harian</option>
                            </select>
                            <InputError message={errors.contract_type} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pkwt_type" value="Status Ketenagakerjaan" />
                            <select id="pkwt_type" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.pkwt_type} onChange={e => setData('pkwt_type', e.target.value)} disabled={data.contract_type === 'Harian'}>
                                <option value="" disabled={data.contract_type !== 'Harian'}>Harian</option>
                                <option value="PKWT">PKWT</option>
                                <option value="PKWTT">PKWTT</option>
                            </select>
                            <InputError message={errors.pkwt_type} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pkwt_number" value="PKWT Ke-" />
                            <TextInput id="pkwt_number" type="number" className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.pkwt_number} onChange={e => setData('pkwt_number', e.target.value)} disabled={data.contract_type === 'PKWTT' || data.contract_type === 'Harian'} placeholder="Opsional — Contoh: 1" />
                            <InputError message={errors.pkwt_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="start_date">Tanggal Mulai Kontrak {data.contract_type !== 'Harian' && <span className="text-red-500 font-bold ml-1">*</span>}</InputLabel>
                            <TextInput id="start_date" type="date" className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.start_date} onChange={e => setData('start_date', e.target.value)} required={data.contract_type !== 'Harian'} />
                            <InputError message={errors.start_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="end_date" value="Tanggal Berakhir Kontrak" />
                            <TextInput id="end_date" type="date" className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.end_date} onChange={e => { lastEditedBy.current = null; setData('end_date', e.target.value); }} disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'} />
                            <p className="text-xs text-slate-500 mt-1">Kosongkan jika PKWTT</p>
                            <InputError message={errors.end_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="duration_months" value="Durasi (Bulan)" />
                            <TextInput id="duration_months" type="number" className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.duration_months} onChange={e => { lastEditedBy.current = null; setData('duration_months', e.target.value.replace(/\D/g, '')); }} disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'} placeholder="Contoh: 3" min="1" />
                            <p className="text-xs text-slate-500 mt-1">Isi bulan untuk auto-hitung tanggal berakhir</p>
                            <InputError message={errors.duration_months} className="mt-1" />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <InputLabel htmlFor="evaluation_notes" value="Evaluasi Kontrak" />
                            <textarea id="evaluation_notes" rows={2} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700" value={data.evaluation_notes} onChange={e => setData('evaluation_notes', e.target.value)} placeholder="Catatan opsional..."></textarea>
                            <InputError message={errors.evaluation_notes} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Compensation Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
                        <iconify-icon icon="solar:wad-of-money-bold" className="text-emerald-600" width="20"></iconify-icon>
                        <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Rincian Gaji dan Tunjangan</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1">
                        {/* Salary */}
                        <div className="space-y-4 mb-10">
                            <h4 className="font-bold text-slate-700 border-b pb-2 dark:text-slate-300">Gaji Pokok</h4>
                            <div>
                                <div className="flex flex-row items-center gap-1">
                                    <InputLabel htmlFor="base_salary" value="Nominal Gaji Pokok" /><span className="text-red-500">*</span>
                                </div>
                                <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                    <span className="text-slate-500 sm:text-sm">Rp</span>
                                    <TextInput id="base_salary" type="text" className="block w-full font-mono" value={data.base_salary} onChange={e => handleNumberInput('base_salary', e.target.value)} required placeholder="0" />
                                </div>
                                <InputError message={errors.base_salary} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="salary_rate" value="Hitungan Gaji Pokok" />
                                <select id="salary_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.salary_rate} onChange={e => setData('salary_rate', e.target.value)}>
                                    <option value="monthly">Bulanan</option>
                                    <option value="daily">Harian</option>
                                    <option value="hourly">Per Jam</option>
                                </select>
                                <InputError message={errors.salary_rate} className="mt-1" />
                            </div>
                        </div>

                        {/* Allowance */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 border-b pb-2 dark:text-slate-300">Tunjangan & Lembur</h4>
                            <div>
                                <InputLabel htmlFor="allowance" value="Tunjangan" />
                                <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                    <span className="text-slate-500 sm:text-sm">Rp</span>
                                    <TextInput id="allowance" type="text" className="mt-1 block w-full font-mono" value={data.allowance} onChange={e => handleNumberInput('allowance', e.target.value)} placeholder="0" />
                                </div>
                                <InputError message={errors.allowance} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div>
                                    <InputLabel htmlFor="meal_allowance" value="Uang Makan" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="meal_allowance" type="text" className="mt-1 block w-full font-mono" value={data.meal_allowance} onChange={e => handleNumberInput('meal_allowance', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.meal_allowance} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="transport_allowance" value="Uang Transport" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="transport_allowance" type="text" className="mt-1 block w-full font-mono" value={data.transport_allowance} onChange={e => handleNumberInput('transport_allowance', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.transport_allowance} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="attendance_allowance" value="Uang Kehadiran" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="attendance_allowance" type="text" className="mt-1 block w-full font-mono" value={data.attendance_allowance} onChange={e => handleNumberInput('attendance_allowance', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.attendance_allowance} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="performance_bonus" value="Insentif Kinerja" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="performance_bonus" type="text" className="mt-1 block w-full font-mono" value={data.performance_bonus} onChange={e => handleNumberInput('performance_bonus', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.performance_bonus} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <InputLabel htmlFor="allowance_rate" value="Hitungan Tunjangan" />
                                <select id="allowance_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.allowance_rate} onChange={e => setData('allowance_rate', e.target.value)}>
                                    <option value="daily">Harian</option>
                                    <option value="monthly">Bulanan</option>
                                </select>
                                <InputError message={errors.allowance_rate} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <InputLabel htmlFor="overtime_weekday_rate" value="Rate Lembur Weekday" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="overtime_weekday_rate" type="text" className="mt-1 block w-full font-mono" value={data.overtime_weekday_rate} onChange={e => handleNumberInput('overtime_weekday_rate', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.overtime_weekday_rate} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="overtime_holiday_rate" value="Rate Lembur Weekend/Libur" />
                                    <div className="flex flex-row items-center gap-2 mt-1 relative rounded-md shadow-sm">
                                        <span className="text-slate-500 sm:text-sm">Rp</span>
                                        <TextInput id="overtime_holiday_rate" type="text" className="mt-1 block w-full font-mono" value={data.overtime_holiday_rate} onChange={e => handleNumberInput('overtime_holiday_rate', e.target.value)} placeholder="0" />
                                    </div>
                                    <InputError message={errors.overtime_holiday_rate} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <InputLabel htmlFor="overtime_rate" value="Hitungan Lembur" />
                                <select id="overtime_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.overtime_rate} onChange={e => setData('overtime_rate', e.target.value)}>
                                    <option value="hourly">Per Jam</option>
                                    <option value="daily">Harian</option>
                                </select>
                                <InputError message={errors.overtime_rate} className="mt-1" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pb-10">
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 transition-colors">
                        {processing ? 'Menyimpan...' : 'Simpan Penempatan & Kontrak'}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}