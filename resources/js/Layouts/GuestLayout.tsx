import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect } from 'react';

export default function Guest({ children, topRightAction }: PropsWithChildren<{ topRightAction?: ReactNode }>) {
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

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF8FF] py-6 sm:py-12 dark:bg-[#0F0A14] text-slate-800 dark:text-[#F5F0FF] font-sans antialiased selection:bg-primary selection:text-white relative overflow-hidden">
            <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-50">
                <button onClick={toggleTheme} className="flex rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 transition-all group">
                    <iconify-icon icon={isDarkMode ? "solar:sun-bold-duotone" : "solar:moon-bold-duotone"} width="22" className="group-hover:scale-110 transition-transform"></iconify-icon>
                </button>
            </div>

            {topRightAction && (
                <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-50">
                    {topRightAction}
                </div>
            )}

            {/* Background Decorations (Optional, similar to a modern vibe) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[0%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]"></div>
            </div>

            <div className="w-full flex justify-center mb-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex items-center justify-center bg-white dark:bg-white/95 p-1.5 rounded-xl transition-colors shadow-sm border border-slate-100 dark:border-slate-800">
                        <img
                            src="/storage/assets/logo.png"
                            alt="ARU HRIS Logo"
                            className="h-12 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
                        />
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                        ARU<span className="text-primary font-extrabold">HRIS</span>
                    </span>
                </Link>
            </div>

            <div className="w-full sm:max-w-md px-6 py-8 glass shadow-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/60 z-10 transition-all">
                {children}
            </div>
        </div>
    );
}
