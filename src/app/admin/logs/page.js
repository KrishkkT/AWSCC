"use client";
import { Activity, Shield, Clock, User, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

const levelConfig = {
    info: { bg: 'bg-brand-cyan/10', color: 'text-brand-cyan', icon: <Info size={18} /> },
    success: { bg: 'bg-green-500/10', color: 'text-green-400', icon: <CheckCircle size={18} /> },
    warning: { bg: 'bg-yellow-500/10', color: 'text-yellow-400', icon: <AlertTriangle size={18} /> },
    error: { bg: 'bg-red-500/10', color: 'text-red-400', icon: <AlertTriangle size={18} /> },
};

export default function AdminLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const supabase = createClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, profiles(role, full_name)')
            .order('timestamp', { ascending: false });

        if (!error) setLogs(data || []);
        setLoading(false);
    }

    const filtered = logs.filter(log => {
        const matchLevel = filterLevel === 'all' || log.level === filterLevel;
        const matchRole = filterRole === 'all' || log.profiles?.role === filterRole;
        return matchLevel && matchRole;
    });

    return (
        <div className="space-y-10">
            <div>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                    Audit <span className="text-brand-cyan">Logs</span>
                </motion.h1>
                <p className="text-white/40 font-medium font-bold px-4 py-1 bg-white/5 rounded-lg inline-block">Real-time System Intelligence</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-6 p-8 glass-card border-white/5 bg-white/[0.02]">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Severity Filter</label>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'info', 'success', 'warning', 'error'].map(level => (
                            <button key={level} onClick={() => setFilterLevel(level)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${filterLevel === level ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}>
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Role Authority Filter</label>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'Leader', 'admin', 'member'].map(role => (
                            <button key={role} onClick={() => setFilterRole(role)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${filterRole === role ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}>
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Log Entries */}
            {loading ? (
                <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">Reading System Logs...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-white/5">
                    <Activity size={48} className="text-white/10 mx-auto mb-6" />
                    <p className="text-white/30 font-bold">No activity logs found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((log, i) => {
                        const level = log.level || 'info';
                        const config = levelConfig[level] || levelConfig.info;
                        return (
                            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5 border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${config.bg} ${config.color}`}>
                                        {config.icon}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white text-sm">{log.action}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{level}</span>
                                        </div>
                                        <p className="text-white/60 text-sm mb-2 font-medium">{log.details}</p>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-white/50">
                                                <User size={10} /> {log.profiles?.full_name || 'System'}
                                            </span>
                                            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${log.profiles?.role === 'Leader' ? 'border-brand-cyan/30 text-brand-cyan bg-brand-cyan/5' : 'border-white/10'}`}>
                                                <Shield size={10} /> {log.profiles?.role || 'Service'}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-white/20">
                                                <Clock size={10} /> {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <div className="text-center text-white/10 text-[10px] font-black uppercase tracking-[0.5em] py-8">
                End of Log Stream
            </div>
        </div>
    );
}
