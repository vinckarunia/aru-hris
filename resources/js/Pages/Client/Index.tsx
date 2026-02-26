import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

/**
 * Interface for the Client data structure.
 */
interface Client {
    id: number;
    full_name: string;
    short_name: string;
    created_at: string;
}

/**
 * Props for the Client Index component.
 */
interface Props {
    clients: Client[];
}

/**
 * Client Index Page Component
 *
 * Displays a table of clients and provides a Single Page Application (SPA) experience
 * for creating, updating, and deleting clients using Modals.
 *
 * @param {Props} props - The component props containing the list of clients.
 * @returns {JSX.Element} The rendered Client management page.
 */
export default function Index({ clients }: Props) {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Initialize Inertia form hook with new schema
    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        full_name: '',
        short_name: '',
    });

    /**
     * Opens the modal in "add" mode and resets form state.
     */
    const openAddModal = () => {
        setModalMode('add');
        setSelectedClient(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the modal in "edit" mode and populates form with client data.
     *
     * @param {Client} client - The client object to edit.
     */
    const openEditModal = (client: Client) => {
        setModalMode('edit');
        setSelectedClient(client);
        setData({
            full_name: client.full_name,
            short_name: client.short_name,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    /**
     * Opens the confirmation modal for deleting a client.
     *
     * @param {Client} client - The client object to delete.
     */
    const openDeleteModal = (client: Client) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    /**
     * Closes the form modal and resets all errors/states.
     */
    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        clearErrors();
    };

    /**
     * Handles the submission of the add/edit client form.
     *
     * @param {React.FormEvent} e - The form submission event.
     */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            post(route('clients.store'), {
                onSuccess: () => closeModal(),
            });
        } else {
            put(route('clients.update', selectedClient?.id), {
                onSuccess: () => closeModal(),
            });
        }
    };

    /**
     * Executes the deletion of the selected client.
     */
    const confirmDelete = () => {
        if (selectedClient) {
            destroy(route('clients.destroy', selectedClient.id), {
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };

    return (
        <AdminLayout title="Kelola Client" header="Data Client">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daftar Client</h2>
                    <p className="text-sm text-slate-500">Kelola perusahaan client yang bekerja sama dengan ARU.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm"
                >
                    <iconify-icon icon="solar:add-circle-bold" width="20"></iconify-icon>
                    Tambah Client
                </button>
            </div>

            {/* Client Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Nama Client</th>
                                <th className="px-6 py-4">Kode Client</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                        Belum ada data client. Silakan tambahkan baru.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client, index) => (
                                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">{index + 1}</td>
                                        <td className="px-6 py-4">  
                                            <Link href={route('clients.show', client.id)} className="text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                                                <span className="font-medium">{client.full_name}</span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {client.short_name}
                                            </span>
                                        </td> 
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={() => openEditModal(client)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <iconify-icon icon="solar:pen-bold" width="20"></iconify-icon>
                                            </button>
                                            <button 
                                                onClick={() => openDeleteModal(client)}
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
            </div>

            {/* Modal for Add / Edit Client */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        {modalMode === 'add' ? 'Tambah Client Baru' : 'Edit Data Client'}
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="full_name" value="Nama Lengkap Client" />
                            <TextInput
                                id="full_name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                placeholder="CONTOH: PT. ABC Indonesia Tbk."
                            />
                            <InputError message={errors.full_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="short_name" value="Kode Client" />
                            <TextInput
                                id="short_name"
                                type="text"
                                className="mt-1 block w-full uppercase"
                                value={data.short_name}
                                onChange={(e) => setData('short_name', e.target.value.toUpperCase())}
                                placeholder="CONTOH: ABC"
                            />
                            <InputError message={errors.short_name} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} type="button" className="font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal for Delete Confirmation */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <iconify-icon icon="solar:danger-triangle-bold" width="32"></iconify-icon>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Client?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Apakah Anda yakin ingin menghapus client <b>{selectedClient?.full_name}</b>? Semua data Project yang terikat dengan client ini akan ikut terhapus.
                    </p>
                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} type="button">Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={processing}>
                            Ya, Hapus
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}