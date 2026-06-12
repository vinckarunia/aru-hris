import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

/**
 * Interface representing the complete InternalEmployee data structure.
 */
interface InternalEmployee {
    id: string;
    nik_aru: string | null;
    name: string;
    ktp_number: string;
    kk_number: string | null;
    birth_place: string | null;
    birth_date: string | null;
    gender: string | null;
    phone: string | null;
    education: string | null;
    religion: string | null;
    tax_status: string | null;
    address_ktp: string | null;
    address_domicile: string | null;
    mother_name: string | null;
    npwp: string | null;
    bpjs_kesehatan: string | null;
    bpjs_ketenagakerjaan: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    position: string | null;
    department: string | null;
    join_date: string | null;
    status: string;
}

interface Props {
    employee: InternalEmployee;
}

/**
 * Predefined bank options grouped by category for the bank selection dropdown.
 * The flat list is used to determine if the employee's current bank is in the predefined options.
 */
const BANK_OPTIONS = [
    { group: "Bank BUMN / HIMBARA", banks: ["Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)", "Bank Tabungan Negara (BTN)", "Bank Syariah Indonesia (BSI)"] },
    { group: "Bank Swasta", banks: ["BCA", "CIMB Niaga", "Bank Permata", "Bank Danamon", "Bank Mega", "Panin Bank", "OCBC NISP", "Maybank Indonesia", "BCA Syariah"] },
    { group: "Bank Pembangunan Daerah (BPD)", banks: ["Bank DKI", "Bank BJB", "Bank Jateng", "Bank Jatim"] },
    { group: "Bank Digital", banks: ["Bank Jago", "SeaBank", "Jenius (BTPN)", "Blu (BCA Digital)"] }
];

const FLAT_BANK_LIST = BANK_OPTIONS.flatMap(group => group.banks);

/**
 * Internal Employee Edit Page Component
 *
 * Provides a comprehensive form to update an existing internal employee's data.
 */
