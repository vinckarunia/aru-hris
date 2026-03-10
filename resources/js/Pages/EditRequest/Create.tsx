import React, { useState, FormEventHandler } from 'react';
import WorkerLayout from '@/Layouts/WorkerLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

const BANK_OPTIONS = [
    { group: "Bank BUMN / HIMBARA", banks: ["Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)", "Bank Tabungan Negara (BTN)", "Bank Syariah Indonesia (BSI)"] },
    { group: "Bank Swasta", banks: ["BCA", "CIMB Niaga", "Bank Permata", "Bank Danamon", "Bank Mega", "Panin Bank", "OCBC NISP", "Maybank Indonesia", "BCA Syariah"] },
    { group: "Bank Pembangunan Daerah (BPD)", banks: ["Bank DKI", "Bank BJB", "Bank Jateng", "Bank Jatim"] },
    { group: "Bank Digital", banks: ["Bank Jago", "SeaBank", "Jenius (BTPN)", "Blu (BCA Digital)"] }
];
const FLAT_BANK_LIST = BANK_OPTIONS.flatMap(group => group.banks);

interface Worker {
    id: number; nik_aru: string | null; name: string; ktp_number: string; kk_number: string | null;
    birth_place: string | null; birth_date: string | null; gender: 'male' | 'female' | null; phone: string | null;
    education: string | null; religion: string | null; tax_status: string | null; address_ktp: string | null;
    address_domicile: string | null; mother_name: string | null; npwp: string | null; bpjs_kesehatan: string | null;
    bpjs_ketenagakerjaan: string | null; bank_name: string | null; bank_account_number: string | null;
    assignments?: any[];
}

interface Props {
    worker: Worker;
}

