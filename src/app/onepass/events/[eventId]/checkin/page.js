'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
    Camera, CheckCircle2, AlertTriangle, XCircle, Search, User,
    ArrowRight, UserCheck, Layers, BookOpen, Sparkles, RefreshCw, AlertCircle,
    Check, Flame, Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import InlineQRScanner from '@/components/onepass/InlineQRScanner';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function AttendeeCheckInDesk() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user, canAccess } = useOnePass();

    // Data State
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [counterList, setCounterList] = useState([]);
    const [activeStation, setActiveStation] = useState('');
    const [loadingCapacities, setLoadingCapacities] = useState(true);

    // Filter tab for session picker: 'ALL' | 'TRACK' | 'WORKSHOP'
    const [sessionFilter, setSessionFilter] = useState('ALL');

    // Check-in Selection State (Unified 1-choice session)
    // selectedSession: { id: string, type: 'TRACK' | 'WORKSHOP', name: string } | null
    const [selectedSession, setSelectedSession] = useState(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualSearchQuery, setManualSearchQuery] = useState('');
    const [scannedAttendee, setScannedAttendee] = useState(null);
    const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

    // Results & Feedback State
    const [checkInSuccess, setCheckInSuccess] = useState(null);
    const [alreadyCheckedInWarning, setAlreadyCheckedInWarning] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load active station from localStorage
    useEffect(() => {
        if (!eventId) return;
        const saved = localStorage.getItem(`onepass_station_${eventId}`);
        if (saved) setActiveStation(saved);
    }, [eventId]);

    const handleStationChange = (station) => {
        setActiveStation(station);
        if (eventId) {
            if (station) {
                localStorage.setItem(`onepass_station_${eventId}`, station);
            } else {
                localStorage.removeItem(`onepass_station_${eventId}`);
            }
        }
    };

    // Load dynamic capacities for tracks, workshops, and counters
    const loadCapacities = async () => {
        try {
            const [trkRes, wkRes, ctrRes] = await Promise.all([
                fetch(`/api/onepass/tracks?eventId=${eventId}`),
                fetch(`/api/onepass/workshops?eventId=${eventId}`),
                fetch(`/api/onepass/attendees/counters?eventId=${eventId}`)
            ]);
            const trkData = await trkRes.json();
            const wkData = await wkRes.json();
            const ctrData = await ctrRes.json();
            setTracks(trkData.tracks || []);
            setWorkshops(wkData.workshops || []);
            if (Array.isArray(ctrData.stats)) {
                setCounterList(ctrData.stats);
            } else if (ctrData.stats?.counters) {
                setCounterList(ctrData.stats.counters);
            }
        } catch (e) {
            console.error('Error fetching event track capacities:', e);
        } finally {
            setLoadingCapacities(false);
        }
    };

    useEffect(() => {
        loadCapacities();
        const interval = setInterval(loadCapacities, 6000); // 6s auto-sync
        return () => clearInterval(interval);
    }, [eventId]);

    // Check if attendee is Workshop ticket holder
    const isWorkshopAttendee = (att) => {
        if (!att) return false;
        const cat = (att.counter_category || '').toLowerCase();
        const tType = (att.ticket_type || '').toLowerCase();
        return cat.includes('workshop') || tType.includes('workshop') || tType.includes('hands-on') || tType.includes('lab');
    };

    // Handle Scanned/Selected Attendee: Check if already checked in or prompt for session choice
    const handleScanOrSelectAttendee = (attendee) => {
        if (!attendee) return;

        // If attendee is already checked in, display warning with counter location
        if (attendee.check_in_status === 'CHECKED_IN') {
            setAlreadyCheckedInWarning(attendee);
            setScannedAttendee(null);
            setCheckInSuccess(null);
            return;
        }

        // Unchecked-in attendee -> Open Session Choice Prompt
        setScannedAttendee(attendee);
        setAlreadyCheckedInWarning(null);
        setCheckInSuccess(null);
    };

    // Confirm Check-In with selected Track or Workshop
    const handleConfirmCheckInSession = async (sessionId, sessionType) => {
        if (!scannedAttendee) return;
        setSubmittingCheckIn(true);
        try {
            const isWs = sessionType === 'WORKSHOP';
            const res = await fetch('/api/onepass/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    attendeeId: scannedAttendee.id,
                    trackId: !isWs ? sessionId : null,
                    workshopId: isWs ? sessionId : null,
                    sessionType: isWs ? 'WORKSHOP' : 'TRACK'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'ALREADY_CHECKED_IN') {
                    setAlreadyCheckedInWarning(data.attendee || scannedAttendee);
                    setCheckInSuccess(null);
                    setScannedAttendee(null);
                } else {
                    alert(data.message || 'Check-in failed');
                }
                return;
            }

            // Trigger celebration confetti
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });

            setCheckInSuccess({
                attendee: data.attendee || scannedAttendee,
                track: data.track,
                workshop: data.workshop,
                session_choice: data.session_choice
            });
            setAlreadyCheckedInWarning(null);
            setScannedAttendee(null);
            loadCapacities();
        } catch (err) {
            console.error(err);
            alert('Failed to connect to check-in server');
        } finally {
            setSubmittingCheckIn(false);
        }
    };

    const lastScanRef = React.useRef({ code: '', time: 0 });

    // Handle Scanned QR Code - Lookup & Prompt for Session
    const handleQRScan = async (rawQR) => {
        const cleanQR = parseScannedQR(rawQR);
        if (!rawQR) return;

        const now = Date.now();
        const codeKey = cleanQR || rawQR;
        if (submittingCheckIn || (lastScanRef.current.code === codeKey && now - lastScanRef.current.time < 3000)) {
            return;
        }
        lastScanRef.current = { code: codeKey, time: now };

        setScannerOpen(false);
        try {
            // 1. Search endpoint
            const res = await fetch(`/api/onepass/attendees/search?eventId=${eventId}&q=${encodeURIComponent(cleanQR || rawQR)}`);
            const data = await res.json();
            if (data.attendees && data.attendees.length > 0) {
                handleScanOrSelectAttendee(data.attendees[0]);
                return;
            }

            // 2. Direct QR endpoint fallback
            const directRes = await fetch(`/api/onepass/attendees?eventId=${eventId}&qr=${encodeURIComponent(rawQR)}`);
            const directData = await directRes.json();
            if (directData.found && directData.attendee) {
                handleScanOrSelectAttendee(directData.attendee);
                return;
            }

            alert(`QR Code "${cleanQR || rawQR}" not found for this event.`);
        } catch (err) {
            console.error(err);
            alert('Failed to lookup scanned attendee over network.');
        }
    };

    // Live debounced search as user types
    useEffect(() => {
        if (!manualSearchQuery || manualSearchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const query = manualSearchQuery.trim();
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
    }, [manualSearchQuery, eventId]);

    // Handle Manual Search Submit
    const handleManualSearch = async (e) => {
        if (e) e.preventDefault();
        if (!manualSearchQuery.trim()) return;
        setIsSearching(true);
        try {
            const query = manualSearchQuery.trim();
            const res = await fetch(`/api/onepass/attendees/search?eventId=${eventId}&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const results = data.attendees || [];
            setSearchResults(results);
            if (results.length === 1) {
                handleScanOrSelectAttendee(results[0]);
                setSearchResults([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectAttendeeForCheckIn = (attendee) => {
        handleScanOrSelectAttendee(attendee);
    };

    const handleConfirmCheckIn = async () => {
        if (!scannedAttendee) return;
        instantCheckInAttendee(scannedAttendee, selectedSession?.id || null);
    };

    const handleUncheckIn = async (attendeeToUncheck) => {
        const att = attendeeToUncheck || alreadyCheckedInWarning;
        if (!att) return;
        if (!confirm(`Are you sure you want to revert check-in for "${att.name}"? This will release their allocated seat.`)) return;

        setSubmittingCheckIn(true);
        try {
            const res = await fetch('/api/onepass/checkin/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    attendeeId: att.id || att.booking_id || att.qr_identifier
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAlreadyCheckedInWarning(null);
                selectAttendeeForCheckIn(data.attendee);
                loadCapacities();
            } else {
                alert(data.error || data.message || 'Failed to uncheck-in attendee');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to communicate with check-in server.');
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
        setSelectedSession(null);
    };

    const activeAttendee = checkInSuccess?.attendee || scannedAttendee || alreadyCheckedInWarning;
    const isWorkshop = isWorkshopAttendee(activeAttendee);
    const isDeskMatch = Boolean(activeAttendee && activeStation && activeAttendee.counter && activeStation.toLowerCase() === activeAttendee.counter.toLowerCase());
    const isDeskMismatch = Boolean(activeAttendee && activeStation && activeAttendee.counter && activeStation.toLowerCase() !== activeAttendee.counter.toLowerCase());

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Check-In Desk (6 Volunteers)</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Scan QR &rarr; Instant Check-In &rarr; Hand badge from Counter Box.
                    </p>
                </div>

                <div className="flex items-center space-x-3 flex-wrap gap-2">
                    {/* Active Station Selector */}
                    <div className="flex items-center space-x-2 bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-1.5">
                        <span className="text-xs text-slate-400 font-mono">📍 Your Station:</span>
                        <select
                            value={activeStation}
                            onChange={(e) => handleStationChange(e.target.value)}
                            className="bg-transparent text-xs font-bold text-[#4F8EF7] font-mono outline-none cursor-pointer"
                        >
                            <option value="" className="bg-[#0C111D] text-slate-300">All Desks / Roaming</option>
                            {counterList.map(c => (
                                <option key={c.counter} value={c.counter} className="bg-[#0C111D] text-white">
                                    {c.counter} ({c.count} badges)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-semibold">Online</span>
                    </div>
                </div>
            </div>

            {/* SCANNER TRIGGER & SEARCH BAR */}
            <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-5 shadow-2xl">
                <div className="text-center space-y-3">
                    <button
                        onClick={() => setScannerOpen(!scannerOpen)}
                        className={`flex items-center justify-center space-x-3 px-8 py-5 ${scannerOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0073BB] hover:bg-[#0073BB]/90'} text-white font-extrabold text-base rounded-2xl transition shadow-xl mx-auto hover:scale-105 active:scale-95`}
                    >
                        <Camera className="w-6 h-6 stroke-[2.5]" />
                        <span>{scannerOpen ? 'Close Camera Scanner' : 'Launch Camera QR Scanner'}</span>
                    </button>
                    <p className="text-xs text-slate-400 font-mono">
                        Scan attendee ticket QR from KonfHub confirmation email / pass
                    </p>
                </div>

                {/* Inline QR Scanner - expands right here below button (no popup modal) */}
                {scannerOpen && (
                    <div className="max-w-md mx-auto">
                        <InlineQRScanner
                            isOpen={scannerOpen}
                            onClose={() => setScannerOpen(false)}
                            onScan={(decoded) => { setScannerOpen(false); handleQRScan(decoded); }}
                            title="Scan Attendee Check-In QR"
                        />
                    </div>
                )}

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-[#1a2540]"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-wider font-mono">
                        or search by name / booking id
                    </span>
                    <div className="flex-grow border-t border-[#1a2540]"></div>
                </div>

                {/* Manual Search Form */}
                <form onSubmit={handleManualSearch} className="max-w-xl mx-auto flex space-x-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={manualSearchQuery}
                            onChange={(e) => setManualSearchQuery(e.target.value)}
                            placeholder="Type attendee name, booking ID, or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-[#0C111D] border border-[#1a2540] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#0073BB]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#1a2540]/80 text-white font-semibold text-xs rounded-xl transition"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="max-w-xl mx-auto p-2 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-1 max-h-60 overflow-y-auto">
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
                                    <div className="font-bold text-white">{att.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                        {att.email} • {att.ticket_type} {att.counter ? `• 🏷️ ${att.counter}` : ''}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-[#4F8EF7] text-xs">{att.counter || att.booking_id}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* STATE 1: CHECK-IN SUCCESS BANNER */}
            {checkInSuccess && (
                <div className="p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl text-center space-y-6 shadow-2xl shadow-emerald-500/15 animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                            ✓ CHECK-IN VERIFIED &amp; ADMITTED
                        </div>
                        <h2 className="text-3xl font-black text-white">{checkInSuccess.attendee?.name}</h2>
                        <p className="text-xs text-slate-300 font-mono">
                            Booking ID: {checkInSuccess.attendee?.booking_id} • {checkInSuccess.attendee?.ticket_type}
                        </p>
                    </div>

                    {/* HERO ASSIGNED TRACK / WORKSHOP LOCATION BOX */}
                    <div className="p-6 bg-[#0C111D] rounded-2xl border-2 border-[#0073BB] max-w-md w-full mx-auto space-y-3 text-center shadow-xl">
                        <div className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                            📍 ASSIGNED TRACK / WORKSHOP
                        </div>
                        <div className="text-3xl font-black text-amber-400 tracking-tight">
                            {checkInSuccess.workshop?.name ||
                             checkInSuccess.track?.name ||
                             checkInSuccess.session_choice?.name ||
                             checkInSuccess.attendee?.assigned_workshop ||
                             checkInSuccess.attendee?.workshop_name ||
                             checkInSuccess.attendee?.assigned_track ||
                             checkInSuccess.attendee?.track_name ||
                             checkInSuccess.attendee?.ticket_type ||
                             'MAIN SESSION'}
                        </div>

                        {/* Counter Number — always shown */}
                        <div className="pt-3 border-t border-[#1a2540] space-y-1">
                            {(checkInSuccess.attendee?.counter || checkInSuccess.attendee?.counter_number) ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="px-4 py-2 bg-[#0073BB]/20 border border-[#0073BB]/50 rounded-xl text-center">
                                        <div className="text-[10px] font-mono text-slate-400 uppercase">🏷️ Badge Counter</div>
                                        <div className="text-xl font-black text-[#4F8EF7]">
                                            {checkInSuccess.attendee.counter || `Counter ${checkInSuccess.attendee.counter_number}`}
                                        </div>
                                        {checkInSuccess.attendee.counter_number && (
                                            <div className="text-[10px] font-mono text-slate-400">Box #{checkInSuccess.attendee.counter_number}</div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                            <p className="text-xs text-slate-400 font-medium">
                                {checkInSuccess.attendee?.counter
                                    ? `Grab badge from counter box and hand it over.`
                                    : 'Grab attendee badge and hand it over.'}
                            </p>
                        </div>
                        
                        {/* Workshop Confirmation if Applicable */}
                        {checkInSuccess.workshop && (
                            <div className="pt-2 border-t border-[#1a2540] text-xs font-mono text-purple-300">
                                Workshop Room: <strong className="text-white font-bold">{checkInSuccess.workshop.name}</strong>
                            </div>
                        )}
                    </div>

                    {/* Workshop Selection Switcher (Only if Workshop attendee) */}
                    {isWorkshopAttendee(checkInSuccess.attendee) && workshops.length > 0 && (
                        <div className="max-w-md mx-auto p-4 bg-[#0C111D]/80 border border-purple-500/30 rounded-2xl text-left space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-purple-400 uppercase flex items-center gap-1.5">
                                    <BookOpen size={14} /> Workshop Track Room:
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">Tap to switch room</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {workshops.map(w => {
                                    const isCurrent = checkInSuccess.workshop?.id === w.id || checkInSuccess.attendee?.assigned_workshop_id === w.id;
                                    const currentOccupancy = w.occupancy || w.attendee_count || 0;
                                    const capacity = w.capacity || 30;
                                    const isFull = currentOccupancy >= capacity && !isCurrent;

                                    return (
                                        <button
                                            key={w.id}
                                            disabled={isFull || submittingCheckIn}
                                            onClick={() => instantCheckInAttendee(checkInSuccess.attendee, w.id)}
                                            className={`p-3 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                                                isCurrent
                                                    ? 'bg-purple-600/30 border-purple-400 text-white font-bold ring-1 ring-purple-400'
                                                    : isFull
                                                        ? 'bg-neutral-900 border-neutral-800 opacity-40 cursor-not-allowed text-slate-500'
                                                        : 'bg-[#151c2e] hover:bg-purple-950/40 border-[#1a2540] hover:border-purple-500/40 text-slate-300'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <div className="text-white font-bold">{w.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{w.venue || 'Lab Room'}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                isCurrent ? 'bg-purple-500 text-white' : isFull ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300'
                                            }`}>
                                                {isCurrent ? 'ASSIGNED' : `${currentOccupancy}/${capacity} Seats`}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-center pt-2">
                        <button
                            onClick={resetForNextScan}
                            className="flex items-center space-x-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-sm font-black transition shadow-lg shadow-emerald-500/20"
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

                    {/* HERO ASSIGNED TRACK / WORKSHOP LOCATION */}
                    <div className="p-5 bg-[#0C111D] rounded-2xl border border-[#1a2540] text-center space-y-2">
                        <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                            📍 ASSIGNED TRACK / WORKSHOP:
                        </div>
                        <div className="text-2xl font-black text-amber-400 tracking-tight">
                            {alreadyCheckedInWarning.workshop_name ||
                             alreadyCheckedInWarning.assigned_workshop ||
                             alreadyCheckedInWarning.track_name ||
                             alreadyCheckedInWarning.assigned_track ||
                             alreadyCheckedInWarning.ticket_type ||
                             'MAIN SESSION'}
                        </div>
                        {(alreadyCheckedInWarning.counter || alreadyCheckedInWarning.counter_number) && (
                            <div className="flex items-center justify-center pt-2 border-t border-[#1a2540]">
                                <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                                    <div className="text-[10px] font-mono text-slate-400 uppercase">🏷️ Badge Counter</div>
                                    <div className="text-lg font-black text-amber-300">
                                        {alreadyCheckedInWarning.counter || `Counter ${alreadyCheckedInWarning.counter_number}`}
                                    </div>
                                    {alreadyCheckedInWarning.counter_number && (
                                        <div className="text-[10px] font-mono text-slate-500">Box #{alreadyCheckedInWarning.counter_number}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workshop Switcher for Checked-in Workshop Attendee */}
                    {isWorkshopAttendee(alreadyCheckedInWarning) && workshops.length > 0 && (
                        <div className="p-4 bg-[#0C111D] rounded-2xl border border-purple-500/30 space-y-3">
                            <div className="text-xs font-mono font-bold text-purple-400 uppercase">
                                Switch Workshop Room:
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {workshops.map(w => {
                                    const isCurrent = alreadyCheckedInWarning.assigned_workshop_id === w.id;
                                    const currentOccupancy = w.occupancy || w.attendee_count || 0;
                                    const capacity = w.capacity || 30;
                                    const isFull = currentOccupancy >= capacity && !isCurrent;

                                    return (
                                        <button
                                            key={w.id}
                                            disabled={isFull || submittingCheckIn}
                                            onClick={() => instantCheckInAttendee(alreadyCheckedInWarning, w.id)}
                                            className={`p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                                                isCurrent
                                                    ? 'bg-purple-600/30 border-purple-400 text-white font-bold ring-1 ring-purple-400'
                                                    : isFull
                                                        ? 'bg-neutral-900 border-neutral-800 opacity-40 cursor-not-allowed text-slate-500'
                                                        : 'bg-[#151c2e] hover:bg-purple-950/40 border-[#1a2540] text-slate-300'
                                            }`}
                                        >
                                            <div className="text-left font-bold text-white">{w.name}</div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                isCurrent ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300'
                                            }`}>
                                                {isCurrent ? 'CURRENT' : `${currentOccupancy}/${capacity}`}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => handleUncheckIn(alreadyCheckedInWarning)}
                            disabled={submittingCheckIn}
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${submittingCheckIn ? 'animate-spin' : ''}`} />
                            <span>Revert Check-In Status</span>
                        </button>

                        <button
                            type="button"
                            onClick={resetForNextScan}
                            className="w-full sm:w-auto px-5 py-2.5 bg-[#1a2540] hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition"
                        >
                            Scan Another Attendee
                        </button>
                    </div>
                </div>
            )}

            {/* STATE 3: UNIFIED SESSION CHOICE PROMPT (FOR ALL UNCHECKED-IN ATTENDEES) */}
            {scannedAttendee && !checkInSuccess && !alreadyCheckedInWarning && (
                <div className="p-6 bg-[#151c2e] border-2 border-[#0073BB] rounded-3xl space-y-6 shadow-2xl animate-fade-in">
                    {/* Attendee Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1a2540] pb-4 gap-3">
                        <div>
                            <span className="text-[10px] font-mono uppercase bg-[#0073BB]/20 text-[#4F8EF7] px-2.5 py-0.5 rounded-full font-bold border border-[#0073BB]/40">
                                Ready for Check-In
                            </span>
                            <h2 className="text-2xl font-black text-white mt-1">{scannedAttendee.name}</h2>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                {scannedAttendee.email} • {scannedAttendee.ticket_type} • ID: {scannedAttendee.booking_id || scannedAttendee.id}
                            </p>
                        </div>
                        <div className="bg-[#0C111D] border-2 border-[#0073BB] px-5 py-3 rounded-2xl text-center shadow-lg max-w-xs">
                            <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">📍 ASSIGNED ACCESS / TICKET:</div>
                            <div className="text-lg font-black text-amber-400 font-mono leading-tight mt-0.5">
                                {scannedAttendee.workshop_name ||
                                 scannedAttendee.assigned_workshop ||
                                 scannedAttendee.track_name ||
                                 scannedAttendee.assigned_track ||
                                 scannedAttendee.ticket_type ||
                                 'MAIN SESSION'}
                            </div>
                            {scannedAttendee.counter && (
                                <div className="text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-[#1a2540]">
                                    Counter: {scannedAttendee.counter}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <Sparkles size={14} /> Select Track or Workshop to Check-In:
                        </div>

                        {/* Tracks */}
                        {tracks.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                                    <Layers size={12} className="text-[#4F8EF7]" /> Tracks:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {tracks.map(t => {
                                        const currentOccupancy = t.occupancy || t.attendee_count || 0;
                                        const capacity = t.capacity || 150;
                                        const isFull = currentOccupancy >= capacity;

                                        return (
                                            <button
                                                key={t.id}
                                                disabled={isFull || submittingCheckIn}
                                                onClick={() => handleConfirmCheckInSession(t.id, 'TRACK')}
                                                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                                                    isFull
                                                        ? 'bg-neutral-900 border-neutral-800 opacity-40 cursor-not-allowed text-slate-500'
                                                        : 'bg-[#0C111D] hover:bg-[#0073BB]/20 border-[#1a2540] hover:border-[#0073BB] text-white hover:scale-[1.01]'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-bold text-sm text-white">{t.name}</div>
                                                    <div className="text-[11px] text-slate-400 line-clamp-1">{t.description || 'Track Session'}</div>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold ${
                                                    isFull ? 'bg-red-500/20 text-red-400' : 'bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/30'
                                                }`}>
                                                    {isFull ? 'FULL' : `${currentOccupancy}/${capacity}`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Workshops */}
                        {workshops.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                                    <BookOpen size={12} className="text-purple-400" /> Workshops &amp; Hands-On Labs:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {workshops.map(w => {
                                        const currentOccupancy = w.occupancy || w.attendee_count || 0;
                                        const capacity = w.capacity || 30;
                                        const isFull = currentOccupancy >= capacity;

                                        return (
                                            <button
                                                key={w.id}
                                                disabled={isFull || submittingCheckIn}
                                                onClick={() => handleConfirmCheckInSession(w.id, 'WORKSHOP')}
                                                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                                                    isFull
                                                        ? 'bg-neutral-900 border-neutral-800 opacity-40 cursor-not-allowed text-slate-500'
                                                        : 'bg-[#0C111D] hover:bg-purple-950/40 border-[#1a2540] hover:border-purple-500 text-white hover:scale-[1.01]'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-bold text-sm text-white">{w.name}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono line-clamp-1">{w.venue || 'Lab Room'} {w.speaker ? `• ${w.speaker}` : ''}</div>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold ${
                                                    isFull ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                }`}>
                                                    {isFull ? 'FULL' : `${currentOccupancy}/${capacity}`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {tracks.length === 0 && workshops.length === 0 && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center text-xs text-amber-300">
                                No Tracks or Workshops currently available for selection.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#1a2540]">
                        <button
                            type="button"
                            onClick={resetForNextScan}
                            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition"
                        >
                            Cancel / Scan Different Ticket
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}
