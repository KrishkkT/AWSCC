'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useOnePass } from '@/components/onepass/OnePassContext';
import {
    Users, UserCheck, UserX, Percent, Layers, BookOpen, Coffee, Award,
    Activity, ShieldAlert, RefreshCw, ArrowRight, AlertTriangle, CheckCircle2,
    Clock, Sparkles
} from 'lucide-react';

export default function EventOverviewPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();
    const isAdmin = user?.role === 'ADMIN';

    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const fetchMetrics = async () => {
        try {
            const res = await fetch(`/api/onepass/events/${eventId}/dashboard?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            const data = await res.json();
            if (data.metrics) {
                setMetrics(data.metrics);
                setLastRefreshed(new Date());
            }
        } catch (e) {
            console.error('Failed to load dashboard metrics', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        let interval = null;
        if (autoRefresh) {
            interval = setInterval(() => {
                fetchMetrics();
            }, 4000); // live updates every 4 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [eventId, autoRefresh]);

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-[#0073BB] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading real-time metrics...</span>
                </div>
            </div>
        );
    }

    const { summary, tracks = [], workshops = [], food = [], swag = [], recent_activity = [] } = metrics || {};

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Live Operations Center</h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                            LIVE FEED
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Real-time attendee check-ins, dynamic track occupancy, and claim distribution.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition ${
                            autoRefresh
                                ? 'bg-[#0073BB]/10 border-[#0073BB]/30 text-[#4F8EF7]'
                                : 'bg-[#151c2e] border-[#1a2540] text-slate-400 hover:text-white'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                        <span>{autoRefresh ? 'Live Auto-Sync ON' : 'Auto-Sync Paused'}</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                        Updated {lastRefreshed.toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* 1. Attendee Check-In Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total Registrations</span>
                        <Users className="w-4 h-4 text-[#4F8EF7]" />
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">{summary?.total_attendees || 0}</div>
                    <div className="text-[10px] text-slate-400">KonfHub Imported Roster</div>
                </div>

                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Checked In</span>
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-400 font-mono">{summary?.checked_in || 0}</div>
                    <div className="text-[10px] text-emerald-400/80 font-medium">Verified On-Site</div>
                </div>

                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Not Checked In</span>
                        <UserX className="w-4 h-4 text-[#FF9900]" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#FF9900] font-mono">{summary?.not_checked_in || 0}</div>
                    <div className="text-[10px] text-slate-400">Awaiting Arrival</div>
                </div>

                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Check-In Rate</span>
                        <Percent className="w-4 h-4 text-[#0073BB]" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#4F8EF7] font-mono">{summary?.check_in_rate || '0%'}</div>
                    <div className="text-[10px] text-slate-400">Turnout Velocity</div>
                </div>
            </div>

            {/* 2. Dynamic Track Capacity Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-[#0073BB]" />
                        <h2 className="text-base font-bold text-white">Dynamic Track Capacities</h2>
                    </div>
                    <Link
                        href={`/onepass/events/${eventId}/tracks`}
                        className="text-xs text-[#4F8EF7] hover:underline flex items-center space-x-1"
                    >
                        <span>Manage & Scan Gates</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tracks.map((t) => {
                        const pct = Math.min(100, Math.round((t.occupancy / (t.capacity || 1)) * 100));
                        const isFull = t.occupancy >= t.capacity;
                        return (
                            <div key={t.id} className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-4 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-white text-sm truncate">{t.name}</h3>
                                    {isFull ? (
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded-full animate-pulse">
                                            FULL
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                                            AVAILABLE
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-slate-400">Occupancy:</span>
                                        <span className="text-white font-bold">{t.occupancy} / {t.capacity}</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#0C111D] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : (pct > 85 ? 'bg-[#FF9900]' : 'bg-[#0073BB]')}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                                        <span>{t.remaining} seats remaining</span>
                                        <span>{pct}% allocated</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. Workshops & Resources (Food & Swag) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workshops */}
                <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            <h2 className="text-sm font-bold text-white">Hands-on Workshops</h2>
                        </div>
                        <Link
                            href={`/onepass/events/${eventId}/workshops`}
                            className="text-xs text-purple-400 hover:underline"
                        >
                            View Details →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {workshops.map((w) => {
                            const pct = Math.min(100, Math.round((w.occupancy / (w.capacity || 1)) * 100));
                            return (
                                <div key={w.id} className="p-3.5 bg-[#0C111D] border border-[#1a2540] rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-white truncate max-w-[240px]">{w.name}</span>
                                        <span className="font-mono text-purple-300 font-bold">{w.occupancy} / {w.capacity}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#151c2e] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span>Speaker: {w.speaker || 'TBD'}</span>
                                        <span>{w.location}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Food & Swag Claims */}
                <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Coffee className="w-4 h-4 text-[#FF9900]" />
                            <h2 className="text-sm font-bold text-white">Food & Swag Distribution</h2>
                        </div>
                        <Link
                            href={`/onepass/events/${eventId}/food`}
                            className="text-xs text-[#FF9900] hover:underline"
                        >
                            Claim Scanners →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {food.map((f) => (
                            <div key={f.id} className="p-3.5 bg-[#0C111D] border border-[#1a2540] rounded-xl space-y-1">
                                <div className="text-[11px] text-slate-400 font-medium truncate">{f.name}</div>
                                <div className="text-2xl font-bold font-mono text-[#FF9900]">{f.claims_count || 0}</div>
                                <div className="text-[10px] text-slate-400">
                                    {f.start_time ? `${f.start_time} - ${f.end_time}` : 'Claims recorded'}
                                </div>
                            </div>
                        ))}

                        {swag.map((s) => (
                            <div key={s.id} className="p-3.5 bg-[#0C111D] border border-[#1a2540] rounded-xl space-y-1 col-span-2 sm:col-span-1">
                                <div className="text-[11px] text-slate-400 font-medium truncate">{s.name}</div>
                                <div className="text-2xl font-bold font-mono text-emerald-400">
                                    {s.claims_count || 0} <span className="text-xs text-slate-400 font-normal">/ {s.capacity || 400}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">{s.remaining} kits remaining</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Live Audit Trail Stream (Admin Only) */}
            {isAdmin && (
                <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-[#0073BB]" />
                            <h2 className="text-sm font-bold text-white">Live Event Operations Log</h2>
                        </div>
                        <Link
                            href={`/onepass/events/${eventId}/audit`}
                            className="text-xs text-[#4F8EF7] hover:underline"
                        >
                            Full Audit Log ({recent_activity.length}) →
                        </Link>
                    </div>

                    <div className="divide-y divide-[#1a2540]">
                        {recent_activity.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">No operational activity recorded yet.</div>
                        ) : (
                            recent_activity.slice(0, 6).map((log) => (
                                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-2 rounded-full bg-[#0073BB] flex-shrink-0" />
                                        <div>
                                            <span className="font-semibold text-white">{log.actor_name}</span>
                                            <span className="text-slate-400 mx-1.5">performed</span>
                                            <span className="font-mono text-[#4F8EF7] px-1.5 py-0.5 rounded bg-[#0073BB]/10 text-[11px]">
                                                {log.action}
                                            </span>
                                            {log.metadata?.attendee_name && (
                                                <span className="text-slate-300 ml-1.5 font-medium">
                                                    for {log.metadata.attendee_name}
                                                    {log.metadata?.assigned_track ? ` (${log.metadata.assigned_track})` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
