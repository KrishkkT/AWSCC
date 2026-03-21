"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Zap, Shield, Users, ArrowRight, ExternalLink, Globe, Cpu, Calendar, Trophy, Rocket, BookOpen, Box } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import HeroVisual from "@/components/HeroVisual";
import * as anime from "animejs";
import { createClient } from "@/utils/supabase/client";
import CloudBackground from "@/components/CloudBackground";

const ScrollReveal = ({ children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
        {children}
    </motion.div>
);

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const [highlights, setHighlights] = useState([]);
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        fetchHighlights();
    }, [fetchHighlights]);

    async function fetchHighlights() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_visible', true)
            .neq('status', 'draft')
            .order('date', { ascending: false })
            .limit(3);

        if (!error && data) {
            setHighlights(data);
        }
    }

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden bg-transparent">
            {/* Cinematic Floating Cloud Background */}
            <CloudBackground />

            <main className="relative z-10 flex-grow min-h-screen">
                {/* Hero Section */}
                <section className="relative min-h-[95vh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">

                    <div className="container relative z-10 px-6 flex flex-col items-center text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight mb-8 leading-[0.85] text-foreground"
                        >
                            AWS Cloud Club <br />
                            <span className="text-aws-gradient">DDU Nadiad</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-lg md:text-2xl text-muted-foreground max-w-3xl mb-14 leading-relaxed font-sans font-medium"
                        >
                            Empowering the next generation of cloud builders through hands-on architecture, serverless systems, and global community collaboration.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="flex flex-col sm:flex-row items-center gap-6"
                        >
                            <Link
                                href="https://www.meetup.com/awscc-at-dharmsinh-desai-university/"
                                target="_blank"
                                className="btn-aws !px-12 !py-5 text-lg flex items-center gap-3 group relative overflow-hidden"
                            >
                                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                                <span className="relative flex items-center gap-2">
                                    Join Community <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                            <Link href="/events" className="btn-outline !px-12 !py-5 text-lg hover:shadow-xl hover:shadow-white/5 transition-all">
                                Explore Events
                            </Link>
                        </motion.div>
                    </div>
                </section>

                {/* Technology Focus Section */}
                <section className="py-24 bg-secondary/30 backdrop-blur-sm border-y border-border/50">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col items-center text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">Our Technology <span className="text-brand-aws">Stack</span></h2>
                            <p className="text-muted-foreground max-w-2xl">We focus on industry-leading cloud technologies and modern development practices to prepare students for the global tech landscape.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Cloud Architecture", desc: "Master AWS Well-Architected frameworks and scalable infrastructure design.", icon: <Cloud size={24} /> },
                                { title: "DevOps & CI/CD", desc: "Automate delivery pipelines and implement infrastructure as code (IaC).", icon: <Zap size={24} /> },
                                { title: "Serverless Computing", desc: "Build highly available applications without the overhead of server management.", icon: <Cpu size={24} /> },
                                { title: "Applied AI/ML", desc: "Integrate intelligent services and machine learning models into cloud platforms.", icon: <Rocket size={24} /> }
                            ].map((focus, i) => (
                                <ScrollReveal key={i} delay={i * 0.1}>
                                    <div className="group h-full p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-border/50 hover:border-brand-aws/40 hover:bg-brand-aws/5 transition-all duration-500 flex flex-col items-center text-center shadow-sm hover:shadow-md">
                                        <div className="w-14 h-14 rounded-xl bg-brand-aws/10 flex items-center justify-center text-brand-aws mb-6 group-hover:scale-110 transition-transform">
                                            {focus.icon}
                                        </div>
                                        <h3 className="text-xl font-display font-bold text-card-foreground mb-3">{focus.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed font-sans">{focus.desc}</p>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Latest Highlights */}
                <section className="py-24">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                            <div className="space-y-3">
                                <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">Latest <span className="text-brand-aws">Events</span></h2>
                                <p className="text-muted-foreground max-w-xl">Stay updated with our most recent workshops, hackathons, and community meetups.</p>
                            </div>
                            <Link href="/events" className="btn-outline !py-2 !px-6 flex items-center gap-2 group">
                                View Archive <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {highlights.length > 0 ? (
                                highlights.map((event, i) => (
                                    <ScrollReveal key={i} delay={i * 0.1}>
                                        <div className="card-professional group h-full flex flex-col p-0 overflow-hidden">
                                            <div className="aspect-[16/9] bg-slate-800 relative overflow-hidden">
                                                {event.image_url ? (
                                                    <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-brand-navy">
                                                        <Box className="w-16 h-16 text-slate-700" />
                                                    </div>
                                                )}
                                                <div className="absolute top-4 left-4">
                                                    <span className="px-3 py-1 bg-brand-deep/80 backdrop-blur-md text-brand-aws text-[10px] font-bold uppercase tracking-widest border border-brand-aws/30 rounded-md">
                                                        {event.status || 'Upcoming'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-8 flex flex-col flex-grow">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-tighter">
                                                    <Calendar size={14} className="text-brand-aws" />
                                                    {new Date(event.date || event.start_time).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <h3 className="text-xl font-display font-bold text-card-foreground group-hover:text-brand-aws transition-colors mb-4 line-clamp-1">{event.title}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6">{event.description || `Join us for an immersive session on ${event.title.toLowerCase()}.`}</p>
                                                <Link href={`/events?id=${event.id}`} className="mt-auto flex items-center gap-2 text-sm font-bold text-brand-aws group/link">
                                                    Event Details <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-border/50 rounded-3xl">
                                    <p className="text-muted-foreground font-medium">New events are being planned. Stay tuned!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Core Pillars */}
                <section className="py-24 bg-secondary/20 backdrop-blur-sm relative border-y border-border/50">
                    <div className="container mx-auto px-6">
                        <div className="max-w-3xl mx-auto text-center mb-20 space-y-6">
                            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">Why Join <span className="text-brand-aws">AWS Cloud Club</span>?</h2>
                            <p className="text-muted-foreground text-lg">We bridge the gap between academic theory and industry practice through the power of cloud computing.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "Industry Ready",
                                    desc: "Learn real-world AWS architecting, DevOps, and Serverless from those who build on it daily.",
                                    icon: <Zap className="text-brand-aws" size={28} />
                                },
                                {
                                    title: "Global Network",
                                    desc: "Connect with a global community of AWS builders and enthusiasts across various Cloud Clubs.",
                                    icon: <Globe className="text-brand-aws" size={28} />
                                },
                                {
                                    title: "Career Growth",
                                    desc: "Access exclusive community resources, certification guidance, and networking opportunities.",
                                    icon: <BookOpen className="text-brand-aws" size={28} />
                                }
                            ].map((pillar, i) => (
                                <ScrollReveal key={i} delay={i * 0.1}>
                                    <div className="card-professional h-full flex flex-col group p-10">
                                        <div className="mb-8 w-14 h-14 rounded-2xl bg-brand-aws/10 flex items-center justify-center group-hover:bg-brand-aws group-hover:text-brand-deep transition-all duration-300">
                                            {pillar.icon}
                                        </div>
                                        <h3 className="text-2xl font-display font-bold mb-4 tracking-tight text-card-foreground">
                                            {pillar.title}
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed font-sans -tracking-tight">
                                            {pillar.desc}
                                        </p>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-24 relative overflow-hidden">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="bg-gradient-to-br from-brand-aws to-brand-blue rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2"></div>

                            <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
                                <h2 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight">
                                    Embark on your <br /> cloud journey today.
                                </h2>
                                <p className="text-white/80 text-lg md:text-xl font-medium max-w-xl mx-auto">
                                    Join the most active developer community at Dharmsinh Desai University and start building for the future.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                                    <Link href="https://www.meetup.com/awscc-at-dharmsinh-desai-university/" target="_blank" className="btn-aws !text-white !px-12 !py-4 text-base shadow-xl">
                                        Register via Meetup
                                    </Link>
                                    <Link href="/contact" className="btn-outline !border-white/30 !text-white !hover:bg-white/10 !px-12 !py-4 text-base">
                                        Partner with Us
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
