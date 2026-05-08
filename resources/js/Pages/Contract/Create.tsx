import React, { useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

/**
 * This component is used for creating a new contract for a specific assignment. It includes form fields for contract details and compensation information. The form data is managed using Inertia's useForm hook, and it handles validation errors returned from the server. The component also calculates the duration of the contract in months based on the start and end dates, if applicable.
 */
interface Assignment {
    id: string;
    worker: { id: string; name: string; nik_aru: string; };
    project: { name: string; prefix: string; } | null;
    branch: { name: string; } | null;
    position: string;
}

interface Props {
    assignment: Assignment;
    suggestedStartDate?: string;
    suggestedPkwtNumber?: number | null;
}

/**
 * Create component renders a form to create a new contract for a given assignment. It handles form state, validation, and submission using Inertia's useForm hook. The component also includes logic to calculate contract duration based on start and end dates, and conditionally enables/disables fields based on the selected contract type.
 * 
 * @param {Props} props - The component props containing the assignment details.
 * @returns {JSX.Element} The rendered Create Contract form.
 */
export default function Create({ assignment, suggestedStartDate, suggestedPkwtNumber }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        assignment_id: assignment.id,
        // Contract Data
        contract_type: 'Kontrak',
        pkwt_type: 'PKWT',
        pkwt_number: suggestedPkwtNumber != null ? suggestedPkwtNumber.toString() : '',
        start_date: suggestedStartDate || '',
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

    /**
     * Tracks which field was last edited to prevent infinite loops between
     * the two useEffects that sync duration_months ↔ end_date.
     */
    const lastEditedBy = useRef<'dates' | 'duration' | null>(null);

    /**
     * Effect A: When user manually edits end_date (or start_date), auto-calculate duration_months.
     */
    useEffect(() => {
        if (lastEditedBy.current === 'duration') {
            lastEditedBy.current = null;
            return;
        }
        if (data.start_date && data.end_date && data.pkwt_type === 'PKWT' && data.contract_type !== 'Harian') {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);

            if (end >= start) {
                const e = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
                let months = (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
                if (e.getDate() < start.getDate()) {
                    months -= 1;
                }
                const diffMonths = Math.max(months, 0);
                lastEditedBy.current = 'dates';
                setData('duration_months', diffMonths.toString());
            } else {
                lastEditedBy.current = 'dates';
                setData('duration_months', '0');
            }
        } else if (!data.end_date) {
            lastEditedBy.current = 'dates';
            setData('duration_months', '');
        }
    }, [data.start_date, data.end_date, data.pkwt_type, data.contract_type]);

    /**
     * Effect B: When user types duration_months, auto-calculate end_date = start_date + N months - 1 day.
     */
    useEffect(() => {
        if (lastEditedBy.current === 'dates') {
            lastEditedBy.current = null;
            return;
        }
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('contracts.store'));
    };

    const handleNumberInput = (field: any, value: string) => {
        setData(field, value.replace(/\D/g, ''));
    };

    return (
        <AdminLayout title={`Buat Kontrak - ${assignment.worker.name}`} header="Buat Kontrak Baru">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Buat Kontrak: {assignment.worker.name}</h2>
                    <p className="text-sm text-slate-500">Penempatan: {assignment.position} di {assignment.project?.name || 'Project Tidak Ditemukan'}</p>
                </div>
                <Link href={route('assignments.show', assignment.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

            {(suggestedStartDate || suggestedPkwtNumber != null) && (
                <div className="mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800/30 flex items-start gap-3 text-sky-600 dark:text-sky-400">
                    <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                    <div className="text-sm font-medium">
                        {suggestedStartDate && <p>Tanggal mulai otomatis diisi berdasarkan kontrak sebelumnya (hari setelah berakhirnya kontrak terakhir).</p>}
                        {suggestedPkwtNumber != null && <p>Nomor PKWT otomatis dilanjutkan dari kontrak sebelumnya (PKWT ke-{suggestedPkwtNumber}).</p>}
                    </div>
                </div>
            )}

            {Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 flex items-start gap-3 text-red-600">
                    <iconify-icon icon="solar:danger-triangle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                    <div className="text-sm font-medium">Gagal menyimpan kontrak. Periksa isian form yang berwarna merah.</div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                {/* Contract Data */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <iconify-icon icon="solar:document-text-bold" className="text-primary" width="20"></iconify-icon>
                        <h3 className="font-bold text-slate-800 dark:text-white">Informasi Legal Kontrak</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <InputLabel htmlFor="contract_type" value="Jenis Kontrak" />
                            <select
                                id="contract_type"
                                className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700"
                                value={data.contract_type}
                                onChange={e => {
                                    const type = e.target.value;
                                    setData('contract_type', type);
                                    if (type === 'Harian') {
                                        setData('pkwt_type', '');
                                    } else if (!data.pkwt_type) {
                                        setData('pkwt_type', 'PKWT');
                                    }
                                }}
                            >
                                <option value="Kontrak">Contract</option>
                                <option value="Harian">Harian</option>
                            </select>
                            <InputError message={errors.contract_type} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pkwt_type" value="Status Ketenagakerjaan" />
                            <select
                                id="pkwt_type"
                                className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                value={data.pkwt_type}
                                onChange={e => setData('pkwt_type', e.target.value)}
                                disabled={data.contract_type === 'Harian'}
                            >
                                <option value="" disabled={data.contract_type !== 'Harian'}>Harian</option>
                                <option value="PKWT">PKWT</option>
                                <option value="PKWTT">PKWTT</option>
                            </select>
                            <InputError message={errors.pkwt_type} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pkwt_number" value="PKWT Ke-" />
                            <TextInput
                                id="pkwt_number"
                                type="number"
                                className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                value={data.pkwt_number}
                                onChange={e => setData('pkwt_number', e.target.value)}
                                disabled={data.contract_type === 'PKWTT' || data.contract_type === 'Harian'}
                                placeholder="Opsional — Contoh: 1"
                            />
                            <InputError message={errors.pkwt_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="start_date">Tanggal Mulai Kontrak <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="start_date" type="date" className="mt-1 block w-full" value={data.start_date} onChange={e => setData('start_date', e.target.value)} required />
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
                            <TextInput
                                id="duration_months"
                                type="number"
                                className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                value={data.duration_months}
                                onChange={e => { lastEditedBy.current = null; setData('duration_months', e.target.value.replace(/\D/g, '')); }}
                                disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'}
                                placeholder="Contoh: 3"
                                min="1"
                            />
                            <p className="text-xs text-slate-500 mt-1">Isi bulan untuk auto-hitung tanggal berakhir, atau sebaliknya</p>
                            <InputError message={errors.duration_months} className="mt-1" />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <InputLabel htmlFor="evaluation_notes" value="Evaluasi Kontrak" />
                            <textarea id="evaluation_notes" rows={2} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700" value={data.evaluation_notes} onChange={e => setData('evaluation_notes', e.target.value)} placeholder="Catatan opsional..."></textarea>
                            <InputError message={errors.evaluation_notes} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Salary and Allowance */}
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
                                <div className="grid grid-cols-2 gap-4 pt-4">
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
                                <InputLabel htmlFor="overtime_rate" value=" Hitungan Lembur" />
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
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base shadow-lg shadow-primary/30 bg-primary hover:bg-primary-dark transition-colors">
                        {processing ? 'Menyimpan...' : 'Simpan Kontrak & Gaji'}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}
