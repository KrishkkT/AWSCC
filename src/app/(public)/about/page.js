"use client";

import { motion } from "framer-motion";
import { Target, Lightbulb, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function About() {
    return (
        <div className="min-h-screen bg-brand-dark relative overflow-hidden pt-24 pb-20">
            {/* Background Elements */}
            <div className="fixed inset-0 bg-dot-grid opacity-30 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Hero Section */}
                <div className="text-center max-w-4xl mx-auto mb-32">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl lg:text-7xl font-black mb-6 tracking-tighter"
                    >
                        We Are <span className="text-gradient-elite">Builders.</span><br />
                        We Are <span className="text-brand-cyan">Innovators.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-xl font-medium leading-relaxed"
                    >
                        AWS Cloud Club is a global community of students passionate about the cloud.
                        At DDU, we are pushing the boundaries of what student developers can achieve.
                    </motion.p>
                </div>

                {/* Mission & Vision Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                    {[
                        {
                            title: "Mission",
                            desc: "To empower students with industry-ready cloud skills through hands-on workshops and real-world projects.",
                            icon: Target,
                            color: "cyan"
                        },
                        {
                            title: "Vision",
                            desc: "To be the leading student community for cloud innovation, fostering the next generation of solutions architects.",
                            icon: Lightbulb,
                            color: "teal"
                        },
                        {
                            title: "Values",
                            desc: "We believe in open source, collaborative learning, and building software that solves meaningful problems.",
                            icon: Heart,
                            color: "pink" // varied color
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="glass-card p-10 border-white/5 relative group overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full bg-${item.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                            <div className="mb-6 w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <item.icon size={32} className={`text-${item.color}-400`} />
                            </div>
                            <h3 className="text-3xl font-black mb-4 tracking-tight">{item.title}</h3>
                            <p className="text-white/50 leading-relaxed font-medium">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-8">Ready to start your cloud journey?</h2>
                    <Link href="/events" className="btn-primary inline-flex items-center gap-3 px-8 py-4 text-lg">
                        Explore Events <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
