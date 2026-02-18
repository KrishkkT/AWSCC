"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Zap, Shield, Users, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import HeroVisual from "@/components/HeroVisual";
import LoadingScreen from "@/components/LoadingScreen";

const ScrollReveal = ({ children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
        {children}
    </motion.div>
);

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        // Simulate loading check (wait for animation)
        const timer = setTimeout(() => setLoading(false), 2800); // Slightly longer than progress bar
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden bg-brand-dark">
            <AnimatePresence>
                {loading && <LoadingScreen key="loader" />}
            </AnimatePresence>
            {/* Elite Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-dot-grid opacity-50"></div>

            {/* Animated Gradient Blobs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-brand-cyan/10 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-brand-teal/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-brand-blue/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
            </div>

            <HeroVisual />

            {/* Hero Section */}
            <section className="relative pt-28 pb-20 lg:pt-38 lg:pb-38 overflow-hidden z-10 flex items-center justify-center min-h-[90vh]">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-brand-cyan text-[10px] font-black tracking-[0.2em] uppercase mb-12"
                    >
                        <Zap size={14} className="animate-pulse" />
                        <span>Empowering the next generation of cloud developers</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-6xl lg:text-[10rem] font-black mb-6 leading-[0.85] tracking-tighter"
                    >
                        AWS <span className="text-brand-cyan text-glow-cyan">Cloud Club</span> <br />
                        <span className="text-white text-4xl lg:text-7xl font-light tracking-[0.2em] opacity-80 mt-6 block uppercase">DDU Nadiad</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="space-y-6 mb-16"
                    >
                        <p className="text-lg lg:text-2xl text-[#B8C5D6] max-w-3xl mx-auto leading-relaxed font-medium">
                            Join our community of passionate developers and cloud enthusiasts. Learn, grow, and build amazing things together.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-8"
                    >
                        <Link href="/events" className="btn-primary flex items-center gap-3 group text-xl px-12 py-5 shadow-[0_0_40px_rgba(0,194,255,0.3)]">
                            Join Our Club
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/about" className="btn-secondary text-xl px-12 py-5 backdrop-blur-md">
                            Learn More
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 z-10 relative">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { label: "Active Members", value: "500+", color: "cyan" },
                            { label: "Workshops Held", value: "25+", color: "teal" },
                            { label: "Cloud Lab Hours", value: "2000+", color: "white" },
                            { label: "AWS Certs Earned", value: "30+", color: "cyan" }
                        ].map((stat, i) => (
                            <ScrollReveal key={i} delay={i * 0.1}>
                                <div className="glass-card group text-center border-white/5 hover:border-brand-cyan/20">
                                    <div className={`text-6xl font-black mb-4 text-brand-${stat.color} tracking-tighter group-hover:scale-110 transition-transform duration-500`}>
                                        {stat.value}
                                    </div>
                                    <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                                        {stat.label}
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Pillars Section */}
            <section className="py-40 relative z-10 border-y border-white/5 bg-brand-deep/30">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-4xl mx-auto mb-32">
                        <h2 className="text-5xl lg:text-8xl font-black mb-10 tracking-tighter">
                            The <span className="text-gradient-elite">Future</span> is Distributed
                        </h2>
                        <p className="text-[#B8C5D6]/80 text-xl lg:text-2xl leading-relaxed font-medium">
                            We provide the infrastructure and community for students to master the world's most comprehensive cloud platform.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            {
                                title: "Build",
                                desc: "Get hands-on with AWS through real-world projects and architect-led learning paths.",
                                icon: <Zap className="text-brand-cyan" size={40} />,
                                gradient: "from-brand-cyan/10 to-transparent"
                            },
                            {
                                title: "Scale",
                                desc: "Understand global infrastructure and how to deploy applications that serve millions of users.",
                                icon: <Cloud className="text-brand-teal" size={40} />,
                                gradient: "from-brand-teal/10 to-transparent"
                            },
                            {
                                title: "Connect",
                                desc: "Join a global network of AWS Cloud Clubs and industry leaders at DDU.",
                                icon: <Users className="text-white" size={40} />,
                                gradient: "from-white/10 to-transparent"
                            }
                        ].map((pillar, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className={`glass-card p-14 group border-white/5 relative overflow-hidden`}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-cyan to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="mb-12 w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan group-hover:text-brand-dark transition-all duration-700 shadow-2xl">
                                    {pillar.icon}
                                </div>
                                <h3 className="text-4xl font-black mb-6 tracking-tight group-hover:translate-x-2 transition-transform">
                                    {pillar.title}
                                </h3>
                                <p className="text-[#B8C5D6]/50 leading-relaxed font-medium text-lg">
                                    {pillar.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Big Cyan Call to Action */}
            <section className="py-40 z-10 relative">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[2.5rem] overflow-hidden p-12 lg:p-20 bg-brand-cyan text-brand-dark group shadow-[0_0_80px_rgba(0,194,255,0.2)]"
                    >
                        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3"></div>

                        <div className="relative z-10 max-w-3xl mx-auto text-center">
                            <h2 className="text-4xl lg:text-6xl font-black mb-8 leading-tight tracking-tight">
                                Ready to Join the Community?
                            </h2>
                            <p className="text-brand-dark/80 text-lg lg:text-2xl mb-10 max-w-xl mx-auto font-bold leading-snug">
                                Empower your journey with the world's most innovative cloud community at DDU.
                            </p>
                            <div className="flex flex-wrap justify-center gap-6">
                                <button className="px-10 py-5 bg-brand-dark text-white rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl">
                                    Join Our Community
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
