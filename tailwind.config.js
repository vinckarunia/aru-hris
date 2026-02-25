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

    darkMode: 'class', // Tambahkan ini
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    DEFAULT: '#364dff',
                    light: '#5a6eff',
                    dark: '#2b3ecc',
                    gradient: '#667aff',
                },
                secondary: '#798bff',
                surface: '#F8F9FF',
                dark: {
                    bg: '#0F172A',
                    surface: '#1E293B',
                    text: '#F1F5F9'
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(54, 77, 255, 0.25)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)'
            }
        },
    },

    plugins: [forms],
};