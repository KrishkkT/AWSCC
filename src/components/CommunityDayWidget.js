"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CommunityDayWidget({ event }) {
    const [hovered, setHovered] = useState(false);
    const pathname = usePathname();

    if (!event) return null;
    
    // Don't show the widget if we are already on the community day page
    if (pathname.includes(`/community-day`)) return null;

    return (
        <div 
            className="fixed bottom-6 right-6 z-[60] flex flex-col items-end"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, originBottomRight: true }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="mb-4 bg-brand-dark/90 backdrop-blur-xl border border-brand-cyan/20 p-5 rounded-2xl shadow-2xl shadow-brand-cyan/10 w-64 origin-bottom-right"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/5 to-transparent rounded-2xl pointer-events-none" />
                        
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">Upcoming Event</span>
                        </div>
                        
                        <h4 className="text-white font-black text-lg leading-tight mb-1 relative z-10">
                            AWS Community Day {event.year}
                        </h4>
                        
                        <p className="text-white/50 text-xs font-medium mb-4 relative z-10">
                            Join us for the biggest cloud computing event at DDU!
                        </p>
                        
                        <Link href={`/community-day/${event.year}`}>
                            <button className="w-full relative z-10 btn-primary py-2.5 px-4 text-xs flex items-center justify-center gap-2 group overflow-hidden">
                                <span className="relative z-10">View Details</span>
                                <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <Link href={`/community-day/${event.year}`}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-aws to-brand-blue flex items-center justify-center shadow-[0_0_30px_rgba(255,153,0,0.3)] relative overflow-hidden group border border-white/20"
                >
                    {/* Glowing effects */}
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full mix-blend-overlay" />
                    <Cloud className="text-white relative z-10 drop-shadow-md" size={24} />
                    
                    {/* Ripple animation continuously */}
                    <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                </motion.button>
            </Link>
        </div>
    );
}
