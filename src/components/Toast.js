"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [onClose, duration]);

    const icons = {
        success: <Check size={18} className="text-white" />,
        error: <X size={18} className="text-white" />,
        warning: <AlertCircle size={18} className="text-white" />,
        info: <Info size={18} className="text-white" />
    };

    const backgrounds = {
        success: "bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]",
        error: "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]",
        warning: "bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]",
        info: "bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
    };

    const textColors = {
        success: "text-white",
        error: "text-white",
        warning: "text-white",
        info: "text-white"
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, x: "50%" }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: "50%" }}
                    exit={{ opacity: 0, scale: 0.9, y: 20, x: "50%" }}
                    className="fixed bottom-10 right-1/2 z-[1000] pointer-events-none"
                    style={{ transform: "translateX(50%)" }}
                >
                    <div className={`${backgrounds[type]} px-6 py-4 rounded-2xl flex items-center gap-4 pointer-events-auto border border-white/10 backdrop-blur-md`}>
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            {icons[type]}
                        </div>
                        <p className={`font-black uppercase tracking-widest text-[10px] ${textColors[type]}`}>
                            {message}
                        </p>
                        <button
                            onClick={onClose}
                            className={`ml-2 hover:opacity-50 transition-opacity ${textColors[type]}`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