export default function Create({ worker }: Props) {
    // Get project id logic
    const activeAssignment = worker.assignments?.find(a => ['active', 'probation', 'extended'].includes(a.status));
    const defaultProjectId = activeAssignment?.project_id || worker.assignments?.[0]?.project_id || '';

    const initialBankDropdown = worker.bank_name
        ? (FLAT_BANK_LIST.includes(worker.bank_name) ? worker.bank_name : 'Lainnya')
        : '';
    const [bankDropdown, setBankDropdown] = useState<string>(initialBankDropdown);

    const { data: requestData, setData: setRequestData, post: postRequest, processing: requestProcessing } = useForm({
        project_id: defaultProjectId,
        requested_fields: ['FULL_PROFILE_SUBMITTED'],
        requested_data: {
            name: worker.name || '', ktp_number: worker.ktp_number || '', kk_number: worker.kk_number || '',
            birth_place: worker.birth_place || '', birth_date: worker.birth_date || '', gender: worker.gender || '',
            phone: worker.phone || '', education: worker.education || '', religion: worker.religion || '',
            tax_status: worker.tax_status || '', address_ktp: worker.address_ktp || '', address_domicile: worker.address_domicile || '',
            mother_name: worker.mother_name || '', npwp: worker.npwp || '', bpjs_kesehatan: worker.bpjs_kesehatan || '',
            bpjs_ketenagakerjaan: worker.bpjs_ketenagakerjaan || '', bank_name: worker.bank_name || '', bank_account_number: worker.bank_account_number || ''
        },
        notes: '',
    });

    const setRequestField = (key: string, value: string) => {
        setRequestData('requested_data', {
            ...requestData.requested_data,
            [key]: value
        });
    };

    const submitEditRequest: FormEventHandler = (e) => {
        e.preventDefault();
        // Since project_id is validated strictly by exists in DB, if worker has no project ever,
        // it may fail validation. But if required validation fails, Laravel returns with errors.
        // For project_id if it's strictly required but empty, it will throw validation error to UI.
        postRequest(route('edit-requests.store'));
    };

    return (
        <WorkerLayout title="Ajukan Perubahan Data" header="Form Pengajuan Perubahan Data">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 mb-6">
                <div className="mb-6 flex items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <iconify-icon icon="solar:document-add-bold" width="24"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                            Ajukan Perubahan Data Profil
                        </h2>
                        <p className="text-sm text-slate-500">
                            Data yang Anda ajukan di bawah ini tidak akan langsung memutakhirkan profil Anda. Form akan dikirim untuk proses validasi awal dan persetujuan oleh PIC/Admin. Setelah "Approved", profil otomatis ter-update.
                        </p>
                    </div>
                </div>

                {!requestData.project_id && (
                    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 rounded-xl text-sm flex gap-3 items-start">
                        <iconify-icon icon="solar:danger-triangle-bold" width="20" className="shrink-0 mt-0.5"></iconify-icon>
                        <p>Anda belum memiliki relasi dengan project apa pun. Untuk menyimpannya, mohon koordinasikan dengan Admin ARU agar ditugaskan minimal ke 1 project, sebab pengajuan ini memerlukan identitas atasan proyek Anda.</p>
                    </div>
                )}

                <form onSubmit={submitEditRequest} className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5">
                        <h3 className="text-md font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Informasi Pribadi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2">
                                <InputLabel htmlFor="req_name">Nama Lengkap (Sesuai KTP) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                                <TextInput id="req_name" type="text" className="mt-1 block w-full" value={requestData.requested_data.name} onChange={e => setRequestField('name', e.target.value)} required />
                            </div>

                            <div>
                                <InputLabel htmlFor="req_ktp_number">Nomor KTP (NIK) <span className="text-red-500 font-bold ml-1">*</span></InputLabel>
                                <TextInput id="req_ktp_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={requestData.requested_data.ktp_number} onChange={e => setRequestField('ktp_number', e.target.value.replace(/\D/g, ''))} required placeholder="16 digit angka" />
                            </div>
                            <div>
                                <InputLabel htmlFor="req_kk_number">Nomor Kartu Keluarga (KK)</InputLabel>
                                <TextInput id="req_kk_number" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={requestData.requested_data.kk_number} onChange={e => setRequestField('kk_number', e.target.value.replace(/\D/g, ''))} placeholder="16 digit angka" />
                            </div>
                            <div>
                                <InputLabel htmlFor="req_mother_name" value="Nama Ibu Kandung" />
                                <TextInput id="req_mother_name" type="text" className="mt-1 block w-full" value={requestData.requested_data.mother_name} onChange={e => setRequestField('mother_name', e.target.value)} />
                            </div>

                            <div>
                                <InputLabel htmlFor="req_birth_place" value="Tempat Lahir" />
                                <TextInput id="req_birth_place" type="text" className="mt-1 block w-full" value={requestData.requested_data.birth_place} onChange={e => setRequestField('birth_place', e.target.value)} />
                            </div>
                            <div>
                                <InputLabel htmlFor="req_birth_date" value="Tanggal Lahir" />
                                <TextInput id="req_birth_date" type="date" className="mt-1 block w-full" value={requestData.requested_data.birth_date} onChange={e => setRequestField('birth_date', e.target.value)} />
                            </div>
                            <div>
                                <InputLabel htmlFor="req_gender" value="Jenis Kelamin" />
                                <select id="req_gender" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.gender || 'male'} onChange={e => setRequestField('gender', e.target.value as 'male' | 'female')}>
                                    <option value="male">Laki-laki</option>
                                    <option value="female">Perempuan</option>
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="req_religion" value="Agama" />
                                <select id="req_religion" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.religion} onChange={e => setRequestField('religion', e.target.value)}>
                                    <option value="">-- Pilih --</option>
                                    <option value="Islam">Islam</option><option value="Kristen">Kristen</option><option value="Katolik">Katolik</option><option value="Hindu">Hindu</option><option value="Buddha">Buddha</option><option value="Konghucu">Konghucu</option><option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="req_education" value="Pendidikan Terakhir" />
                                <select id="req_education" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.education} onChange={e => setRequestField('education', e.target.value)}>
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
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5">
                            <h3 className="text-md font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Kontak & Domisili</h3>
                            <div className="space-y-4">
                                <div>
                                    <InputLabel htmlFor="req_phone" value="Nomor WhatsApp / HP" />
                                    <TextInput id="req_phone" type="text" className="mt-1 block w-full font-mono" value={requestData.requested_data.phone} onChange={e => setRequestField('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="req_address_ktp" value="Alamat Sesuai KTP" />
                                    <textarea id="req_address_ktp" rows={3} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.address_ktp} onChange={e => setRequestField('address_ktp', e.target.value)}></textarea>
                                </div>
                                <div>
                                    <InputLabel htmlFor="req_address_domicile" value="Alamat Domisili (Saat Ini)" />
                                    <textarea id="req_address_domicile" rows={3} className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.address_domicile} onChange={e => setRequestField('address_domicile', e.target.value)} placeholder="Kosongkan jika sama dengan KTP"></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5">
                            <h3 className="text-md font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Administrasi & Pembayaran</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="req_tax_status" value="Status PTKP (Pajak)" />
                                    <select id="req_tax_status" className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm" value={requestData.requested_data.tax_status} onChange={e => setRequestField('tax_status', e.target.value)}>
                                        <option value="">-- Pilih --</option>
                                        <option value="TK/0">TK/0</option><option value="TK/1">TK/1</option><option value="TK/2">TK/2</option><option value="TK/3">TK/3</option>
                                        <option value="K/0">K/0</option><option value="K/1">K/1</option><option value="K/2">K/2</option><option value="K/3">K/3</option>
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="req_npwp" value="Nomor NPWP" />
                                    <TextInput id="req_npwp" type="text" maxLength={16} className="mt-1 block w-full font-mono" value={requestData.requested_data.npwp} onChange={e => setRequestField('npwp', e.target.value.replace(/\D/g, ''))} placeholder="15/16 digit" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="req_bpjs_kes" value="No. BPJS Kesehatan" />
                                    <TextInput id="req_bpjs_kes" type="text" maxLength={13} className="mt-1 block w-full font-mono" value={requestData.requested_data.bpjs_kesehatan} onChange={e => setRequestField('bpjs_kesehatan', e.target.value.replace(/\D/g, ''))} placeholder="13 digit" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="req_bpjs_tk" value="No. BPJS Ketgj." />
                                    <TextInput id="req_bpjs_tk" type="text" maxLength={11} className="mt-1 block w-full font-mono" value={requestData.requested_data.bpjs_ketenagakerjaan} onChange={e => setRequestField('bpjs_ketenagakerjaan', e.target.value.replace(/\D/g, ''))} placeholder="11 digit" />
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-3 mt-2">
                                    <div>
                                        <InputLabel htmlFor="req_bank_dropdown" value="Nama Bank" />
                                        <select
                                            id="req_bank_dropdown"
                                            className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                                            value={bankDropdown}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setBankDropdown(val);
                                                if (val !== 'Lainnya') setRequestField('bank_name', val);
                                                else setRequestField('bank_name', '');
                                            }}
                                        >
                                            <option value="">-- Pilih Bank --</option>
                                            {BANK_OPTIONS.map((group, idx) => (
                                                <optgroup key={idx} label={group.group}>
                                                    {group.banks.map(b => <option key={b} value={b}>{b}</option>)}
                                                </optgroup>
                                            ))}
                                            <option value="Lainnya">Lainnya...</option>
                                        </select>
                                    </div>

                                    {bankDropdown === 'Lainnya' && (
                                        <div className="animate-fade-in-up">
                                            <InputLabel htmlFor="req_bank_name" value="Ketik Nama Bank" />
                                            <TextInput
                                                id="req_bank_name"
                                                type="text"
                                                className="mt-1 block w-full uppercase"
                                                value={requestData.requested_data.bank_name}
                                                onChange={e => setRequestField('bank_name', e.target.value.toUpperCase())}
                                                placeholder="Contoh: BANK NOBU"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <InputLabel htmlFor="req_account_number" value="Nomor Rekening" />
                                    <TextInput id="req_account_number" type="text" className="mt-1 block w-full font-mono" value={requestData.requested_data.bank_account_number} onChange={e => setRequestField('bank_account_number', e.target.value.replace(/\D/g, ''))} placeholder="Hanya angka" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <InputLabel htmlFor="req_notes" value="Keterangan / Alasan Perubahan Data (Opsional)" />
                        <textarea
                            id="req_notes"
                            value={requestData.notes}
                            onChange={(e) => setRequestData('notes', e.target.value)}
                            rows={3}
                            className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm text-sm"
                            placeholder="Contoh: Saya baru saja pindah domisili, atau KK saya dicantumkan nama baru..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <Link href={route('workers.index')} className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:text-slate-700 rounded-lg text-sm font-medium transition-colors">
                            Batal
                        </Link>
                        <PrimaryButton
                            disabled={requestProcessing}
                            className="bg-primary hover:bg-primary-dark text-white px-8 ml-2"
                        >
                            {requestProcessing ? 'Mengirim Data...' : 'Kirim Pengajuan Edit'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </WorkerLayout>
    );
}
