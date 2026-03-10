"use client";

import { motion } from "framer-motion";
import { Hammer, Cloud } from "lucide-react";

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-dot-grid opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-cyan/10 blur-[120px] rounded-full animate-pulse" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 space-y-8 max-w-2xl"
            >
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-brand-cyan/10 border border-brand-cyan/20 rounded-[2rem] flex items-center justify-center text-brand-cyan shadow-[0_0_50px_rgba(0,194,255,0.2)]">
                        <Hammer size={48} className="animate-bounce" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-5xl lg:text-7xl font-black text-white tracking-widest uppercase">
                        Under <span className="text-brand-cyan">Construction</span>
                    </h1>
                    <div className="h-1 w-24 bg-brand-cyan mx-auto" />
                </div>

                <p className="text-white/40 text-lg lg:text-xl font-medium leading-relaxed">
                    Our digital hub is currently undergoing an elite technical upgrade.
                    The Cloud Club experience will return shortly with enhanced capabilities.
                </p>

                <div className="pt-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-brand-cyan text-sm font-black uppercase tracking-widest">
                        <Cloud size={18} />
                        AWS Cloud Club DDU
                    </div>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-10 left-0 w-full flex justify-center opacity-20">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">
                    Synchronizing Systems...
                </span>
            </div>
        </div>
    );
}
