import React from 'react';
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
    id: number;
    worker: { id: number; name: string; nik_aru: string; };
    project: { name: string; prefix: string; };
    branch: { name: string; };
    position: string;
}

interface Props {
    assignment: Assignment;
}

/**
 * Create component renders a form to create a new contract for a given assignment. It handles form state, validation, and submission using Inertia's useForm hook. The component also includes logic to calculate contract duration based on start and end dates, and conditionally enables/disables fields based on the selected contract type.
 * 
 * @param {Props} props - The component props containing the assignment details.
 * @returns {JSX.Element} The rendered Create Contract form.
 */
export default function Create({ assignment }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        assignment_id: assignment.id,
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
        allowance_rate: 'daily',
        overtime_weekday_rate: '',
        overtime_holiday_rate: '',
        overtime_rate: 'hourly',
    });

    // Calculate contract duration in months when start_date, end_date, pkwt_type, or contract_type changes
    useEffect(() => {
        if (data.start_date && data.end_date && data.pkwt_type === 'PKWT' && data.contract_type !== 'Harian') {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);

            if (end >= start) {
                const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const diffMonths = Math.round(diffDays / 30.437);

                setData('duration_months', diffMonths.toString());
            } else {
                setData('duration_months', '0');
            }
        } else {
            setData('duration_months', '');
        }
    }, [data.start_date, data.end_date, data.pkwt_type, data.contract_type]);

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
                    <p className="text-sm text-slate-500">Penempatan: {assignment.position} di {assignment.project.name}</p>
                </div>
                <Link href={route('assignments.show', assignment.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

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
                                placeholder="Contoh: PKWT 1 isi dengan 1"
                                required min="1"
                            />
                            <InputError message={errors.pkwt_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="start_date" value="Tanggal Mulai Kontrak" />
                            <TextInput id="start_date" type="date" className="mt-1 block w-full" value={data.start_date} onChange={e => setData('start_date', e.target.value)} required />
                            <InputError message={errors.start_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="end_date" value="Tanggal Berakhir Kontrak" />
                            <TextInput id="end_date" type="date" className="mt-1 block w-full disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800" value={data.end_date} onChange={e => setData('end_date', e.target.value)} disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'} />
                            <p className="text-xs text-slate-500 mt-1">Kosongkan jika PKWTT</p>
                            <InputError message={errors.end_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="duration_months" value="Durasi (Bulan)" />
                            <TextInput
                                id="duration_months"
                                type="text"
                                className="mt-1 block w-full bg-slate-100 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700"
                                value={data.duration_months ? `${data.duration_months} Bulan` : ''}
                                disabled
                                placeholder="-"
                            />
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
                            <h4 className="font-bold text-slate-700 border-b pb-2">Gaji Pokok</h4>
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
                            <h4 className="font-bold text-slate-700 border-b pb-2">Tunjangan & Lembur</h4>
                            <div className="grid grid-cols-2 gap-4">
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