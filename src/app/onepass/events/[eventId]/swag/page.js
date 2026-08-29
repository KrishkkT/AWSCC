'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Award, Camera, CheckCircle2, AlertTriangle, XCircle, Plus,
    RefreshCw, Sparkles, Package, Gift, Edit2, Trash2, X
} from 'lucide-react';
import QRScannerModal from '@/components/onepass/QRScannerModal';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function SwagManagementPage() {
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

    // Create & Edit Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [saving, setSaving] = useState(false);

    const [newResource, setNewResource] = useState({
        name: '',
        type: 'SWAG',
        description: '',
        capacity: 400
    });

    const fetchSwagResources = async () => {
        try {
            const res = await fetch(`/api/onepass/resources?eventId=${eventId}&type=SWAG`);
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
        fetchSwagResources();
    }, [eventId]);

    const handleClaimScan = async (qrInput) => {
        const clean = parseScannedQR(qrInput || manualCode);
        if (!clean || !selectedResourceId) return;

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
            fetchSwagResources();
        } catch (e) {
            setClaimResult({
                success: false,
                code: 'NETWORK_ERROR',
                message: 'Failed to process swag claim.'
            });
        } finally {
            setClaiming(false);
            setScannerOpen(false);
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
                setNewResource({ name: '', type: 'SWAG', description: '', capacity: 400 });
                fetchSwagResources();
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
                    capacity: editingResource.capacity
                })
            });
            if (res.ok) {
                setEditModalOpen(false);
                setEditingResource(null);
                fetchSwagResources();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteResource = async (resourceId, resourceName) => {
        if (!confirm(`Are you sure you want to delete swag resource "${resourceName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/resources?id=${resourceId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                if (selectedResourceId === resourceId) {
                    setSelectedResourceId('');
                }
                fetchSwagResources();
            } else {
                alert(data.error || 'Failed to delete swag item');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const currentResource = resources.find(r => r.id === selectedResourceId);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Swag Kit Distribution</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        1-Click Swag claim scanner. Prevents attendees from claiming multiple kits.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Swag Item</span>
                    </button>
                )}
            </div>

            {/* Swag Item Cards & Management */}
            {resources.length === 0 ? (
                <div className="p-8 text-center bg-[#151c2e] rounded-3xl border border-[#1a2540] text-slate-500 text-xs">
                    No swag items created yet. Click <strong>Add Swag Item</strong> to define goodies and merchandise.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {resources.map((r) => {
                        const isSelected = selectedResourceId === r.id;
                        const pct = r.capacity ? Math.round((r.claims_count / r.capacity) * 100) : 0;
                        return (
                            <div
                                key={r.id}
                                className={`p-6 rounded-3xl border transition flex flex-col justify-between space-y-4 ${
                                    isSelected
                                        ? 'bg-emerald-950/20 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-xl shadow-emerald-500/10'
                                        : 'bg-[#151c2e] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
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
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-base text-white">{r.name}</span>
                                        <Gift className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2">{r.description || 'Swag kit package'}</p>
                                </button>

                                <div className="space-y-2 pt-2 border-t border-[#1a2540]">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-slate-400">Claimed:</span>
                                        <span className="text-emerald-400 font-bold">{r.claims_count || 0} / {r.capacity || '∞'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#0C111D] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                                        <span>{r.remaining} remaining</span>

                                        {isAdmin && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingResource(r);
                                                        setEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0C111D] transition"
                                                    title="Edit Swag"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteResource(r.id, r.name);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#0C111D] transition"
                                                    title="Delete Swag"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Scanner Station */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl text-center">
                <h2 className="text-xl font-bold text-white">
                    Scan for {currentResource?.name || 'Swag Kit'}
                </h2>

                <div className="flex justify-center">
                    <button
                        onClick={() => setScannerOpen(true)}
                        disabled={!currentResource}
                        className="flex items-center space-x-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-extrabold text-sm rounded-2xl transition shadow-xl shadow-emerald-500/20 hover:scale-105"
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>Open Swag Camera Scanner</span>
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleClaimScan(manualCode);
                    }}
                    className="max-w-md mx-auto flex space-x-2 pt-2"
                >
                    <input
                        type="text"
                        placeholder="Scan or enter QR Code..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="flex-1 bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
                    />
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || claiming || !currentResource}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono"
                    >
                        Claim
                    </button>
                </form>
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
                                    ✓ SWAG CLAIMED
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{claimResult.attendee?.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">{claimResult.resource?.name}</p>
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
                                    Swag was already issued to this attendee at{' '}
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

            {/* Create Swag Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Create Swag Resource</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Swag Item Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Delegate Goodie Bag"
                                    value={newResource.name}
                                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Total Quantity / Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newResource.capacity}
                                    onChange={(e) => setNewResource({ ...newResource, capacity: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={newResource.description}
                                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
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
                                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl"
                                >
                                    {saving ? 'Saving...' : 'Save Swag Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Swag Modal */}
            {editModalOpen && editingResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Edit Swag Resource</h2>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateResource} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Swag Item Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingResource.name}
                                    onChange={(e) => setEditingResource({ ...editingResource, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Total Quantity / Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingResource.capacity || ''}
                                    onChange={(e) => setEditingResource({ ...editingResource, capacity: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Description</label>
                                <textarea
                                    rows={2}
                                    value={editingResource.description || ''}
                                    onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
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
                                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl"
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
                onScan={(decoded) => handleClaimScan(decoded)}
                title={`Scan for ${currentResource?.name || 'Swag Kit'}`}
            />
        </div>
    );
}
