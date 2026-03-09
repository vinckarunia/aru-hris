import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nik_aru: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [isCheckingNik, setIsCheckingNik] = useState(false);
    const [nikMessage, setNikMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleNikBlur = async () => {
        if (!data.nik_aru) return;

        setIsCheckingNik(true);
        setNikMessage(null);

        try {
            const response = await fetch(route('register.check-nik') + `?nik_aru=${encodeURIComponent(data.nik_aru)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();

            if (response.ok) {
                setData('name', result.name);
                setNikMessage({ type: 'success', text: `Profil ditemukan: ${result.name}` });
            } else {
                setData('name', '');
                setNikMessage({ type: 'error', text: result.message || 'NIK ARU tidak valid.' });
            }
        } catch (error) {
            setData('name', '');
            setNikMessage({ type: 'error', text: 'Terjadi kesalahan saat mengecek NIK ARU.' });
        } finally {
            setIsCheckingNik(false);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            topRightAction={
                <Link
                    href={route('login')}
                    className="text-md uppercase tracking-wide font-bold text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <iconify-icon icon="solar:login-3-bold" width="20" className="group-hover:scale-110 transition-transform"></iconify-icon>
                        Log In
                    </span>
                </Link>
            }
        >
            <Head title="Registrasi Karyawan" />

            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Daftar Akun Karyawan</h2>
                <p className="text-sm text-slate-500 mt-1">Pastikan anda memiliki NIK ARU yang valid untuk menautkan akun dengan data profil Anda.</p>
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="nik_aru" value="NIK ARU" />

                    <TextInput
                        id="nik_aru"
                        name="nik_aru"
                        value={data.nik_aru}
                        className="mt-1 block w-full bg-slate-50 dark:bg-slate-900 font-mono"
                        autoComplete="off"
                        isFocused={true}
                        onChange={(e) => setData('nik_aru', e.target.value)}
                        onBlur={handleNikBlur}
                        required
                        placeholder="Contoh: ARU-2026-X01"
                        disabled={isCheckingNik}
                    />

                    {isCheckingNik && <p className="text-sm text-slate-500 mt-2 flex items-center gap-2"><iconify-icon icon="line-md:loading-twotone-loop"></iconify-icon> Mengecek NIK ARU...</p>}
                    {nikMessage && !isCheckingNik && (
                        <p className={`text-sm mt-2 font-medium ${nikMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {nikMessage.text}
                        </p>
                    )}

                    <InputError message={errors.nik_aru} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="name" value="Nama" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        autoComplete="name"
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        disabled={true}
                        className={`mt-1 block w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                        placeholder="(Terisi otomatis setelah input NIK ARU)"
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
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
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
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

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <div className="relative">
                        <TextInput
                            id="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full pr-10"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center mt-1 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                        >
                            <iconify-icon icon={showConfirmPassword ? "solar:eye-linear" : "solar:eye-closed-linear"} width="20"></iconify-icon>
                        </button>
                    </div>

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="mt-8 flex items-center justify-end">
                    <PrimaryButton disabled={processing} className="px-6 py-2.5 rounded-xl text-base font-semibold bg-primary hover:bg-primary-dark shadow-md hover:shadow-lg transition-all">
                        Buat Akun
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
