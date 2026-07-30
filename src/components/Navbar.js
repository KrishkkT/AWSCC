"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const isSCDRoute = pathname?.startsWith('/scd/');
    const scdYear = isSCDRoute ? pathname.split('/')[2] : null;
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 10) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }

            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                // scrolling down
                setHidden(true);
            } else if (currentScrollY < lastScrollY.current) {
                // scrolling up
                setHidden(false);
            }
            
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const navLinks = isSCDRoute ? [
        { name: "About", href: "#about" },
        { name: "Workshops", href: "#workshops" },
        { name: "Agenda", href: "#agenda" },
        { name: "Speakers", href: "#speakers" },
        { name: "Venue", href: "#venue" },
        { name: "Team", href: "#team" },
    ] : [
        { name: "Home", href: "/" },
        { name: "Team", href: "/team" },
        { name: "Events", href: "/events" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    const isActive = (href) => {
        if (href.startsWith('#')) return false;
        return pathname === href;
    };

    return (
        <>
            <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-deep-navy shadow-lg' : 'bg-transparent'} ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
                <div className="flex items-center justify-between px-6 md:px-10 py-6 max-w-7xl mx-auto">
                    <Link href={isSCDRoute ? `/scd/${scdYear}` : "/"} className="flex items-center">
                        <img src="/images/ddu-aws-combined.png" alt="AWS Student Builder Group DDU" className="h-8 md:h-10 w-auto object-contain" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-[15px] font-medium tracking-wide transition-colors relative group py-1 ${isActive(link.href) ? 'text-[#0073BB]' : 'text-white hover:text-gray-200'}`}
                            >
                                {link.name}
                                <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#0073BB] transition-transform duration-300 origin-left ${isActive(link.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link
                            href="https://www.meetup.com/aws-sbg-ddit/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative overflow-hidden group bg-[#0073BB] text-white text-[13px] font-bold px-6 py-2.5 tracking-wider hidden md:block rounded-full border border-[#0073BB]"
                        >
                            <span className="relative z-10 group-hover:text-[#0C111D] transition-colors duration-300">JOIN COMMUNITY</span>
                            <div className="absolute inset-0 bg-white transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden flex items-center justify-center p-2 text-white hover:text-gray-300 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isMobileMenuOpen ? (
                                    <>
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </>
                                ) : (
                                    <>
                                        <line x1="4" y1="12" x2="20" y2="12"></line>
                                        <line x1="4" y1="6" x2="20" y2="6"></line>
                                        <line x1="4" y1="18" x2="20" y2="18"></line>
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-deep-navy md:hidden pt-24"
                        >
                            <div className="flex flex-col items-center gap-6 p-8">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={`text-2xl font-bold ${isActive(link.href) ? 'text-[#0073BB]' : 'text-white'}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <Link
                                    href="https://www.meetup.com/aws-sbg-ddit/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-8 bg-[#0073BB] text-white font-bold text-sm px-8 py-4 w-full text-center"
                                >
                                    JOIN COMMUNITY
                                </Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
