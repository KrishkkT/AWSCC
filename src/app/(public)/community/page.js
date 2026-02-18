"use client";

import { motion } from "framer-motion";
import { Users, MessageSquare, Zap, Globe } from "lucide-react";

export default function CommunityPage() {
    return (
        <div className="pt-32 pb-20">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight"
                    >
                        Our <span className="text-gradient-elite">Community</span>
                    </motion.h1>
                    <p className="text-xl text-white/40 font-medium">
                        A vibrant ecosystem of cloud enthusiasts, builders, and innovators at DDU.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: "Collaborate", desc: "Work together on real-world cloud projects.", icon: <Users size={32} /> },
                        { title: "Discuss", desc: "Share ideas in our dedicated Discord channels.", icon: <MessageSquare size={32} /> },
                        { title: "Learn", desc: "Weekly hands-on workshops and cloud clinics.", icon: <Zap size={32} /> },
                        { title: "Connect", desc: "Network with industry experts and alumni.", icon: <Globe size={32} /> },
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-10 border-white/5 group hover:border-brand-cyan/20 transition-all"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan mb-8 group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4">{feature.title}</h3>
                            <p className="text-white/40 font-medium leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
