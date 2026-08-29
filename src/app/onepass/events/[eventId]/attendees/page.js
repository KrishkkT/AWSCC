'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Search, Plus, Filter, QrCode, CheckCircle2, XCircle, Clock,
    MoreHorizontal, ShieldCheck, RefreshCw, Edit, AlertCircle,
    User, Mail, Phone, Ticket, Layers, Coffee, Award, Sparkles, X, Trash2, Edit2
} from 'lucide-react';
import { useOnePass } from '@/components/onepass/OnePassContext';

export default function AttendeesDirectoryPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();

    const [attendees, setAttendees] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [trackFilter, setTrackFilter] = useState('');

    // Modals & Drawers
    const [selectedAttendee, setSelectedAttendee] = useState(null);
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Override Form State
    const [overrideTrackId, setOverrideTrackId] = useState('');
    const [overrideWorkshopId, setOverrideWorkshopId] = useState('');
    const [overrideCheckInStatus, setOverrideCheckInStatus] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideSubmitting, setOverrideSubmitting] = useState(false);

    // New Attendee Form
    const [newAttendee, setNewAttendee] = useState({
        name: '',
        email: '',
        phone: '',
        ticket_type: 'Attendee',
        booking_id: '',
        qr_identifier: ''
    });

    const fetchAttendees = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                eventId,
                search,
                check_in_status: statusFilter,
                track_id: trackFilter
            });
            const res = await fetch(`/api/onepass/attendees?${queryParams.toString()}`);
            const data = await res.json();
            setAttendees(data.attendees || []);

            const trkRes = await fetch(`/api/onepass/tracks?eventId=${eventId}`);
            const trkData = await trkRes.json();
            setTracks(trkData.tracks || []);

            const wkRes = await fetch(`/api/onepass/workshops?eventId=${eventId}`);
            const wkData = await wkRes.json();
            setWorkshops(wkData.workshops || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchAttendees();
        }, 250);
        return () => clearTimeout(timeout);
    }, [eventId, search, statusFilter, trackFilter]);

    const openProfile = async (attendeeId) => {
        try {
            const res = await fetch(`/api/onepass/attendees/${attendeeId}?eventId=${eventId}`);
            const data = await res.json();
            if (data.attendee) {
                setSelectedAttendee(data.attendee);
                setOverrideTrackId(data.attendee.assigned_track_id || '');
                setOverrideWorkshopId(data.attendee.assigned_workshop_id || '');
                setOverrideCheckInStatus(data.attendee.check_in_status || 'NOT_CHECKED_IN');
                setOverrideReason('');
                setProfileDrawerOpen(true);
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    };

    const handleAdminOverride = async (e) => {
        e.preventDefault();
        if (!selectedAttendee || !overrideReason.trim()) return;

        setOverrideSubmitting(true);
        try {
            const res = await fetch(`/api/onepass/attendees/${selectedAttendee.id}/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    updates: {
                        assigned_track_id: overrideTrackId || null,
                        assigned_workshop_id: overrideWorkshopId || null,
                        check_in_status: overrideCheckInStatus,
                        check_in_time: overrideCheckInStatus === 'CHECKED_IN' ? (selectedAttendee.check_in_time || new Date().toISOString()) : null
                    },
                    reason: overrideReason
                })
            });

            const data = await res.json();
            if (res.ok) {
                setOverrideModalOpen(false);
                setSelectedAttendee(data.attendee);
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to apply override');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setOverrideSubmitting(false);
        }
    };

    const handleDeleteAttendee = async (attendeeId, attendeeName) => {
        if (!confirm(`Are you sure you want to permanently delete attendee "${attendeeName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/attendees/${attendeeId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setProfileDrawerOpen(false);
                setSelectedAttendee(null);
                fetchAttendees();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete attendee');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAttendee = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/onepass/attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newAttendee
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCreateModalOpen(false);
                setNewAttendee({ name: '', email: '', phone: '', ticket_type: 'Attendee', booking_id: '', qr_identifier: '' });
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to create attendee');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Attendees Directory</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Search, inspect profiles, edit track assignments, and delete records.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-xs rounded-xl transition shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Attendee</span>
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by Name, Email, Phone, Booking ID, or QR code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB]"
                    />
                </div>

                <div className="sm:col-span-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Check-in Statuses</option>
                        <option value="CHECKED_IN">Checked In (Verified)</option>
                        <option value="NOT_CHECKED_IN">Not Checked In</option>
                    </select>
                </div>

                <div className="sm:col-span-3">
                    <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Tracks</option>
                        {tracks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Attendees Table */}
            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0C111D] border-b border-[#1a2540] text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                                <th className="px-5 py-3.5">Attendee</th>
                                <th className="px-4 py-3.5">Ticket</th>
                                <th className="px-4 py-3.5">QR Identifier</th>
                                <th className="px-4 py-3.5">Assigned Track</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2540] text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0073BB]" />
                                        <span>Loading attendee roster...</span>
                                    </td>
                                </tr>
                            ) : attendees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No attendees found. Import a KonfHub sheet or add attendees manually.
                                    </td>
                                </tr>
                            ) : (
                                attendees.map((a) => {
                                    const isCheckedIn = a.check_in_status === 'CHECKED_IN';
                                    return (
                                        <tr key={a.id} className="hover:bg-[#1a2540]/50 transition">
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-white">{a.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{a.email}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="px-2 py-0.5 rounded bg-[#0C111D] text-slate-300 text-[10px] font-medium border border-[#1a2540]">
                                                    {a.ticket_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-[#4F8EF7] font-semibold">
                                                {a.qr_identifier}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {a.track_name ? (
                                                    <span className="text-white font-medium">{a.track_name}</span>
                                                ) : (
                                                    <span className="text-slate-600 font-mono">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {isCheckedIn ? (
                                                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Checked In</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center space-x-1 text-slate-400 bg-[#0C111D] px-2 py-0.5 rounded-full text-[11px] border border-[#1a2540]">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Pending</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right space-x-1.5">
                                                <button
                                                    onClick={() => openProfile(a.id)}
                                                    className="px-3 py-1.5 bg-[#1a2540] hover:bg-[#0073BB] text-white rounded-lg transition text-xs font-medium"
                                                >
                                                    Profile
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAttendee(a.id, a.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#0C111D] transition"
                                                    title="Delete Attendee"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
                    <span>Showing {attendees.length} attendees</span>
                    <span>Total Database: {attendees.length}</span>
                </div>
            </div>

            {/* Profile Drawer */}
            {profileDrawerOpen && selectedAttendee && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setProfileDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#151c2e] border-l border-[#1a2540] h-full p-6 overflow-y-auto space-y-6 z-10 shadow-2xl">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-[#1a2540]">
                            <div>
                                <h2 className="text-lg font-bold text-white">{selectedAttendee.name}</h2>
                                <p className="text-xs text-[#4F8EF7] font-mono">{selectedAttendee.qr_identifier}</p>
                            </div>
                            <button
                                onClick={() => setProfileDrawerOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Fast Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setOverrideModalOpen(true)}
                                className="flex items-center justify-center space-x-1.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Override Assignment</span>
                            </button>

                            <button
                                onClick={() => handleDeleteAttendee(selectedAttendee.id, selectedAttendee.name)}
                                className="flex items-center justify-center space-x-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Attendee</span>
                            </button>
                        </div>

                        {/* Attendee Details Card */}
                        <div className="p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Booking Reference</span>
                                <span className="font-mono text-white font-semibold">{selectedAttendee.booking_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Email Address</span>
                                <span className="text-white">{selectedAttendee.email}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Phone Number</span>
                                <span className="text-white">{selectedAttendee.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Ticket Category</span>
                                <span className="px-2 py-0.5 bg-[#151c2e] rounded text-[#4F8EF7] font-medium border border-[#1a2540]">{selectedAttendee.ticket_type}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]">
                                <span className="text-slate-400">Check-in Status</span>
                                <span className={selectedAttendee.check_in_status === 'CHECKED_IN' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                    {selectedAttendee.check_in_status}
                                </span>
                            </div>
                            {selectedAttendee.check_in_time && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Check-in Timestamp</span>
                                    <span className="font-mono text-slate-300">{new Date(selectedAttendee.check_in_time).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Assigned Track</span>
                                <span className="text-white font-semibold">{selectedAttendee.assigned_track?.name || 'None'}</span>
                            </div>
                        </div>

                        {/* Meal & Swag Claims Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Resource & Meal Claims</h3>
                            <div className="space-y-2">
                                {selectedAttendee.claims?.length === 0 ? (
                                    <div className="p-3 bg-[#0C111D] rounded-xl text-xs text-slate-500 text-center">No meals or swag claimed yet.</div>
                                ) : (
                                    selectedAttendee.claims?.map((c) => (
                                        <div key={c.id} className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540] flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-white">{c.resource?.name || 'Resource'}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{new Date(c.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">CLAIMED</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Gate Access Logs */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Gate Access Attempts</h3>
                            <div className="space-y-2">
                                {selectedAttendee.track_access_logs?.length === 0 ? (
                                    <div className="p-3 bg-[#0C111D] rounded-xl text-xs text-slate-500 text-center">No gate access logs recorded.</div>
                                ) : (
                                    selectedAttendee.track_access_logs?.map((l) => (
                                        <div key={l.id} className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540] flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-white">{l.track?.name || 'Track Gate'}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{new Date(l.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${l.result === 'GRANTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {l.result}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Override Modal */}
            {overrideModalOpen && selectedAttendee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                <ShieldCheck className="w-5 h-5 text-[#FF9900]" />
                                <span>Administrator Override</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Modify track assignment, check-in status, or workshop for <strong>{selectedAttendee.name}</strong>. All changes are permanently audited.
                            </p>
                        </div>

                        <form onSubmit={handleAdminOverride} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Assigned Track</label>
                                <select
                                    value={overrideTrackId}
                                    onChange={(e) => setOverrideTrackId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Track Assigned</option>
                                    {tracks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.occupancy}/{t.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Assigned Workshop</label>
                                <select
                                    value={overrideWorkshopId}
                                    onChange={(e) => setOverrideWorkshopId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Workshop Assigned</option>
                                    {workshops.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.occupancy}/{w.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Check-in Status</label>
                                <select
                                    value={overrideCheckInStatus}
                                    onChange={(e) => setOverrideCheckInStatus(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="NOT_CHECKED_IN">NOT CHECKED IN</option>
                                    <option value="CHECKED_IN">CHECKED IN</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Override Reason (Mandatory for Audit Trail)</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="e.g. Attendee requested track change at helpdesk due to mistaken check-in selection."
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOverrideModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={overrideSubmitting || !overrideReason.trim()}
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    {overrideSubmitting ? 'Applying Override...' : 'Confirm Override'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Single Attendee Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Add Attendee</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAttendee} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newAttendee.name}
                                    onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={newAttendee.email}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Phone</label>
                                    <input
                                        type="text"
                                        value={newAttendee.phone}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Ticket Type</label>
                                    <select
                                        value={newAttendee.ticket_type}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, ticket_type: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    >
                                        <option value="Attendee">Attendee</option>
                                        <option value="VIP Attendee">VIP Attendee</option>
                                        <option value="Speaker">Speaker</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Volunteer">Volunteer</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Booking ID (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if empty"
                                        value={newAttendee.booking_id}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, booking_id: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl"
                                >
                                    Save Attendee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
