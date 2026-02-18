"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Something went wrong!</h2>
            <p className="text-white/50 mb-8 max-w-md">
                We encountered an unexpected error. Our team has been notified.
            </p>
            <button
                onClick={() => reset()}
                className="btn-primary py-3 px-8 flex items-center gap-2"
            >
                <RefreshCw size={18} />
                Try Again
            </button>
        </div>
    );
}
