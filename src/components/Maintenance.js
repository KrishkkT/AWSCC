"use client";

import { motion } from "framer-motion";
import { Wrench, Cloud } from "lucide-react";

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-brand-deep flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 space-y-10 max-w-2xl px-8 py-16 card-professional bg-brand-navy/30 border-slate-800/50"
            >
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-brand-aws/10 border border-brand-aws/20 rounded-2xl flex items-center justify-center text-brand-aws shadow-2xl shadow-brand-aws/20">
                        <Wrench size={40} className="animate-pulse" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl lg:text-6xl font-display font-bold text-white tracking-tight">
                        Under <span className="text-brand-aws">Optimization</span>
                    </h1>
                    <div className="h-1 w-20 bg-brand-aws mx-auto rounded-full" />
                </div>

                <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-lg mx-auto">
                    The Cloud Club headquarters is currently undergoing a structural upgrade to better serve our builder community.
                </p>

                <div className="pt-4">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <Cloud size={16} className="text-brand-aws" />
                        AWS Cloud Club DDU
                    </div>
                </div>
            </motion.div>

            {/* Bottom Indicator */}
            <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-4 opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 animate-pulse">
                    Deploying Enhancements...
                </span>
            </div>
        </div>
    );
}
