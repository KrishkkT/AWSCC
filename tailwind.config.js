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
                'brand-dark': '#0f172a', // Slate - Deep but professional
                'brand-deep': '#020617', // Deeper Slate
                'brand-aws': '#3b82f6',  // Professional Blue instead of Orange
                'brand-blue': '#2563eb', // Deeper Blue
                'brand-navy': '#1e293b',
                'brand-accent': '#60a5fa',
                'cloud-gray': '#94a3b8',
                'aws-slate': '#232f3e',  // True AWS Deep Slate
            },
            backgroundImage: {
                "premium-gradient": "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
                "aws-gradient": "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                "blue-gradient": "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'fade-up': 'fade-up 0.5s ease-out forwards',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                }
            }
        },
    },
    plugins: [],
};
