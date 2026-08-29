'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    BookOpen, Camera, CheckCircle2, XCircle, Plus, Search,
    RefreshCw, MapPin, Clock, User, Edit2, Trash2, X
} from 'lucide-react';
import QRScannerModal from '@/components/onepass/QRScannerModal';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function WorkshopsPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();
    const isAdmin = user?.role === 'ADMIN';

    const [workshops, setWorkshops] = useState([]);
    const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
    const [loading, setLoading] = useState(true);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    // Create & Edit Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingWorkshop, setEditingWorkshop] = useState(null);
    const [saving, setSaving] = useState(false);

    const [newWorkshop, setNewWorkshop] = useState({
        name: '',
        speaker: '',
        location: '',
        start_time: '11:00',
        end_time: '13:00',
        capacity: 100,
        description: ''
    });

    const fetchWorkshops = async () => {
        try {
            const res = await fetch(`/api/onepass/workshops?eventId=${eventId}`);
            const data = await res.json();
            const list = data.workshops || [];
            setWorkshops(list);
            if (list.length > 0 && !selectedWorkshopId) {
                setSelectedWorkshopId(list[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkshops();
    }, [eventId]);

    const handleWorkshopScan = async (qrInput) => {
        const clean = parseScannedQR(qrInput || manualCode);
        if (!clean || !selectedWorkshopId) return;

        setEvaluating(true);
        setScanResult(null);

        try {
            const res = await fetch('/api/onepass/workshops/access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    qrToken: clean,
                    workshopId: selectedWorkshopId
                })
            });

            const data = await res.json();
            setScanResult({
                ...data,
                scanned_code: clean,
                timestamp: new Date().toLocaleTimeString()
            });
            fetchWorkshops();
        } catch (e) {
            setScanResult({
                granted: false,
                code: 'NETWORK_ERROR',
                message: 'Failed to verify workshop access.'
            });
        } finally {
            setEvaluating(false);
            setScannerOpen(false);
        }
    };

    const handleCreateWorkshop = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/workshops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newWorkshop
                })
            });
            if (res.ok) {
                setCreateModalOpen(false);
                setNewWorkshop({ name: '', speaker: '', location: '', start_time: '11:00', end_time: '13:00', capacity: 100, description: '' });
                fetchWorkshops();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateWorkshop = async (e) => {
        e.preventDefault();
        if (!editingWorkshop) return;
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/workshops', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingWorkshop.id,
                    name: editingWorkshop.name,
                    speaker: editingWorkshop.speaker,
                    location: editingWorkshop.location,
                    start_time: editingWorkshop.start_time,
                    end_time: editingWorkshop.end_time,
                    capacity: editingWorkshop.capacity,
                    description: editingWorkshop.description
                })
            });
            if (res.ok) {
                setEditModalOpen(false);
                setEditingWorkshop(null);
                fetchWorkshops();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWorkshop = async (workshopId, workshopName) => {
        if (!confirm(`Are you sure you want to delete workshop "${workshopName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/workshops?id=${workshopId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                if (selectedWorkshopId === workshopId) {
                    setSelectedWorkshopId('');
                }
                fetchWorkshops();
            } else {
                alert(data.error || 'Failed to delete workshop');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const currentWk = workshops.find(w => w.id === selectedWorkshopId);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Workshops Access Gate</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Scan attendees at workshop entrances to enforce seating capacity and eligibility.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Workshop</span>
                    </button>
                )}
            </div>

            {/* Workshop Selector & Management Grid */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                        Select Workshop Room / Session
                    </label>
                    <span className="text-[11px] font-mono text-purple-400">
                        {currentWk ? currentWk.name : 'None Selected'}
                    </span>
                </div>

                {workshops.length === 0 ? (
                    <div className="p-8 text-center bg-[#0C111D] rounded-2xl border border-[#1a2540] text-slate-500 text-xs">
                        No workshops created yet. Click <strong>Add Workshop</strong> to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {workshops.map((w) => {
                            const isSelected = selectedWorkshopId === w.id;
                            return (
                                <div
                                    key={w.id}
                                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                                        isSelected
                                            ? 'bg-purple-950/20 border-purple-500 text-white ring-1 ring-purple-500 shadow-lg shadow-purple-500/10'
                                            : 'bg-[#0C111D] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedWorkshopId(w.id);
                                            setScanResult(null);
                                        }}
                                        className="text-left w-full space-y-1"
                                    >
                                        <div className="font-bold text-sm text-white">{w.name}</div>
                                        <div className="text-[11px] text-slate-400 line-clamp-2">{w.description || 'Hands-on lab session'}</div>
                                    </button>

                                    <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]/80">
                                        <div className="text-[10px] font-mono text-slate-400">
                                            {w.speaker ? `Speaker: ${w.speaker}` : ''} • {w.occupancy}/{w.capacity} seats
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingWorkshop(w);
                                                        setEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Edit Workshop"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteWorkshop(w.id, w.name);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151c2e] transition"
                                                    title="Delete Workshop"
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

            {/* Scanner Action Box */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl text-center">
                <h2 className="text-xl font-bold text-white">
                    Scan for {currentWk?.name || 'Workshop Access'}
                </h2>

                <div className="flex justify-center">
                    <button
                        onClick={() => setScannerOpen(true)}
                        disabled={!currentWk}
                        className="flex items-center space-x-2 px-8 py-4 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-neutral-950 font-extrabold text-sm rounded-2xl transition shadow-xl shadow-purple-500/20 hover:scale-105"
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>Open Workshop Camera Scanner</span>
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleWorkshopScan(manualCode);
                    }}
                    className="max-w-md mx-auto flex space-x-2 pt-2"
                >
                    <input
                        type="text"
                        placeholder="Scan or enter QR Code..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="flex-1 bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || evaluating || !currentWk}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono"
                    >
                        Verify
                    </button>
                </form>
            </div>

            {/* Scan Feedback */}
            {scanResult && (
                <div className="animate-fade-in">
                    {scanResult.granted ? (
                        <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-4 shadow-2xl">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-emerald-400 uppercase">
                                    ✓ WORKSHOP ACCESS GRANTED
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{scanResult.attendee?.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">{scanResult.workshop?.name}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 bg-red-950/40 border-2 border-red-500 rounded-3xl text-center space-y-4 shadow-2xl">
                            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-red-400 uppercase">
                                    ✕ ACCESS DENIED
                                </div>
                                <h3 className="text-2xl font-bold text-white">{scanResult.attendee?.name || 'Invalid QR'}</h3>
                                <p className="text-sm text-red-300 font-semibold">{scanResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Workshop Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Create Workshop</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateWorkshop} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Workshop Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newWorkshop.name}
                                    onChange={(e) => setNewWorkshop({ ...newWorkshop, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Speaker</label>
                                    <input
                                        type="text"
                                        value={newWorkshop.speaker}
                                        onChange={(e) => setNewWorkshop({ ...newWorkshop, speaker: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Capacity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newWorkshop.capacity}
                                        onChange={(e) => setNewWorkshop({ ...newWorkshop, capacity: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Location / Room</label>
                                <input
                                    type="text"
                                    value={newWorkshop.location}
                                    onChange={(e) => setNewWorkshop({ ...newWorkshop, location: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
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
                                    className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-neutral-950 font-bold rounded-xl"
                                >
                                    {saving ? 'Saving...' : 'Save Workshop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Workshop Modal */}
            {editModalOpen && editingWorkshop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Edit Workshop</h2>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateWorkshop} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Workshop Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingWorkshop.name}
                                    onChange={(e) => setEditingWorkshop({ ...editingWorkshop, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Speaker</label>
                                    <input
                                        type="text"
                                        value={editingWorkshop.speaker || ''}
                                        onChange={(e) => setEditingWorkshop({ ...editingWorkshop, speaker: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Capacity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editingWorkshop.capacity}
                                        onChange={(e) => setEditingWorkshop({ ...editingWorkshop, capacity: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Location / Room</label>
                                <input
                                    type="text"
                                    value={editingWorkshop.location || ''}
                                    onChange={(e) => setEditingWorkshop({ ...editingWorkshop, location: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500"
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
                                    className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-neutral-950 font-bold rounded-xl"
                                >
                                    {saving ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={(decoded) => handleWorkshopScan(decoded)}
                title={`Scan for ${currentWk?.name || 'Workshop Access'}`}
            />
        </div>
    );
}
