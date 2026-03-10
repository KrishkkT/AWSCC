"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Zap, Shield, Users, ArrowRight, ExternalLink, Globe, Cpu, Calendar, Trophy, Rocket, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import HeroVisual from "@/components/HeroVisual";
import * as anime from "animejs";
import { createClient } from "@/utils/supabase/client";

const ScrollReveal = ({ children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
        {children}
    </motion.div>
);

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const [highlights, setHighlights] = useState([]);
    const heroRef = useRef(null);
    const titleRef = useRef(null);
    const badgeRef = useRef(null);
    const subtitleRef = useRef(null);
    const ctaRef = useRef(null);
    const bioRef = useRef(null);
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        fetchHighlights();

        if (mounted) {
            const timeline = anime.createTimeline({
                defaults: {
                    easing: 'easeOutExpo',
                    duration: 1000
                }
            });

            timeline
                .add(badgeRef.current, {
                    opacity: [0, 1],
                    scale: [0.8, 1],
                    translateY: [15, 0],
                    delay: 100
                })
                .add(titleRef.current, {
                    opacity: [0, 1],
                    translateY: [30, 0],
                    letterSpacing: ['-0.1em', '-0.02em'],
                }, '-=700')
                .add(subtitleRef.current, {
                    opacity: [0, 1],
                    translateY: [15, 0],
                }, '-=800')
                .add(bioRef.current, {
                    opacity: [0, 1],
                    translateY: [15, 0],
                }, '-=800')
                .add(ctaRef.current, {
                    opacity: [0, 1],
                    translateY: [20, 0],
                    scale: [0.98, 1],
                    easing: 'outElastic(1, .8)',
                }, '-=600');
        }
    }, [mounted]);

    async function fetchHighlights() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_visible', true)
            .neq('status', 'draft')
            .order('date', { ascending: true })
            .limit(3);

        if (!error && data) {
            setHighlights(data);
        }
    }

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden bg-brand-dark">
            {/* Elite Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-dot-grid opacity-60"></div>

            {/* Animated Gradient Blobs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-brand-cyan/5 rounded-full blur-[80px] animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[25rem] h-[25rem] bg-brand-teal/5 rounded-full blur-[80px] animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[35rem] h-[35rem] bg-brand-blue/5 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>
            </div>

            <main className="relative z-10 flex-grow">
                {/* Elite Hero Section */}
                <div className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
                    {/* Background Visuals */}
                    <div className="absolute inset-0 z-0">
                        <HeroVisual />
                        <div className="absolute inset-0 bg-brand-dark/20 backdrop-blur-[2px]" />
                    </div>

                    <div className="container relative z-10 px-6 flex flex-col items-center text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 backdrop-blur-md mb-8"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-cyan">
                                Empowering the next generation of cloud developers
                            </span>
                        </motion.div>

                        <div className="relative mb-6">
                            <motion.h1
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-none"
                            >
                                AWS <span className="text-brand-cyan drop-shadow-[0_0_30px_rgba(0,194,255,0.8)]">Cloud Club</span>
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl md:text-6xl font-light text-white/90 tracking-[0.4em] uppercase mt-4 mb-8"
                                style={{ fontFamily: "'Cinzel', serif" }}
                            >
                                DDU Nadiad
                            </motion.div>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mb-12 leading-relaxed"
                        >
                            Join our community of passionate developers and cloud enthusiasts. Learn, grow, and build amazing things together.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center gap-6"
                        >
                            <Link
                                href="https://www.meetup.com/awscc-at-dharmsinh-desai-university/"
                                target="_blank"
                                className="px-10 py-5 bg-brand-cyan text-brand-dark rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,194,255,0.4)] flex items-center gap-3"
                            >
                                Join Our Club <ArrowRight size={20} />
                            </Link>
                            <Link href="/about" className="px-10 py-5 bg-white/5 border border-white/10 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white backdrop-blur-md">
                                Learn More
                            </Link>
                        </motion.div>
                    </div>
                </div>

                {/* Featured Highlights Section */}
                <section className="py-12 z-10 relative border-t border-white/5 bg-brand-deep/20">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Cloud Workshops", desc: "Expert-led technical sessions", icon: <Cpu size={20} />, color: "cyan" },
                                { title: "Hands-on Labs", desc: "Practical AWS infrastructure", icon: <Zap size={20} />, color: "teal" },
                                { title: "Certifications", desc: "Cloud career roadmap", icon: <Trophy size={20} />, color: "white" },
                                { title: "Community", desc: "Network with builders", icon: <Users size={20} />, color: "cyan" }
                            ].map((feat, i) => (
                                <ScrollReveal key={i} delay={i * 0.1}>
                                    <div className="glass-card p-5 group flex flex-col items-center text-center">
                                        <div className={`w-10 h-10 rounded-xl bg-brand-${feat.color}/10 flex items-center justify-center text-brand-${feat.color} mb-4 group-hover:scale-110 transition-transform`}>
                                            {feat.icon}
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider mb-2">{feat.title}</h4>
                                        <p className="text-[10px] text-white/40 font-medium">{feat.desc}</p>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Latest Events Section */}
                <section className="py-20 z-10 relative">
                    <div className="container mx-auto px-6">
                        <div className="flex items-end justify-between mb-12">
                            <div className="space-y-2">
                                <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Latest <span className="text-white">Highlights</span></h2>
                            </div>
                            <Link href="/events" className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40 hover:text-brand-cyan transition-colors">
                                View All Events <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {highlights.length > 0 ? (
                                highlights.map((event, i) => (
                                    <ScrollReveal key={i} delay={i * 0.1}>
                                        <div className="glass-card p-0 overflow-hidden group">
                                            <div className="aspect-[16/9] bg-white/5 relative bg-mesh overflow-hidden">
                                                {event.image_url ? (
                                                    <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                                        <Cloud size={64} className="text-brand-cyan" />
                                                    </div>
                                                )}
                                                <div className="absolute top-4 left-4">
                                                    <span className="px-3 py-1 bg-brand-cyan text-brand-dark text-[8px] font-black uppercase tracking-widest rounded-full">
                                                        {event.status === 'upcoming' ? 'Soon' : event.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-6 space-y-3">
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#B8C5D6]/40">
                                                    <Calendar size={12} /> {new Date(event.date || event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <h3 className="text-lg font-black tracking-tight group-hover:text-brand-cyan transition-colors line-clamp-1">{event.title}</h3>
                                                <p className="text-[11px] text-[#B8C5D6]/50 line-clamp-2 leading-relaxed">{event.description || `Join us for an immersive session on ${event.title.toLowerCase()}.`}</p>
                                                <Link href="/events" className="pt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-cyan opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                                    Learn More <ArrowRight size={12} />
                                                </Link>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                ))
                            ) : (
                                <div className="col-span-full py-10 text-center opacity-40">
                                    <p className="text-xs font-black uppercase tracking-widest">More exciting events coming soon</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Core Pillars Section - Condensed */}
                <section className="py-20 relative z-10 border-y border-white/5 bg-brand-deep/30">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-4xl mx-auto mb-16">
                            <h2 className="text-3xl lg:text-4xl font-black mb-6 tracking-tighter">
                                The <span className="text-gradient-elite">Future</span> is Distributed
                            </h2>
                            <p className="text-[#B8C5D6]/80 text-sm lg:text-base leading-relaxed font-medium">
                                We provide the infrastructure and community for students to master the world's most comprehensive cloud platform.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    title: "Build",
                                    desc: "Get hands-on with AWS through real-world projects and architect-led learning paths.",
                                    icon: <Rocket className="text-brand-cyan" size={24} />
                                },
                                {
                                    title: "Scale",
                                    desc: "Understand global infrastructure and how to deploy applications that serve millions of users.",
                                    icon: <Globe className="text-brand-teal" size={24} />
                                },
                                {
                                    title: "Connect",
                                    desc: "Join a global network of AWS Cloud Clubs and industry leaders at DDU.",
                                    icon: <BookOpen className="text-white" size={24} />
                                }
                            ].map((pillar, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className={`glass-card p-8 group border-white/5 relative overflow-hidden`}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-cyan to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="mb-6 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan group-hover:text-brand-dark transition-all duration-700">
                                        {pillar.icon}
                                    </div>
                                    <h3 className="text-xl font-black mb-3 tracking-tight group-hover:translate-x-1 transition-transform">
                                        {pillar.title}
                                    </h3>
                                    <p className="text-[#B8C5D6]/50 leading-relaxed font-medium text-[12px]">
                                        {pillar.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Big Cyan Call to Action - Smaller */}
                <section className="py-20 z-10 relative">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative rounded-[1.5rem] overflow-hidden p-8 lg:p-12 bg-brand-cyan text-brand-dark group shadow-[0_0_60px_rgba(0,194,255,0.15)]"
                        >
                            <div className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-white/20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3"></div>

                            <div className="relative z-10 max-w-2xl mx-auto text-center">
                                <h2 className="text-2xl lg:text-3xl font-black mb-4 leading-tight tracking-tight">
                                    Ready to Join the Community?
                                </h2>
                                <p className="text-brand-dark/80 text-xs lg:text-sm mb-6 max-w-lg mx-auto font-bold">
                                    Empower your journey with the world's most innovative cloud community at DDU.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button className="px-6 py-2.5 bg-brand-dark text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                                        Join Our Community
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>
        </div>
    );
}
