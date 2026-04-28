    import React from 'react';
import { Head, Link } from '@inertiajs/react';

/**
 * Error messages mapped by HTTP status code.
 */
const ERROR_MAP: Record<number, { title: string; message: string; icon: string }> = {
    403: {
        title: 'Akses Ditolak',
        message: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
        icon: 'solar:shield-warning-bold',
    },
    404: {
        title: 'Halaman Tidak Ditemukan',
        message: 'Halaman yang Anda cari tidak ada atau telah dipindahkan.',
        icon: 'solar:map-arrow-square-bold',
    },
    419: {
        title: 'Sesi Kedaluwarsa',
        message: 'Sesi Anda telah berakhir. Silakan muat ulang halaman.',
        icon: 'solar:clock-circle-bold',
    },
    429: {
        title: 'Terlalu Banyak Permintaan',
        message: 'Anda telah mengirim terlalu banyak permintaan. Coba lagi nanti.',
        icon: 'solar:traffic-economy-bold',
    },
    500: {
        title: 'Kesalahan Server',
        message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
        icon: 'solar:server-bold',
    },
    503: {
        title: 'Sedang Dalam Pemeliharaan',
        message: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
        icon: 'solar:settings-bold',
    },
};

/**
 * Props for the Error page component.
 */
interface ErrorPageProps {
    status: number;
}

/**
 * Error Page Component
 *
 * Renders a user-friendly error page with an icon, title, message, and a
 * button to navigate back to the dashboard.
 *
 * @param {ErrorPageProps} props - The component props containing the HTTP status code.
 * @returns {JSX.Element} The rendered error page.
 */
export default function Error({ status }: ErrorPageProps) {
    const error = ERROR_MAP[status] || {
        title: 'Terjadi Kesalahan',
        message: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
        icon: 'solar:danger-triangle-bold',
    };

    return (
        <>
            <Head title={`${status} - ${error.title}`} />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    {/* Icon */}
                    <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
                        <iconify-icon icon={error.icon} width="48" className="text-primary"></iconify-icon>
                    </div>

                    {/* Status Code */}
                    <h1 className="text-7xl font-black text-primary mb-2 tracking-tight">{status}</h1>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">{error.title}</h2>

                    {/* Message */}
                    <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{error.message}</p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/"
                            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary/25 flex items-center gap-2"
                        >
                            <iconify-icon icon="solar:home-2-bold" width="18"></iconify-icon>
                            Kembali ke Dashboard
                        </Link>
                        <button
                            onClick={() => window.history.back()}
                            className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                            <iconify-icon icon="solar:arrow-left-linear" width="18"></iconify-icon>
                            Kembali
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
