/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,jsx,mdx}",
        "./src/components/**/*.{js,jsx,mdx}",
        "./src/app/**/*.{js,jsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-dark': '#020b17', // Rich Navy Dark
                'brand-deep': '#051124', // Subtle secondary dark
                'brand-navy': '#0f1f39',
                'brand-blue': '#1e3a8a',
                'brand-cyan': '#00C2FF', // Electric Cyan
                'brand-teal': '#1DD3B0', // Soft Teal
                'cloud-gray': '#94a3b8', // Slate-400
            },
            backgroundImage: {
                "premium-gradient": "linear-gradient(to bottom right, #020b17, #051124, #0f1f39)",
                "cyan-glow": "radial-gradient(circle, rgba(0, 194, 255, 0.15) 0%, transparent 70%)",
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'blob': 'blob 7s infinite',
                'shimmer': 'shimmer 8s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% center' },
                    '100%': { backgroundPosition: '-200% center' },
                }
            }
        },
    },
    plugins: [],
};
