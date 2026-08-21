import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PlaceholderGuideModal from './PlaceholderGuideModal';

interface DocumentTemplate {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
    is_default: boolean;
    created_at: string;
}

interface Props extends PageProps {
    templates: DocumentTemplate[];
}

export default function Index({ auth, templates }: Props) {
    const [activeTab, setActiveTab] = useState<'kontrak' | 'surat_tugas' | 'paklaring'>('kontrak');
    const [showGuide, setShowGuide] = useState(false);

    const handleDelete = (id: number) => {
        if (confirm('Hapus template ini?')) {
            router.delete(route('document-templates.destroy', id), {
                onSuccess: () => alert('Template berhasil dihapus'),
                onError: () => alert('Gagal menghapus template'),
            });
        }
    };

    const handleToggleDefault = (template: DocumentTemplate) => {
        router.patch(route('document-templates.toggle-default', template.id), {
            is_default: !template.is_default,
        }, {
            preserveScroll: true,
        });
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            'kontrak_pkwt': 'Kontrak PKWT',
            'kontrak_part_time': 'Kontrak Part-Time',
            'kontrak_harian': 'Kontrak Harian',
            'kontrak_mitra': 'Kontrak Mitra',
            'surat_tugas': 'Surat Tugas',
            'paklaring_a': 'Paklaring A',
            'paklaring_b': 'Paklaring B',
        };
        return types[type] || type;
    };

    const filteredTemplates = templates.filter(t => {
        if (activeTab === 'kontrak') return ['kontrak_pkwt', 'kontrak_part_time', 'kontrak_harian', 'kontrak_mitra'].includes(t.type);
        if (activeTab === 'surat_tugas') return t.type === 'surat_tugas';
        if (activeTab === 'paklaring') return ['paklaring_a', 'paklaring_b'].includes(t.type);
        return false;
    });

    return (
        <AdminLayout
            title="Document Templates"
            header="Master Template Dokumen"
        >
            <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Daftar Template Global</h3>
                        <div className="flex items-center gap-3">
                            <SecondaryButton onClick={() => setShowGuide(true)} className="flex items-center gap-2">
                                <iconify-icon icon="solar:info-circle-linear" width="20"></iconify-icon>
                                Panduan Variabel
                            </SecondaryButton>
                            <Link href={route('document-templates.create')}>
                                <PrimaryButton className="flex items-center gap-2">
                                    <iconify-icon icon="solar:add-circle-linear" width="20"></iconify-icon>
                                    Upload Template Baru
                                </PrimaryButton>
                            </Link>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                        <button
                            onClick={() => setActiveTab('kontrak')}
                            className={`pb-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'kontrak' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Kontrak
                        </button>
                        <button
                            onClick={() => setActiveTab('surat_tugas')}
                            className={`pb-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'surat_tugas' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Surat Tugas
                        </button>
                        <button
                            onClick={() => setActiveTab('paklaring')}
                            className={`pb-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'paklaring' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Paklaring
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="pb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Nama Template</th>
                                    <th className="pb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Tipe</th>
                                    <th className="pb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    {auth.user.role !== 'PIC' && <th className="pb-3 text-sm font-semibold text-slate-600 dark:text-slate-400 text-center">Jadikan Default</th>}
                                    <th className="pb-3 text-sm font-semibold text-slate-600 dark:text-slate-400 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTemplates.length > 0 ? filteredTemplates.map((template) => (
                                    <tr key={template.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-4 text-sm text-slate-800 dark:text-slate-200">{template.name}</td>
                                        <td className="py-4 text-sm">
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">
                                                {getTypeLabel(template.type)}
                                            </span>
                                        </td>
                                        <td className="py-4 text-sm">
                                            {template.is_active ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-md">Aktif</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md">Non-Aktif</span>
                                            )}
                                        </td>
                                        {auth.user.role !== 'PIC' && (
                                            <td className="py-4 text-center">
                                                <button 
                                                    onClick={() => handleToggleDefault(template)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${template.is_default ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${template.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                        )}
                                        <td className="py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => window.open(route('document-templates.preview', template.id), '_blank')}
                                                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                                                    title="Unduh Format Placeholder"
                                                >
                                                    <iconify-icon icon="solar:download-minimalistic-bold" width="18"></iconify-icon>
                                                </button>
                                                <Link href={route('document-templates.edit', template.id)} className="p-2 text-primary hover:bg-primary/10 rounded-md" title="Edit HTML">
                                                    <iconify-icon icon="solar:pen-bold" width="18"></iconify-icon>
                                                </Link>
                                                {auth.user.role !== 'PIC' && (
                                                    <button onClick={() => handleDelete(template.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Hapus">
                                                        <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">Belum ada template di kategori ini.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <PlaceholderGuideModal show={showGuide} onClose={() => setShowGuide(false)} />
        </AdminLayout>
    );
}
