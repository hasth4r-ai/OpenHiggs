/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./packages/studio/src/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--color-accent, #29364b)',
                    hover: 'var(--color-accent-hover, #374763)',
                },
                accent: {
                    DEFAULT: 'var(--color-accent, #29364b)',
                    hover: 'var(--color-accent-hover, #374763)',
                },
                'app-bg': 'var(--bg-app, rgb(9 9 11))',
                'panel-bg': 'var(--bg-panel, rgb(9 9 11))',
                'card-bg': 'var(--bg-card, #14141a)',
                secondary: '#a1a1aa',
                muted: '#52525b',
            },
            fontFamily: {
                sans: ['var(--font-ui)', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            borderRadius: {
                'xs': 'var(--radius-xs, 0.25rem)',
                'sm': 'var(--radius-sm, 0.375rem)',
                'md': 'var(--radius-md, 0.5rem)',
                'lg': 'var(--radius-lg, 0.5rem)',
                'xl': 'var(--radius-xl, 0.5rem)',
                '2xl': 'var(--radius-2xl, 0.5rem)',
                '3xl': 'var(--radius-3xl, 0.75rem)',
            },
            boxShadow: {
                'glow': '0 0 20px var(--color-accent-glow, rgba(41, 54, 75, 0.45))',
                'glow-accent': '0 0 20px var(--color-accent-glow, rgba(41, 54, 75, 0.45))',
                '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.8)',
            }
        },
    },
    plugins: [],
}
