import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import StatusBadge from '@/Components/StatusBadge';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

/**
 * Interface representing an internal employee of PT. ARU.
 */
interface InternalEmployee {
    id: string;
    nik_aru: string | null;
    name: string;
    ktp_number: string;
    birth_date: string | null;
    phone: string | null;
    gender: 'male' | 'female' | null;
    position: string | null;
    department: string | null;
    join_date: string | null;
    status: 'active' | 'inactive' | 'resign';
}

/**
 * Props for the InternalEmployee Index component.
 */
interface Props {
    employees: InternalEmployee[];
}

/** Number of employees displayed per page. */
const PER_PAGE = 10;

/**
 * Internal Employee Index Page Component
 *
 * Displays a table list of all registered internal employees of PT. ARU.
 * Provides search, filter by status, sorting, and CRUD actions.
 */
export default function Index({ employees }: Props) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [selectedEmployee, setSelectedEmployee] = useState<InternalEmployee | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const { delete: destroy, processing } = useForm();

    // Search + Filter logic
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (emp.nik_aru && emp.nik_aru.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesStatus = true;
        if (filterStatus !== 'all') {
            matchesStatus = emp.status === filterStatus;
        }

        return matchesSearch && matchesStatus;
    });

    /** Handles sorting logic for regular and shift-clicks (multi-sort). */
    const handleSort = (key: string, e: React.MouseEvent) => {
        setSortConfigs(prevConfigs => {
            const existingIndex = prevConfigs.findIndex(config => config.key === key);
            let newConfigs = [...prevConfigs];

            if (e.shiftKey) {
                if (existingIndex >= 0) {
                    if (newConfigs[existingIndex].direction === 'asc') {
                        newConfigs[existingIndex].direction = 'desc';
                    } else {
                        newConfigs.splice(existingIndex, 1);
                    }
                } else {
                    newConfigs.push({ key, direction: 'asc' });
                }
            } else {
                if (existingIndex >= 0) {
                    if (newConfigs.length === 1 && newConfigs[0].direction === 'asc') {
                        newConfigs = [{ key, direction: 'desc' }];
                    } else if (newConfigs.length === 1 && newConfigs[0].direction === 'desc') {
                        newConfigs = [];
                    } else {
                        newConfigs = [{ key, direction: 'asc' }];
                    }
                } else {
                    newConfigs = [{ key, direction: 'asc' }];
                }
            }
            return newConfigs;
        });
    };

    /** Retrieves the value from an employee object based on a key path. */
    const getSortValue = (emp: InternalEmployee, key: string): any => {
        return emp[key as keyof InternalEmployee] ?? '';
    };

    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        for (const config of sortConfigs) {
            let valA = getSortValue(a, config.key);
            let valB = getSortValue(b, config.key);

            if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return config.direction === 'asc' ? -1 : 1;
            if (valA > valB) return config.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const paginatedEmployees = sortedEmployees.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const rowOffset = (currentPage - 1) * PER_PAGE;

    const openDeleteModal = (emp: InternalEmployee) => {
        setSelectedEmployee(emp);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (selectedEmployee) {
            destroy(route('internal-employees.destroy', selectedEmployee.id), {
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };

    /** Calculates the age of an employee based on their birth date. */
    const calculateAge = (employee: InternalEmployee) => {
        const today = new Date();
        const birthDateObj = new Date(employee.birth_date);
        const age = today.getFullYear() - birthDateObj.getFullYear();
        return age;
    };

    /** Helper to render the sort indicator icon based on sort status. */
    const renderSortIndicator = (key: string) => {
        const configIndex = sortConfigs.findIndex(c => c.key === key);
        if (configIndex === -1) return <iconify-icon icon="solar:sort-vertical-linear" className="text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"></iconify-icon>;

        const isAsc = sortConfigs[configIndex].direction === 'asc';
        return (
            <div className="flex items-center gap-1 text-primary">
                <iconify-icon icon={isAsc ? 'solar:sort-from-bottom-to-top-bold' : 'solar:sort-from-top-to-bottom-bold'}></iconify-icon>
                {sortConfigs.length > 1 && <span className="text-xs font-bold">{configIndex + 1}</span>}
            </div>
        );
    };

    /** Translates status value to Indonesian label. */
    const translateStatus = (status: string) => {
        const map: Record<string, string> = {
            active: 'Aktif',
            inactive: 'Non-Aktif',
            resign: 'Resign',
        };
        return map[status] || status;
    };

    /** Returns CSS classes for status badge. */
    const statusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700';
            case 'inactive':
                return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700';
            case 'resign':
                return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700';
            default:
                return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <AdminLayout title="Kelola Karyawan Internal" header="Karyawan Internal">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manajemen Karyawan Internal</h2>
                    <p className="text-sm text-slate-500">Kelola data karyawan internal PT. ARU</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={route('internal-employees.create')}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                    >
                        <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                        Tambah Karyawan Internal
                    </Link>
                </div>
            </div>

            {/* Search Bar & Filter */}
            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-4">
                {/* Search */}
                <div className="relative w-full md:w-96 flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <iconify-icon icon="solar:magnifer-linear" className="text-slate-400" width="20"></iconify-icon>
                    </div>
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nama atau NIK ARU..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                    />
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-48">
                    <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        className="block w-full border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm text-sm"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Non-Aktif</option>
                        <option value="resign">Resign</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-16">No</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('name', e)}
                                    title="Klik untuk mengurutkan"
                                >
                                    <div className="flex items-center gap-2">
                                        Nama Lengkap
                                        {renderSortIndicator('name')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('nik_aru', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        NIK ARU
                                        {renderSortIndicator('nik_aru')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('position', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Jabatan
                                        {renderSortIndicator('position')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('department', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Divisi
                                        {renderSortIndicator('department')}
                                    </div>
                                </th>
                                <th className="px-6 py-4">Status</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group select-none"
                                    onClick={(e) => handleSort('phone', e)}
                                >
                                    <div className="flex items-center gap-2">
                                        Telepon
                                        {renderSortIndicator('phone')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10">
                                        {employees.length === 0 ? (
                                            <EmptyState icon="solar:shield-user-bold" message="Belum ada data karyawan internal." subMessage="Silakan tambahkan data karyawan internal PT. ARU." />
                                        ) : (
                                            <EmptyState icon="solar:magnifer-linear" message="Data tidak ditemukan." subMessage="Coba gunakan kata kunci pencarian yang lain." />
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                paginatedEmployees.map((emp, index) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">{rowOffset + index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                <Link href={route('internal-employees.show', emp.id)} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                                                    {emp.name}
                                                    <iconify-icon icon="solar:arrow-right-up-linear" width="14" class="text-slate-400 group-hover:text-primary transition-colors"></iconify-icon>
                                                </Link>
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize">{emp.gender === 'male' ? 'Laki-laki' : emp.gender === 'female' ? 'Perempuan' : '-'}</div>
                                            <div className="text-xs text-slate-400 capitalize">{calculateAge(emp)}<span> Tahun</span></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.nik_aru ? (
                                                <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-mono text-xs font-bold">{emp.nik_aru}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Belum ada</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.position || <span className="text-xs text-slate-400 italic">-</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.department || <span className="text-xs text-slate-400 italic">-</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[11px] px-2 py-1 rounded-full font-semibold border ${statusBadgeClass(emp.status)}`}>
                                                {translateStatus(emp.status)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">{emp.phone || '-'}</td>
                                        <td className="px-6 py-4 text-center space-x-2">
                                            <Link
                                                href={route('internal-employees.edit', emp.id)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-block"
                                                title="Edit Data"
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </Link>
                                            <button
                                                onClick={() => openDeleteModal(emp)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredEmployees.length}
                    itemsPerPage={PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Karyawan Internal?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Yakin menghapus data karyawan internal <b>{selectedEmployee?.name}</b>?
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>Ya, Hapus</DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
