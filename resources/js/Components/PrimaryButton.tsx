import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    className
                }`
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
