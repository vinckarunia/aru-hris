import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    className
                }`
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
