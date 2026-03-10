import { useState, PropsWithChildren, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import { PageProps } from '@/types';

/**
 * Props for the AdminLayout component.
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
 * AdminLayout Component
 *
 * Provides the main application shell including the sidebar navigation, 
 * top header with user profile, and the main content area.
 *
 * @param {PropsWithChildren<Props>} props - Component props containing children, title, and optional header.
 * @returns {JSX.Element} The rendered layout component.
 */
export default function AdminLayout({ title, header, children }: PropsWithChildren<Props>) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // Manage sidebar state, persisting in localStorage if available
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
    };

    // Manage expanded/collapsed state for sidebar menus
    const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('collapsedMenus');
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    const toggleMenu = (menuKey: string) => {
        const newCollapsedMenus = { ...collapsedMenus, [menuKey]: !collapsedMenus[menuKey] };
        setCollapsedMenus(newCollapsedMenus);
        localStorage.setItem('collapsedMenus', JSON.stringify(newCollapsedMenus));
    };

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
        <div className="bg-[#F8F9FF] text-slate-800 font-sans antialiased selection:bg-primary selection:text-white min-h-screen relative overflow-hidden dark:bg-[#0F172A] dark:text-[#F1F5F9] flex">
            <Head title={title} />

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            {/* Sidebar */}
            {(user.role !== 'WORKER') && (
                <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen transition-all duration-300 glass flex flex-col border-r border-slate-200 dark:border-slate-800 shrink-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isSidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'} w-[280px]
                `}>
                    {/* Logo Area */}
                    <div className={`h-20 flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'lg:px-0 lg:justify-center px-8' : 'px-8'} border-b border-slate-100 dark:border-slate-800 shrink-0`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-gradient flex items-center justify-center text-white shadow-glow shrink-0">
                                <iconify-icon icon="solar:buildings-2-linear" width="18"></iconify-icon>
                            </div>
                            <span className={`font-bold text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'hidden' : 'lg:w-[130px] opacity-100 w-auto'}`}>ARU<span className="text-primary font-extrabold">HRIS</span></span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-6 space-y-4 px-4 overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {/* General Section */}
                        {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_ARU') && (
                            <div>
                                <div
                                    onClick={() => toggleMenu('general')}
                                    className={`mb-2 flex items-center justify-between text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`}
                                    title="General"
                                >
                                    <div className="flex items-center gap-2">
                                        <iconify-icon icon="solar:layers-minimalistic-linear" width="18" className={`shrink-0 transition-opacity duration-300 ${collapsedMenus['general'] && isSidebarCollapsed ? 'opacity-50' : 'opacity-100'}`}></iconify-icon>
                                        <span className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden' : 'inline'}`}>General</span>
                                    </div>
                                    <iconify-icon
                                        icon="solar:alt-arrow-down-linear"
                                        width="14"
                                        className={`transition-transform duration-300 ${collapsedMenus['general'] ? '-rotate-90' : ''} ${isSidebarCollapsed ? 'hidden' : 'block'}`}
                                    ></iconify-icon>
                                </div>
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${collapsedMenus['general'] ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                                    <Link href="/dashboard" className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Dashboard">
                                        <iconify-icon icon="solar:widget-add-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Dashboard</span>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Admin Setup Section */}
                        {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_ARU') && (
                            <div className="mb-6">
                                <div
                                    onClick={() => toggleMenu('adminSetup')}
                                    className={`mb-2 flex items-center justify-between text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`}
                                    title="Admin Setup"
                                >
                                    <div className="flex items-center gap-2">
                                        <iconify-icon icon="solar:shield-keyhole-minimalistic-linear" width="18" className={`shrink-0 transition-opacity duration-300 ${collapsedMenus['adminSetup'] && isSidebarCollapsed ? 'opacity-50' : 'opacity-100'}`}></iconify-icon>
                                        <span className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden' : 'inline'}`}>Admin Setup</span>
                                    </div>
                                    <iconify-icon
                                        icon="solar:alt-arrow-down-linear"
                                        width="14"
                                        className={`transition-transform duration-300 ${collapsedMenus['adminSetup'] ? '-rotate-90' : ''} ${isSidebarCollapsed ? 'hidden' : 'block'}`}
                                    ></iconify-icon>
                                </div>
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${collapsedMenus['adminSetup'] ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                                    <Link href={route('users.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="User Management">
                                        <iconify-icon icon="solar:users-group-rounded-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Manajemen User</span>
                                    </Link>
                                    <Link href={route('pics.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Profil PIC">
                                        <iconify-icon icon="solar:user-id-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Profil PIC</span>
                                    </Link>
                                    <Link href={route('settings.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Pengaturan Sistem">
                                        <iconify-icon icon="solar:settings-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Pengaturan Sistem</span>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Master Data Modules Section */}
                        <div className="mb-6">
                            <div
                                onClick={() => toggleMenu('masterData')}
                                className={`mb-2 flex items-center justify-between text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`}
                                title="Master Data"
                            >
                                <div className="flex items-center gap-2">
                                    <iconify-icon icon="solar:database-linear" width="18" className={`shrink-0 transition-opacity duration-300 ${collapsedMenus['masterData'] && isSidebarCollapsed ? 'opacity-50' : 'opacity-100'}`}></iconify-icon>
                                    <span className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden' : 'inline'}`}>Master Data</span>
                                </div>
                                <iconify-icon
                                    icon="solar:alt-arrow-down-linear"
                                    width="14"
                                    className={`transition-transform duration-300 ${collapsedMenus['masterData'] ? '-rotate-90' : ''} ${isSidebarCollapsed ? 'hidden' : 'block'}`}
                                ></iconify-icon>
                            </div>
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${collapsedMenus['masterData'] ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                                {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_ARU') && (
                                    <Link href={route('clients.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Client">
                                        <iconify-icon icon="solar:buildings-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Client</span>
                                    </Link>
                                )}
                                <Link href={route('projects.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Project">
                                    <iconify-icon icon="solar:folder-with-files-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Project</span>
                                </Link>
                                <Link href={route('workers.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Karyawan">
                                    <iconify-icon icon="solar:users-group-two-rounded-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Karyawan</span>
                                </Link>
                            </div>
                        </div>

                        {/* Operational Section */}
                        <div className="mb-6">
                            <div
                                onClick={() => toggleMenu('operational')}
                                className={`mb-2 flex items-center justify-between text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`}
                                title="Operasional"
                            >
                                <div className="flex items-center gap-2">
                                    <iconify-icon icon="solar:clipboard-list-linear" width="18" className={`shrink-0 transition-opacity duration-300 ${collapsedMenus['operational'] && isSidebarCollapsed ? 'opacity-50' : 'opacity-100'}`}></iconify-icon>
                                    <span className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden' : 'inline'}`}>Operasional</span>
                                </div>
                                <iconify-icon
                                    icon="solar:alt-arrow-down-linear"
                                    width="14"
                                    className={`transition-transform duration-300 ${collapsedMenus['operational'] ? '-rotate-90' : ''} ${isSidebarCollapsed ? 'hidden' : 'block'}`}
                                ></iconify-icon>
                            </div>
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${collapsedMenus['operational'] ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                                <Link href={route('edit-requests.index')} className={`flex items-center gap-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group ${isSidebarCollapsed ? 'lg:justify-center px-0' : 'px-4'}`} title="Edit Requests">
                                    <iconify-icon icon="solar:file-check-linear" width="20" className="shrink-0 group-hover:text-primary transition-colors"></iconify-icon>
                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100 block'}`}>Edit Request</span>
                                </Link>
                            </div>
                        </div>
                    </nav>
                </aside>
            )}

            {/* Main Content Area */}
            <main className="flex-1 w-full min-w-0 flex flex-col h-screen overflow-y-auto">
                {/* Top Header */}
                {(user.role !== 'WORKER' && (
                    <header className="h-20 glass sticky top-0 z-30 px-6 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                        <div className="flex items-center gap-4">
                            {/* Mobile Menu Hamburger */}
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <iconify-icon icon="solar:hamburger-menu-linear" width="24"></iconify-icon>
                            </button>

                            {/* Desktop Sidebar Toggle Hamburger */}
                            <button onClick={toggleSidebar} className="hidden lg:flex p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 transition-all group">
                                <iconify-icon icon="solar:hamburger-menu-linear" width="24" className="group-hover:scale-110 transition-transform"></iconify-icon>
                            </button>

                            <div className="hidden sm:block">
                                <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">{header || title}</h1>
                            </div>
                        </div>

                        {/* User Profile Info & Logout */}
                        <div className="flex items-center gap-4 pl-2 ml-2">
                            <button onClick={toggleTheme} className="flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 transition-all group">
                                <iconify-icon icon={isDarkMode ? "solar:sun-bold-duotone" : "solar:moon-bold-duotone"} width="22" className="group-hover:scale-110 transition-transform"></iconify-icon>
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:outline-none"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center font-bold shadow-sm border-2 border-white dark:border-slate-800 hover:shadow-glow transition-all">
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="hidden sm:block text-left relative">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-white leading-none pr-5">{user.name}</p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">
                                                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN_ARU' ? 'ARU' : user.role === 'PIC' ? 'PIC Project' : 'Karyawan'}
                                                </p>
                                            </div>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary">
                                        <iconify-icon icon="solar:settings-linear" width="18"></iconify-icon>
                                        Pengaturan Profil
                                    </Dropdown.Link>

                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 w-full"
                                    >
                                        <iconify-icon icon="solar:logout-3-bold" width="18"></iconify-icon>
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </header>
                ))}

                {/* Top Navigation Bar / Header */}
                {(user.role === 'WORKER' && (
                    <header className="h-20 glass sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                        {/* Logo & Desktop Nav */}
                        <div className="flex items-center gap-8">
                            {/* Logo Area */}
                            {user.worker_id && (
                                <Link href={route('workers.show', user.worker_id)} className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-gradient flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform shrink-0">
                                        <iconify-icon icon="solar:buildings-2-linear" width="22"></iconify-icon>
                                    </div>
                                    <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white hidden sm:block">
                                        ARU<span className="text-primary font-extrabold">HRIS</span>
                                    </span>
                                </Link>
                            )}

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
                                    Edit Request
                                </Link>
                            </nav>
                        </div>

                        {/* Right Area: Mobile Menu Toggle & User Profile */}
                        <div className="flex items-center gap-4">
                            <button onClick={toggleTheme} className="flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 transition-all group">
                                <iconify-icon icon={isDarkMode ? "solar:sun-bold-duotone" : "solar:moon-bold-duotone"} width="22" className="group-hover:scale-110 transition-transform"></iconify-icon>
                            </button>
                            {/* Mobile Menu Hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Toggle Menu"
                            >
                                <iconify-icon icon={isMobileMenuOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width="28"></iconify-icon>
                            </button>

                            {/* User Profile Info & Logout */}
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:outline-none"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center font-bold shadow-sm border-2 border-white dark:border-slate-800 hover:shadow-glow transition-all">
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="hidden sm:block text-left relative">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-white leading-none pr-5">{user.name}</p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Karyawan</p>
                                            </div>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary">
                                        <iconify-icon icon="solar:settings-linear" width="18"></iconify-icon>
                                        Pengaturan Profil
                                    </Dropdown.Link>

                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 w-full"
                                    >
                                        <iconify-icon icon="solar:logout-3-bold" width="18"></iconify-icon>
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </header>
                ))}

                {/* Page Content */}
                <div className="p-6 md:p-8 w-full max-w-7xl mx-auto flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
