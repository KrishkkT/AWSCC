'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Layers, Camera, CheckCircle2, XCircle, AlertTriangle, Plus,
    Search, RefreshCw, Sparkles, Shield, User, Clock, ArrowRight,
    Edit2, Trash2, X, Download, FileSpreadsheet
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
    const [downloadingTrackId, setDownloadingTrackId] = useState(null);
    const [downloadingAll, setDownloadingAll] = useState(false);

    // Gate Scanner State
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [scanResult, setScanResult] = useState(null);

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

    const handleDownloadTrackAttendees = async (trackId, trackName, format = 'xlsx') => {
        try {
            setDownloadingTrackId(`${trackId}_${format}`);
            const res = await fetch(`/api/onepass/reports?eventId=${eventId}&type=track_attendees&trackId=${trackId}&format=${format}`);
            if (!res.ok) throw new Error('Failed to export track attendees');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = format === 'xlsx' ? 'xlsx' : 'csv';
            const cleanName = (trackName || 'Track').replace(/[^a-zA-Z0-9_-]/g, '_');
            a.download = `${cleanName}_Attendees_${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error(err);
            alert('Failed to download track attendee file');
        } finally {
            setDownloadingTrackId(null);
        }
    };

    const handleDownloadAllTracks = async (format = 'xlsx') => {
        try {
            setDownloadingAll(true);
            const res = await fetch(`/api/onepass/reports?eventId=${eventId}&type=track_attendees&format=${format}`);
            if (!res.ok) throw new Error('Failed to export all track attendees');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = format === 'xlsx' ? 'xlsx' : 'csv';
            a.download = `All_Tracks_Attendees_Workbook_${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error(err);
            alert('Failed to download all tracks workbook');
        } finally {
            setDownloadingAll(false);
        }
    };

    const lastScanRef = React.useRef({ code: '', time: 0 });

    const handleGateScan = async (qrInput) => {
        const clean = parseScannedQR(qrInput || manualCode);
        if (!clean || !selectedGateTrackId) return;

        const now = Date.now();
        if (evaluating || (lastScanRef.current.code === clean && now - lastScanRef.current.time < 3000)) {
            return;
        }
        lastScanRef.current = { code: clean, time: now };

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
                        Gate security scanning: validates check-in status, manages capacities, and exports per-track attendee rosters.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {tracks.length > 0 && (
                        <button
                            onClick={() => handleDownloadAllTracks('xlsx')}
                            disabled={downloadingAll}
                            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition"
                            title="Download multi-tab Excel file with dedicated sheets for each track"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>{downloadingAll ? 'Exporting...' : 'Download All Tracks Excel'}</span>
                        </button>
                    )}

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
            </div>

            {/* Gate Entrance Selector & Track Manager */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                        1. Select Current Track Entrance
                    </label>
                    <div className="flex items-center gap-3">
                        {currentGateTrack && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleDownloadTrackAttendees(currentGateTrack.id, currentGateTrack.name, 'xlsx')}
                                    disabled={downloadingTrackId === `${currentGateTrack.id}_xlsx`}
                                    className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-mono flex items-center gap-1 transition"
                                    title="Download Excel file of attendees for this track"
                                >
                                    <Download className="w-3 h-3" />
                                    <span>{downloadingTrackId === `${currentGateTrack.id}_xlsx` ? 'Downloading...' : 'Export Excel (.xlsx)'}</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadTrackAttendees(currentGateTrack.id, currentGateTrack.name, 'csv')}
                                    disabled={downloadingTrackId === `${currentGateTrack.id}_csv`}
                                    className="px-2.5 py-1 bg-[#1a2540] hover:bg-[#223050] border border-[#1a2540] text-slate-300 rounded-lg text-[11px] font-mono flex items-center gap-1 transition"
                                    title="Download CSV file of attendees for this track"
                                >
                                    <Download className="w-3 h-3" />
                                    <span>CSV</span>
                                </button>
                            </div>
                        )}
                        <span className="text-[11px] font-mono text-[#4F8EF7]">
                            Gate: {currentGateTrack ? currentGateTrack.name : 'None'}
                        </span>
                    </div>
                </div>

                {tracks.length === 0 ? (
                    <div className="p-8 text-center bg-[#0C111D] rounded-2xl border border-[#1a2540] text-slate-500 text-xs">
                        No tracks created yet. Click <strong>Add New Track</strong> to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {tracks.map((t) => {
                            const isSelected = selectedGateTrackId === t.id;
                            const isDownloadingXlsx = downloadingTrackId === `${t.id}_xlsx`;
                            const isDownloadingCsv = downloadingTrackId === `${t.id}_csv`;

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

                                    <div className="space-y-2 pt-2 border-t border-[#1a2540]/80">
                                        <div className="flex items-center justify-between">
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

                                        {/* Download attendee file for this track */}
                                        <div className="flex items-center gap-1.5 pt-1 border-t border-[#1a2540]/50">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadTrackAttendees(t.id, t.name, 'xlsx');
                                                }}
                                                disabled={isDownloadingXlsx}
                                                className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition"
                                                title="Download Excel spreadsheet of attendees for this track"
                                            >
                                                <FileSpreadsheet className="w-3 h-3" />
                                                <span>{isDownloadingXlsx ? '...' : 'Excel (.xlsx)'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadTrackAttendees(t.id, t.name, 'csv');
                                                }}
                                                disabled={isDownloadingCsv}
                                                className="py-1.5 px-2.5 bg-[#151c2e] hover:bg-[#202b44] text-slate-300 border border-[#1a2540] rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition"
                                                title="Download CSV of attendees for this track"
                                            >
                                                <Download className="w-3 h-3" />
                                                <span>CSV</span>
                                            </button>
                                        </div>
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
                        className="flex items-center space-x-2 px-8 py-4 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition shadow-xl hover:scale-105 cursor-pointer"
                    >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>Open Gate Camera Scanner</span>
                    </button>
                </div>

                {/* Modal QR Scanner Popup */}
                <QRScannerModal
                    isOpen={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={(decoded) => handleGateScan(decoded)}
                    title={`Scan for ${currentGateTrack?.name || 'Gate Access'}`}
                />

                {/* Manual Search & Verification */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleGateScan(manualCode);
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
                            className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || evaluating || !currentGateTrack}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono"
                    >
                        Verify
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className="max-w-md mx-auto p-2 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-1 max-h-56 overflow-y-auto text-left">
                        {searchResults.map((att) => (
                            <button
                                key={att.id}
                                onClick={() => {
                                    handleGateScan(att.booking_id || att.qr_identifier || att.email || att.name);
                                    setSearchResults([]);
                                    setManualCode(att.name || att.booking_id);
                                }}
                                className="w-full text-left p-2.5 hover:bg-[#1a2540] rounded-xl transition flex items-center justify-between text-xs"
                            >
                                <div>
                                    <div className="font-bold text-white">{att.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">{att.email} • {att.booking_id}</div>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[#4F8EF7]">{att.check_in_status}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* SCAN RESULT DISPLAY */}
            {scanResult && (
                <div className="animate-fade-in">
                    {scanResult.already_checked_in || scanResult.code === 'ALREADY_CHECKED_IN' ? (
                        <div className="p-8 bg-amber-950/40 border-2 border-amber-500 rounded-3xl text-center space-y-4 shadow-2xl shadow-amber-500/15">
                            <div className="w-20 h-20 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-amber-400 uppercase">
                                    ⚠️ ALREADY CHECKED IN TO THIS TRACK
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{scanResult.attendee?.name}</h3>
                                <p className="text-xs text-amber-200 font-mono">
                                    Attendee was previously checked in to <strong>{scanResult.track?.name}</strong>
                                    {scanResult.attendee?.check_in_time && ` at ${new Date(scanResult.attendee.check_in_time).toLocaleTimeString()}`}
                                </p>
                            </div>
                            {(scanResult.attendee?.counter || scanResult.attendee?.counter_number) && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                    <span className="text-[10px] font-mono text-amber-300 uppercase">🏷️ Counter:</span>
                                    <span className="text-base font-black text-amber-200">
                                        {scanResult.attendee.counter || `Counter ${scanResult.attendee.counter_number}`}
                                    </span>
                                </div>
                            )}
                            <div className="text-xs text-slate-300 bg-[#0C111D] p-3 rounded-xl border border-amber-500/30 max-w-sm mx-auto font-mono">
                                ✓ Re-verified: Access granted to Track Gate.
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                                Scan logged at {scanResult.timestamp}
                            </div>
                        </div>
                    ) : scanResult.granted ? (
                        <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-4 shadow-2xl shadow-emerald-500/10">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-mono font-bold tracking-widest text-emerald-400 uppercase">
                                    ✓ FIRST-TIME TRACK CHECK-IN &amp; ACCESS GRANTED
                                </div>
                                <h3 className="text-3xl font-extrabold text-white">{scanResult.attendee?.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">
                                    Assigned Track: <strong>{scanResult.track?.name}</strong>
                                </p>
                            </div>
                            {(scanResult.attendee?.counter || scanResult.attendee?.counter_number) && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">🏷️ Counter:</span>
                                    <span className="text-base font-black text-emerald-300">
                                        {scanResult.attendee.counter || `Counter ${scanResult.attendee.counter_number}`}
                                    </span>
                                </div>
                            )}
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


        </div>
    );
}
