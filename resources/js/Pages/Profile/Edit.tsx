import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AdminLayout
            title="Pengaturan Profil"
            header="Pengaturan Profil"
        >
            <div className="py-2">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
