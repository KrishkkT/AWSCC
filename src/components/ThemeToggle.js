"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="p-2 w-10 h-10" />;

    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border flex items-center justify-center relative overflow-hidden shadow-sm"
            aria-label="Toggle Theme"
        >
            <AnimatePresence mode="popLayout" initial={false}>
                {theme === "dark" ? (
                    <motion.div
                        key="dark"
                        initial={{ y: 30, x: 30, opacity: 0, rotate: 90 }} // Comes up from bottom right
                        animate={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 30, x: 30, opacity: 0, rotate: 90 }} // Goes down to bottom right
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="absolute flex items-center justify-center"
                    >
                        <Sun className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="light"
                        initial={{ y: 30, x: -30, opacity: 0, rotate: -90 }} // Comes up from bottom left
                        animate={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 30, x: -30, opacity: 0, rotate: -90 }} // Goes down to bottom left
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="absolute flex items-center justify-center"
                    >
                        <Moon className="w-5 h-5 text-slate-700 drop-shadow-[0_0_8px_rgba(51,65,85,0.3)]" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