export default function Edit({ employee }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        nik_aru: employee.nik_aru || '',
        name: employee.name || '',
        ktp_number: employee.ktp_number || '',
        kk_number: employee.kk_number || '',
        birth_place: employee.birth_place || '',
        birth_date: employee.birth_date || '',
        gender: employee.gender || '',
        phone: employee.phone || '',
        education: employee.education || '',
        religion: employee.religion || '',
        tax_status: employee.tax_status || '',
        address_ktp: employee.address_ktp || '',
        address_domicile: employee.address_domicile || '',
        mother_name: employee.mother_name || '',
        npwp: employee.npwp || '',
        bpjs_kesehatan: employee.bpjs_kesehatan || '',
        bpjs_ketenagakerjaan: employee.bpjs_ketenagakerjaan || '',
        bank_name: employee.bank_name || '',
        bank_account_number: employee.bank_account_number || '',
        position: employee.position || '',
        department: employee.department || '',
        join_date: employee.join_date || '',
        status: employee.status || 'active',
    });

    const initialBankDropdown = employee.bank_name
        ? (FLAT_BANK_LIST.includes(employee.bank_name) ? employee.bank_name : 'Lainnya')
        : '';
    const [bankDropdown, setBankDropdown] = useState<string>(initialBankDropdown);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('internal-employees.update', employee.id));
    };

    return (
        <AdminLayout title={`Edit Karyawan Internal - ${employee.name}`} header="Edit Data Karyawan Internal">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Data: {employee.name}</h2>
                    <p className="text-sm text-slate-500">Perbarui informasi detail karyawan internal di bawah ini.</p>
                </div>
                <Link href={route('internal-employees.index')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                    <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon> Batal
                </Link>
            </div>

            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30 flex items-start gap-3 text-red-600 dark:text-red-400">
                <iconify-icon icon="solar:info-circle-bold" width="20" className="mt-0.5 shrink-0"></iconify-icon>
                <div className="text-sm font-medium">Kolom dengan tanda bintang (<span className="text-red-500 font-bold">*</span>) wajib diisi. Pastikan nomor identitas (KTP, KK, BPJS) diisi sesuai dengan jumlah digit resminya.</div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                {/* Section 0: Position & Employment */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Kepegawaian</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <InputLabel htmlFor="nik_aru">NIK ARU</InputLabel>
                            <TextInput id="nik_aru" type="text" className="mt-1 block w-full" value={data.nik_aru} onChange={e => setData('nik_aru', e.target.value)} placeholder="Nomor induk karyawan" />
                            <InputError message={errors.nik_aru} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="position">Jabatan</InputLabel>
                            <TextInput id="position" type="text" className="mt-1 block w-full" value={data.position} onChange={e => setData('position', e.target.value)} placeholder="Contoh: HR Manager" />
                            <InputError message={errors.position} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="department">Divisi / Bagian</InputLabel>
                            <TextInput id="department" type="text" className="mt-1 block w-full" value={data.department} onChange={e => setData('department', e.target.value)} placeholder="Contoh: HRD" />
                            <InputError message={errors.department} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="join_date" value="Tanggal Masuk Kerja" />
                            <TextInput id="join_date" type="date" className="mt-1 block w-full" value={data.join_date} onChange={e => setData('join_date', e.target.value)} />
                            <InputError message={errors.join_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="status" value="Status Kepegawaian" />
                            <select id="status" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="active">Aktif</option>
                                <option value="inactive">Non-Aktif</option>
                                <option value="resign">Resign</option>
                            </select>
                            <InputError message={errors.status} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Section 1: Personal Information */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Pribadi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2">
                            <InputLabel htmlFor="name">Nama Lengkap (Sesuai KTP) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div></div>

                        <div>
                            <InputLabel htmlFor="ktp_number">Nomor KTP (NIK) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                            <TextInput id="ktp_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={data.ktp_number} onChange={e => setData('ktp_number', e.target.value.replace(/\D/g, ''))} required placeholder="16 digit angka" />
                            <InputError message={errors.ktp_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="kk_number">Nomor Kartu Keluarga (KK)</InputLabel>
                            <TextInput id="kk_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={data.kk_number} onChange={e => setData('kk_number', e.target.value.replace(/\D/g, ''))} placeholder="16 digit angka" />
                            <InputError message={errors.kk_number} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="mother_name" value="Nama Ibu Kandung" />
                            <TextInput id="mother_name" type="text" className="mt-1 block w-full" value={data.mother_name} onChange={e => setData('mother_name', e.target.value)} />
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
                                <option value="Islam">Islam</option><option value="Kristen">Kristen</option><option value="Katolik">Katolik</option><option value="Hindu">Hindu</option><option value="Buddha">Buddha</option><option value="Konghucu">Konghucu</option><option value="Lainnya">Lainnya</option>
                            </select>
                            <InputError message={errors.religion} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="education" value="Pendidikan Terakhir" />
                            <select id="education" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={data.education} onChange={e => setData('education', e.target.value)}>
                                <option value="">-- Pilih Jenjang --</option>
                                <option value="SD">SD / Sederajat</option>
                                <option value="SMP">SMP / Sederajat</option>
                                <option value="SMA/SMK">SMA / SMK / Sederajat</option>
                                <option value="D1">Diploma 1 (D1)</option>
                                <option value="D2">Diploma 2 (D2)</option>
                                <option value="D3">Diploma 3 (D3)</option>
                                <option value="D4">Diploma 4 (D4)</option>
                                <option value="S1">Strata 1 (S1)</option>
                                <option value="S2">Strata 2 (S2)</option>
                                <option value="S3">Strata 3 (S3)</option>
                            </select>
                            <InputError message={errors.education} className="mt-1" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Contact & Domicile */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Kontak & Domisili</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="phone" value="Nomor WhatsApp / HP" />
                            <TextInput id="phone" type="text" className="mt-1 block w-full md:w-1/2 font-mono" value={data.phone} onChange={e => setData('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
                            <InputError message={errors.phone} className="mt-1" />
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
                                <option value="TK/0">TK/0</option><option value="TK/1">TK/1</option><option value="TK/2">TK/2</option><option value="TK/3">TK/3</option>
                                <option value="K/0">K/0</option><option value="K/1">K/1</option><option value="K/2">K/2</option><option value="K/3">K/3</option>
                            </select>
                            <InputError message={errors.tax_status} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="npwp" value="Nomor NPWP" />
                            <TextInput id="npwp" type="text" maxLength={50} className="mt-1 block w-full font-mono" value={data.npwp} onChange={e => setData('npwp', e.target.value)} placeholder="Nomor NPWP" />
                            <InputError message={errors.npwp} className="mt-1" />
                        </div>
                        <div></div>

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

                <div className="flex justify-end gap-4 pb-10">
                    <PrimaryButton disabled={processing} className="px-8 py-2 rounded-xl text-base bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/30 transition-all">
                        {processing ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}
