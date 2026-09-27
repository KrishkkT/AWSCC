'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, CheckCircle2, Clock, Search, RefreshCw, Zap,
    RotateCcw, ShieldCheck, CheckSquare, Square, Check,
    Utensils, Gift, AlertTriangle
} from 'lucide-react';

export default function ResourceClaimsLedger({
    eventId,
    resource,
    onClaimSuccess
}) {
    const [filterStatus, setFilterStatus] = useState('unclaimed'); // 'unclaimed' | 'claimed' | 'all'
    const [searchQuery, setSearchQuery] = useState('');
    const [counterFilter, setCounterFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState({
        summary: {
            total_registered: 0,
            event_checked_in: 0,
            resource_claimed: 0,
            unclaimed_count: 0,
            capacity: null
        },
        attendees: []
    });

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [actionInProgressId, setActionInProgressId] = useState(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    const isFood = resource?.type === 'FOOD';
    const actionLabel = isFood ? 'Claim Meal' : 'Issue Swag';
    const itemNoun = isFood ? 'Food / Meal' : 'Swag Kit';
    const primaryBg = isFood ? 'bg-[#FF9900]' : 'bg-emerald-500';
    const primaryHoverBg = isFood ? 'hover:bg-[#FF9900]/90' : 'hover:bg-emerald-400';
    const textPrimary = isFood ? 'text-[#FF9900]' : 'text-emerald-400';

    const fetchClaimsData = useCallback(async (isBackground = false) => {
        if (!eventId || !resource?.id) return;
        if (!isBackground) setLoading(true);
        else setRefreshing(true);

        try {
            const url = `/api/onepass/resources/claims?eventId=${eventId}&resourceId=${resource.id}&status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastSyncTime(new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error('[ResourceClaimsLedger fetch error]', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [eventId, resource?.id, filterStatus, searchQuery]);

    useEffect(() => {
        fetchClaimsData();
    }, [fetchClaimsData]);

    // Single 1-Click Claim
    const handleSingleClaim = async (attendee) => {
        if (actionInProgressId || batchProcessing || attendee.is_claimed) return;
        setActionInProgressId(attendee.id);

        try {
            const res = await fetch('/api/onepass/resources/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    resourceId: resource.id,
                    attendeeId: attendee.id
                })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                // Optimistically update local list
                setData(prev => {
                    const updated = prev.attendees.map(a => {
                        if (a.id === attendee.id) {
                            return {
                                ...a,
                                is_claimed: true,
                                claim_time: new Date().toISOString()
                            };
                        }
                        return a;
                    });
                    const newUnclaimed = Math.max(0, prev.summary.unclaimed_count - 1);
                    const newClaimed = prev.summary.resource_claimed + 1;
                    return {
                        ...prev,
                        summary: {
                            ...prev.summary,
                            unclaimed_count: newUnclaimed,
                            resource_claimed: newClaimed
                        },
                        attendees: filterStatus === 'unclaimed' ? updated.filter(a => a.id !== attendee.id) : updated
                    };
                });
                if (onClaimSuccess) onClaimSuccess(result);
            } else {
                alert(result.message || result.error || 'Failed to claim');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to process claim due to network error');
        } finally {
            setActionInProgressId(null);
        }
    };

    // Single Revert Claim
    const handleSingleRevert = async (attendee) => {
        if (actionInProgressId || batchProcessing || !attendee.is_claimed) return;
        const confirmMsg = `Are you sure you want to REVERT / UNDO the ${itemNoun} check-in for "${attendee.name}"?\n\nThis will remove the claim from Supabase and mark them as Pending Claim.`;
        if (!confirm(confirmMsg)) return;

        setActionInProgressId(attendee.id);

        try {
            const res = await fetch('/api/onepass/resources/claims', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    resourceId: resource.id,
                    attendeeId: attendee.id,
                    claimId: attendee.claim_id
                })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                // Optimistically update local list
                setData(prev => {
                    const updated = prev.attendees.map(a => {
                        if (a.id === attendee.id) {
                            return {
                                ...a,
                                is_claimed: false,
                                claim_time: null,
                                claim_id: null
                            };
                        }
                        return a;
                    });
                    const newUnclaimed = prev.summary.unclaimed_count + 1;
                    const newClaimed = Math.max(0, prev.summary.resource_claimed - 1);
                    return {
                        ...prev,
                        summary: {
                            ...prev.summary,
                            unclaimed_count: newUnclaimed,
                            resource_claimed: newClaimed
                        },
                        attendees: filterStatus === 'claimed' ? updated.filter(a => a.id !== attendee.id) : updated
                    };
                });
                if (onClaimSuccess) onClaimSuccess(result);
            } else {
                alert(result.message || result.error || 'Failed to revert claim');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to revert claim due to network error');
        } finally {
            setActionInProgressId(null);
        }
    };

    // Batch Claim Selected
    const handleBatchClaim = async (targetAttendeeIds) => {
        const idsToClaim = targetAttendeeIds || Array.from(selectedIds).filter(id => {
            const att = data.attendees.find(a => a.id === id);
            return att && !att.is_claimed;
        });
        if (idsToClaim.length === 0 || batchProcessing) return;

        const count = idsToClaim.length;
        const confirmMsg = `Are you sure you want to directly check-in and claim ${itemNoun} for ${count} admitted attendee(s)?`;
        if (!confirm(confirmMsg)) return;

        setBatchProcessing(true);
        try {
            const res = await fetch('/api/onepass/resources/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    resourceId: resource.id,
                    attendeeIds: idsToClaim
                })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setSelectedIds(new Set());
                fetchClaimsData();
                if (onClaimSuccess) onClaimSuccess(result);
                alert(`Successfully checked in ${result.claimed_count || count} attendee(s) to ${resource.name}!`);
            } else {
                alert(result.message || result.error || 'Failed to process batch claim');
            }
        } catch (err) {
            console.error(err);
            alert('Batch claim failed due to network error');
        } finally {
            setBatchProcessing(false);
        }
    };

    // Batch Revert Selected
    const handleBatchRevert = async (targetAttendeeIds) => {
        const idsToRevert = targetAttendeeIds || Array.from(selectedIds).filter(id => {
            const att = data.attendees.find(a => a.id === id);
            return att && att.is_claimed;
        });
        if (idsToRevert.length === 0 || batchProcessing) return;

        const count = idsToRevert.length;
        const confirmMsg = `Are you sure you want to REVERT / UNDO ${itemNoun} check-ins for ${count} attendee(s)?\n\nThis will remove their claims from Supabase and restore them to Pending Claim status.`;
        if (!confirm(confirmMsg)) return;

        setBatchProcessing(true);
        try {
            const res = await fetch('/api/onepass/resources/claims', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    resourceId: resource.id,
                    attendeeIds: idsToRevert
                })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setSelectedIds(new Set());
                fetchClaimsData();
                if (onClaimSuccess) onClaimSuccess(result);
                alert(`Successfully reverted ${count} claim(s) from ${resource.name}!`);
            } else {
                alert(result.message || result.error || 'Failed to revert claims');
            }
        } catch (err) {
            console.error(err);
            alert('Batch revert failed due to network error');
        } finally {
            setBatchProcessing(false);
        }
    };

    // Toggle Selection
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === displayedAttendees.length && displayedAttendees.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayedAttendees.map(a => a.id)));
        }
    };

    // Counters available for filter dropdown
    const availableCounters = Array.from(new Set(data.attendees.map(a => a.counter).filter(Boolean))).sort();

    // Client-side counter filtering
    const displayedAttendees = counterFilter === 'all'
        ? data.attendees
        : data.attendees.filter(a => a.counter === counterFilter);

    const unclaimedInView = displayedAttendees.filter(a => !a.is_claimed);
    const claimedInView = displayedAttendees.filter(a => a.is_claimed);

    const selectedUnclaimedInView = displayedAttendees.filter(a => selectedIds.has(a.id) && !a.is_claimed);
    const selectedClaimedInView = displayedAttendees.filter(a => selectedIds.has(a.id) && a.is_claimed);

    return (
        <div className="bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 space-y-6 shadow-2xl">
            {/* Header & Metrics */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <div className="flex items-center gap-2">
                        {isFood ? <Utensils className={`w-5 h-5 ${textPrimary}`} /> : <Gift className={`w-5 h-5 ${textPrimary}`} />}
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            Admitted Attendees &amp; {itemNoun} Ledger
                        </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Filter attendees whose event check-in is completed to 1-click claim or revert {itemNoun.toLowerCase()} with live Supabase sync.
                    </p>
                </div>

                {/* Summary Stat Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1.5 bg-[#0C111D] border border-[#1a2540] rounded-xl text-center">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Event Checked In</div>
                        <div className="text-sm font-black text-white">{data.summary.event_checked_in}</div>
                    </div>

                    <div className="px-3 py-1.5 bg-[#0C111D] border border-[#1a2540] rounded-xl text-center">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">{itemNoun} Claimed</div>
                        <div className={`text-sm font-black ${textPrimary}`}>{data.summary.resource_claimed}</div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-xl border text-center ${
                        data.summary.unclaimed_count > 0
                            ? `${isFood ? 'bg-amber-500/10 border-amber-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`
                            : 'bg-[#0C111D] border-[#1a2540]'
                    }`}>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Pending Claim</div>
                        <div className={`text-sm font-black ${data.summary.unclaimed_count > 0 ? (isFood ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-400'}`}>
                            {data.summary.unclaimed_count}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Alert if count is low compared to event check-ins */}
            {data.summary.unclaimed_count > 0 && (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isFood
                        ? 'bg-gradient-to-r from-amber-950/40 via-[#0C111D] to-[#151c2e] border-amber-500/40'
                        : 'bg-gradient-to-r from-emerald-950/40 via-[#0C111D] to-[#151c2e] border-emerald-500/40'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${isFood ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{data.summary.unclaimed_count} Admitted Attendee(s) Pending {itemNoun}</span>
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${isFood ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                    <span className={`relative rounded-full h-2 w-2 ${isFood ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                                These attendees have entered the event gate but haven&apos;t been issued {itemNoun.toLowerCase()}.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleBatchClaim(unclaimedInView.map(a => a.id))}
                        disabled={batchProcessing || unclaimedInView.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 text-neutral-950 text-xs font-extrabold rounded-xl transition shadow-lg shrink-0 cursor-pointer disabled:opacity-50 ${primaryBg} ${primaryHoverBg}`}
                    >
                        <Zap className="w-4 h-4 stroke-[2.5]" />
                        <span>{batchProcessing ? 'Processing Direct Sync...' : `Quick Claim All Pending (${unclaimedInView.length})`}</span>
                    </button>
                </div>
            )}

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex space-x-1 p-1 bg-[#0C111D] border border-[#1a2540] rounded-2xl">
                    <button
                        onClick={() => setFilterStatus('unclaimed')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            filterStatus === 'unclaimed'
                                ? `${primaryBg} text-neutral-950 shadow-md`
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Claim</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterStatus === 'unclaimed' ? 'bg-black/20 text-neutral-950' : 'bg-[#151c2e] text-slate-300'}`}>
                            {data.summary.unclaimed_count}
                        </span>
                    </button>

                    <button
                        onClick={() => setFilterStatus('claimed')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            filterStatus === 'claimed'
                                ? `${primaryBg} text-neutral-950 shadow-md`
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterStatus === 'claimed' ? 'bg-black/20 text-neutral-950' : 'bg-[#151c2e] text-slate-300'}`}>
                            {data.summary.resource_claimed}
                        </span>
                    </button>

                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            filterStatus === 'all'
                                ? `${primaryBg} text-neutral-950 shadow-md`
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>All Admitted</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterStatus === 'all' ? 'bg-black/20 text-neutral-950' : 'bg-[#151c2e] text-slate-300'}`}>
                            {data.summary.event_checked_in}
                        </span>
                    </button>
                </div>

                {/* Search & Counter Filter */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter by name, booking ID, email, counter..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-400 font-mono"
                        />
                    </div>

                    {availableCounters.length > 0 && (
                        <select
                            value={counterFilter}
                            onChange={(e) => setCounterFilter(e.target.value)}
                            className="bg-[#0C111D] border border-[#1a2540] rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none font-mono"
                        >
                            <option value="all">All Desks</option>
                            {availableCounters.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={() => fetchClaimsData(true)}
                        disabled={refreshing}
                        className="p-2 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 rounded-xl transition cursor-pointer"
                        title="Sync with Supabase"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-white' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Selection Toolbar */}
            {selectedIds.size > 0 && (
                <div className="p-3 bg-[#0C111D] border border-blue-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
                    <div className="flex items-center gap-2 text-blue-300 font-semibold">
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                        <span>{selectedIds.size} attendee(s) selected</span>
                        {selectedUnclaimedInView.length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono rounded-lg">
                                {selectedUnclaimedInView.length} pending
                            </span>
                        )}
                        {selectedClaimedInView.length > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded-lg">
                                {selectedClaimedInView.length} claimed
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                            Clear Selection
                        </button>

                        {/* Batch Claim Action for selected pending attendees */}
                        {selectedUnclaimedInView.length > 0 && (
                            <button
                                onClick={() => handleBatchClaim(selectedUnclaimedInView.map(a => a.id))}
                                disabled={batchProcessing}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-neutral-950 font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 ${primaryBg} ${primaryHoverBg}`}
                            >
                                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{batchProcessing ? 'Syncing...' : `Claim ${itemNoun} (${selectedUnclaimedInView.length})`}</span>
                            </button>
                        )}

                        {/* Batch Revert Action for selected claimed attendees */}
                        {selectedClaimedInView.length > 0 && (
                            <button
                                onClick={() => handleBatchRevert(selectedClaimedInView.map(a => a.id))}
                                disabled={batchProcessing}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{batchProcessing ? 'Reverting...' : `Revert Claims (${selectedClaimedInView.length})`}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Attendees Table */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
                    Connecting to Supabase and loading live attendance records...
                </div>
            ) : displayedAttendees.length === 0 ? (
                <div className="p-12 text-center bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-2">
                    <div className="w-10 h-10 bg-[#151c2e] rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-white">
                        {filterStatus === 'unclaimed' ? `All Admitted Attendees Have Claimed ${itemNoun}!` : 'No attendees match current filter.'}
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {filterStatus === 'unclaimed'
                            ? `Every attendee who completed event check-in has already received their ${itemNoun.toLowerCase()}.`
                            : 'Try adjusting your search keyword or desk filter.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#1a2540]">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0C111D] border-b border-[#1a2540] text-[10px] font-mono uppercase text-slate-400">
                            <tr>
                                <th className="p-3 w-8">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-slate-400 hover:text-white cursor-pointer"
                                        title="Select/Deselect All in View"
                                    >
                                        {selectedIds.size > 0 && selectedIds.size === displayedAttendees.length ? (
                                            <CheckSquare className="w-4 h-4 text-blue-400" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="p-3">Attendee Name</th>
                                <th className="p-3">Booking ID &amp; QR</th>
                                <th className="p-3">Desk / Box #</th>
                                <th className="p-3">Event Check-In</th>
                                <th className="p-3">{itemNoun} Status</th>
                                <th className="p-3 text-right">Quick Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2540] bg-[#0C111D]/60">
                            {displayedAttendees.map((a) => {
                                const isBusy = actionInProgressId === a.id;
                                const isSelected = selectedIds.has(a.id);
                                return (
                                    <tr
                                        key={a.id}
                                        className={`transition hover:bg-[#151c2e]/80 ${
                                            isSelected ? 'bg-blue-950/20' : ''
                                        }`}
                                    >
                                        <td className="p-3">
                                            <button
                                                onClick={() => toggleSelect(a.id)}
                                                className="text-slate-400 hover:text-white cursor-pointer"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-400" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>

                                        <td className="p-3">
                                            <div className="font-bold text-white">{a.name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                                <span>{a.email}</span>
                                                {a.phone && <span>• {a.phone}</span>}
                                            </div>
                                            {(a.track_name || a.workshop_name) && (
                                                <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-[#1a2540] text-slate-300 text-[10px] font-mono rounded">
                                                    {a.track_name ? `Track: ${a.track_name}` : `Lab: ${a.workshop_name}`}
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-3 font-mono text-[11px] text-slate-300">
                                            <div>{a.booking_id || '—'}</div>
                                            <div className="text-[10px] text-slate-500">{a.qr_identifier}</div>
                                        </td>

                                        <td className="p-3 font-mono text-[11px]">
                                            <span className="text-blue-400 font-semibold">{a.counter || 'Unassigned'}</span>
                                            {a.counter_number && (
                                                <span className="block text-[10px] text-slate-400">Box #{a.counter_number}</span>
                                            )}
                                        </td>

                                        <td className="p-3 font-mono text-[11px] text-slate-300">
                                            {a.check_in_time ? (
                                                <>
                                                    <div>{new Date(a.check_in_time).toLocaleTimeString()}</div>
                                                    <div className="text-[10px] text-slate-500">by {a.checked_in_by_name}</div>
                                                </>
                                            ) : (
                                                <span className="text-slate-500">Not recorded</span>
                                            )}
                                        </td>

                                        <td className="p-3">
                                            {a.is_claimed ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg font-mono text-[11px] font-semibold">
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Claimed {a.claim_time ? new Date(a.claim_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-mono text-[11px] font-semibold">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Pending</span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-3 text-right">
                                            {a.is_claimed ? (
                                                <button
                                                    onClick={() => handleSingleRevert(a)}
                                                    disabled={isBusy || batchProcessing}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                                                    title="Undo / Revert this claim and restore attendee to Pending Claim"
                                                >
                                                    {isBusy ? (
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>{isBusy ? 'Reverting...' : 'Revert Claim'}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSingleClaim(a)}
                                                    disabled={isBusy || batchProcessing}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-neutral-950 font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 ${primaryBg} ${primaryHoverBg}`}
                                                >
                                                    {isBusy ? (
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                    )}
                                                    <span>{isBusy ? 'Saving...' : actionLabel}</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer with sync time */}
            {lastSyncTime && (
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-[#1a2540]">
                    <span>Showing {displayedAttendees.length} records</span>
                    <span>Live Supabase Synchronized • Last checked at {lastSyncTime}</span>
                </div>
            )}
        </div>
    );
}
