"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Team", href: "/team" },
        { name: "Events", href: "/events" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? "py-4 bg-background/80 dark:bg-background/95 backdrop-blur-xl border-b border-border shadow-sm" : "py-8 bg-transparent"}`}>
            <div className="container mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group relative z-10">
                    <div className="h-14 md:h-16 flex items-center justify-start overflow-visible">
                        <img
                            src="/images/logo.png"
                            alt="AWSCC Logo"
                            className="h-full w-auto object-contain transition-transform group-hover:scale-105 invert dark:invert-0"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden items-center gap-2" style={{ display: 'none' }}>
                            <div className="w-8 h-8 bg-brand-aws rounded-md flex items-center justify-center font-display font-bold text-white">A</div>
                            <span className="font-display font-bold text-xl tracking-tight text-foreground">AWS <span className="text-brand-aws">CC</span></span>
                        </div>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-10">
                    {navLinks.map((link) => (
                        <Link key={link.name} href={link.href} className="nav-link font-display text-sm tracking-wide">
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="hidden lg:flex items-center gap-4">
                    <ThemeToggle />
                    <Link href="/contact" className="btn-aws !py-2.5 !px-8 text-xs whitespace-nowrap">
                        Join Community
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <div className="flex items-center gap-4 lg:hidden">
                    <ThemeToggle />
                    <button className="text-foreground p-2 relative z-10" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="fixed inset-0 h-screen w-full bg-background/98 backdrop-blur-xl z-40 p-10 lg:hidden flex flex-col justify-center gap-8"
                    >
                        <div className="flex flex-col gap-6">
                            {navLinks.map((link, idx) => (
                                <motion.div
                                    key={link.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Link
                                        href={link.href}
                                        className="text-3xl font-display font-bold hover:text-brand-aws transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-col gap-4">
                            <Link href="/contact" className="btn-aws py-4 text-center font-bold" onClick={() => setIsMobileMenuOpen(false)}>
                                Join Community
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
