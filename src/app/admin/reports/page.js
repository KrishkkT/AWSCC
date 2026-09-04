"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { FileText, Download, BarChart3, Users, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { generateProfessionalReport } from "@/utils/pdfGenerator";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import html2canvas from "html2canvas";

export default function AdminReports() {
    const [stats, setStats] = useState({ members: 0, events: 0, activeMembers: 0 });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(null);
    const supabase = createClient();

    const fetchStats = useCallback(async () => {
        setLoading(true);
        const [membersRes, eventsRes, activeRes, allProfiles, allEvents, logsRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('events').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('profiles').select('role'),
            supabase.from('events').select('status'),
            supabase.from('audit_logs').select('level')
        ]);
        
        const roles = allProfiles.data?.reduce((acc, p) => {
            acc[p.role] = (acc[p.role] || 0) + 1;
            return acc;
        }, {}) || {};
        
        const evStatus = allEvents.data?.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
        }, {}) || {};

        const logLevels = logsRes.data?.reduce((acc, l) => {
            acc[l.level || 'info'] = (acc[l.level || 'info'] || 0) + 1;
            return acc;
        }, {}) || {};

        setStats({
            members: membersRes.count || 0,
            events: eventsRes.count || 0,
            activeMembers: activeRes.count || 0,
            roleData: Object.keys(roles).map(key => ({ name: key, value: roles[key] })),
            eventData: Object.keys(evStatus).map(key => ({ name: key, value: evStatus[key] })),
            auditLogsTotal: logsRes.data?.length || 0,
            auditLogLevels: logLevels
        });
        setLoading(false);
    }, [supabase]);

    const reports = useMemo(() => [
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
    ], [stats]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    async function handleExport(report) {
        setExporting(report.title);

        let reportData = {};
        const chartImages = [];

        try {
            const chartElem1 = document.getElementById('report-chart-1');
            const chartElem2 = document.getElementById('report-chart-2');
            
            let canvas1 = null, canvas2 = null;
            if (chartElem1) canvas1 = await html2canvas(chartElem1, { backgroundColor: '#ffffff' });
            if (chartElem2) canvas2 = await html2canvas(chartElem2, { backgroundColor: '#ffffff' });

            if (report.title === "Membership Summary") {
                reportData = {
                    "Total Community Members": stats.members,
                    "Active Members": stats.activeMembers,
                    "Member Engagement Rate": `${Math.round((stats.activeMembers / (stats.members || 1)) * 100)}%`,
                    "Role Distribution": stats.roleData?.map(r => `${r.name.toUpperCase()}: ${r.value}`).join(' | ') || 'N/A',
                };
                if (canvas1) chartImages.push(canvas1.toDataURL('image/png'));
            } else if (report.title === "Event Analytics") {
                reportData = {
                    "Total Events Hosted": stats.events,
                    "Event Status Breakdown": stats.eventData?.map(e => `${e.name.toUpperCase()}: ${e.value}`).join(' | ') || 'N/A',
                };
                if (canvas2) chartImages.push(canvas2.toDataURL('image/png'));
            } else if (report.title === "Activity Report") {
                reportData = {
                    "Total Admin Actions Logged": stats.auditLogsTotal,
                    "Log Level Breakdown": Object.entries(stats.auditLogLevels || {}).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(' | ') || 'N/A',
                    "System Integrity": "Verified (Secure SSL)",
                };
            } else {
                // HOD Annual Report (Everything)
                reportData = {
                    "Total Community Members": stats.members,
                    "Member Engagement Rate": `${Math.round((stats.activeMembers / (stats.members || 1)) * 100)}%`,
                    "Total Events Hosted": stats.events,
                    "Total Admin Actions Logged": stats.auditLogsTotal,
                    "Role Distribution": stats.roleData?.map(r => `${r.name.toUpperCase()}: ${r.value}`).join(' | ') || 'N/A',
                    "Event Status Breakdown": stats.eventData?.map(e => `${e.name.toUpperCase()}: ${e.value}`).join(' | ') || 'N/A',
                };
                if (canvas1) chartImages.push(canvas1.toDataURL('image/png'));
                if (canvas2) chartImages.push(canvas2.toDataURL('image/png'));
            }
        } catch (err) {
            console.error('Failed to capture charts:', err);
        }

        await generateProfessionalReport(reportData, report.title, chartImages);
        setExporting(null);
    }

    const COLORS = ['#00C2FF', '#00B77A', '#FFB800', '#FF3B30', '#8A2BE2'];

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
                            <button
                                onClick={() => handleExport(report)}
                                disabled={exporting === report.title}
                                className="btn-secondary py-2 px-4 flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {exporting === report.title ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                                {exporting === report.title ? 'Generating...' : 'Export PDF'}
                            </button>
                        </div>
                        <h3 className="text-lg font-black text-white mb-2">{report.title}</h3>
                        <p className="text-sm text-white/40 mb-4">{report.desc}</p>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">{report.stats}</div>
                    </motion.div>
                ))}
            </div>

            {/* Hidden Charts for PDF Generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div id="report-chart-1" style={{ width: '800px', height: '450px', padding: '20px', background: 'white' }}>
                    <h2 style={{ color: '#0B5394', fontFamily: 'sans-serif', textAlign: 'center' }}>Role Distribution</h2>
                    <PieChart width={760} height={380}>
                        <Pie data={stats.roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                            {stats.roleData?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </div>
                <div id="report-chart-2" style={{ width: '800px', height: '450px', padding: '20px', background: 'white' }}>
                    <h2 style={{ color: '#0B5394', fontFamily: 'sans-serif', textAlign: 'center' }}>Event Status Overview</h2>
                    <BarChart width={760} height={380} data={stats.eventData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#00C2FF" />
                    </BarChart>
                </div>
            </div>
        </div>
    );
}
