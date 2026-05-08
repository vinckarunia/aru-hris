import React, { useRef, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps } from '@/types';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

/**
 * Predefined bank options grouped by category for the bank selection dropdown.
 */
const BANK_OPTIONS = [
    { group: "Bank BUMN / HIMBARA", banks: ["Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)", "Bank Tabungan Negara (BTN)", "Bank Syariah Indonesia (BSI)"] },
    { group: "Bank Swasta", banks: ["BCA", "CIMB Niaga", "Bank Permata", "Bank Danamon", "Bank Mega", "Panin Bank", "OCBC NISP", "Maybank Indonesia", "BCA Syariah"] },
    { group: "Bank Pembangunan Daerah (BPD)", banks: ["Bank DKI", "Bank BJB", "Bank Jateng", "Bank Jatim"] },
    { group: "Bank Digital", banks: ["Bank Jago", "SeaBank", "Jenius (BTPN)", "Blu (BCA Digital)"] }
];

/**
 * Worker Create Page Component
 *
 * Provides a comprehensive form to register a new worker in the HRIS.
 */
interface Branch {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
    branches?: Branch[];
}

interface CreateProps extends PageProps {
    picProjects?: Project[];
    validationDigits?: Record<string, number>;
    validationEnums?: Record<string, { value: string; label: string; enabled: boolean }[]>;
}

