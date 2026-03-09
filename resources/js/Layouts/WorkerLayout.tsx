import { useState, PropsWithChildren } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

/**
 * Props for the WorkerLayout component.
 *
 * @interface Props
 * @property {string} title - The title of the page, used for document title (SEO).
 * @property {string} [header] - The optional header text displayed on the top navigation bar.
 */
interface Props {
    title: string;
    header?: string;
}

/**
 * WorkerLayout Component
 *
 * Provides a simplified application shell specifically for the Worker role,
 * featuring a horizontal top navigation bar without a complex sidebar,
 * while maintaining the same design language as AdminLayout.
 *
 * @param {PropsWithChildren<Props>} props - Component props containing children, title, and optional header.
 * @returns {JSX.Element} The rendered layout component.
 */
export default function WorkerLayout({ title, header, children }: PropsWithChildren<Props>) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Retrieve the authenticated user data from Inertia's shared props
    const user = usePage<PageProps>().props.auth.user;

    /**
     * Extracts initials from a given full name.
     * Takes the first letter of the first and second names, or the first two letters of a single name.
     *
     * @param {string} name - The full name of the user.
     * @returns {string} The user's initials in uppercase.
     */
    const getInitials = (name: string): string => {
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-[#F8F9FF] text-slate-800 font-sans antialiased selection:bg-primary selection:text-white min-h-screen relative overflow-x-hidden dark:bg-[#0F172A] dark:text-[#F1F5F9] flex flex-col">
            <Head title={title} />

            {/* Top Navigation Bar / Header */}
            <header className="h-20 glass sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                {/* Logo & Desktop Nav */}
                <div className="flex items-center gap-8">
                    {/* Logo Area */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-gradient flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform shrink-0">
                            <iconify-icon icon="solar:buildings-2-linear" width="22"></iconify-icon>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white hidden sm:block">
                            ARU<span className="text-primary font-extrabold">HRIS</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 dark:border-slate-700/50 pl-8 h-10">
                        {user.worker_id && (
                            <Link
                                href={route('workers.show', user.worker_id)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${route().current('workers.show') ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                            >
                                <iconify-icon icon="solar:user-circle-linear" width="20"></iconify-icon>
                                Profil Lengkap
                            </Link>
                        )}
                        <Link
                            href={route('edit-requests.index')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${route().current('edit-requests.index') ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                        >
                            <iconify-icon icon="solar:file-check-linear" width="20"></iconify-icon>
                            Riwayat Request Edit
                        </Link>
                    </nav>
                </div>

                {/* Right Area: Mobile Menu Toggle & User Profile */}
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Toggle Menu"
                    >
                        <iconify-icon icon={isMobileMenuOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width="28"></iconify-icon>
                    </button>

                    {/* User Profile Info & Logout */}
                    <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800 hidden sm:flex">
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-white leading-none">{user.name}</p>
                                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">
                                    Karyawan
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center font-bold shadow-sm border-2 border-white dark:border-slate-800 hover:shadow-glow transition-all">
                                {getInitials(user.name)}
                            </div>
                        </div>

                        {/* Logout Button */}
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="w-10 h-10 rounded-full bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition-all flex items-center justify-center group"
                            title="Sign Out"
                        >
                            <iconify-icon icon="solar:logout-2-bold" width="20" className="group-hover:scale-110 transition-transform"></iconify-icon>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden glass border-b border-slate-200/50 dark:border-slate-800/50 absolute top-20 left-0 w-full z-40 shadow-xl slide-in-bottom">
                    <nav className="flex flex-col p-4 gap-2">
                        {user.worker_id && (
                            <Link
                                href={route('workers.show', user.worker_id)}
                                className={`p-4 rounded-xl flex items-center gap-3 font-medium ${route().current('workers.show') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <iconify-icon icon="solar:user-circle-bold" width="24"></iconify-icon>
                                Profil Lengkap
                            </Link>
                        )}
                        <Link
                            href={route('edit-requests.index')}
                            className={`p-4 rounded-xl flex items-center gap-3 font-medium ${route().current('edit-requests.index') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <iconify-icon icon="solar:file-check-bold" width="24"></iconify-icon>
                            Riwayat Request Edit
                        </Link>

                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                                    {getInitials(user.name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-white">{user.name}</p>
                                    <p className="text-xs text-slate-500">Karyawan</p>
                                </div>
                            </div>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <iconify-icon icon="solar:logout-2-linear" width="24"></iconify-icon>
                            </Link>
                        </div>
                    </nav>
                </div>
            )}

            {/* Page Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col pt-8 md:pt-10 transition-all duration-300 slide-up">
                {header && (
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{header}</h1>
                    </div>
                )}
                <div className="flex-1 slide-up relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
