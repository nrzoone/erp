/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
    safelist: [
        {
            pattern: /(bg|text|border)-(emerald|blue|indigo|amber|rose|purple|cyan|teal|violet)-(400|500|600|700)/,
        },
    ],
}
