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
        <div className="space-y-12">
            {/* Header with Role Context */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                            <Shield size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-cyan">
                            Management Protocol Active
                        </span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white mb-2 tracking-tight"
                    >
                        Welcome, <span className="text-brand-cyan">{profile?.full_name?.split(' ')[0] || 'Admin'}</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Monitoring system status and club metrics.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card px-6 py-4 border-white/5 flex items-center gap-4"
                >
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Current Role</div>
                        <div className="text-white font-bold uppercase tracking-tight text-sm text-brand-cyan">{profile?.role || 'member'}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                        <Shield size={18} />
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                        className="glass-card p-8 group border-white/5 hover:border-brand-cyan/20 transition-all duration-500 cursor-pointer"
                        onClick={() => window.location.href = stat.link}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-12 h-12 rounded-2xl bg-brand-${stat.color}/10 flex items-center justify-center text-brand-${stat.color} group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">{stat.label}</div>
                        <div className="text-4xl font-black text-white tracking-tighter">{stat.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card p-10 border-white/5"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-white tracking-tight">System Integrity</h3>
                        <button onClick={() => window.location.href = '/admin/logs'} className="text-[10px] font-black text-brand-cyan uppercase tracking-widest hover:opacity-80 transition-opacity">Audit Protocol</button>
                    </div>
                    <div className="space-y-6">
                        <div className="flex gap-4 p-5 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 items-center">
                            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                                <Shield size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">All systems operational</div>
                                <div className="text-[10px] text-brand-cyan uppercase font-black tracking-widest">Real-time monitoring active</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="text-xs text-white/40 leading-relaxed font-medium"> The club management system is synced with Supabase Realtime. Any changes to members or events will be reflected across all administrative portals instantly. </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card p-10 border-white/5"
                >
                    <h3 className="text-xl font-black text-white tracking-tight mb-8">Control Center</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <button onClick={() => window.location.href = '/admin/events'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <Calendar size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Events</span>
                        </button>
                        <button onClick={() => window.location.href = '/admin/team'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <Users size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Team</span>
                        </button>
                        <button onClick={() => window.location.href = '/admin/resources'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <FileText size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Resources</span>
                        </button>
                        <button onClick={() => window.location.href = '/admin/knowledge'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <Bookmark size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Knowledge</span>
                        </button>
                        <button onClick={() => window.location.href = '/admin/certificates'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <Award size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Certificates</span>
                        </button>
                        <button onClick={() => window.location.href = '/admin/settings'} className="btn-secondary py-6 flex flex-col items-center gap-3 group hover:border-brand-cyan/30">
                            <Shield size={24} className="group-hover:text-brand-cyan transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                        </button>
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
