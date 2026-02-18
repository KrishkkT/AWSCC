"use client";

import { motion } from "framer-motion";

export default function LoadingScreen({ onComplete }) {
    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-brand-dark flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            onAnimationComplete={onComplete}
        >
            <div className="relative">
                {/* Glowing Orb */}
                <motion.div
                    className="absolute inset-0 bg-brand-cyan/20 blur-2xl rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Logo / Icon */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-24 h-24 bg-brand-dark border border-brand-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,194,255,0.2)]"
                >
                    <span className="text-4xl font-black text-brand-cyan">A</span>
                </motion.div>
            </div>

            {/* Loading Text */}
            <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="text-white/60 text-sm font-bold uppercase tracking-[0.3em] mb-2">
                    Loading AWS Cloud Club...
                </div>
                {/* Progress Bar */}
                <div className="w-70 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-brand-cyan"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}
