/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,jsx,mdx}",
        "./src/components/**/*.{js,jsx,mdx}",
        "./src/app/**/*.{js,jsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                "deep-navy": "#0C111D",
                "link-blue": "#0073BB",
                "surface-container-lowest": "#f0f2f8",
                "surface-container": "#e2e4ea",
                "outline-variant": "#d0d2dc",
                "on-surface": "#2e3040",
                "on-surface-variant": "#585a68",
                "inverse-surface": "#2e3040",
                "inverse-on-surface": "#e8eaf0",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                display: ['var(--font-jakarta)', 'sans-serif'],
                serif: ['var(--font-playfair)', 'serif'],
            }
        },
    },
    plugins: [],
};
