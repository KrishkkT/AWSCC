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
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled && !isMobileMenuOpen ? "py-4 bg-background/80 dark:bg-background/95 backdrop-blur-xl border-b border-border shadow-sm" : "py-8 bg-transparent"}`}>
            <div className="container mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center group relative z-10 transition-transform hover:scale-[1.02] duration-300">
                    <div className="h-9 sm:h-16 md:h-20 lg:h-24 flex items-center justify-start overflow-hidden">
                        <img
                            src="/images/ddu-aws-combined.png"
                            alt="AWS Cloud Club & DDU Logo"
                            className="h-16 w-auto object-contain brightness-110 dark:brightness-100 drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-none"
                        />
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
                    <Link href="https://www.meetup.com/awscc-at-dharmsinh-desai-university/" target="_blank" className="btn-aws !py-2.5 !px-8 text-xs whitespace-nowrap">
                        Join Community
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <div className="flex items-center gap-4 lg:hidden">
                    <ThemeToggle />
                    <button
                        className="text-foreground p-2 relative z-[100]"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 h-screen w-full bg-background/10 backdrop-blur-2xl z-[90] lg:hidden flex flex-col justify-center items-center"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <div
                            className="container mx-auto px-10 flex flex-col justify-center gap-12"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-8">
                                {navLinks.map((link, idx) => (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link
                                            href={link.href}
                                            className="text-4xl md:text-5xl font-display font-bold hover:text-brand-aws transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {link.name}
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-4">
                                <Link href="https://www.meetup.com/awscc-at-dharmsinh-desai-university/" target="_blank" className="btn-aws py-5 text-center font-bold text-lg" onClick={() => setIsMobileMenuOpen(false)}>
                                    Join Community
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
