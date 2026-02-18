"use client";

import { motion } from "framer-motion";

export default function HeroVisual() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 1200 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-40"
            >
                {/* Converging Data Lines */}
                {[...Array(10)].map((_, i) => (
                    <motion.path
                        key={`left-${i}`}
                        d={`M -200 ${100 + i * 40} C 200 ${100 + i * 40}, 400 300, 600 300`}
                        stroke="url(#gradient-cyan)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0, 1, 0],
                            opacity: [0, 1, 0],
                            pathOffset: [0, 1]
                        }}
                        transition={{
                            duration: 4 + Math.random() * 4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 2
                        }}
                    />
                ))}

                {[...Array(10)].map((_, i) => (
                    <motion.path
                        key={`right-${i}`}
                        d={`M 1400 ${100 + i * 40} C 1000 ${100 + i * 40}, 800 300, 600 300`}
                        stroke="url(#gradient-teal)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0, 1, 0],
                            opacity: [0, 1, 0],
                            pathOffset: [0, 1]
                        }}
                        transition={{
                            duration: 4 + Math.random() * 4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 2
                        }}
                    />
                ))}

                {/* Central Convergent Glow */}
                <motion.circle
                    cx="600"
                    cy="300"
                    r="40"
                    fill="url(#radial-glow)"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                <defs>
                    <linearGradient id="gradient-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#00C2FF" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                    <linearGradient id="gradient-teal" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#1DD3B0" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                    <radialGradient id="radial-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#00C2FF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>

            {/* Dynamic Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-cyan/5 blur-[120px] rounded-full"></div>
        </div>
    );
}
