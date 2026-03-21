"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";

// Crisp, real-looking SVG vector clouds (unblurred, using 3D stacked vectors for authentic shading)
const OrbitalBody = ({ isDark }) => {
    return (
        <div className="absolute left-[8%] top-[30%] -ml-12 -mt-12 md:-ml-16 md:-mt-16 w-32 h-32 md:w-36 md:h-36 rounded-full z-0 pointer-events-none scale-75 md:scale-100">
            <AnimatePresence mode="popLayout" initial={false}>
                {isDark ? (
                    // MOON (NIGHT)
                    <motion.div
                        key="moon"
                        initial={{ opacity: 0, x: "80vw", y: "80vh", scale: 0.5, rotate: 90 }}
                        animate={{
                            opacity: 0.7,
                            x: "0vw",
                            y: ["80vh", "-20vh", "0vh"],
                            scale: 0.85,
                            rotate: 0
                        }}
                        exit={{
                            opacity: 0,
                            x: "-10vw",
                            y: "80vh",
                            scale: 0.5,
                            rotate: -45,
                            transition: { duration: 0.5, ease: "easeIn" }
                        }}
                        transition={{
                            duration: 2,
                            x: { ease: "linear", duration: 2 },
                            y: { ease: ["easeOut", "easeIn"], times: [0, 0.5, 1], duration: 2 },
                            opacity: { duration: 2 },
                            scale: { ease: "easeOut", duration: 2 },
                            rotate: { ease: "linear", duration: 2 }
                        }}
                        className="relative w-full h-full rounded-full bg-slate-500 overflow-hidden"
                        style={{ boxShadow: 'inset -20px -20px 30px rgba(0,0,0,0.5), inset 5px 5px 15px rgba(255,255,255,0.1)' }}
                    >
                        <div className="absolute top-[20%] left-[25%] w-6 h-6 rounded-full bg-black/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]"></div>
                        <div className="absolute top-[45%] left-[60%] w-10 h-10 rounded-full bg-black/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] rotate-12"></div>
                        <div className="absolute top-[65%] left-[30%] w-12 h-6 rounded-full bg-black/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] -rotate-12"></div>
                        <div className="absolute top-[50%] left-[15%] w-4 h-4 rounded-full bg-black/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]"></div>
                        <div className="absolute top-[15%] left-[65%] w-5 h-5 rounded-full bg-black/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]"></div>
                    </motion.div>
                ) : (
                    // SUN (DAY)
                    <motion.div
                        key="sun"
                        initial={{ opacity: 0, x: "80vw", y: "80vh", scale: 0.5, rotate: -90 }}
                        animate={{
                            opacity: 0.85,
                            x: "0vw",
                            y: ["80vh", "-20vh", "0vh"],
                            scale: 0.95,
                            rotate: 0
                        }}
                        exit={{
                            opacity: 0,
                            x: "-10vw",
                            y: "80vh",
                            scale: 0.5,
                            rotate: 45,
                            transition: { duration: 0.5, ease: "easeIn" }
                        }}
                        transition={{
                            duration: 2,
                            x: { ease: "linear", duration: 2 },
                            y: { ease: ["easeOut", "easeIn"], times: [0, 0.5, 1], duration: 2 },
                            opacity: { duration: 2 },
                            scale: { ease: "easeOut", duration: 2 },
                            rotate: { ease: "linear", duration: 2 }
                        }}
                        className="relative w-full h-full rounded-full bg-white"
                        style={{ boxShadow: '0 0 40px 10px rgba(253, 224, 71, 0.3), 0 0 80px 20px rgba(251, 146, 60, 0.1), inset 0 0 10px rgba(250, 204, 21, 0.2)' }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const Cloud1 = ({ className, fill }) => (
    <svg viewBox="0 0 512 512" className={className} fill={fill}>
        <path d="M405.3,202.7c-4.1-66-56.7-117.3-117.3-117.3c-44,0-82.5,24.1-102.4,61.5c-7.9-2-16.1-3.1-24.5-3.1c-47.1,0-85.3,38.2-85.3,85.3c0,7.3,1,14.4,2.8,21.2C38.3,260.6,10.7,294.9,10.7,336c0,53,43,96,96,96h288c58.9,0,106.7-47.8,106.7-106.7C501.3,269.1,458.2,213.9,405.3,202.7z" />
    </svg>
);

const Cloud2 = ({ className, fill }) => (
    <svg viewBox="0 0 512 512" className={className} fill={fill}>
        <path d="M384,181.3c-4.2-56.9-52-101.3-106.7-101.3c-38.3,0-72,21.6-90,53.8c-6.8-1.5-13.8-2.5-21-2.5c-47.1,0-85.3,38.2-85.3,85.3c0,9.9,1.7,19.3,4.8,28.2c-29.8,12.7-50.5,41-50.5,74.5c0,44.2,35.8,80,80,80h256c58.9,0,106.7-47.8,106.7-106.7C477.9,235.1,436.5,188,384,181.3z" />
    </svg>
);

const Cloud3 = ({ className, fill }) => (
    <svg viewBox="0 0 512 512" className={className} fill={fill}>
        <path d="M437.3,224c-5.5-70.8-63.5-128-138.7-128c-42.5,0-80.9,19.9-105.7,50.7c-9.5-2.9-19.6-4.7-30.2-4.7c-61.9,0-112,50.1-112,112c0,11,1.7,21.7,4.7,31.7c-30.5,14.4-51.4,46.1-51.4,82.3c0,50.1,40.6,90.7,90.7,90.7h298.7c64.8,0,117.3-52.5,117.3-117.3C510.6,283.4,479.2,236.4,437.3,224z" />
    </svg>
);

// Stacks the SVG multiple times with different distinct shades to create unblurred but deeply realistic physical 3D clouds.
const RealCloud = ({ type, className, isDark }) => {
    const CloudComponent = type === 1 ? Cloud1 : type === 2 ? Cloud2 : Cloud3;

    // Distinct, unblurred 3D layering colors
    const shadowColor = isDark ? "#080c14" : "#cbd5e1"; // Deep shadow / slate-300
    const bodyColor = isDark ? "#111827" : "#f1f5f9";   // Base night sky / slate-100
    const highlightColor = isDark ? "#1f2937" : "#ffffff"; // Moonlight / pure white

    return (
        <div className={`relative ${className}`}>
            <CloudComponent className="absolute inset-0 translate-y-3 opacity-90" fill={shadowColor} />
            <CloudComponent className="absolute inset-0" fill={bodyColor} />
            <CloudComponent className="absolute inset-0 -translate-y-1.5 scale-95 opacity-80" fill={highlightColor} />
        </div>
    );
};

export default function CloudBackground() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isDark = resolvedTheme === 'dark';

    // Theme responsive deep skies (low light to keep focus on text)
    const skyGradient = isDark
        ? "bg-gradient-to-b from-[#030612] via-[#080d1a] to-[#0d1322]" // Very dark subtle night
        : "bg-gradient-to-b from-[#38bdf8] via-[#7dd3fc] to-[#e0f2fe]"; // Day sky

    return (
        <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000 ${skyGradient}`}>

            {/* Celestial Bodies Container */}
            <OrbitalBody isDark={isDark} />


            {/* Twinkling Stars (Dark Mode only) */}
            {isDark && (
                <div className="absolute inset-0 opacity-40">
                    {[...Array(60)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full animate-pulse"
                            style={{
                                top: `${(i * 17) % 100}%`,
                                left: `${(i * 31) % 100}%`,
                                width: `${(i % 2) + 1}px`,
                                height: `${(i % 2) + 1}px`,
                                animationDuration: `${(i % 4) + 2}s`,
                                animationDelay: `${(i % 3)}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Clouds Back Layer (Slowest, smallest) */}
            <div className="absolute left-0 right-0 bottom-[25%] h-64 overflow-hidden -mx-[10%] w-[120%] pointer-events-none opacity-50">
                <motion.div
                    animate={{ x: [0, "-50%"] }}
                    transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 flex w-[200%]"
                >
                    {[...Array(2)].map((_, idx) => (
                        <div key={idx} className="flex-1 flex justify-around items-end pb-10">
                            <RealCloud type={1} isDark={isDark} className="w-64 h-32" />
                            <RealCloud type={2} isDark={isDark} className="w-48 h-24 -translate-y-12" />
                            <RealCloud type={3} isDark={isDark} className="w-80 h-40" />
                            <RealCloud type={1} isDark={isDark} className="w-56 h-28 -translate-y-8" />
                            <RealCloud type={2} isDark={isDark} className="w-72 h-36" />
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Clouds Middle Layer (Medium speed, medium size) */}
            <div className="absolute left-0 right-0 bottom-[10%] h-80 overflow-hidden -mx-[10%] w-[120%] pointer-events-none opacity-60">
                <motion.div
                    animate={{ x: [0, "-50%"] }}
                    transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 flex w-[200%]"
                >
                    {[...Array(2)].map((_, idx) => (
                        <div key={idx} className="flex-1 flex justify-around items-end pb-5">
                            <RealCloud type={2} isDark={isDark} className="w-96 h-48 -translate-y-16" />
                            <RealCloud type={1} isDark={isDark} className="w-80 h-40" />
                            <RealCloud type={3} isDark={isDark} className="w-[28rem] h-56 -translate-y-10" />
                            <RealCloud type={2} isDark={isDark} className="w-72 h-36" />
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Clouds Front Layer (Fastest, largest) */}
            <div className="absolute left-0 right-0 -bottom-10 h-96 overflow-hidden -mx-[10%] w-[120%] pointer-events-none opacity-80">
                <motion.div
                    animate={{ x: [0, "-50%"] }}
                    transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 flex w-[200%]"
                >
                    {[...Array(2)].map((_, idx) => (
                        <div key={idx} className="flex-1 flex justify-between items-end pb-0">
                            <RealCloud type={3} isDark={isDark} className="w-[600px] h-[300px] -translate-y-20" />
                            <RealCloud type={1} isDark={isDark} className="w-[500px] h-[250px]" />
                            <RealCloud type={2} isDark={isDark} className="w-[700px] h-[350px] -translate-y-10" />
                            <RealCloud type={1} isDark={isDark} className="w-[550px] h-[280px]" />
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Base gradient to merge skies into bottom content perfectly */}
            <div className={`absolute left-0 right-0 bottom-0 h-48 bg-gradient-to-t ${isDark ? "from-[#030612]" : "from-white"} to-transparent opacity-90 z-10`}></div>
        </div>
    );
}
