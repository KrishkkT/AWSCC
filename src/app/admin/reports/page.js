"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, BarChart3, Users, Calendar, TrendingUp } from "lucide-react";

export default function AdminReports() {
    const [stats, setStats] = useState({ members: 0, events: 0, activeMembers: 0 });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => { fetchStats(); }, []);

    async function fetchStats() {
        setLoading(true);
        const [membersRes, eventsRes, activeRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('events').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ]);
        setStats({
            members: membersRes.count || 0,
            events: eventsRes.count || 0,
            activeMembers: activeRes.count || 0,
        });
        setLoading(false);
    }

    const reports = [
        {
            title: "Membership Summary",
            desc: "Total members, role breakdown, activation rates",
            icon: <Users size={24} />,
            stats: `${stats.members} members · ${stats.activeMembers} active`,
        },
        {
            title: "Event Analytics",
            desc: "Events created, attendance rates, participation trends",
            icon: <Calendar size={24} />,
            stats: `${stats.events} total events`,
        },
        {
            title: "Activity Report",
            desc: "Login frequency, admin actions, system health",
            icon: <TrendingUp size={24} />,
            stats: "Real-time monitoring",
        },
        {
            title: "HOD Annual Report",
            desc: "Comprehensive annual report for Head of Department",
            icon: <FileText size={24} />,
            stats: "PDF Export Ready",
        },
    ];

    return (
        <div className="space-y-10">
            <div>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                    System <span className="text-brand-cyan">Reports</span>
                </motion.h1>
                <p className="text-white/40 font-medium">Generate analytics and reports for administration.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Members", value: stats.members, icon: <Users size={20} />, color: "cyan" },
                    { label: "Active Members", value: stats.activeMembers, icon: <BarChart3 size={20} />, color: "teal" },
                    { label: "Total Events", value: stats.events, icon: <Calendar size={20} />, color: "white" },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-8 border-white/5 group hover:border-brand-cyan/20 transition-all">
                        <div className={`w-12 h-12 rounded-2xl bg-brand-${stat.color}/10 flex items-center justify-center text-brand-${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                        <div className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">{stat.label}</div>
                        <div className="text-4xl font-black text-white tracking-tighter">
                            {loading ? '...' : stat.value}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reports.map((report, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="glass-card p-8 border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-brand-cyan group-hover:bg-brand-cyan/10 transition-all">
                                {report.icon}
                            </div>
                            <button className="btn-secondary py-2 px-4 flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download size={14} /> Export
                            </button>
                        </div>
                        <h3 className="text-lg font-black text-white mb-2">{report.title}</h3>
                        <p className="text-sm text-white/40 mb-4">{report.desc}</p>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">{report.stats}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