export default function Create({ picProjects = [], validationDigits, validationEnums }: CreateProps) {
    const { auth } = usePage<PageProps>().props;
    const isPic = auth.user.role === 'PIC';

    const digits = validationDigits ?? { ktp: 16, kk: 16, npwp: 16, bpjs_kes: 13, bpjs_tk: 11 };
    const enums = validationEnums ?? {};
    const enabledOptions = (key: string) => (enums[key] || []).filter(i => i.enabled);

    const { data, setData, post, processing, errors } = useForm({
        nik_aru: '', name: '', ktp_number: '', kk_number: '', birth_place: '',
        birth_date: '', gender: '', phone: '', email: '', education: '', religion: '',
        tax_status: '', address_ktp: '', address_domicile: '', mother_name: '',
        npwp: '', bpjs_kesehatan: '', bpjs_ketenagakerjaan: '', bank_name: '', bank_account_number: '',
        project_id: '',
        branch_ids: [] as string[],
        position: '',
        hire_date: '',
        employee_id: '',
        contract_type: 'Kontrak',
        pkwt_type: 'PKWT',
        pkwt_number: '',
        start_date: '',
        end_date: '',
        duration_months: '',
        evaluation_notes: '',
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

    /** Get the branches belonging to the currently selected project. */
    const selectedProjectBranches = picProjects.find(p => p.id.toString() === data.project_id)?.branches ?? [];

    const [bankDropdown, setBankDropdown] = useState<string>('');

    const lastEditedBy = useRef<'dates' | 'duration' | null>(null);

    useEffect(() => {
        if (!isPic) return;
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
            } else { lastEditedBy.current = 'dates'; setData('duration_months', '0'); }
        } else if (!data.end_date) { lastEditedBy.current = 'dates'; setData('duration_months', ''); }
    }, [data.start_date, data.end_date, data.pkwt_type, data.contract_type]);

    useEffect(() => {
        if (!isPic) return;
        if (lastEditedBy.current === 'dates') { lastEditedBy.current = null; return; }
        if (data.start_date && data.duration_months && data.pkwt_type === 'PKWT' && data.contract_type !== 'Harian') {
            const m = parseInt(data.duration_months, 10);
            if (!isNaN(m) && m > 0) {
                const s = new Date(data.start_date);
                const ed = new Date(s.getFullYear(), s.getMonth() + m, s.getDate() - 1);
                lastEditedBy.current = 'duration';
                setData('end_date', `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`);
            }
        }
    }, [data.duration_months, data.start_date, data.pkwt_type, data.contract_type]);

    useEffect(() => {
        if (isPic && data.hire_date && !data.start_date) setData('start_date', data.hire_date);
    }, [data.hire_date]);

    const handleNumberInput = (field: any, value: string) => setData(field, value.replace(/\D/g, ''));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('workers.store'));
    };

    return (
        <AdminLayout title="Tambah Karyawan Baru" header="Data Karyawan">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tambah Karyawan Baru</h2>
                    <p className="text-sm text-slate-500">Silakan lengkapi form pendaftaran karyawan di bawah ini.</p>
                </div>
                <Link href={route('workers.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Kembali
                </Link>
            </div>

            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30 flex items-start gap-3 text-red-600 dark:text-red-400">
                <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                <div className="text-sm font-medium">Kolom dengan tanda bintang (<span className="text-red-500 font-bold">*</span>) wajib diisi. Pastikan nomor identitas (KTP, KK, NPWP, BPJS) diisi sesuai dengan jumlah digit resminya.</div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                {/* Section 0: Assignment Details (PIC Only) */}
                {isPic && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                            Detail Penempatan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-2">
                                <InputLabel htmlFor="project_id">Project / Site <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                                <select
                                    id="project_id"
                                    className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                                    value={data.project_id}
                                    onChange={e => {
                                        setData(prev => ({ ...prev, project_id: e.target.value, branch_ids: [] }));
                                    }}
                                    required
                                >
                                    <option value="">-- Pilih Project --</option>
                                    {picProjects.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                    ))}
                                </select>
                                <InputError message={errors.project_id} className="mt-1" />
                            </div>
                            <div className="md:col-span-2">
                                <InputLabel htmlFor="branch_ids">Cabang Penempatan (Bisa Pilih &gt;1)</InputLabel>
                                <div className="mt-1 block w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-900 rounded-md shadow-sm xl:max-h-48 max-h-32 overflow-y-auto p-2">
                                    {selectedProjectBranches.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                            {selectedProjectBranches.map(b => (
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
                                <InputError message={(errors as any).branch_ids} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="position">Jabatan</InputLabel>
                                <TextInput
                                    id="position"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={data.position}
                                    onChange={e => setData('position', e.target.value)}
                                    placeholder="Contoh: Security"
                                />
                                <InputError message={(errors as any).position} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="hire_date">Tanggal Bergabung {data.contract_type !== 'Harian' && <span className="text-red-500 font-bold ml-1">*</span>}</InputLabel>
                                <TextInput id="hire_date" type="date" className="mt-1 block w-full" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} required={data.contract_type !== 'Harian'} />
                                <InputError message={(errors as any).hire_date} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="employee_id">ID Karyawan Client</InputLabel>
                                <TextInput id="employee_id" type="text" className="mt-1 block w-full font-mono" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)} placeholder="Opsional" />
                                <InputError message={(errors as any).employee_id} className="mt-1" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 1: Personal Information */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Pribadi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2">
                            <InputLabel htmlFor="name">Nama Lengkap (Sesuai KTP) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="nik_aru">NIK ARU</InputLabel>
                            <TextInput id="nik_aru" type="text" className="mt-1 block w-full bg-slate-100 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700" value={data.nik_aru} disabled placeholder="Auto-generated saat Assignment" title="Dibuat otomatis oleh sistem saat penempatan project" />
                            <InputError message={errors.nik_aru} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="ktp_number">Nomor KTP (NIK) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="ktp_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={data.ktp_number} onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setData(prev => ({
                                    ...prev,
                                    ktp_number: val,
                                    npwp: val,
                                }));
                            }} required placeholder="16 digit angka" />
                            <InputError message={errors.ktp_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="kk_number">Nomor Kartu Keluarga (KK)</InputLabel>
                            <TextInput id="kk_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={data.kk_number} onChange={e => setData('kk_number', e.target.value.replace(/\D/g, ''))} placeholder="16 digit angka" />
                            <InputError message={errors.kk_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="mother_name">Nama Ibu Kandung <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="mother_name" type="text" className="mt-1 block w-full" value={data.mother_name} onChange={e => setData('mother_name', e.target.value)} required />
                            <InputError message={errors.mother_name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="birth_place" value="Tempat Lahir" />
                            <TextInput id="birth_place" type="text" className="mt-1 block w-full" value={data.birth_place} onChange={e => setData('birth_place', e.target.value)} />
                            <InputError message={errors.birth_place} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="birth_date" value="Tanggal Lahir" />
                            <TextInput id="birth_date" type="date" className="mt-1 block w-full" value={data.birth_date} onChange={e => setData('birth_date', e.target.value)} />
                            <InputError message={errors.birth_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="gender" value="Jenis Kelamin" />
                            <select id="gender" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.gender || ''} onChange={e => setData('gender', e.target.value as 'male' | 'female')}>
                                <option value="">-- Pilih --</option>
                                <option value="male">Laki-laki</option>
                                <option value="female">Perempuan</option>
                            </select>
                            <InputError message={errors.gender} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="religion" value="Agama" />
                            <select id="religion" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.religion} onChange={e => setData('religion', e.target.value)}>
                                <option value="">-- Pilih --</option>
                                {enabledOptions('religion').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <InputError message={errors.religion} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="education" value="Pendidikan Terakhir" />
                            <select id="education" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.education} onChange={e => setData('education', e.target.value)}>
                                <option value="">-- Pilih Jenjang --</option>
                                {enabledOptions('education').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <InputError message={errors.education} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Contact & Domicile */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Kontak & Domisili</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <InputLabel htmlFor="phone" value="Nomor WhatsApp / HP" />
                            <TextInput id="phone" type="text" className="mt-1 block w-full font-mono" value={data.phone} onChange={e => setData('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
                            <InputError message={errors.phone} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput id="email" type="email" className="mt-1 block w-full" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="contoh@email.com" />
                            <InputError message={errors.email} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="address_ktp" value="Alamat Sesuai KTP" />
                            <textarea id="address_ktp" rows={3} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.address_ktp} onChange={e => setData('address_ktp', e.target.value)}></textarea>
                            <InputError message={errors.address_ktp} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="address_domicile" value="Alamat Domisili (Saat Ini)" />
                            <textarea id="address_domicile" rows={3} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.address_domicile} onChange={e => setData('address_domicile', e.target.value)} placeholder="Kosongkan jika sama dengan KTP"></textarea>
                            <InputError message={errors.address_domicile} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Section 3: Administrative & Bank */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Administrasi & Pembayaran</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <InputLabel htmlFor="tax_status" value="Status PTKP (Pajak)" />
                            <select id="tax_status" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.tax_status} onChange={e => setData('tax_status', e.target.value)}>
                                <option value="">-- Pilih --</option>
                                {enabledOptions('tax_status').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <InputError message={errors.tax_status} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="npwp">Nomor NPWP <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">Sama dengan NIK</span></InputLabel>
                            <TextInput id="npwp" type="text" maxLength={16} className="mt-1 block w-full font-mono bg-slate-50 dark:bg-slate-900/50" value={data.npwp} onChange={e => setData('npwp', e.target.value.replace(/\D/g, ''))} placeholder="Otomatis dari NIK" readOnly />
                            <InputError message={errors.npwp} className="mt-1" />
                        </div>
                        <div></div> {/* Empty div for grid alignment */}

                        <div>
                            <InputLabel htmlFor="bpjs_kesehatan" value="No. BPJS Kesehatan" />
                            <TextInput id="bpjs_kesehatan" type="text" maxLength={13} className="mt-1 block w-full font-mono" value={data.bpjs_kesehatan} onChange={e => setData('bpjs_kesehatan', e.target.value.replace(/\D/g, ''))} placeholder="13 digit" />
                            <InputError message={errors.bpjs_kesehatan} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="bpjs_ketenagakerjaan" value="No. BPJS Ketenagakerjaan" />
                            <TextInput id="bpjs_ketenagakerjaan" type="text" maxLength={11} className="mt-1 block w-full font-mono" value={data.bpjs_ketenagakerjaan} onChange={e => setData('bpjs_ketenagakerjaan', e.target.value.replace(/\D/g, ''))} placeholder="11 digit" />
                            <InputError message={errors.bpjs_ketenagakerjaan} className="mt-1" />
                        </div>
                        <div></div>

                        <div className="flex flex-col gap-3">
                            <div>
                                <InputLabel htmlFor="bank_dropdown" value="Nama Bank" />
                                <select
                                    id="bank_dropdown"
                                    className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                                    value={bankDropdown}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setBankDropdown(val);
                                        if (val !== 'Lainnya') setData('bank_name', val);
                                        else setData('bank_name', '');
                                    }}
                                >
                                    <option value="">-- Pilih Bank --</option>
                                    {BANK_OPTIONS.map((group, idx) => (
                                        <optgroup key={idx} label={group.group}>
                                            {group.banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                                        </optgroup>
                                    ))}
                                    <option value="Lainnya">Lainnya...</option>
                                </select>
                            </div>

                            {bankDropdown === 'Lainnya' && (
                                <div className="animate-fade-in-up">
                                    <InputLabel htmlFor="bank_name" value="Ketik Nama Bank" />
                                    <TextInput
                                        id="bank_name"
                                        type="text"
                                        className="mt-1 block w-full uppercase"
                                        value={data.bank_name}
                                        onChange={e => setData('bank_name', e.target.value.toUpperCase())}
                                        placeholder="Contoh: BANK NOBU"
                                        autoFocus
                                    />
                                </div>
                            )}
                            <InputError message={errors.bank_name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="bank_account_number" value="Nomor Rekening" />
                            <TextInput id="bank_account_number" type="text" className="mt-1 block w-full font-mono" value={data.bank_account_number} onChange={e => setData('bank_account_number', e.target.value.replace(/\D/g, ''))} placeholder="Hanya angka" />
                            <InputError message={errors.bank_account_number} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* PIC: Contract + Compensation Section */}
                {isPic && (<>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <iconify-icon icon="solar:document-text-bold" class="text-primary" width="20"></iconify-icon>
                            <h3 className="font-bold text-slate-800 dark:text-white">Kontrak Pertama</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div>
                                <InputLabel htmlFor="contract_type" value="Jenis Kontrak" />
                                <select id="contract_type" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700" value={data.contract_type} onChange={e => { const t = e.target.value; setData('contract_type', t); if (t === 'Harian') setData('pkwt_type', ''); else if (!data.pkwt_type) setData('pkwt_type', 'PKWT'); }}>
                                    <option value="Kontrak">Contract</option><option value="Harian">Harian</option>
                                </select>
                                <InputError message={(errors as any).contract_type} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="pkwt_type" value="Status Ketenagakerjaan" />
                                <select id="pkwt_type" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50" value={data.pkwt_type} onChange={e => setData('pkwt_type', e.target.value)} disabled={data.contract_type === 'Harian'}>
                                    <option value="" disabled={data.contract_type !== 'Harian'}>Harian</option><option value="PKWT">PKWT</option><option value="PKWTT">PKWTT</option>
                                </select>
                                <InputError message={(errors as any).pkwt_type} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="pkwt_number" value="PKWT Ke-" />
                                <TextInput id="pkwt_number" type="number" className="mt-1 block w-full disabled:opacity-50" value={data.pkwt_number} onChange={e => setData('pkwt_number', e.target.value)} placeholder="Opsional" />
                                <InputError message={(errors as any).pkwt_number} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="start_date">Tanggal Mulai Kontrak {data.contract_type !== 'Harian' && <span className="text-red-500 font-bold ml-1">*</span>}</InputLabel>
                                <TextInput id="start_date" type="date" className="mt-1 block w-full" value={data.start_date} onChange={e => setData('start_date', e.target.value)} required={data.contract_type !== 'Harian'} />
                                <InputError message={(errors as any).start_date} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="end_date" value="Tanggal Berakhir Kontrak" />
                                <TextInput id="end_date" type="date" className="mt-1 block w-full disabled:opacity-50" value={data.end_date} onChange={e => { lastEditedBy.current = null; setData('end_date', e.target.value); }} disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'} />
                                <InputError message={(errors as any).end_date} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="duration_months" value="Durasi (Bulan)" />
                                <TextInput id="duration_months" type="number" className="mt-1 block w-full disabled:opacity-50" value={data.duration_months} onChange={e => { lastEditedBy.current = null; setData('duration_months', e.target.value.replace(/\D/g, '')); }} disabled={data.pkwt_type === 'PKWTT' || data.contract_type === 'Harian'} placeholder="Contoh: 3" min="1" />
                                <p className="text-xs text-slate-500 mt-1">Isi bulan untuk auto-hitung tanggal berakhir</p>
                                <InputError message={(errors as any).duration_months} className="mt-1" />
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <InputLabel htmlFor="evaluation_notes" value="Catatan Evaluasi" />
                                <textarea id="evaluation_notes" rows={2} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-700" value={data.evaluation_notes} onChange={e => setData('evaluation_notes', e.target.value)} placeholder="Opsional..."></textarea>
                                <InputError message={(errors as any).evaluation_notes} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
                            <iconify-icon icon="solar:wad-of-money-bold" class="text-emerald-600" width="20"></iconify-icon>
                            <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Rincian Gaji dan Tunjangan</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-4 pb-10 border-b border-slate-100 dark:border-slate-700">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <div className="flex items-center gap-1"><InputLabel htmlFor="base_salary" value="Gaji Pokok" /><span className="text-red-500">*</span></div>
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="base_salary" type="text" className="block w-full font-mono" value={data.base_salary} onChange={e => handleNumberInput('base_salary', e.target.value)} required placeholder="0" /></div>
                                        <InputError message={(errors as any).base_salary} className="mt-1" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="salary_rate" value="Hitungan Gaji" />
                                        <select id="salary_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.salary_rate} onChange={e => setData('salary_rate', e.target.value)}>
                                            <option value="monthly">Bulanan</option><option value="daily">Harian</option><option value="hourly">Per Jam</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pb-10 border-b border-slate-100 dark:border-slate-700">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <InputLabel htmlFor="allowance" value="Tunjangan" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="allowance" type="text" className="block w-full font-mono" value={data.allowance} onChange={e => handleNumberInput('allowance', e.target.value)} placeholder="0" /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="meal_allowance" value="Uang Makan" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="meal_allowance" type="text" className="block w-full font-mono" value={data.meal_allowance} onChange={e => handleNumberInput('meal_allowance', e.target.value)} placeholder="0" /></div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="transport_allowance" value="Transport" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="transport_allowance" type="text" className="block w-full font-mono" value={data.transport_allowance} onChange={e => handleNumberInput('transport_allowance', e.target.value)} placeholder="0" /></div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="attendance_allowance" value="Kehadiran" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="attendance_allowance" type="text" className="block w-full font-mono" value={data.attendance_allowance} onChange={e => handleNumberInput('attendance_allowance', e.target.value)} placeholder="0" /></div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="performance_bonus" value="Insentif" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="performance_bonus" type="text" className="block w-full font-mono" value={data.performance_bonus} onChange={e => handleNumberInput('performance_bonus', e.target.value)} placeholder="0" /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <InputLabel htmlFor="allowance_rate" value="Hitungan Tunjangan" />
                                        <select id="allowance_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.allowance_rate} onChange={e => setData('allowance_rate', e.target.value)}><option value="daily">Harian</option><option value="monthly">Bulanan</option></select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="overtime_weekday_rate" value="Lembur Weekday" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="overtime_weekday_rate" type="text" className="block w-full font-mono" value={data.overtime_weekday_rate} onChange={e => handleNumberInput('overtime_weekday_rate', e.target.value)} placeholder="0" /></div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="overtime_holiday_rate" value="Lembur Weekend" />
                                        <div className="flex items-center gap-2 mt-1"><span className="text-slate-500 text-sm">Rp</span><TextInput id="overtime_holiday_rate" type="text" className="block w-full font-mono" value={data.overtime_holiday_rate} onChange={e => handleNumberInput('overtime_holiday_rate', e.target.value)} placeholder="0" /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <InputLabel htmlFor="overtime_rate" value="Hitungan Lembur" />
                                        <select id="overtime_rate" className="mt-1 block w-full rounded-md border-slate-300 dark:bg-slate-900" value={data.overtime_rate} onChange={e => setData('overtime_rate', e.target.value)}><option value="hourly">Per Jam</option><option value="daily">Harian</option></select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>)}

                <div className="flex justify-end gap-4 pb-10">
                    <Link href={route('workers.index')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">
                        Batal
                    </Link>
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/30 transition-all">
                        {processing ? 'Menyimpan...' : (isPic ? 'Ajukan Data Karyawan + Kontrak' : 'Simpan Data Karyawan')}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}