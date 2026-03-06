import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import AdminLayout from '@/Layouts/AdminLayout';

interface Worker {
    id: number;
    name: string;
}

interface Project {
    id: number;
    name: string;
}

interface EditRequest {
    id: number;
    worker_id: number;
    project_id: number;
    requested_by: number;
    requested_fields: string[];
    notes: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: number | null;
    review_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    worker: Worker;
    project: Project;
    requester: { id: number; name: string };
    reviewer: { id: number; name: string } | null;
}

export default function EditRequestIndex({ editRequests }: PageProps<{ editRequests: EditRequest[] }>) {
    const { auth } = usePage<PageProps>().props;
    const isWorker = auth.user.role === 'WORKER';

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingRequest, setReviewingRequest] = useState<EditRequest | null>(null);

    const { data, setData, put, processing, errors, reset } = useForm<{
        status: 'approved' | 'rejected';
        review_notes: string;
    }>({
        status: 'approved',
        review_notes: '',
    });

    const openReviewModal = (req: EditRequest) => {
        setReviewingRequest(req);
        setData({
            status: 'approved',
            review_notes: '',
        });
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewingRequest) return;

        put(route('edit-requests.review', reviewingRequest.id), {
            onSuccess: () => {
                setIsReviewModalOpen(false);
                setReviewingRequest(null);
                reset();
            },
        });
    };

    // Format human readable fields
    const formatFields = (fields: string[]) => {
        return fields.map(f => f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ');
    };

    return (
        <AdminLayout title="Edit Request" header="Edit Request">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Pengajuan Perubahan Data Karyawan</h1>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Karyawan</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Data yang Ingin Diubah</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                            {editRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">Belum ada history request edit.</td>
                                </tr>
                            ) : editRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                        {new Date(req.created_at).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {req.worker?.name || 'Tidak diketahui'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {req.project?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs truncate" title={formatFields(req.requested_fields)}>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">Kolom:</span> {formatFields(req.requested_fields)}
                                        </div>
                                        {req.notes && (
                                            <div className="max-w-xs truncate text-xs text-slate-500 mt-1" title={req.notes}>
                                                <span className="italic">"{req.notes}"</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                            {req.status === 'pending' && <iconify-icon icon="solar:clock-circle-linear" width="14"></iconify-icon>}
                                            {req.status === 'approved' && <iconify-icon icon="solar:check-circle-linear" width="14"></iconify-icon>}
                                            {req.status === 'rejected' && <iconify-icon icon="solar:close-circle-linear" width="14"></iconify-icon>}
                                            {req.status === 'pending' ? 'Menunggu Review' :
                                                req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {req.status === 'pending' && !isWorker ? (
                                            <button
                                                onClick={() => openReviewModal(req)}
                                                className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                            >
                                                Review
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openReviewModal(req)}
                                                className="text-slate-500 hover:text-slate-700 text-xs transition-colors underline"
                                            >
                                                Lihat Detail
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            {isReviewModalOpen && reviewingRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold">
                                {reviewingRequest.status === 'pending' && !isWorker ? 'Review Request Edit' : 'Detail Request Edit'}
                            </h3>
                            <button type="button" onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 mb-1">Karyawan</p>
                                    <p className="font-medium">{reviewingRequest.worker?.name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Project Terkait</p>
                                    <p className="font-medium">{reviewingRequest.project?.name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Tanggal Diajukan</p>
                                    <p className="font-medium">{new Date(reviewingRequest.created_at).toLocaleString('id-ID')}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Status</p>
                                    <p className="font-medium capitalize">{reviewingRequest.status}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-semibold mb-2">Data yang ingin diubah:</h4>
                                <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 mb-4">
                                    {reviewingRequest.requested_fields.map((f, i) => (
                                        <li key={i}>{f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</li>
                                    ))}
                                </ul>

                                <h4 className="text-sm font-semibold mb-1">Keterangan / Alasan dari Karyawan:</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line italic">
                                    {reviewingRequest.notes || 'Tidak ada keterangan tambahan.'}
                                </p>
                            </div>

                            {reviewingRequest.status !== 'pending' && (
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-sm mt-4">
                                    <p className="text-slate-500 mb-1">Direview oleh: <span className="font-medium text-slate-800 dark:text-slate-200">{reviewingRequest.reviewer?.name || '-'}</span> pada {reviewingRequest.reviewed_at ? new Date(reviewingRequest.reviewed_at).toLocaleString('id-ID') : '-'}</p>
                                    <h4 className="font-semibold text-slate-700 mt-2">Catatan Reviewer:</h4>
                                    <p className="text-slate-600 bg-slate-100 p-2 rounded mt-1 italic">{reviewingRequest.review_notes || '-'}</p>
                                </div>
                            )}

                            {reviewingRequest.status === 'pending' && !isWorker && (
                                <form id="reviewRequestForm" onSubmit={handleReviewSubmit} className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2">Keputusan Keputusan PIC</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="approved" checked={data.status === 'approved'} onChange={() => setData('status', 'approved')} className="text-emerald-600 focus:ring-emerald-500" />
                                                <span className="text-sm font-medium text-emerald-700">Setujui</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" value="rejected" checked={data.status === 'rejected'} onChange={() => setData('status', 'rejected')} className="text-rose-600 focus:ring-rose-500" />
                                                <span className="text-sm font-medium text-rose-700">Tolak</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Catatan Review (Cth: Minta dokumen pendukung)</label>
                                        <textarea
                                            value={data.review_notes}
                                            onChange={e => setData('review_notes', e.target.value)}
                                            rows={3}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
                                            placeholder="Tambahkan pesan untuk karyawan..."
                                        />
                                    </div>
                                    {data.status === 'approved' && (
                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                                            <iconify-icon icon="solar:info-circle-linear" width="16" className="mt-0.5 shrink-0"></iconify-icon>
                                            <p>Catatan: Menyetujui request ini <strong>TIDAK</strong> akan mengubah data secara otomatis di sistem. Anda atau ARU tetap perlu mengupdate profil terkait secara manual di menu Karyawan setelah menyetujui request ini dan menerima data barunya.</p>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Tutup</button>
                            {reviewingRequest.status === 'pending' && !isWorker && (
                                <button type="submit" form="reviewRequestForm" disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium disabled:opacity-50">Kirim Keputusan</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
