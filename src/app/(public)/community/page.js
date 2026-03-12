"use client";

import { motion } from "framer-motion";
import { Users, MessageSquare, Zap, Globe } from "lucide-react";

export default function CommunityPage() {
    return (
        <div className="min-h-screen bg-brand-deep pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

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
                        className="text-5xl md:text-7xl font-display font-bold text-white mb-8 tracking-tight"
                    >
                        Our <span className="text-brand-aws">Community</span>
                    </motion.h1>
                    <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
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
                            className="card-professional flex flex-col p-10 group border-slate-800/50 hover:border-brand-aws/30"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center text-brand-aws mb-8 group-hover:bg-brand-aws group-hover:text-brand-deep transition-all duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-display font-bold text-white mb-4 tracking-tight">{feature.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Join Discord CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 card-professional p-12 text-center bg-brand-navy/30 border border-slate-800"
                >
                    <h2 className="text-3xl font-display font-bold text-white mb-6 tracking-tight">Ready to integrate with us?</h2>
                    <p className="text-slate-400 max-w-xl mx-auto mb-10 text-lg">
                        Join our digital headquarters for real-time discussions, event announcements, and collaborative building.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a href="https://discord.gg/yourlink" className="btn-aws !px-10 !py-4 flex items-center justify-center gap-2">
                            Join Discord
                        </a>
                        <a href="https://meetup.com/yourlink" className="btn-outline !px-10 !py-4">
                            Meetup Page
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
