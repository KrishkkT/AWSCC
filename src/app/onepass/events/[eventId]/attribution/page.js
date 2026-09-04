'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useOnePass } from '@/components/onepass/OnePassContext';
import {
    UserCheck, Search, Filter, RefreshCw, CheckCircle2, ShieldCheck,
    Clock, Users, Award, Download, ArrowUpRight, ChevronRight, Layers,
    BookOpen, Sparkles, Activity, User, RotateCcw, X, Check
} from 'lucide-react';

export default function CheckInAttributionPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();

    const [allCheckedInAttendees, setAllCheckedInAttendees] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedVolunteer, setSelectedVolunteer] = useState('');
    const [selectedSessionType, setSelectedSessionType] = useState('ALL'); // 'ALL' | 'TRACK' | 'WORKSHOP'
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [uncheckingId, setUncheckingId] = useState(null);

    const isInitialLoad = useRef(true);

    const fetchData = async (isBackground = false) => {
        if (!eventId) return;
        try {
            if (!isBackground) {
                if (isInitialLoad.current) setLoading(true);
                else setIsRefreshing(true);
            }

            // Fetch all checked in attendees and volunteers for the event
            const [attRes, volRes] = await Promise.all([
                fetch(`/api/onepass/attendees?eventId=${eventId}&check_in_status=CHECKED_IN`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                }),
                fetch(`/api/onepass/volunteers?eventId=${eventId}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                })
            ]);

            if (attRes.ok) {
                const attData = await attRes.json();
                setAllCheckedInAttendees(attData.attendees || []);
            }

            if (volRes.ok) {
                const volData = await volRes.json();
                setVolunteers(volData.volunteers || []);
            }

            setLastSyncTime(new Date());
        } catch (e) {
            console.error('[Attribution Load Error]', e);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            isInitialLoad.current = false;
        }
    };

    useEffect(() => {
        fetchData(false);
    }, [eventId]);

    // Live background polling every 4 seconds
    useEffect(() => {
        if (!eventId) return;
        const interval = setInterval(() => {
            fetchData(true);
        }, 4000);
        return () => clearInterval(interval);
    }, [eventId]);

    // Compute Volunteer Stats Leaderboard globally over ALL checked-in attendees
    const { leaderboard, volunteerMap } = useMemo(() => {
        const stats = {};
        const vMap = new Map();

        volunteers.forEach(v => {
            if (v.name) vMap.set(v.id, v.name);
        });

        allCheckedInAttendees.forEach(a => {
            let volName = a.checked_in_by_name;
            if (!volName && a.checked_in_by_id && vMap.has(a.checked_in_by_id)) {
                volName = vMap.get(a.checked_in_by_id);
            }
            if (!volName) {
                volName = 'Check-in Desk';
            }

            if (!stats[volName]) {
                stats[volName] = {
                    name: volName,
                    role: a.checked_in_by_role || (volName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER'),
                    count: 0,
                    tracksCount: 0,
                    workshopsCount: 0,
                    lastActive: a.check_in_time
                };
            }
            stats[volName].count++;
            if (a.assigned_workshop_id) {
                stats[volName].workshopsCount++;
            } else {
                stats[volName].tracksCount++;
            }
            if (a.check_in_time && (!stats[volName].lastActive || new Date(a.check_in_time) > new Date(stats[volName].lastActive))) {
                stats[volName].lastActive = a.check_in_time;
            }
        });

        const list = Object.values(stats).sort((a, b) => b.count - a.count);
        return { leaderboard: list, volunteerMap: vMap };
    }, [allCheckedInAttendees, volunteers]);

    // Filter attendees client-side for instant snappy search without network latency
    const displayedAttendees = useMemo(() => {
        return allCheckedInAttendees.filter(a => {
            const volName = a.checked_in_by_name || (a.checked_in_by_id && volunteerMap.get(a.checked_in_by_id)) || 'Check-in Desk';

            // Filter by volunteer
            if (selectedVolunteer && volName !== selectedVolunteer) {
                return false;
            }

            // Filter by session type
            if (selectedSessionType === 'WORKSHOP' && !a.assigned_workshop_id) {
                return false;
            }
            if (selectedSessionType === 'TRACK' && a.assigned_workshop_id) {
                return false;
            }

            // Filter by search query
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchName = (a.name || '').toLowerCase().includes(q);
                const matchEmail = (a.email || '').toLowerCase().includes(q);
                const matchBooking = (a.booking_id || '').toLowerCase().includes(q);
                const matchQR = (a.qr_identifier || '').toLowerCase().includes(q);
                const matchVol = volName.toLowerCase().includes(q);
                const matchTrack = (a.track_name || '').toLowerCase().includes(q);
                const matchWorkshop = (a.workshop_name || '').toLowerCase().includes(q);
                return matchName || matchEmail || matchBooking || matchQR || matchVol || matchTrack || matchWorkshop;
            }

            return true;
        });
    }, [allCheckedInAttendees, selectedVolunteer, selectedSessionType, search, volunteerMap]);

    // Handle Uncheck-In
    const handleUncheckIn = async (attendeeId, attendeeName) => {
        if (!confirm(`Are you sure you want to revert check-in for "${attendeeName}"? This will release their allocated seat and remove attribution.`)) return;

        setUncheckingId(attendeeId);
        try {
            const res = await fetch('/api/onepass/checkin/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, attendeeId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchData(false);
            } else {
                alert(data.error || data.message || 'Failed to uncheck-in attendee');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to communicate with check-in server');
        } finally {
            setUncheckingId(null);
        }
    };

    // Export Attribution CSV
    const handleExportCSV = () => {
        if (displayedAttendees.length === 0) return;

        const headers = ['Attendee Name', 'Email', 'Booking ID', 'QR Identifier', 'Assigned Session', 'Session Type', 'Checked In By (Volunteer)', 'Volunteer Role', 'Check-In Timestamp'];
        const rows = displayedAttendees.map(a => {
            const volName = a.checked_in_by_name || (a.checked_in_by_id && volunteerMap.get(a.checked_in_by_id)) || 'Check-in Desk';
            const sessionName = a.workshop_name ? `Lab: ${a.workshop_name}` : a.track_name || 'General Entry';
            const sessionType = a.assigned_workshop_id ? 'Workshop Lab' : 'Track Session';

            return [
                `"${(a.name || '').replace(/"/g, '""')}"`,
                `"${(a.email || '').replace(/"/g, '""')}"`,
                `"${(a.booking_id || '').replace(/"/g, '""')}"`,
                `"${(a.qr_identifier || '').replace(/"/g, '""')}"`,
                `"${sessionName.replace(/"/g, '""')}"`,
                `"${sessionType}"`,
                `"${volName.replace(/"/g, '""')}"`,
                `"${a.checked_in_by_role || 'VOLUNTEER'}"`,
                `"${a.check_in_time ? new Date(a.check_in_time).toLocaleString() : ''}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `onepass_attribution_${eventId}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0073BB]/15 text-[#4F8EF7] flex items-center justify-center border border-[#0073BB]/30">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Who Checked-in Whom Desk</h1>
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                            <Activity className="w-3 h-3 animate-pulse" />
                            <span>LIVE ATTRIBUTION</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Real-time audit traceability of which volunteer or admin verified each attendee, with session allocations and timestamps.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5 text-[#0073BB]" />
                        <span>Export Attribution CSV ({displayedAttendees.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fetchData(false)}
                        className="p-2 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 hover:text-white rounded-xl transition flex items-center space-x-1 text-xs"
                        title="Force Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin text-[#0073BB]' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Volunteer Activity Leaderboard Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
                        <Award className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>Volunteer Verification Activity Leaderboard</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        {allCheckedInAttendees.length} Total Verified Check-Ins
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {leaderboard.length === 0 ? (
                        <div className="col-span-full p-6 bg-[#151c2e] border border-[#1a2540] rounded-2xl text-center text-slate-500 text-xs">
                            No check-in activity recorded yet. Verified check-ins will appear here in real-time as volunteers scan attendees.
                        </div>
                    ) : (
                        leaderboard.map((vol, idx) => {
                            const isSelected = selectedVolunteer === vol.name;
                            return (
                                <button
                                    key={vol.name}
                                    type="button"
                                    onClick={() => setSelectedVolunteer(isSelected ? '' : vol.name)}
                                    className={`p-4 rounded-2xl border text-left transition relative overflow-hidden shadow-lg ${
                                        isSelected
                                            ? 'bg-[#0073BB]/25 border-[#0073BB] ring-2 ring-[#0073BB]'
                                            : 'bg-[#151c2e] border-[#1a2540] hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 rounded-lg bg-[#0C111D] border border-[#1a2540] flex items-center justify-center text-xs font-bold text-[#4F8EF7]">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-white truncate block max-w-[130px]">{vol.name}</span>
                                                <span className={`text-[9px] font-mono px-1 rounded ${vol.role === 'ADMIN' ? 'text-[#FF9900] bg-[#FF9900]/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                                    {vol.role}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0C111D] border border-[#1a2540] text-emerald-400 font-extrabold">
                                            {vol.count}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-[#1a2540]/60 pt-2 mt-2">
                                        <div className="flex justify-between font-mono">
                                            <span>Tracks: <strong className="text-white">{vol.tracksCount}</strong></span>
                                            <span>Labs: <strong className="text-amber-300">{vol.workshopsCount}</strong></span>
                                        </div>
                                        {vol.lastActive && (
                                            <div className="text-[10px] text-slate-500 font-mono truncate pt-0.5">
                                                Last: {new Date(vol.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search Attendee Name, Booking ID, QR, Volunteer, or Session..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB]"
                    />
                </div>

                <div className="sm:col-span-4">
                    <select
                        value={selectedVolunteer}
                        onChange={(e) => setSelectedVolunteer(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Volunteers & Admins ({allCheckedInAttendees.length})</option>
                        {leaderboard.map(v => (
                            <option key={v.name} value={v.name}>👤 {v.name} ({v.count} checked in)</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-3">
                    <select
                        value={selectedSessionType}
                        onChange={(e) => setSelectedSessionType(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="ALL">All Session Types</option>
                        <option value="TRACK">General Tracks Only</option>
                        <option value="WORKSHOP">Workshop Labs Only</option>
                    </select>
                </div>
            </div>

            {/* Active Filters Display */}
            {(selectedVolunteer || selectedSessionType !== 'ALL' || search) && (
                <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500 font-mono text-[11px]">Active Filters:</span>
                    {selectedVolunteer && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/40 font-mono text-[11px]">
                            <span>Volunteer: {selectedVolunteer}</span>
                            <button onClick={() => setSelectedVolunteer('')} className="hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {selectedSessionType !== 'ALL' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-[11px]">
                            <span>Session: {selectedSessionType}</span>
                            <button onClick={() => setSelectedSessionType('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {search && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                            <span>Search: &quot;{search}&quot;</span>
                            <button onClick={() => setSearch('')} className="hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    <button
                        onClick={() => { setSelectedVolunteer(''); setSelectedSessionType('ALL'); setSearch(''); }}
                        className="text-[11px] text-slate-400 hover:text-white underline ml-2"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Attribution Table */}
            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0C111D] border-b border-[#1a2540] text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                                <th className="px-5 py-3.5">Verified Attendee</th>
                                <th className="px-4 py-3.5">Booking / QR</th>
                                <th className="px-4 py-3.5">Assigned Session</th>
                                <th className="px-4 py-3.5">Checked In By (Volunteer)</th>
                                <th className="px-4 py-3.5">Role</th>
                                <th className="px-4 py-3.5">Timestamp</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2540] text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0073BB]" />
                                        <span>Loading live attribution records...</span>
                                    </td>
                                </tr>
                            ) : displayedAttendees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No check-in records matching the current filters.
                                    </td>
                                </tr>
                            ) : (
                                displayedAttendees.map((a) => {
                                    const volName = a.checked_in_by_name || (a.checked_in_by_id && volunteerMap.get(a.checked_in_by_id)) || 'Check-in Desk';
                                    const sessionDisplay = a.workshop_name ? (
                                        <span className="text-amber-300 font-medium font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                            🔬 {a.workshop_name}
                                        </span>
                                    ) : a.track_name ? (
                                        <span className="text-white font-medium bg-[#0C111D] px-2 py-0.5 rounded border border-[#1a2540]">
                                            🎯 {a.track_name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 font-mono">Unassigned</span>
                                    );

                                    return (
                                        <tr key={a.id} className="hover:bg-[#1a2540]/50 transition">
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-white">{a.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{a.email}</div>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-[#4F8EF7] font-semibold">
                                                <div>{a.booking_id}</div>
                                                <div className="text-[10px] text-slate-500">{a.qr_identifier}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {sessionDisplay}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-white flex items-center space-x-1.5">
                                                    <User className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                                    <span className="text-white font-bold">
                                                        {volName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                                    (a.checked_in_by_role === 'ADMIN' || volName.toLowerCase().includes('admin'))
                                                        ? 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                }`}>
                                                    {a.checked_in_by_role || (volName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                                                {a.check_in_time ? (
                                                    <div>
                                                        <div className="text-white font-semibold">{new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                                        <div className="text-[10px] text-slate-500">{new Date(a.check_in_time).toLocaleDateString()}</div>
                                                    </div>
                                                ) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUncheckIn(a.id, a.name)}
                                                    disabled={uncheckingId === a.id}
                                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition text-xs font-medium inline-flex items-center space-x-1 disabled:opacity-50"
                                                    title="Revert Check-In for this attendee"
                                                >
                                                    <RotateCcw className={`w-3 h-3 ${uncheckingId === a.id ? 'animate-spin' : ''}`} />
                                                    <span>Uncheck</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="px-6 py-3 bg-[#0C111D] border-t border-[#1a2540] text-xs text-slate-400 flex items-center justify-between font-mono">
                    <span>Showing {displayedAttendees.length} of {allCheckedInAttendees.length} verified check-ins</span>
                    <span className="text-[10px] text-slate-500">
                        {lastSyncTime ? `Last Synced: ${lastSyncTime.toLocaleTimeString()}` : 'Live Auto Syncing'}
                    </span>
                </div>
            </div>
        </div>
    );
}
