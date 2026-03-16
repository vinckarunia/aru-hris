import React, { useState, useEffect, Fragment } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { Dialog, Transition } from '@headlessui/react';

/**
 * Interface representing a Reminder record.
 */
interface Reminder {
    id: number;
    type: string;
    title: string;
    message: string | null;
    status: 'pending' | 'critical' | 'missed' | 'done';
    remind_at: string;
    deadline_at: string;
    dismissed_at: string | null;
    created_at: string;
}

/**
 * Interface for paginated reminder data coming from Laravel.
 */
interface PaginatedReminders {
    data: Reminder[];
    current_page: number;
    last_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

/**
 * Filter state interface.
 */
interface Filters {
    search: string;
    type: string;
    status: string;
    tab: 'active' | 'dismissed';
    sort_by: string;
    sort_dir: 'asc' | 'desc';
}

interface Props {
    reminders: PaginatedReminders;
    filters: Filters;
    typeOptions: Array<{ value: string; label: string }>;
}

/**
 * Reminders Index Page
 * 
 * Displays a comprehensive list of all system reminders with support for
 * search, filtering (by type and status), sorting, and pagination.
 * 
 * Also provides an action to "Tandai Selesai" or "Restore" individual reminders.
 */
export default function Index({ reminders, filters, typeOptions }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [currentType, setCurrentType] = useState(filters.type);
    const [currentStatus, setCurrentStatus] = useState(filters.status);
    const [currentTab, setCurrentTab] = useState(filters.tab || 'active');
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

    // Debounced search logic
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== filters.search) {
                applyFilters({ search: searchTerm });
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, filters.search]);

    const applyFilters = (newFilters: Partial<Filters>) => {
        router.get(route('reminders.index'), {
            search: filters.search,
            type: filters.type,
            status: filters.status,
            tab: filters.tab,
            sort_by: filters.sort_by,
            sort_dir: filters.sort_dir,
            ...newFilters,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSort = (field: string) => {
        const isAsc = filters.sort_by === field && filters.sort_dir === 'asc';
        applyFilters({
            sort_by: field,
            sort_dir: isAsc ? 'desc' : 'asc'
        });
    };

    const handleRefresh = () => {
        router.post(route('reminders.process'), {}, {
            preserveScroll: true,
            onStart: () => setIsProcessing(true),
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleDismiss = (id: number) => {
        if (confirm('Apakah Anda yakin ingin men-dismiss reminder ini?')) {
            router.post(route('reminders.dismiss', id), {}, {
                preserveScroll: true,
            });
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('Apakah Anda yakin ingin memulihkan reminder ini?')) {
            router.post(route('reminders.restore', id), {}, {
                preserveScroll: true,
            });
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: 'pending' | 'critical' | 'missed' | 'done') => {
        switch (status) {
            case 'missed':
                return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Missed</span>;
            case 'critical':
                return <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Critical</span>;
            case 'pending':
                return <span className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Pending</span>;
            case 'done':
                return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Done</span>;
            default:
                return null;
        }
    };

    const openModal = (reminder: Reminder) => {
        setSelectedReminder(reminder);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedReminder(null), 300); // clear after animation
    };

    return (
        <AdminLayout title="Manajemen Reminder" header="Manajemen Reminder">
            <Head title="Manajemen Reminder" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Reminder</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pantau dan kelola peringatan sistem.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-sm
                            ${isProcessing ? 'text-slate-400 dark:text-slate-500 cursor-wait' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <iconify-icon
                            icon={isProcessing ? "solar:refresh-circle-bold-duotone" : "solar:refresh-linear"}
                            width="18"
                            className={isProcessing ? "animate-spin text-primary" : ""}
                        ></iconify-icon>
                        <span className="font-medium">{isProcessing ? 'Memproses...' : 'Refresh'}</span>
                    </button>
                    {/* Manual job trigger button could be added here if needed */}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex w-full md:w-auto gap-4 flex-col sm:flex-row flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <iconify-icon icon="solar:magnifer-linear" className="text-slate-400"></iconify-icon>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari reminder..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Filter Type */}
                        <select
                            value={currentType}
                            onChange={(e) => {
                                setCurrentType(e.target.value);
                                applyFilters({ type: e.target.value });
                            }}
                            className="py-2 pl-3 pr-8 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">Semua Jenis</option>
                            {typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Filter Status */}
                        <select
                            value={currentStatus}
                            onChange={(e) => {
                                setCurrentStatus(e.target.value);
                                applyFilters({ status: e.target.value });
                            }}
                            className="py-2 pl-3 pr-8 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="critical">Critical</option>
                            <option value="missed">Missed</option>
                        </select>
                    </div>
                </div>

                {/* Status Tabs (Aktif/Ditandai Selesai) */}
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => {
                            setCurrentTab('active');
                            applyFilters({ tab: 'active' });
                        }}
                        className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentTab === 'active'
                            ? 'bg-white dark:bg-slate-800 text-primary dark:text-primary-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Aktif
                    </button>
                    <button
                        onClick={() => {
                            setCurrentTab('dismissed');
                            applyFilters({ tab: 'dismissed' });
                        }}
                        className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentTab === 'dismissed'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Ditandai Selesai
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleSort('deadline_at')}
                                >
                                    <div className="flex items-center gap-2">
                                        Deadline
                                        {filters.sort_by === 'deadline_at' && (
                                            <iconify-icon icon={filters.sort_dir === 'asc' ? 'solar:sort-from-bottom-to-top-linear' : 'solar:sort-from-top-to-bottom-linear'}></iconify-icon>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center gap-2">
                                        Jenis
                                        {filters.sort_by === 'type' && (
                                            <iconify-icon icon={filters.sort_dir === 'asc' ? 'solar:sort-from-bottom-to-top-linear' : 'solar:sort-from-top-to-bottom-linear'}></iconify-icon>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center gap-2">
                                        Informasi
                                        {filters.sort_by === 'title' && (
                                            <iconify-icon icon={filters.sort_dir === 'asc' ? 'solar:sort-from-bottom-to-top-linear' : 'solar:sort-from-top-to-bottom-linear'}></iconify-icon>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-2">
                                        Status
                                        {filters.sort_by === 'status' && (
                                            <iconify-icon icon={filters.sort_dir === 'asc' ? 'solar:sort-from-bottom-to-top-linear' : 'solar:sort-from-top-to-bottom-linear'}></iconify-icon>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {reminders.data.length > 0 ? (
                                reminders.data.map((reminder) => (
                                    <tr key={reminder.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {formatDate(reminder.deadline_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                {typeOptions.find(o => o.value === reminder.type)?.label || reminder.type}
                                            </span>
                                        </td>
                                        <td
                                            className="px-6 py-4 max-w-md cursor-pointer group-hover:bg-slate-100 dark:group-hover:bg-slate-600/50 transition-colors"
                                            onClick={() => openModal(reminder)}
                                            title="Klik untuk melihat detail lengkap"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold hover:text-primary dark:hover:text-primary-400 truncate">{reminder.title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{reminder.message}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(reminder.status)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {currentTab === 'active' ? (
                                                <button
                                                    onClick={() => handleDismiss(reminder.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white border border-emerald-200 hover:bg-emerald-600 hover:border-transparent rounded-lg transition-all dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-600 dark:hover:text-white"
                                                    title="Tandai peringatan ini selesai"
                                                >
                                                    <iconify-icon icon="solar:check-circle-line-duotone" width="16"></iconify-icon>
                                                    Tandai Selesai
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleRestore(reminder.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white border border-emerald-200 hover:bg-emerald-600 hover:border-transparent rounded-lg transition-all dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-600 dark:hover:text-white"
                                                    title="Kembalikan ke status aktif"
                                                >
                                                    <iconify-icon icon="solar:restart-linear" width="16"></iconify-icon>
                                                    Restore
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                                <iconify-icon icon="solar:bell-off-linear" width="32"></iconify-icon>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400">
                                                Tidak ada reminder yang {currentTab === 'active' ? 'aktif' : 'ditandai selesai'} dengan filter tersebut.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {reminders.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{reminders.data.length}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-300">{reminders.total}</span> data
                        </div>
                        <div className="flex gap-1">
                            {reminders.links.map((link, index) => {
                                // Strip HTML entities like &laquo; and &raquo;
                                const label = link.label.replace(/&[a-z]+;/gi, '').trim();
                                const isPrev = index === 0;
                                const isNext = index === reminders.links.length - 1;

                                return (
                                    <button
                                        key={index}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                        className={`
                                            px-3 py-1.5 min-w-[32px] rounded-lg text-sm font-medium transition-all flex items-center justify-center
                                            ${link.active ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'}
                                            ${!link.url ? 'opacity-50 cursor-not-allowed hidden sm:flex' : ''}
                                            ${(isPrev || isNext) && !link.url ? 'hidden' : ''}
                                        `}
                                    >
                                        {isPrev ? <iconify-icon icon="solar:alt-arrow-left-linear" width="16"></iconify-icon> :
                                            isNext ? <iconify-icon icon="solar:alt-arrow-right-linear" width="16"></iconify-icon> :
                                                label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Reminder Detail Modal */}
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-slate-100 dark:border-slate-700">
                                    {selectedReminder && (
                                        <>
                                            <div className="flex justify-between items-start mb-5">
                                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-slate-900 dark:text-white flex items-center gap-2">
                                                    <iconify-icon icon="solar:bell-bing-bold" className="text-primary"></iconify-icon>
                                                    Detail Reminder
                                                </Dialog.Title>
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-slate-50 dark:bg-slate-700 p-1.5 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    onClick={closeModal}
                                                >
                                                    <iconify-icon icon="solar:close-circle-line-duotone" width="20"></iconify-icon>
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                                        {selectedReminder.title}
                                                    </h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {selectedReminder.message}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis</span>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {typeOptions.find(o => o.value === selectedReminder.type)?.label || selectedReminder.type}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Deadline</span>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {formatDate(selectedReminder.deadline_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status Saat Ini</span>
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(selectedReminder.status)}
                                                        {currentTab === 'dismissed' && (
                                                            <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <iconify-icon icon="solar:eye-closed-linear"></iconify-icon>
                                                                Ditandai Selesai
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex justify-end">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none transition-colors"
                                                    onClick={closeModal}
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AdminLayout>
    );
}
