"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

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
        { name: "Contact", href: "/contact" },
    ];

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-gradient-bottom ${scrolled ? "py-4 bg-brand-dark/80 backdrop-blur-md" : "py-6 bg-transparent"}`}>
            <div className="container mx-auto px-6 flex items-center justify-between">
                {/* Elite Branding */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative h-14 w-52 flex items-center justify-start overflow-visible">
                        <div className="absolute inset-0 bg-brand-cyan/5 blur-2xl group-hover:bg-brand-cyan/10 transition-all rounded-full scale-150" />
                        <img
                            src="/images/logo.png"
                            alt="AWSCC Logo"
                            className="h-full w-full object-contain object-left relative z-10 scale-125 origin-left transition-transform group-hover:scale-[1.35]"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    </div>
                </Link>

                {/* Desktop Navigation - Standard Spacing */}
                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link key={link.name} href={link.href} className="nav-link text-sm font-bold uppercase tracking-wider hover:text-brand-cyan transition-colors">
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* CTA Button */}
                <div className="hidden lg:block">
                    <Link href="/contact" className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-cyan hover:text-brand-dark hover:border-brand-cyan transition-all">
                        Join Community
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button className="lg:hidden text-white p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 w-full bg-brand-deep border-b border-white/5 p-8 lg:hidden flex flex-col gap-6"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-xl font-black uppercase tracking-widest"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <button className="btn-primary w-full mt-4">Join Community</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
