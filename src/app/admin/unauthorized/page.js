"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function Unauthorized() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px]"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-12 max-w-lg w-full border-red-500/20 relative z-10"
            >
                <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                    <ShieldAlert size={40} className="text-red-500" />
                </div>

                <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Access Denied</h1>
                <p className="text-white/50 mb-10 leading-relaxed text-lg font-medium">
                    You do not have the required permissions to access the Admin Portal.
                    If you believe this is an error, please contact the <span className="text-brand-cyan">Club Captain</span>.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/" className="btn-secondary flex items-center justify-center gap-2 px-8 py-4">
                        <Home size={18} />
                        Back to Home
                    </Link>
                    <Link href="/login" className="btn-primary flex items-center justify-center gap-2 px-8 py-4 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <ArrowLeft size={18} />
                        Sign Out
                    </Link>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-white/20 text-xs font-bold uppercase tracking-[0.4em]"
            >
                Security Protocol Active
            </motion.div>
        </div>
    );
}
