"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Calendar, Users, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CommunityDayPopup({ event }) {
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        if (!event) return;

        // Don't show on the actual community day page
        if (pathname.includes(`/scd/${event.year}`)) return;

        // Check if user already dismissed it this session
        const dismissed = sessionStorage.getItem(`awscc_popup_dismissed_${event.year}`);
        if (!dismissed) {
            // Slight delay so it doesn't instantly block the screen on exact load
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [event, pathname]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem(`awscc_popup_dismissed_${event?.year}`, 'true');
    };

    if (!event) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
                        onClick={handleDismiss}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-brand-cyan/20 bg-[#0a0f18] shadow-2xl glass-card z-10"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors z-30 backdrop-blur-sm"
                        >
                            <X size={16} />
                        </button>

                        {(event.hero_data?.popup_image || event.hero_data?.mobile_image) && (
                            <div className={`w-full relative overflow-hidden bg-brand-dark flex flex-col items-center justify-center ${event.hero_data?.mobile_image ? 'aspect-[9/16] md:aspect-[1.6/1]' : 'aspect-[1.6/1]'}`}>
                                {event.hero_data?.popup_image && (
                                    <img
                                        src={event.hero_data.popup_image}
                                        alt="Event Cover Desktop"
                                        className={`${event.hero_data?.mobile_image ? 'hidden md:block' : 'block'} absolute inset-0 w-full h-full object-cover`}
                                    />
                                )}
                                {event.hero_data?.mobile_image && (
                                    <img
                                        src={event.hero_data.mobile_image}
                                        alt="Event Cover Mobile"
                                        className={`${event.hero_data?.popup_image ? 'block md:hidden' : 'block'} absolute inset-0 w-full h-full object-cover`}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-transparent pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0f18] to-transparent pointer-events-none" />
                            </div>
                        )}

                        {/* Glowing orb accent */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-brand-cyan/20 blur-[100px] pointer-events-none" />

                        <div className={`relative p-8 ${(event.hero_data?.popup_image || event.hero_data?.mobile_image) ? 'pt-2' : ''}`}>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                                    Flagship Event
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-white mb-2 leading-tight">
                                {event.title}
                            </h2>
                            <p className="text-white/60 mb-6 font-medium text-sm leading-relaxed">
                                Experience the future of cloud computing! Join expert sessions, hands-on workshops, and network with industry professionals at Dharmsinh Desai University.
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                                    <Calendar className="text-brand-cyan" size={18} />
                                    <div className="text-xs font-bold text-white">
                                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                                    <Target className="text-brand-aws" size={18} />
                                    <div className="text-xs font-bold text-white">Limited Seats</div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Link href={`/scd/${event.year}`} className="flex-1" onClick={handleDismiss}>
                                    <button className="w-full btn-primary py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,194,255,0.3)]">
                                        Explore the Event <ArrowRight size={16} />
                                    </button>
                                </Link>
                                <button onClick={handleDismiss} className="btn-secondary py-3 px-6 text-sm font-bold">
                                    Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
