'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Ticket, CheckCircle2, MapPin, Calendar, Clock, Download,
    Printer, Share2, Sparkles, AlertCircle, ArrowRight, ShieldCheck,
    Navigation, ExternalLink, RefreshCw, UserCheck
} from 'lucide-react';
import Image from 'next/image';

export default function OnePassAttendeeBadgePage() {
    const params = useParams();
    const eventId = params?.eventId;
    const ticketId = params?.ticketId;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    const fetchBadge = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/onepass/events/${eventId}/badge/${ticketId}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Unable to load digital pass');
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId && ticketId) {
            fetchBadge();
        }
    }, [eventId, ticketId]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `${data?.attendee?.name || 'Attendee'} - E-Ticket Pass`,
                text: `Digital Entry Pass for ${data?.event?.name || 'AWS Community Day 2026'}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center mb-4">
                    <RefreshCw size={24} className="text-[#FF9900] animate-spin" />
                </div>
                <p className="font-mono text-sm font-bold text-slate-400">Loading Official Digital Pass...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Digital Pass Not Found</h2>
                    <p className="text-xs text-slate-400 font-mono">
                        {error || 'Unable to retrieve ticket details for this link.'}
                    </p>
                    <button
                        onClick={fetchBadge}
                        className="px-6 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { event, attendee } = data;
    const isCheckedIn = attendee.check_in_status === 'CHECKED_IN';
    const checkinTimeFormatted = attendee.check_in_time
        ? new Date(attendee.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 font-sans flex flex-col items-center justify-center selection:bg-[#FF9900] selection:text-slate-950">
            {/* Background Gradient Glow */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF9900]/15 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-lg w-full space-y-6">
                
                {/* TOP HEADER */}
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#FF9900] flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-[#FF9900]/20">
                            AWS
                        </div>
                        <div>
                            <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">AWS Community Day</p>
                            <p className="text-[10px] text-slate-400 font-mono">DDU Nadiad &bull; Official Digital Pass</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShare}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Share E-Pass"
                        >
                            <Share2 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Print / Save Pass"
                        >
                            <Printer size={16} />
                        </button>
                    </div>
                </div>

                {copied && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
                        ✅ Pass link copied to clipboard!
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    MAIN DIGITAL PASS CARD (PRINTABLE)
                ══════════════════════════════════════════ */}
                <div id="printable-ticket" className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/80">
                    
                    {/* Glowing Top Accent Strip */}
                    <div className="h-2 bg-gradient-to-r from-[#FF9900] via-amber-400 to-[#FF9900]" />

                    {/* PASS HEADER */}
                    <div className="p-6 border-b border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={12} /> {attendee.ticket_type || 'Delegate Pass'}
                            </span>
                            
                            {isCheckedIn ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Checked In {checkinTimeFormatted ? `@ ${checkinTimeFormatted}` : ''}
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                    <ShieldCheck size={12} /> Verified & Ready for Entry
                                </span>
                            )}
                        </div>

                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                {attendee.name}
                            </h1>
                            <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
                                <span>Booking ID: <strong className="text-sky-400 font-bold">{attendee.booking_id}</strong></span>
                                {attendee.email && <span>&bull; {attendee.email}</span>}
                            </p>
                        </div>
                    </div>

                    {/* QR CODE & COUNTER SECTION */}
                    <div className="p-6 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800/80">
                        {/* High-Res Scannable QR Code */}
                        <div className="flex flex-col items-center">
                            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-slate-800/80">
                                {attendee.qr_image ? (
                                    <img
                                        src={attendee.qr_image}
                                        alt="Attendee Entry QR Code"
                                        className="w-40 h-40 object-contain rounded"
                                    />
                                ) : (
                                    <div className="w-40 h-40 bg-slate-100 flex items-center justify-center font-mono text-xs text-slate-500">
                                        QR CODE
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 mt-2">
                                Scan at Gate / Counter Desk
                            </span>
                        </div>

                        {/* DESK & SESSION HIGHLIGHTS */}
                        <div className="flex-1 w-full space-y-3">
                            {/* Counter Box */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                                    Assigned Badge Counter Desk
                                </span>
                                <p className="text-lg font-black text-emerald-400 mt-0.5 font-mono flex items-center gap-2">
                                    🏷️ {attendee.counter}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Collect your physical badge & welcome swag kit at this desk.
                                </p>
                            </div>

                            {/* Session / Room Box */}
                            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                                    Allocated Session & Room
                                </span>
                                <p className="text-xs font-bold text-white mt-1">
                                    {attendee.session}
                                </p>
                                <p className="text-[11px] font-mono text-purple-300 mt-0.5 flex items-center gap-1">
                                    <MapPin size={12} /> {attendee.location}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* EVENT VENUE & TIMINGS */}
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
                                <Calendar size={16} className="text-[#FF9900] mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Date & Time</span>
                                    <span className="font-bold text-white text-xs">{event.date}</span>
                                    <span className="text-[11px] text-slate-400 block font-mono">{event.start_time} - {event.end_time}</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
                                <MapPin size={16} className="text-[#FF9900] mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Venue</span>
                                    <span className="font-bold text-white text-xs">{event.venue}</span>
                                </div>
                            </div>
                        </div>

                        {/* Official Ticket PDF Download if available */}
                        {attendee.ticket_pdf && (
                            <a
                                href={attendee.ticket_pdf}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <Download size={14} className="text-[#FF9900]" />
                                Download Original KonfHub PDF Invoice
                            </a>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                        <span>Official Entry Pass &bull; Non-Transferable</span>
                        <span>AWS Student Builder Group, DDU</span>
                    </div>

                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="py-3 px-4 rounded-2xl bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF9900]/20 transition-all cursor-pointer"
                    >
                        <Printer size={15} /> Save / Print Pass
                    </button>

                    <a
                        href={`https://maps.google.com/?q=${encodeURIComponent('Dharmsinh Desai University, Nadiad, Gujarat')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <Navigation size={15} className="text-sky-400" /> Directions
                    </a>
                </div>

            </div>
        </div>
    );
}
