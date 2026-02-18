"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
    return (
        <html>
            <body className="bg-brand-dark min-h-screen flex flex-col items-center justify-center text-center p-6">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={48} className="text-red-500" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4">Critical System Error</h2>
                <p className="text-white/50 mb-8 max-w-md">
                    The application encountered a critical error and could not load.
                </p>
                <button
                    onClick={() => reset()}
                    className="bg-brand-cyan text-brand-dark font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <RefreshCw size={20} />
                    Restart System
                </button>
            </body>
        </html>
    );
}
