import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 text-primary shadow-sm focus:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-primary-light dark:focus:ring-offset-gray-800 ' +
                className
            }
        />
    );
}
