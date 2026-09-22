'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Coffee, Camera, CheckCircle2, AlertTriangle, XCircle, Plus, Search,
    Clock, RefreshCw, Sparkles, UserCheck, Utensils, Edit2, Trash2, X
} from 'lucide-react';
import InlineQRScanner from '@/components/onepass/InlineQRScanner';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function FoodManagementPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();
    const isAdmin = user?.role === 'ADMIN';

    const [resources, setResources] = useState([]);
    const [selectedResourceId, setSelectedResourceId] = useState('');
    const [loading, setLoading] = useState(true);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState(null);

    // Live attendee search state as user types
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!manualCode || manualCode.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const query = manualCode.trim();
                const res = await fetch(`/api/onepass/attendees/search?eventId=${eventId}&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSearchResults(data.attendees || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [manualCode, eventId]);

    // Create & Edit Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [saving, setSaving] = useState(false);

    const [newResource, setNewResource] = useState({
        name: '',
        type: 'FOOD',
        description: '',
        capacity: 450,
        start_time: '12:30',
        end_time: '14:30'
    });

    const fetchFoodResources = async () => {
        try {
            const res = await fetch(`/api/onepass/resources?eventId=${eventId}&type=FOOD`);
            const data = await res.json();
            const list = data.resources || [];
            setResources(list);
            if (list.length > 0 && !selectedResourceId) {
                setSelectedResourceId(list[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFoodResources();
    }, [eventId]);

    const lastScanRef = React.useRef({ code: '', time: 0 });

    const handleClaimScan = async (qrInput) => {
        const clean = parseScannedQR(qrInput || manualCode);
        if (!clean || !selectedResourceId) return;

        const now = Date.now();
        if (claiming || (lastScanRef.current.code === clean && now - lastScanRef.current.time < 3000)) {
            return;
        }
        lastScanRef.current = { code: clean, time: now };

        setClaiming(true);
        setClaimResult(null);

        try {
            const res = await fetch('/api/onepass/resources/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    qrToken: clean,
                    resourceId: selectedResourceId
                })
            });

            const data = await res.json();
            setClaimResult({
                ...data,
                scanned_code: clean,
                timestamp: new Date().toLocaleTimeString()
            });
            fetchFoodResources();
        } catch (e) {
            setClaimResult({
                success: false,
                code: 'NETWORK_ERROR',
                message: 'Failed to process meal claim.'
            });
        } finally {
            setClaiming(false);
        }
    };

    const handleCreateResource = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newResource
                })
            });
            if (res.ok) {
                setCreateModalOpen(false);
                setNewResource({ name: '', type: 'FOOD', description: '', capacity: 450, start_time: '12:30', end_time: '14:30' });
                fetchFoodResources();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateResource = async (e) => {
        e.preventDefault();
        if (!editingResource) return;
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/resources', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingResource.id,
                    name: editingResource.name,
                    description: editingResource.description,
                    capacity: editingResource.capacity,
                    start_time: editingResource.start_time,
                    end_time: editingResource.end_time
                })
            });
            if (res.ok) {
                setEditModalOpen(false);
                setEditingResource(null);
                fetchFoodResources();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteResource = async (resourceId, resourceName) => {
        if (!confirm(`Are you sure you want to delete meal resource "${resourceName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/resources?id=${resourceId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                if (selectedResourceId === resourceId) {
                    setSelectedResourceId('');
                }
                fetchFoodResources();
            } else {
                alert(data.error || 'Failed to delete resource');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const currentResource = resources.find(r => r.id === selectedResourceId);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Food & Meals Distribution</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Scan attendee QR codes to claim meals. Prevents duplicate meal collections automatically.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 text-neutral-950 rounded-xl text-xs font-bold shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Meal Resource</span>
                    </button>
                )}
            </div>

            {/* Meal Resource Selector & Manager */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                    Select Active Meal Service
                </label>

                {resources.length === 0 ? (
                    <div className="p-8 text-center bg-[#0C111D] rounded-2xl border border-[#1a2540] text-slate-500 text-xs">
                        No food resources created yet. Click <strong>Add Meal Resource</strong> to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {resources.map((r) => {
                            const isSelected = selectedResourceId === r.id;
                            return (
                                <div
                                    key={r.id}
                                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                                        isSelected
                                            ? 'bg-[#FF9900]/10 border-[#FF9900] text-white ring-1 ring-[#FF9900] shadow-lg shadow-[#FF9900]/10'
                                            : 'bg-[#0C111D] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedResourceId(r.id);
                                            setClaimResult(null);
                                        }}
                                        className="text-left w-full space-y-1"
                                    >
                                        <div className="font-bold text-sm text-white flex items-center justify-between">
                                            <span>{r.name}</span>
                                            <Utensils className="w-4 h-4 text-[#FF9900]" />
                                        </div>
                                        <div className="text-[11px] text-slate-400 line-clamp-2">{r.description || 'Meal service'}</div>
                                    </button>

                                    <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]/80">
                                        <div className="text-[10px] font-mono text-slate-400">
                                            Claims: <strong className="text-[#FF9900]">{r.claims_count || 0}</strong>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingResource(r);
                                                        setEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Edit Meal"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteResource(r.id, r.name);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Delete Meal"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Scanner Station */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl text-center">
                <h2 className="text-xl font-bold text-white">
                    Scan for {currentResource?.name || 'Meal Claim'}
                </h2>

                <div className="flex justify-center">
                    <button
                        onClick={() => setScannerOpen(!scannerOpen)}
                        disabled={!currentResource}
                        className={`flex items-center space-x-2 px-8 py-4 ${scannerOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF9900] hover:bg-[#FF9900]/90'} disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition shadow-xl hover:scale-105`}
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>{scannerOpen ? 'Close Camera Scanner' : 'Open Food Camera Scanner'}</span>
                    </button>
                </div>

                {/* Inline QR Scanner - expands right here (no popup modal) */}
                {scannerOpen && (
                    <div className="max-w-md mx-auto">
                        <InlineQRScanner
                            isOpen={scannerOpen}
                            onClose={() => setScannerOpen(false)}
                            onScan={(decoded) => handleClaimScan(decoded)}
                            title={`Scan for ${currentResource?.name || 'Meal Claim'}`}
                            continuous={true}
                        />
                    </div>
                )}

                {/* Manual Search & Verification */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleClaimScan(manualCode);
                        setSearchResults([]);
                    }}
                    className="max-w-md mx-auto flex space-x-2 pt-2"
                >
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by name, email, booking ID, or QR..."
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#FF9900]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || claiming || !currentResource}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#FF9900] hover:text-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono"
                    >
                        Claim
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className="max-w-md mx-auto p-2 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-1 max-h-56 overflow-y-auto text-left">
                        {searchResults.map((att) => (
                            <button
                                key={att.id}
                                onClick={() => {
                                    handleClaimScan(att.booking_id || att.qr_identifier || att.email || att.name);
                                    setSearchResults([]);
                                    setManualCode(att.name || att.booking_id);
                                }}
                                className="w-full text-left p-2.5 hover:bg-[#1a2540] rounded-xl transition flex items-center justify-between text-xs"
                            >
                                <div>
                                    <div className="font-bold text-white">{att.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">{att.email} • {att.booking_id}</div>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[#FF9900]">{att.check_in_status}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Claim Result Display */}
            {claimResult && (
                <div className="animate-fade-in">
                    {claimResult.success ? (
                        <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-4 shadow-2xl">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-emerald-400 uppercase">
                                    ✓ {claimResult.resource?.name} CLAIMED
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{claimResult.attendee?.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">{claimResult.attendee?.booking_id}</p>
                            </div>
                            {(claimResult.attendee?.counter || claimResult.attendee?.counter_number) && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">🏷️ Counter:</span>
                                    <span className="text-base font-black text-emerald-300">
                                        {claimResult.attendee.counter || `Counter ${claimResult.attendee.counter_number}`}
                                    </span>
                                </div>
                            )}
                            <div className="text-[11px] text-slate-400 font-mono">
                                Claim recorded at {claimResult.timestamp}
                            </div>
                        </div>
                    ) : claimResult.code === 'ALREADY_CLAIMED' ? (
                        <div className="p-8 bg-amber-950/40 border-2 border-amber-500 rounded-3xl text-center space-y-4 shadow-2xl">
                            <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-amber-400 uppercase">
                                    ⚠ ALREADY CLAIMED
                                </div>
                                <h3 className="text-2xl font-bold text-white">{claimResult.attendee?.name}</h3>
                                <p className="text-sm text-amber-300 font-medium">
                                    {claimResult.resource?.name} was already claimed for this attendee at{' '}
                                    {claimResult.previous_claim?.timestamp ? new Date(claimResult.previous_claim.timestamp).toLocaleTimeString() : 'an earlier time'}.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 bg-red-950/40 border-2 border-red-500 rounded-3xl text-center space-y-4 shadow-2xl">
                            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-red-400 uppercase">
                                    ✕ CLAIM REJECTED
                                </div>
                                <h3 className="text-2xl font-bold text-white">{claimResult.attendee?.name || 'Invalid QR'}</h3>
                                <p className="text-sm text-red-300 font-semibold">{claimResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Meal Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Create Meal Service</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Meal Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Lunch Buffet"
                                    value={newResource.name}
                                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Start Time</label>
                                    <input
                                        type="time"
                                        value={newResource.start_time}
                                        onChange={(e) => setNewResource({ ...newResource, start_time: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">End Time</label>
                                    <input
                                        type="time"
                                        value={newResource.end_time}
                                        onChange={(e) => setNewResource({ ...newResource, end_time: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Capacity (Optional)</label>
                                <input
                                    type="number"
                                    value={newResource.capacity}
                                    onChange={(e) => setNewResource({ ...newResource, capacity: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={newResource.description}
                                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#FF9900]"
                                />
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
                                    disabled={saving}
                                    className="px-5 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 text-neutral-950 font-bold rounded-xl"
                                >
                                    {saving ? 'Saving...' : 'Save Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Meal Modal */}
            {editModalOpen && editingResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Edit Meal Service</h2>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateResource} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Meal Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingResource.name}
                                    onChange={(e) => setEditingResource({ ...editingResource, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Start Time</label>
                                    <input
                                        type="time"
                                        value={editingResource.start_time || ''}
                                        onChange={(e) => setEditingResource({ ...editingResource, start_time: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">End Time</label>
                                    <input
                                        type="time"
                                        value={editingResource.end_time || ''}
                                        onChange={(e) => setEditingResource({ ...editingResource, end_time: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Capacity (Optional)</label>
                                <input
                                    type="number"
                                    value={editingResource.capacity || ''}
                                    onChange={(e) => setEditingResource({ ...editingResource, capacity: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FF9900]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={editingResource.description || ''}
                                    onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#FF9900]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 text-neutral-950 font-bold rounded-xl"
                                >
                                    {saving ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
}
