import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            topRightAction={
                <Link
                    href={route('register')}
                    className="text-md uppercase tracking-wide font-bold text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <iconify-icon icon="solar:user-plus-bold" width="20" className="group-hover:scale-110 transition-transform"></iconify-icon>
                        Buat Akun Karyawan Baru
                    </span>
                </Link>
            }
        >
            <Head title="Log in" />

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <div className="relative">
                        <TextInput
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full pr-10"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center mt-1 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            <iconify-icon icon={showPassword ? "solar:eye-linear" : "solar:eye-closed-linear"} width="20"></iconify-icon>
                        </button>
                    </div>

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData(
                                    'remember',
                                    (e.target.checked || false) as false,
                                )
                            }
                        />
                        <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">
                            Ingat saya
                        </span>
                    </label>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    {canResetPassword ? (
                        <Link
                            href={route('password.request')}
                            className="rounded-md text-sm font-medium text-slate-500 underline hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-slate-400 dark:hover:text-primary-light"
                        >
                            Lupa Password
                        </Link>
                    ) : <div></div>}

                    <PrimaryButton disabled={processing} className="px-6 py-2.5 rounded-xl text-base font-semibold bg-primary hover:bg-primary-dark shadow-md hover:shadow-lg transition-all">
                        Masuk
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
