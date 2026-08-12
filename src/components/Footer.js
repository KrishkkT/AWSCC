"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Instagram, Linkedin, ArrowUpRight, Users } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const pathname = usePathname();
    const isSCDRoute = pathname?.startsWith('/scd/');
    const scdYear = isSCDRoute ? pathname.split('/')[2] : null;

    return (
        <footer className="bg-[#0C111D] pt-16 pb-12 border-t border-white/10 relative z-20">
            <div className="container px-6 md:px-10 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <Link href={isSCDRoute ? `/scd/${scdYear}` : "/"} className="flex items-center">
                            <img src="/images/ddu-aws-combined.png" alt="AWS Student Builder Group at Dharmsinh Desai University DDU Nadiad" className="h-9 md:h-12 w-auto object-contain" />
                        </Link><br />
                        <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
                            Built with purpose, driven by community.
                        </p>

                        <div className="flex items-center gap-4 mb-8">
                            <Link href="https://www.linkedin.com/company/aws-sbg-ddit/" target="_blank" className="text-gray-400 hover:text-white hover:bg-[#0073BB] transition-all transform hover:-translate-y-1 bg-white/5 p-2.5 rounded-full border border-white/5 hover:border-[#0073BB]">
                                <Linkedin size={20} />
                            </Link>
                            <Link href="https://www.instagram.com/aws_sbg_ddit" target="_blank" className="text-gray-400 hover:text-white hover:bg-[#E1306C] transition-all transform hover:-translate-y-1 bg-white/5 p-2.5 rounded-full border border-white/5 hover:border-[#E1306C]">
                                <Instagram size={20} />
                            </Link>
                            <Link href="https://meetup.com/aws-sbg-ddit" target="_blank" className="text-gray-400 hover:text-white hover:bg-[#F24453] transition-all transform hover:-translate-y-1 bg-white/5 p-2.5 rounded-full border border-white/5 hover:border-[#F24453]" title="Meetup Group">
                                <Users size={20} />
                            </Link>
                        </div>

                        <p className="text-gray-500 text-xs">
                            &copy; {currentYear} AWS SBG DDU.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-6">QUICK LINKS</h4>
                        <ul className="space-y-4 text-sm font-bold tracking-wider uppercase">
                            <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">HOME</Link></li>
                            <li><Link href="/team" className="text-gray-400 hover:text-white transition-colors">TEAM</Link></li>
                            <li><Link href="/events" className="text-gray-400 hover:text-white transition-colors">EVENTS</Link></li>
                            <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">ABOUT</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">CONTACT</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-6">COMMUNITY</h4>
                        <ul className="space-y-4 text-sm font-bold tracking-wider uppercase">
                            <li><Link href="/community" className="text-gray-400 hover:text-white transition-colors">MEMBER HUB</Link></li>
                            <li><Link href="/resources" className="text-gray-400 hover:text-white transition-colors">RESOURCES</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">SUPPORT</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
