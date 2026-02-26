import { useState, PropsWithChildren } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

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
    
    // Retrieve the authenticated user data from Inertia's shared props
    const user = usePage<{ auth: { user: { name: string; email: string } } }>().props.auth.user;

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
            <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] transition-transform duration-300 glass flex flex-col border-r border-slate-200 dark:border-slate-800 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Logo Area */}
                <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-gradient flex items-center justify-center text-white shadow-glow">
                            <iconify-icon icon="solar:buildings-2-linear" width="18"></iconify-icon>
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">ARU<span className="text-primary font-extrabold">HRIS</span></span>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
                    
                    {/* General Section */}
                    <div>
                        <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">General</div>
                        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group">
                            <iconify-icon icon="solar:widget-add-linear" width="20" className="group-hover:text-primary transition-colors"></iconify-icon>
                            <span className="font-medium">Dashboard</span>
                        </Link>
                    </div>

                    {/* Master Data Modules Section */}
                    <div>
                        <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Master Data</div>
                        <Link href={route('clients.index')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group">
                            <iconify-icon icon="solar:buildings-linear" width="20" className="group-hover:text-primary transition-colors"></iconify-icon>
                            <span className="font-medium">Client</span>
                        </Link>
                        <Link href={route('projects.index')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group">
                            <iconify-icon icon="solar:folder-with-files-linear" width="20" className="group-hover:text-primary transition-colors"></iconify-icon>
                            <span className="font-medium">Project</span>
                        </Link>
                        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white hover:shadow-sm hover:text-primary dark:hover:bg-slate-800 transition-all group">
                            <iconify-icon icon="solar:users-group-two-rounded-linear" width="20" className="group-hover:text-primary transition-colors"></iconify-icon>
                            <span className="font-medium">Karyawan</span>
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 w-full min-w-0 flex flex-col h-screen overflow-y-auto">
                {/* Top Header */}
                <header className="h-20 glass sticky top-0 z-30 px-6 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <iconify-icon icon="solar:hamburger-menu-linear" width="24"></iconify-icon>
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">{header || title}</h1>
                        </div>
                    </div>
                    
                    {/* User Profile Info */}
                    <div className="flex items-center gap-3 pl-1">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-semibold text-slate-700 dark:text-white leading-none">{user.name}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wide">Administrator</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-light text-white flex items-center justify-center font-bold shadow-sm border-2 border-white dark:border-slate-800 cursor-pointer hover:shadow-glow transition-all">
                            {getInitials(user.name)}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 md:p-8 w-full max-w-7xl mx-auto flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}