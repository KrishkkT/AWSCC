"use client";

import {
    Activity, Shield, Clock, User, AlertTriangle, CheckCircle, Info,
    Search, Filter, RefreshCw, Download, Calendar, ArrowUpRight, ChevronDown, Sparkles
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

const levelConfig = {
    info: { bg: 'bg-brand-cyan/10', color: 'text-brand-cyan', border: 'border-brand-cyan/30', icon: <Info size={16} /> },
    success: { bg: 'bg-emerald-500/10', color: 'text-emerald-400', border: 'border-emerald-500/30', icon: <CheckCircle size={16} /> },
    warning: { bg: 'bg-amber-500/10', color: 'text-amber-400', border: 'border-amber-500/30', icon: <AlertTriangle size={16} /> },
    error: { bg: 'bg-rose-500/10', color: 'text-rose-400', border: 'border-rose-500/30', icon: <AlertTriangle size={16} /> },
};

export default function AdminLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [expandedLogId, setExpandedLogId] = useState(null);

    const supabase = createClient();

    const fetchLogs = useCallback(async () => {
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles(role, full_name, email)')
                .order('created_at', { ascending: false })
                .limit(250);

            if (!error && data) {
                setLogs(data);
            } else if (error) {
                console.error('[AdminLogs] Fetch error:', error);
            }
        } catch (err) {
            console.error('[AdminLogs] Exception:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filtered = useMemo(() => {
        return logs.filter(log => {
            const matchLevel = filterLevel === 'all' || log.level === filterLevel;
            const logRole = log.profiles?.role || 'Service';
            const matchRole = filterRole === 'all' || logRole === filterRole;

            const q = searchQuery.toLowerCase().trim();
            if (!q) return matchLevel && matchRole;

            const matchText =
                (log.action || '').toLowerCase().includes(q) ||
                (log.details || '').toLowerCase().includes(q) ||
                (log.profiles?.full_name || '').toLowerCase().includes(q) ||
                (log.profiles?.email || '').toLowerCase().includes(q) ||
                (log.profiles?.role || '').toLowerCase().includes(q);

            return matchLevel && matchRole && matchText;
        });
    }, [logs, filterLevel, filterRole, searchQuery]);

    // Summary Statistics
    const stats = useMemo(() => {
        return {
            total: logs.length,
            success: logs.filter(l => l.level === 'success').length,
            warning: logs.filter(l => l.level === 'warning').length,
            error: logs.filter(l => l.level === 'error').length,
            info: logs.filter(l => l.level === 'info').length,
        };
    }, [logs]);

    // Export Audit Trail as CSV
    const exportCSV = () => {
        if (!logs.length) return;
        const headers = ['ID', 'Timestamp', 'Level', 'Action', 'Details', 'Actor Name', 'Actor Email', 'Actor Role'];
        const rows = logs.map(l => [
            l.id,
            new Date(l.created_at).toISOString(),
            l.level || 'info',
            `"${(l.action || '').replace(/"/g, '""')}"`,
            `"${(l.details || '').replace(/"/g, '""')}"`,
            `"${(l.profiles?.full_name || 'System').replace(/"/g, '""')}"`,
            `"${(l.profiles?.email || 'N/A').replace(/"/g, '""')}"`,
            `"${(l.profiles?.role || 'Service').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                        Audit <span className="text-brand-cyan">Logs</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium font-bold px-4 py-1 bg-white/5 rounded-lg inline-block">
                        Real-time Administrator Activity & System Stream
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        disabled={refreshing}
                        className="px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 transition"
                        title="Refresh Logs"
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin text-brand-cyan' : ''} />
                        <span>{refreshing ? 'Syncing...' : 'Live Refresh'}</span>
                    </button>

                    <button
                        onClick={exportCSV}
                        disabled={logs.length === 0}
                        className="btn-primary px-6 py-3.5 flex items-center gap-2 text-xs font-bold shadow-[0_0_30px_rgba(0,194,255,0.2)]"
                    >
                        <Download size={15} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Total Activities</div>
                    <div className="text-3xl font-black text-white">{stats.total}</div>
                </div>

                <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-1">Success Operations</div>
                    <div className="text-3xl font-black text-emerald-400">{stats.success}</div>
                </div>

                <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 mb-1">Warning / Deletes</div>
                    <div className="text-3xl font-black text-amber-400">{stats.warning}</div>
                </div>

                <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-400/60 mb-1">Errors Caught</div>
                    <div className="text-3xl font-black text-rose-400">{stats.error}</div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-6 p-8 glass-card border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 max-w-xl group focus-within:border-brand-cyan/50 transition-all">
                    <Search size={18} className="text-white/30 group-focus-within:text-brand-cyan" />
                    <input
                        type="text"
                        placeholder="Search by admin name, email, action, or details..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white text-xs">Clear</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Severity Filter</label>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'info', 'success', 'warning', 'error'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setFilterLevel(level)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                                        filterLevel === level
                                            ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40 shadow-[0_0_15px_rgba(0,194,255,0.15)]'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Role Authority Filter</label>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'Leader', 'captain', 'faculty', 'core', 'admin', 'member'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => setFilterRole(role)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                                        filterRole === role
                                            ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Stream */}
            {loading ? (
                <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">
                    Reading System Logs...
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-white/5">
                    <Activity size={48} className="text-white/10 mx-auto mb-6" />
                    <p className="text-white/40 font-bold">No activity logs matching your filter criteria.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="text-[11px] font-mono text-white/30 px-2 flex justify-between">
                        <span>Showing {filtered.length} of {logs.length} logged events</span>
                        <span>Latest on top</span>
                    </div>

                    {filtered.map((log, i) => {
                        const level = log.level || 'info';
                        const config = levelConfig[level] || levelConfig.info;
                        const isExpanded = expandedLogId === log.id;
                        const actorName = log.profiles?.full_name || 'System / Service';
                        const actorEmail = log.profiles?.email || null;
                        const actorRole = log.profiles?.role || 'Service';

                        return (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                className={`glass-card p-5 border transition-all cursor-pointer ${
                                    isExpanded ? 'border-brand-cyan/40 bg-white/[0.04]' : 'border-white/5 hover:border-white/15'
                                }`}
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${config.bg} ${config.color} ${config.border}`}>
                                        {config.icon}
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="font-bold text-white text-base tracking-tight">{log.action}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                                                    {level}
                                                </span>
                                            </div>

                                            <span className="text-[11px] font-mono text-white/30 whitespace-nowrap flex items-center gap-1">
                                                <Clock size={11} /> {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <p className="text-white/70 text-sm font-medium leading-relaxed mb-3">
                                            {log.details}
                                        </p>

                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest flex-wrap">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg text-white/70 border border-white/5">
                                                <User size={11} className="text-brand-cyan" />
                                                <span>{actorName}</span>
                                                {actorEmail && <span className="text-white/30 font-normal lowercase font-sans">({actorEmail})</span>}
                                            </span>

                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                                                ['Leader', 'captain'].includes(actorRole)
                                                    ? 'border-brand-cyan/30 text-brand-cyan bg-brand-cyan/5'
                                                    : actorRole === 'faculty'
                                                    ? 'border-brand-teal/30 text-brand-teal bg-brand-teal/5'
                                                    : 'border-white/10 text-white/50 bg-white/5'
                                            }`}>
                                                <Shield size={11} />
                                                <span>{actorRole}</span>
                                            </span>

                                            <span className="text-white/20 font-mono text-[9px] ml-auto">
                                                ID: {log.id}
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
                End of Audit Stream
            </div>
        </div>
    );
}
