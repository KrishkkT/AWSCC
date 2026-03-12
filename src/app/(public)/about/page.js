"use client";

import { motion } from "framer-motion";
import { Target, Lightbulb, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function About() {
    return (
        <div className="min-h-screen bg-brand-deep relative overflow-hidden pt-32 pb-24">
            {/* Background Elements */}
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-aws/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-32">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
                    >
                        Our Story & Mission
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl lg:text-7xl font-display font-bold mb-8 tracking-tight text-white leading-tight"
                    >
                        Empowering the next generation of <span className="text-aws-gradient">Cloud Architects</span>.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-3xl"
                    >
                        The AWS Cloud Club at DDU is a student-led organization authorized by Amazon Web Services.
                        We bridge the gap between classroom theory and industry infrastructure.
                    </motion.p>
                </div>

                {/* Mission & Vision Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                    {[
                        {
                            title: "Mission",
                            desc: "To equip students with industry-standard cloud skills through structured learning paths and technical excellence.",
                            icon: Target,
                        },
                        {
                            title: "Vision",
                            desc: "To cultivate a community of architects capable of designing and deploying global-scale cloud solutions.",
                            icon: Lightbulb,
                        },
                        {
                            title: "Values",
                            desc: "We prioritize security-first architecture, operational excellence, and collaborative innovation.",
                            icon: Heart,
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="card-professional flex flex-col group p-10"
                        >
                            <div className="mb-8 w-14 h-14 rounded-2xl bg-brand-aws/10 flex items-center justify-center text-brand-aws group-hover:bg-brand-aws group-hover:text-brand-deep transition-all duration-300">
                                <item.icon size={28} />
                            </div>
                            <h3 className="text-2xl font-display font-bold mb-4 tracking-tight text-white">{item.title}</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Detailed Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        <h2 className="text-4xl font-display font-bold text-white">Why we exist?</h2>
                        <p className="text-slate-400 leading-relaxed text-lg">
                            Cloud computing isn't just a technology; it's the foundation of modern digital transformation.
                            We realized that many students have the passion but lack the environment to experiment with enterprise-grade tools.
                        </p>
                        <p className="text-slate-400 leading-relaxed text-lg">
                            Our club provides that environment. We focus on AWS—not just because it's the market leader,
                            but because its services offer the most comprehensive playground for building anything from a simple website to complex machine learning pipelines.
                        </p>
                        <div className="flex flex-col gap-4 pt-4">
                            {[
                                "Authorized by AWS Club Program",
                                "Hands-on Workshop Series",
                                "Industry Networking Events",
                                "Official Certification Support"
                            ].map((ptr, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-slate-300 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-aws"></div>
                                    {ptr}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl overflow-hidden border border-slate-800 aspect-video lg:aspect-square group"
                    >
                        <div className="absolute inset-0 bg-brand-aws/10 group-hover:bg-transparent transition-colors z-10"></div>
                        <img
                            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop"
                            alt="Team Collaboration"
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                    </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center bg-brand-navy/30 py-20 rounded-[2.5rem] border border-slate-800"
                >
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">Ready to join our builder community?</h2>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/events" className="btn-aws !px-10 !py-4 text-base flex items-center justify-center gap-3 group">
                            Explore Workshops <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/contact" className="btn-outline !px-10 !py-4 text-base">
                            Contact Support
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
