import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

interface DocumentTemplate {
    id: number;
    name: string;
    type: string;
    file_path: string | null;
}

interface Props extends PageProps {
    template: DocumentTemplate;
}

export default function Edit({ auth, template }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        name: template.name,
        type: template.type,
        file: null as File | null,
    });

    const [fileName, setFileName] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('document-templates.update', template.id), {
            onSuccess: () => alert('Template berhasil diperbarui'),
            onError: () => alert('Gagal memperbarui template'),
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
            if (!isDocx) {
                alert('Hanya file DOCX yang diperbolehkan!');
                e.target.value = '';
                setData('file', null);
                setFileName('');
                return;
            }
            setData('file', file);
            setFileName(file.name);
        }
    };

    return (
        <AdminLayout
            title="Edit Template"
            header="Edit Template Dokumen"
        >
            <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg border border-slate-200 dark:border-slate-800 p-6 max-w-4xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <Link href={route('document-templates.index')}>
                            <SecondaryButton className="mb-4 flex items-center gap-2">
                                <iconify-icon icon="solar:alt-arrow-left-linear" width="18"></iconify-icon>
                                Kembali
                            </SecondaryButton>
                        </Link>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Re-Upload Template</h3>
                        <p className="text-sm text-slate-500">Ubah nama atau unggah dokumen Word (.docx) baru untuk menimpa template yang ada.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <InputLabel htmlFor="name" value="Nama Template" />
                            <TextInput 
                                id="name"
                                value={data.name} 
                                onChange={(e) => setData('name', e.target.value)} 
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="type" value="Tipe Dokumen" />
                            <select
                                id="type"
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                                className="mt-1 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                                required
                            >
                                <option value="kontrak_pkwt">Kontrak PKWT</option>
                                <option value="kontrak_part_time">Kontrak Part-Time</option>
                                <option value="kontrak_harian">Kontrak Harian</option>
                                <option value="surat_tugas">Surat Tugas</option>
                                <option value="paklaring_a">Paklaring A</option>
                                <option value="paklaring_b">Paklaring B</option>
                            </select>
                            <InputError message={errors.type} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Timpa File Dokumen (.docx)" />
                        <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:hover:border-slate-600 transition-all relative overflow-hidden group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <iconify-icon icon="solar:upload-square-bold-duotone" width="32" className="text-primary mb-2"></iconify-icon>
                                {fileName ? (
                                    <p className="text-sm font-semibold text-primary">{fileName}</p>
                                ) : (
                                    <>
                                        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="font-semibold text-primary">Klik untuk memilih</span> atau seret file ke sini
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500">Microsoft Word Document (.docx)</p>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">Biarkan kosong jika tidak ingin mengubah file dokumen, dan hanya mengubah nama.</p>
                        <InputError message={errors.file as string} className="mt-2" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <PrimaryButton 
                            type="submit" 
                            disabled={processing}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
