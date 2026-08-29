'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
    Camera, CheckCircle2, AlertTriangle, XCircle, Search, User,
    ArrowRight, UserCheck, Layers, BookOpen, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRScannerModal from '@/components/onepass/QRScannerModal';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function AttendeeCheckInDesk() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user, canAccess } = useOnePass();

    // Data State
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [loadingCapacities, setLoadingCapacities] = useState(true);

    // Check-in Selection State
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualSearchQuery, setManualSearchQuery] = useState('');
    const [scannedAttendee, setScannedAttendee] = useState(null);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
    const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

    // Results & Feedback State
    const [checkInSuccess, setCheckInSuccess] = useState(null);
    const [alreadyCheckedInWarning, setAlreadyCheckedInWarning] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load dynamic capacities for tracks and workshops
    const loadCapacities = async () => {
        try {
            const [trkRes, wkRes] = await Promise.all([
                fetch(`/api/onepass/tracks?eventId=${eventId}`),
                fetch(`/api/onepass/workshops?eventId=${eventId}`)
            ]);
            const trkData = await trkRes.json();
            const wkData = await wkRes.json();
            setTracks(trkData.tracks || []);
            setWorkshops(wkData.workshops || []);
        } catch (e) {
            console.error('Error fetching event track capacities:', e);
        } finally {
            setLoadingCapacities(false);
        }
    };

    useEffect(() => {
        loadCapacities();
        const interval = setInterval(loadCapacities, 5000); // 5s auto-sync
        return () => clearInterval(interval);
    }, [eventId]);

    // Handle Scanned QR Code
    const handleQRScan = async (rawQR) => {
        const cleanQR = parseScannedQR(rawQR);
        if (!rawQR) return;

        setScannerOpen(false);
        try {
            // 1. Search endpoint
            const res = await fetch(`/api/onepass/attendees/search?eventId=${eventId}&q=${encodeURIComponent(cleanQR || rawQR)}`);
            const data = await res.json();
            if (data.attendees && data.attendees.length > 0) {
                const attendee = data.attendees[0];
                selectAttendeeForCheckIn(attendee);
                return;
            }

            // 2. Direct QR endpoint fallback
            const directRes = await fetch(`/api/onepass/attendees?eventId=${eventId}&qr=${encodeURIComponent(rawQR)}`);
            const directData = await directRes.json();
            if (directData.found && directData.attendee) {
                selectAttendeeForCheckIn(directData.attendee);
                return;
            }

            alert(`QR Code "${cleanQR || rawQR}" not found for this event. Please verify the booking ID or attendee name.`);
        } catch (err) {
            console.error(err);
            alert('Failed to lookup scanned attendee over network.');
        }
    };

    // Handle Manual Search
    const handleManualSearch = async (e) => {
        e.preventDefault();
        if (!manualSearchQuery.trim()) return;
        setIsSearching(true);
        try {
            const query = manualSearchQuery.trim();
            const res = await fetch(`/api/onepass/attendees/search?eventId=${eventId}&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setSearchResults(data.attendees || []);
            if (data.attendees?.length === 1) {
                selectAttendeeForCheckIn(data.attendees[0]);
                setSearchResults([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectAttendeeForCheckIn = (attendee) => {
        setScannedAttendee(attendee);
        setCheckInSuccess(null);
        setAlreadyCheckedInWarning(null);

        // Pre-select current track or default
        if (attendee.assigned_track_id) {
            setSelectedTrackId(attendee.assigned_track_id);
        } else if (tracks.length > 0) {
            const availableTrack = tracks.find(t => !t.is_full);
            setSelectedTrackId(availableTrack ? availableTrack.id : tracks[0].id);
        }

        if (attendee.assigned_workshop_id) {
            setSelectedWorkshopId(attendee.assigned_workshop_id);
        } else {
            setSelectedWorkshopId('');
        }

        if (attendee.check_in_status === 'CHECKED_IN') {
            setAlreadyCheckedInWarning(attendee);
        }
    };

    const handleConfirmCheckIn = async () => {
        if (!scannedAttendee) return;
        if (!selectedTrackId && tracks.length > 0) {
            alert('Please select an assigned track.');
            return;
        }

        setSubmittingCheckIn(true);
        try {
            const res = await fetch('/api/onepass/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    attendeeId: scannedAttendee.id,
                    trackId: selectedTrackId || null,
                    workshopId: selectedWorkshopId || null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'ALREADY_CHECKED_IN') {
                    setAlreadyCheckedInWarning(data.attendee);
                } else if (data.code === 'TRACK_FULL') {
                    alert(`Selected track is full. Please choose another track.`);
                    loadCapacities();
                } else {
                    alert(data.message || 'Check-in failed');
                }
                return;
            }

            // Check-in Successful! Trigger confetti
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });

            setCheckInSuccess({
                attendee: data.attendee,
                track: data.track,
                workshop: data.workshop
            });
            setAlreadyCheckedInWarning(null);
            loadCapacities();
        } catch (e) {
            console.error(e);
            alert('An unexpected network error occurred.');
        } finally {
            setSubmittingCheckIn(false);
        }
    };

    const resetForNextScan = () => {
        setScannedAttendee(null);
        setCheckInSuccess(null);
        setAlreadyCheckedInWarning(null);
        setManualSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Main Check-in Desk</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Ultra-fast attendee entry station with atomic track seat allocation.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-mono text-emerald-400">Desk Online</span>
                </div>
            </div>

            {/* SCANNER TRIGGER & SEARCH BAR */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl">
                <div className="text-center space-y-3">
                    <button
                        onClick={() => setScannerOpen(true)}
                        className="flex items-center justify-center space-x-3 px-8 py-5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-extrabold text-base rounded-2xl transition shadow-xl shadow-[#0073BB]/25 mx-auto hover:scale-105 active:scale-95"
                    >
                        <Camera className="w-6 h-6 stroke-[2.5]" />
                        <span>Launch Camera QR Scanner</span>
                    </button>
                    <p className="text-xs text-slate-400 font-mono">
                        Instant attendee lookup via device camera or external barcode gun.
                    </p>
                </div>

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-[#1a2540]"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-wider font-mono">
                        or lookup manually
                    </span>
                    <div className="flex-grow border-t border-[#1a2540]"></div>
                </div>

                {/* Manual Search Form */}
                <form onSubmit={handleManualSearch} className="max-w-xl mx-auto flex space-x-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Enter Name, Email, Booking ID, or QR string..."
                            value={manualSearchQuery}
                            onChange={(e) => setManualSearchQuery(e.target.value)}
                            className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || !manualSearchQuery.trim()}
                        className="px-6 py-3 bg-[#1a2540] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono transition"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {/* Multiple Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="max-w-xl mx-auto p-2 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-1">
                        <div className="text-[10px] font-mono text-slate-400 px-3 py-1 uppercase">Select Attendee:</div>
                        {searchResults.map((att) => (
                            <button
                                key={att.id}
                                onClick={() => {
                                    selectAttendeeForCheckIn(att);
                                    setSearchResults([]);
                                }}
                                className="w-full text-left p-3 hover:bg-[#1a2540] rounded-xl transition flex items-center justify-between text-xs"
                            >
                                <div>
                                    <div className="font-semibold text-white">{att.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">{att.email} • {att.ticket_type}</div>
                                </div>
                                <span className="font-mono text-[#4F8EF7] text-xs">{att.qr_identifier}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* STATE 1: CHECK-IN SUCCESS BANNER */}
            {checkInSuccess && (
                <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-6 shadow-2xl shadow-emerald-500/10 animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-sm font-mono font-bold tracking-widest text-emerald-400 uppercase">
                            ✓ Check-In Verified & Admitted
                        </div>
                        <h2 className="text-3xl font-extrabold text-white">{checkInSuccess.attendee?.name}</h2>
                        <p className="text-xs text-slate-300 font-mono">
                            {checkInSuccess.attendee?.booking_id} • {checkInSuccess.attendee?.ticket_type}
                        </p>
                    </div>

                    {/* Assigned Track */}
                    <div className="inline-block p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] max-w-sm w-full mx-auto space-y-1 text-left">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Confirmed Track Allocation</div>
                        <div className="text-base font-bold text-[#4F8EF7]">{checkInSuccess.track?.name || 'General Access'}</div>
                        {checkInSuccess.workshop && (
                            <div className="text-xs text-purple-400 pt-1 border-t border-[#1a2540]">
                                Workshop: <strong>{checkInSuccess.workshop.name}</strong>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center pt-4">
                        <button
                            onClick={resetForNextScan}
                            className="flex items-center space-x-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-500/20"
                        >
                            <span>Ready for Next Attendee</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* STATE 2: ALREADY CHECKED IN WARNING */}
            {alreadyCheckedInWarning && !checkInSuccess && (
                <div className="p-6 bg-amber-950/30 border border-amber-500/40 rounded-3xl space-y-4 animate-fade-in">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Attendee Already Checked In</h2>
                            <p className="text-xs text-amber-300">
                                <strong>{alreadyCheckedInWarning.name}</strong> was already checked in at{' '}
                                {alreadyCheckedInWarning.check_in_time ? new Date(alreadyCheckedInWarning.check_in_time).toLocaleTimeString() : 'an earlier time'}.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] flex items-center justify-between text-xs">
                        <div>
                            <div className="text-slate-400">Assigned Track:</div>
                            <div className="font-bold text-white text-sm">
                                {tracks.find(t => t.id === alreadyCheckedInWarning.assigned_track_id)?.name || 'Unassigned'}
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-mono text-xs border border-emerald-500/30">
                            Verified Entry
                        </span>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={resetForNextScan}
                            className="px-5 py-2.5 bg-[#1a2540] hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl"
                        >
                            Scan Another Attendee
                        </button>
                    </div>
                </div>
            )}

            {/* STATE 3: ATTENDEE SCANNED - READY TO CONFIRM & CHOOSE TRACK */}
            {scannedAttendee && !checkInSuccess && !alreadyCheckedInWarning && (
                <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                        <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#4F8EF7]">Step 2: Assign Track & Complete Check-In</span>
                            <h2 className="text-2xl font-bold text-white">{scannedAttendee.name}</h2>
                            <div className="text-xs text-slate-400 font-mono">
                                {scannedAttendee.email} • {scannedAttendee.phone || 'No phone'} • Booking: {scannedAttendee.booking_id}
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0073BB]/10 text-[#4F8EF7] border border-[#0073BB]/30 self-start">
                            {scannedAttendee.ticket_type}
                        </span>
                    </div>

                    {/* Track Selection with Live Capacities */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                                Select Track Assignment:
                            </label>
                            <span className="text-[10px] font-mono text-slate-500">Live seat occupancy</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {tracks.map((t) => {
                                const isSelected = selectedTrackId === t.id;
                                const isFull = t.is_full;
                                return (
                                    <button
                                        type="button"
                                        key={t.id}
                                        disabled={isFull}
                                        onClick={() => setSelectedTrackId(t.id)}
                                        className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between space-y-3 ${
                                            isFull
                                                ? 'bg-[#0C111D]/40 border-[#1a2540] opacity-40 cursor-not-allowed'
                                                : isSelected
                                                    ? 'bg-[#0073BB]/15 border-[#0073BB] text-white ring-1 ring-[#0073BB] shadow-lg shadow-[#0073BB]/10'
                                                    : 'bg-[#0C111D] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="font-bold text-sm text-white">{t.name}</div>
                                            <div className="text-[11px] text-slate-400 line-clamp-2">{t.description || 'General track sessions'}</div>
                                        </div>

                                        <div className="space-y-1.5 pt-2 border-t border-[#1a2540]/80">
                                            <div className="flex justify-between text-[11px] font-mono">
                                                <span>Capacity:</span>
                                                <span className={isFull ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                                    {t.occupancy} / {t.capacity}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-[#0C111D] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${isFull ? 'bg-red-500' : isSelected ? 'bg-[#0073BB]' : 'bg-slate-600'}`}
                                                    style={{ width: `${Math.min(100, (t.occupancy / t.capacity) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-right font-mono text-slate-500">
                                                {t.remaining} seats left
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Workshop Selection (Optional) */}
                    {workshops.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">
                                Hands-on Workshop Allocation (Optional):
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {workshops.map((w) => {
                                    const isSelected = selectedWorkshopId === w.id;
                                    const isFull = w.is_full;
                                    return (
                                        <button
                                            type="button"
                                            key={w.id}
                                            disabled={isFull}
                                            onClick={() => setSelectedWorkshopId(isSelected ? '' : w.id)}
                                            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                                                isFull
                                                    ? 'bg-[#0C111D]/40 border-[#1a2540] opacity-40 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-purple-950/30 border-purple-500 text-white ring-1 ring-purple-500'
                                                        : 'bg-[#0C111D] hover:bg-[#1a2540] border-[#1a2540] text-slate-300'
                                            }`}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-xs text-white">{w.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{w.speaker ? `Speaker: ${w.speaker}` : w.location}</div>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#151c2e] text-slate-300">
                                                {w.occupancy}/{w.capacity}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action Confirmation Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#1a2540]">
                        <button
                            type="button"
                            onClick={resetForNextScan}
                            className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirmCheckIn}
                            disabled={submittingCheckIn || (!selectedTrackId && tracks.length > 0)}
                            className="flex items-center space-x-2 px-8 py-3.5 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition shadow-xl shadow-[#0073BB]/20 hover:scale-105"
                        >
                            <UserCheck className="w-4 h-4" />
                            <span>{submittingCheckIn ? 'Confirming Entry...' : 'Admit & Assign Track'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* QR Scanner Camera Modal */}
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={(decoded) => handleQRScan(decoded)}
                title="Scan Attendee Check-In QR"
            />
        </div>
    );
}
