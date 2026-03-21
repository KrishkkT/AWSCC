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
                'brand-dark': "var(--brand-dark)",
                'brand-deep': "var(--brand-deep)",
                'brand-aws': "var(--brand-aws)",
                'brand-blue': "var(--brand-blue)",
                'brand-cyan': '#00c2ff',
                'brand-navy': '#1e293b',
                'brand-accent': '#60a5fa',
                'cloud-gray': '#94a3b8',
                'aws-slate': '#232f3e',
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
            },
            backgroundImage: {
                "premium-gradient": "linear-gradient(135deg, var(--brand-dark) 0%, var(--brand-deep) 100%)",
                "aws-gradient": "linear-gradient(90deg, var(--brand-aws) 0%, #60a5fa 100%)",
                "blue-gradient": "linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-aws) 100%)",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                display: ['var(--font-outfit)', 'sans-serif'],
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
