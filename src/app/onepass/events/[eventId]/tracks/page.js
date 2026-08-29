'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Layers, Camera, CheckCircle2, XCircle, AlertTriangle, Plus,
    Search, RefreshCw, Sparkles, Shield, User, Clock, ArrowRight,
    Edit2, Trash2, X
} from 'lucide-react';
import QRScannerModal from '@/components/onepass/QRScannerModal';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function TracksAndGateAccessPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();
    const isAdmin = user?.role === 'ADMIN';

    const [tracks, setTracks] = useState([]);
    const [selectedGateTrackId, setSelectedGateTrackId] = useState('');
    const [loading, setLoading] = useState(true);

    // Gate Scanner State
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    // Track Create & Edit Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newTrack, setNewTrack] = useState({ name: '', description: '', capacity: 150 });
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTrack, setEditingTrack] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchTracks = async () => {
        try {
            const res = await fetch(`/api/onepass/tracks?eventId=${eventId}`);
            const data = await res.json();
            const list = data.tracks || [];
            setTracks(list);
            if (list.length > 0 && !selectedGateTrackId) {
                setSelectedGateTrackId(list[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTracks();
    }, [eventId]);

    const handleGateScan = async (qrInput) => {
        const clean = parseScannedQR(qrInput || manualCode);
        if (!clean || !selectedGateTrackId) return;

        setEvaluating(true);
        setScanResult(null);

        try {
            const res = await fetch('/api/onepass/tracks/access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    qrToken: clean,
                    trackId: selectedGateTrackId
                })
            });

            const data = await res.json();
            setScanResult({
                ...data,
                scanned_code: clean,
                timestamp: new Date().toLocaleTimeString()
            });
            fetchTracks();
        } catch (e) {
            setScanResult({
                granted: false,
                code: 'NETWORK_ERROR',
                message: 'Failed to verify gate access over network.'
            });
        } finally {
            setEvaluating(false);
            setScannerOpen(false);
        }
    };

    const handleCreateTrack = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/tracks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newTrack
                })
            });
            if (res.ok) {
                setCreateModalOpen(false);
                setNewTrack({ name: '', description: '', capacity: 150 });
                fetchTracks();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTrack = async (e) => {
        e.preventDefault();
        if (!editingTrack) return;
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/tracks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingTrack.id,
                    eventId,
                    name: editingTrack.name,
                    description: editingTrack.description,
                    capacity: editingTrack.capacity
                })
            });
            if (res.ok) {
                setEditModalOpen(false);
                setEditingTrack(null);
                fetchTracks();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTrack = async (trackId, trackName) => {
        if (!confirm(`Are you sure you want to delete track "${trackName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/tracks?id=${trackId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                if (selectedGateTrackId === trackId) {
                    setSelectedGateTrackId('');
                }
                fetchTracks();
            } else {
                alert(data.error || 'Failed to delete track');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const currentGateTrack = tracks.find(t => t.id === selectedGateTrackId);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Track Access Gate</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Gate security scanning: validates check-in status and prevents access to incorrect tracks.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white rounded-xl text-xs font-semibold shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add New Track</span>
                    </button>
                )}
            </div>

            {/* Gate Entrance Selector & Track Manager */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                        1. Select Current Track Entrance
                    </label>
                    <span className="text-[11px] font-mono text-[#4F8EF7]">
                        Gate: {currentGateTrack ? currentGateTrack.name : 'None'}
                    </span>
                </div>

                {tracks.length === 0 ? (
                    <div className="p-8 text-center bg-[#0C111D] rounded-2xl border border-[#1a2540] text-slate-500 text-xs">
                        No tracks created yet. Click <strong>Add New Track</strong> to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {tracks.map((t) => {
                            const isSelected = selectedGateTrackId === t.id;
                            return (
                                <div
                                    key={t.id}
                                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                                        isSelected
                                            ? 'bg-[#0073BB]/15 border-[#0073BB] text-white ring-1 ring-[#0073BB] shadow-lg shadow-[#0073BB]/10'
                                            : 'bg-[#0C111D] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedGateTrackId(t.id);
                                            setScanResult(null);
                                        }}
                                        className="text-left w-full space-y-1"
                                    >
                                        <div className="font-bold text-sm text-white">{t.name}</div>
                                        <div className="text-[11px] text-slate-400 line-clamp-2">{t.description || 'General track'}</div>
                                    </button>

                                    <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]/80">
                                        <div className="text-[10px] font-mono text-slate-400">
                                            {t.occupancy} / {t.capacity} seats
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingTrack(t);
                                                        setEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Edit Track"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTrack(t.id, t.name);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Delete Track"
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

            {/* Gate Scanner Action Box */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl text-center">
                <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        2. Ready for Attendee Gate Verification
                    </span>
                    <h2 className="text-xl font-bold text-white">
                        Scanning for {currentGateTrack?.name || 'Selected Gate'}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => setScannerOpen(true)}
                        disabled={!currentGateTrack}
                        className="flex items-center space-x-2 px-8 py-4 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition shadow-xl shadow-[#0073BB]/20 hover:scale-105"
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>Open Gate Camera Scanner</span>
                    </button>
                </div>

                {/* Manual QR Fallback */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleGateScan(manualCode);
                    }}
                    className="max-w-md mx-auto flex space-x-2 pt-2"
                >
                    <input
                        type="text"
                        placeholder="Scan or enter QR Code..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="flex-1 bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                    />
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || evaluating || !currentGateTrack}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono"
                    >
                        Verify
                    </button>
                </form>
            </div>

            {/* SCAN RESULT DISPLAY */}
            {scanResult && (
                <div className="animate-fade-in">
                    {scanResult.granted ? (
                        <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-4 shadow-2xl shadow-emerald-500/10">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-emerald-400 uppercase">
                                    ✓ ACCESS GRANTED
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{scanResult.attendee?.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">
                                    Assigned Track: <strong>{scanResult.track?.name}</strong>
                                </p>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                                Gate scan logged at {scanResult.timestamp}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 bg-red-950/40 border-2 border-red-500 rounded-3xl text-center space-y-4 shadow-2xl shadow-red-500/10">
                            <div className="w-20 h-20 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-red-400 uppercase">
                                    ✕ ACCESS DENIED
                                </div>
                                <h3 className="text-2xl font-bold text-white">{scanResult.attendee?.name || 'Unknown QR Code'}</h3>
                                <p className="text-sm text-red-300 font-semibold max-w-md mx-auto">
                                    {scanResult.message}
                                </p>
                            </div>
                            {scanResult.assigned_track && (
                                <div className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540] max-w-xs mx-auto text-xs text-slate-300">
                                    Correct Track: <strong>{scanResult.assigned_track.name}</strong>
                                </div>
                            )}
                            <div className="text-[11px] text-slate-400 font-mono">
                                Denied access attempt logged at {scanResult.timestamp}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Track Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Create New Track</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTrack} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Track Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Track 1: Cloud & AI"
                                    value={newTrack.name}
                                    onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Capacity (Max Seats)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={newTrack.capacity}
                                    onChange={(e) => setNewTrack({ ...newTrack, capacity: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={newTrack.description}
                                    onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
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
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl"
                                >
                                    {saving ? 'Saving...' : 'Save Track'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Track Modal */}
            {editModalOpen && editingTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Edit Track</h2>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTrack} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Track Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingTrack.name}
                                    onChange={(e) => setEditingTrack({ ...editingTrack, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Capacity (Max Seats)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={editingTrack.capacity}
                                    onChange={(e) => setEditingTrack({ ...editingTrack, capacity: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={editingTrack.description || ''}
                                    onChange={(e) => setEditingTrack({ ...editingTrack, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
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
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl"
                                >
                                    {saving ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={(decoded) => handleGateScan(decoded)}
                title={`Scan for ${currentGateTrack?.name || 'Gate Access'}`}
            />
        </div>
    );
}
