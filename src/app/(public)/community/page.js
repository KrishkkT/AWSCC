"use client";

import { motion } from "framer-motion";
import { Users, MessageSquare, Zap, Globe } from "lucide-react";

export default function CommunityPage() {
    return (
        <div className="min-h-screen bg-background pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        Active Ecosystem
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-display font-bold text-foreground mb-8 tracking-tight"
                    >
                        Our <span className="text-brand-aws">Community</span>
                    </motion.h1>
                    <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                        A vibrant ecosystem of cloud enthusiasts, builders, and innovators at DDU,
                        fostering a culture of shared learning and technological growth.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: "Collaborate", desc: "Work together on production-grade cloud projects and research.", icon: <Users size={28} /> },
                        { title: "Discuss", desc: "Share architectures and debug in our technical forums.", icon: <MessageSquare size={28} /> },
                        { title: "Learn", desc: "Weekly intensive workshops and cloud practitioner deep-dives.", icon: <Zap size={28} /> },
                        { title: "Connect", desc: "Direct networking with AWS mentors and industry leaders.", icon: <Globe size={28} /> },
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white dark:bg-[#1A1F2B] rounded-2xl p-8 border border-gray-200 dark:border-white/5 group-hover:border-[#0073BB] dark:group-hover:border-white/20 transition-colors flex flex-col relative overflow-hidden group shadow-sm"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-50 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <div className="w-14 h-14 rounded-2xl bg-[#0073BB]/10 flex items-center justify-center text-[#0073BB] mb-8 group-hover:bg-[#0073BB] group-hover:text-white transition-all duration-300 relative z-10">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-display font-bold text-foreground mb-4 tracking-tight relative z-10">{feature.title}</h3>
                            <p className="text-muted-foreground font-medium leading-relaxed relative z-10">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Join Discord CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 text-center bg-secondary/30 dark:bg-brand-navy/30 py-20 rounded-[2.5rem] border border-border shadow-lg"
                >
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 tracking-tight">Ready to integrate with us?</h2>
                    <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-lg">
                        Join our digital headquarters for real-time discussions, event announcements, and collaborative building.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-5">
                        <a href="https://linkedin.com/company/aws-sbg-ddit" className="relative overflow-hidden group border-2 border-[#0073BB] bg-[#0073BB] text-white font-bold text-sm px-8 py-4 text-center tracking-wider inline-flex justify-center items-center">
                            <span className="relative z-10 flex items-center gap-2 group-hover:text-[#0C111D] transition-colors duration-300">JOIN LINKEDIN</span>
                            <div className="absolute inset-0 bg-white transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </a>
                        <a href="https://meetup.com/aws-sbg-ddit" className="relative overflow-hidden group border-2 border-[#0C111D] dark:border-white/30 text-[#0C111D] dark:text-white font-bold text-sm px-8 py-4 text-center tracking-wider inline-flex justify-center items-center">
                            <span className="relative z-10 group-hover:text-white dark:group-hover:text-[#0C111D] transition-colors duration-300">MEETUP PAGE</span>
                            <div className="absolute inset-0 bg-[#0C111D] dark:bg-white transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
