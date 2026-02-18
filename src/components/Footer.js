"use client";

import Link from "next/link";
import { Cloud, Mail, MapPin, Globe, Github, Linkedin, Instagram, Twitter } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-brand-deep text-white border-t border-brand-cyan/20 pt-32 pb-16 relative overflow-hidden">
            {/* Subtle Glow at the top of footer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_20px_rgba(0,194,255,0.5)]"></div>

            <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 border-b border-white/5 pb-24 mb-16 relative z-10">
                {/* Branding & Logo Section */}
                <div className="lg:col-span-1 space-y-8">
                    <Link href="/" className="flex items-center gap-4 group">
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
                    <p className="text-[#B8C5D6]/60 leading-relaxed font-medium">
                        Empowering students with cloud technology and innovation through hands-on learning and industry expertise at DDU Nadiad.
                    </p>
                    <div className="flex gap-4">
                        {[
                            { icon: <Mail size={18} />, href: "mailto:awscloudclub@ddu.ac.in" },
                            { icon: <Instagram size={18} />, href: "#" },
                            { icon: <Linkedin size={18} />, href: "#" },
                            { icon: <Github size={18} />, href: "#" },
                            { icon: <Twitter size={18} />, href: "#" }
                        ].map((social, idx) => (
                            <a key={idx} href={social.href} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-brand-cyan hover:text-brand-dark hover:border-brand-cyan transition-all duration-300">
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Navigation Column */}
                <div className="space-y-8 lg:pl-10">
                    <h4 className="text-sm font-black uppercase tracking-[0.25em] text-brand-cyan">Club</h4>
                    <ul className="space-y-4 text-white/50 font-medium">
                        <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                        <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                        <li><Link href="/team" className="hover:text-white transition-colors">Our Team</Link></li>
                        <li><Link href="/events" className="hover:text-white transition-colors">Latest Events</Link></li>
                        <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
                    </ul>
                </div>

                {/* Community Column */}
                <div className="space-y-8 lg:pl-10">
                    <h4 className="text-sm font-black uppercase tracking-[0.25em] text-brand-teal">Community</h4>
                    <ul className="space-y-4 text-white/50 font-medium">
                        <li><Link href="/community" className="hover:text-white transition-colors">Member Hub</Link></li>
                        <li><Link href="/resources" className="hover:text-white transition-colors">Resources</Link></li>
                        <li><Link href="/knowledge" className="hover:text-white transition-colors">Knowledge Center</Link></li>
                        <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                    </ul>
                </div>

                {/* Get In Touch Column */}
                <div className="space-y-8 lg:pl-10">
                    <h4 className="text-sm font-black uppercase tracking-[0.25em] text-white">Get In Touch</h4>
                    <ul className="space-y-6">
                        <li className="flex items-center gap-4 group">
                            <div className="text-brand-cyan group-hover:scale-110 transition-transform"><Mail size={18} /></div>
                            <span className="text-white/60 font-medium text-sm">awscloudclub@ddu.ac.in</span>
                        </li>
                        <li className="flex items-center gap-4 group">
                            <div className="text-brand-teal group-hover:scale-110 transition-transform"><MapPin size={18} /></div>
                            <span className="text-white/60 font-medium text-sm">DDU Campus, Nadiad</span>
                        </li>
                        <li className="pt-4">
                            <button className="px-8 py-3 bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-cyan hover:text-brand-dark transition-all">
                                Join Our Club
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 relative z-10">
                <p>© {currentYear} AWS Cloud Club DDU. All rights reserved.</p>
                <p className="flex items-center gap-2">
                    Made with <span className="text-brand-cyan">💙</span> by our dev team
                </p>
            </div>

            <div className="absolute bottom-[-10%] right-[-10%] opacity-5 pointer-events-none rotate-12">
                <Cloud size={500} />
            </div>
        </footer>
    );
}
