"use client";

import Link from "next/link";
import { Cloud, Mail, MapPin, Github, Instagram, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-background text-foreground/80 pt-24 pb-12 relative overflow-hidden border-t border-border">
            <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 relative z-10 font-sans">
                {/* Branding & Logo Section */}
                <div className="lg:col-span-1 space-y-6">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/images/ddu-aws-combined.png"
                            alt="AWSCC Logo"
                            className="h-14 w-auto object-contain invert dark:invert-0"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden items-center gap-2" style={{ display: 'none' }}>
                            <div className="w-8 h-8 bg-brand-aws rounded-md flex items-center justify-center font-display font-bold text-white">A</div>
                            <span className="font-display font-bold text-xl tracking-tight text-foreground">AWS <span className="text-brand-aws">CC</span></span>
                        </div>
                    </Link>
                    <p className="text-muted-foreground leading-relaxed text-sm max-w-xs">
                        The official AWS Student Builder Group at Dharmsinh Desai University. Empowering students with industry-leading cloud technology and hands-on learning.
                    </p>
                    <div className="flex gap-3">
                        {[
                            { icon: <Mail size={16} />, href: "mailto:awscloudclub@ddu.ac.in" },
                            { icon: <Instagram size={16} />, href: "#" },
                            { icon: <Linkedin size={16} />, href: "#" },
                            { icon: <Github size={16} />, href: "#" },
                            { icon: <Twitter size={16} />, href: "#" }
                        ].map((social, idx) => (
                            <a key={idx} href={social.href} className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-brand-aws hover:text-white hover:border-brand-aws transition-all duration-300">
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Navigation Column */}
                <div className="lg:pl-8">
                    <h4 className="font-display font-bold text-foreground mb-6 tracking-wide">Resources</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="/" className="hover:text-brand-aws transition-colors">Home</Link></li>
                        <li><Link href="/about" className="hover:text-brand-aws transition-colors">About Us</Link></li>
                        <li><Link href="/team" className="hover:text-brand-aws transition-colors">Our Team</Link></li>
                        <li><Link href="/events" className="hover:text-brand-aws transition-colors">Events</Link></li>
                        <li><Link href="/gallery" className="hover:text-brand-aws transition-colors">Gallery</Link></li>
                    </ul>
                </div>

                {/* Community Column */}
                <div>
                    <h4 className="font-display font-bold text-foreground mb-6 tracking-wide">Community</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="/community" className="hover:text-brand-aws transition-colors">Member Hub</Link></li>
                        <li><Link href="/resources" className="hover:text-brand-aws transition-colors">Cloud Resources</Link></li>
                        <li><Link href="/contact" className="hover:text-brand-aws transition-colors">Support</Link></li>
                    </ul>
                </div>

                {/* Get In Touch Column */}
                <div>
                    <h4 className="font-display font-bold text-foreground mb-6 tracking-wide">Contact</h4>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3 group">
                            <Mail size={18} className="text-brand-aws mt-0.5" />
                            <span className="text-muted-foreground text-sm break-all">awscloudclub@ddu.ac.in</span>
                        </li>
                        <li className="flex items-start gap-3 group">
                            <MapPin size={18} className="text-brand-aws mt-0.5" />
                            <span className="text-muted-foreground text-sm">DDU Campus, Nadiad, Gujarat</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="container mx-auto px-6 pt-8 border-t border-border flex flex-col items-center justify-center text-center gap-6 text-xs text-muted-foreground font-medium">
                <p>© {currentYear} AWS Student Builder Group DDU. All rights reserved.</p>
            </div>
        </footer>
    );
}
