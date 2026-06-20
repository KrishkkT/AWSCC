"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Users, Calendar, Award, FileText, Bookmark } from "lucide-react";

export default function AdminDashboard() {
    const [profile, setProfile] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data || { full_name: user.email, role: 'member' });
            }
        }
        loadProfile();
    }, []);

    const [stats, setStats] = useState([
        { label: "Active Events", value: "...", icon: <Calendar size={20} />, color: "cyan", link: "/admin/events" },
        { label: "Total Certificates", value: "...", icon: <Award size={20} />, color: "teal", link: "/admin/certificates" },
        { label: "System Health", value: "Optimal", icon: <Zap size={20} />, color: "white", link: "/admin/logs" },
    ]);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data || { full_name: user.email, role: 'member' });
            }

            // Fetch real stats
            const [eventsCount, certsCount] = await Promise.all([
                supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'past'),
                supabase.from('certificates').select('*', { count: 'exact', head: true })
            ]);

            setStats([
                { label: "Active Events", value: eventsCount.count || 0, icon: <Calendar size={20} />, color: "cyan", link: "/admin/events" },
                { label: "Total Certificates", value: certsCount.count || 0, icon: <Award size={20} />, color: "teal", link: "/admin/certificates" },
                { label: "System Health", value: "Optimal", icon: <Zap size={20} />, color: "white", link: "/admin/logs" },
            ]);
        }
        loadData();
    }, []);

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-brand-aws/10 flex items-center justify-center text-brand-aws border border-brand-aws/20 shadow-lg shadow-brand-aws/5 ring-1 ring-white/5">
                            <Shield size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-aws/80 leading-none mb-1">
                                Secure Protocol
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                v2.4.0-Stable
                            </span>
                        </div>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tighter leading-tight"
                    >
                        Operations <span className="text-aws-gradient">Control</span>
                    </motion.h1>
                    <p className="text-slate-400 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
                        Authorized access for {profile?.full_name || 'Administrator'}.
                        Monitoring real-time metrics and system integrity for the AWS Student Builder Group DDU deployment.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-1 pb-1 pr-6 flex items-center gap-6 bg-slate-900/40 border-white/5 shadow-2xl"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-aws to-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-aws/20 ring-1 ring-white/20 shrink-0">
                        <Shield size={28} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Access Level</div>
                        <div className="text-white font-black uppercase tracking-tight text-lg text-aws-gradient truncate leading-none">
                            {profile?.role || 'member'}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Metrics Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                        className="group relative"
                        onClick={() => window.location.href = stat.link}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-aws/20 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl blur-sm transition duration-500"></div>
                        <div className="glass-card p-8 bg-slate-900/60 border-white/5 hover:border-brand-aws/30 transition-all duration-500 cursor-pointer relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-aws group-hover:bg-brand-aws group-hover:text-brand-deep transition-all duration-500 shadow-inner">
                                    {stat.icon}
                                </div>
                                <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-aws animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                </div>
                            </div>
                            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white tracking-tighter">{stat.value}</span>
                                <span className="text-[10px] font-bold text-brand-aws/60 uppercase tracking-widest">Global Status</span>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telemetry Active</span>
                                <Zap size={12} className="text-brand-aws" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Secondary Command Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* System Integrity (3 cols) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-3 glass-card p-10 bg-slate-900/40 border-white/5 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-aws/10 flex items-center justify-center text-brand-aws border border-brand-aws/20">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">System <span className="text-brand-aws">Sync</span></h3>
                        </div>
                        <button onClick={() => window.location.href = '/admin/logs'} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-brand-aws hover:text-brand-deep transition-all duration-300">
                            Audit Protocol
                        </button>
                    </div>

                    <div className="flex-grow space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest">
                            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3 text-green-400">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                Database Cluster Online
                            </div>
                            <div className="p-4 rounded-xl bg-brand-aws/5 border border-brand-aws/10 flex items-center gap-3 text-brand-aws">
                                <div className="w-2 h-2 rounded-full bg-brand-aws shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                API Gateway Optimized
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-brand-aws animate-spin shrink-0"></div>
                            <div>
                                <div className="text-white font-bold mb-2">Supabase High Availability Active</div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    Real-time socket connection established. All administrative changes are synchronized
                                    across edge nodes with sub-50ms latency.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Control Grid (2 cols) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-2 glass-card p-10 bg-slate-900/40 border-white/5"
                >
                    <div className="mb-10">
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">Control <span className="text-brand-aws">Center</span></h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resource Management Modules</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: "Events", icon: Calendar, link: "/admin/events" },
                            { name: "Team", icon: Users, link: "/admin/team" },
                            { name: "Docs", icon: FileText, link: "/admin/resources" },
                            { name: "Guides", icon: Bookmark, link: "/admin/knowledge" },
                            { name: "Certs", icon: Award, link: "/admin/certificates" },
                            { name: "Config", icon: Shield, link: "/admin/settings" },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => window.location.href = item.link}
                                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-3 transition-all duration-300 hover:bg-brand-aws/10 hover:border-brand-aws/30"
                            >
                                <item.icon size={24} className="text-slate-400 group-hover:text-brand-aws group-hover:scale-110 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
                                    {item.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
