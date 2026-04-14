import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    DEFAULT: '#8B2E8B',
                    light: '#A855A8',
                    dark: '#6D1F6D',
                    gradient: '#C06EC0',
                },
                secondary: '#C084C0',
                surface: '#FDF8FF',
                dark: {
                    bg: '#0F0A14',
                    surface: '#1A0F1E',
                    text: '#F5F0FF'
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 46, 139, 0.30)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)'
            }
        },
    },

    plugins: [forms],
};