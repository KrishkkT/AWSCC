'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
    FileSpreadsheet, Download, Users, Layers, BookOpen, Coffee,
    Award, ShieldAlert, ScrollText, CheckCircle2, FileText
} from 'lucide-react';

export default function ReportsExportPage() {
    const params = useParams();
    const eventId = params?.eventId;

    const [downloading, setDownloading] = useState(null);

    const REPORT_DEFINITIONS = [
        {
            type: 'attendees',
            title: '1. Master Attendee Roster',
            desc: 'Complete attendee roster with registration IDs, booking IDs, QR codes, check-in statuses, and session allocations.',
            icon: Users,
            color: 'text-[#4F8EF7] bg-[#0073BB]/10 border-[#0073BB]/30'
        },
        {
            type: 'checkedin',
            title: '2. Checked-In Attendees Only',
            desc: 'Clean manifest of all attendees currently verified on-site with check-in timestamps and volunteer scanner names.',
            icon: CheckCircle2,
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
        },
        {
            type: 'attribution',
            title: '3. Volunteer Attribution & Leaderboard',
            desc: 'Detailed breakdown of who checked-in whom: volunteer names, roles, total check-ins processed, and percentage share.',
            icon: Users,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        },
        {
            type: 'tracks',
            title: '4. Track Occupancy Report',
            desc: 'Detailed breakdown of maximum capacity, current seat allocation, remaining seats, and occupancy percentages.',
            icon: Layers,
            color: 'text-[#FF9900] bg-[#FF9900]/10 border-[#FF9900]/30'
        },
        {
            type: 'workshops',
            title: '5. Workshop Assignments',
            desc: 'Room assignments, speaker metadata, session capacity, and attendee enrollment rosters.',
            icon: BookOpen,
            color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
        },
        {
            type: 'food',
            title: '6. Food & Meal Distribution',
            desc: 'Distribution count per meal resource (Breakfast, Lunch, Hi-Tea) with operational timing windows.',
            icon: Coffee,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        },
        {
            type: 'swag',
            title: '7. Swag Kit Distribution & Stock',
            desc: 'Swag kit distribution numbers, remaining physical kits, and distribution velocity.',
            icon: Award,
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
        },
        {
            type: 'claims',
            title: '8. Item Claims Activity Ledger',
            desc: 'Itemized claim-by-claim log: meal & swag items claimed, attendee details, timestamps, and volunteer scanners.',
            icon: FileText,
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
        },
        {
            type: 'access',
            title: '9. Gate Access Logs (Tracks & Workshops)',
            desc: 'Complete log of gate scans: GRANTED entry, DENIED attempts, session names, and volunteer scanners.',
            icon: ShieldAlert,
            color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
        },
        {
            type: 'volunteers',
            title: '10. Volunteer Permissions & Staff Roster',
            desc: 'Authorized operational staff, assigned event permissions, and active statuses.',
            icon: Users,
            color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
        },
        {
            type: 'audit',
            title: '11. Immutable Audit & Governance Trail',
            desc: 'Timestamped trail of all operations: check-ins, overrides, claims, permissions, and entity modifications.',
            icon: ScrollText,
            color: 'text-slate-300 bg-[#0C111D] border-[#1a2540]'
        },
    ];

    const handleDownload = async (type) => {
        try {
            setDownloading(type);
            const res = await fetch(`/api/onepass/reports?eventId=${eventId}&type=${type}`);
            if (!res.ok) throw new Error('Failed to generate export');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `onepass_${type}_report_${eventId}_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error(e);
            alert('Failed to download report');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Export Reports Center</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Download raw spreadsheet exports (CSV / Excel compatible) for post-event analytics and compliance.
                    </p>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPORT_DEFINITIONS.map((r) => {
                    const Icon = r.icon;
                    const isBusy = downloading === r.type;

                    return (
                        <div
                            key={r.type}
                            className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2.5 rounded-2xl border ${r.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-white text-sm">{r.title}</h2>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase">CSV / XLSX Spreadsheet</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{r.desc}</p>
                            </div>

                            <div className="pt-3 border-t border-[#1a2540] flex justify-end">
                                <button
                                    onClick={() => handleDownload(r.type)}
                                    disabled={isBusy}
                                    className="flex items-center space-x-2 px-4 py-2 bg-[#0C111D] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-mono border border-[#1a2540] transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isBusy ? 'Generating Export...' : 'Download CSV'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
