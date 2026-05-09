import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'Inter',
                    '"Hiragino Sans"',
                    '"Hiragino Kaku Gothic ProN"',
                    '"Yu Gothic UI"',
                    '"Meiryo"',
                    ...defaultTheme.fontFamily.sans,
                ],
            },
            colors: {
                brand: {
                    50:  '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                surface: {
                    DEFAULT: '#ffffff',
                    muted: '#f8fafc',
                    soft: '#f1f5f9',
                },
            },
            boxShadow: {
                card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
                'card-hover': '0 1px 2px rgba(15,23,42,0.06), 0 16px 32px -12px rgba(15,23,42,0.16)',
                pop: '0 20px 50px -20px rgba(15,23,42,0.35)',
            },
            borderRadius: {
                xl2: '1.25rem',
            },
            keyframes: {
                fadeIn: {
                    '0%':   { opacity: 0, transform: 'translateY(-4px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%':   { opacity: 0, transform: 'translate(-50%, -8px)' },
                    '100%': { opacity: 1, transform: 'translate(-50%, 0)' },
                },
                pulseRing: {
                    '0%, 100%': { opacity: 1 },
                    '50%':      { opacity: 0.45 },
                },
            },
            animation: {
                fadeIn: 'fadeIn 200ms ease-out',
                slideDown: 'slideDown 220ms ease-out',
                pulseRing: 'pulseRing 1.6s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};
