"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-brand-deep flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <div className="relative z-10 card-professional p-12 max-w-lg border-red-500/20 bg-brand-navy/30">
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-red-500/20">
                    <AlertCircle size={40} className="text-red-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-4 tracking-tight">System Fault Detected</h2>
                <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                    An unexpected exception occurred during the execution. The error has been logged for architectural review.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => reset()}
                        className="btn-aws !px-10 py-3.5 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Retry Operation
                    </button>
                    <a href="/" className="btn-outline !px-10 py-3.5">
                        Return Home
                    </a>
                </div>
            </div>
        </div>
    );
}
