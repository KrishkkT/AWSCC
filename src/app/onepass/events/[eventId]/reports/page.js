'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
    FileSpreadsheet, Download, Users, Layers, BookOpen, Coffee,
    Award, ShieldAlert, ScrollText, CheckCircle2, FileText,
    RefreshCw, BarChart3, Info, ChevronDown, ChevronUp, Printer,
    Copy, Check, ExternalLink, Sparkles, Database, ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';

const TABS = [
    { id: 'live', label: 'Live Stats Sheet', icon: BarChart3 },
    { id: 'export', label: 'Export Reports (Excel / CSV)', icon: FileSpreadsheet },
    { id: 'googlesheets', label: 'Google Sheets Auto-Sync', icon: FileSpreadsheet }
];

export default function ReportsExportPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const [activeTab, setActiveTab] = useState('live');
    const [downloading, setDownloading] = useState(null);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [liveData, setLiveData] = useState(null);
    const [liveLoading, setLiveLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [copiedScript, setCopiedScript] = useState(false);
    const [originUrl, setOriginUrl] = useState('');

    const printableRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOriginUrl(window.location.origin);
        }
    }, []);

    const fetchLiveData = useCallback(async () => {
        if (!eventId) return;
        try {
            const [trkRes, wkRes, foodRes, swagRes, attRes, ctrRes] = await Promise.all([
                fetch(`/api/onepass/tracks?eventId=${eventId}`),
                fetch(`/api/onepass/workshops?eventId=${eventId}`),
                fetch(`/api/onepass/resources?eventId=${eventId}&type=FOOD`),
                fetch(`/api/onepass/resources?eventId=${eventId}&type=SWAG`),
                fetch(`/api/onepass/attendees?eventId=${eventId}&limit=5000`),
                fetch(`/api/onepass/attendees/counters?eventId=${eventId}`)
            ]);
            const [trkData, wkData, foodData, swagData, attData, ctrData] = await Promise.all([
                trkRes.json(), wkRes.json(), foodRes.json(), swagRes.json(), attRes.json(), ctrRes.json()
            ]);
            const attendees = attData.attendees || attData.data || [];
            const checkedIn = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
            const counters = Array.isArray(ctrData.stats) ? ctrData.stats : (ctrData.stats?.counters || []);

            setLiveData({
                attendees,
                checkedIn,
                tracks: trkData.tracks || [],
                workshops: wkData.workshops || [],
                foodResources: foodData.resources || [],
                swagResources: swagData.resources || [],
                counters
            });
            setLastRefreshed(new Date().toLocaleTimeString());
        } catch (e) {
            console.error(e);
        } finally {
            setLiveLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchLiveData();
        const id = setInterval(fetchLiveData, 8000);
        return () => clearInterval(id);
    }, [fetchLiveData]);

    // Download Multi-Tab Master Excel (.xlsx)
    const handleDownloadMasterExcel = async () => {
        try {
            setExportingExcel(true);
            const res = await fetch(`/api/onepass/reports?eventId=${eventId}&format=xlsx&type=master`);
            if (!res.ok) throw new Error('Failed to generate Excel report');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `OnePass_Master_Event_Report_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('Failed to download Master Excel workbook');
        } finally {
            setExportingExcel(false);
        }
    };

    // Export Formatted PDF Report
    const handleExportPDF = () => {
        if (!liveData) return;
        setExportingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageHeight = doc.internal.pageSize.height;
            let y = 16;

            const checkPageBreak = (neededHeight) => {
                if (y + neededHeight > pageHeight - 16) {
                    doc.addPage();
                    y = 16;
                }
            };

            // Header Banner
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 26, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('AWS Community Day - OnePass Official Event Report', 14, 12);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${new Date().toLocaleString()} • Live Supabase Cloud Synchronized Report`, 14, 19);
            y = 34;

            // Summary Section
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('1. Executive Check-In Summary', 14, y);
            y += 6;

            const total = liveData.attendees.length;
            const inCount = liveData.checkedIn.length;
            const rate = total > 0 ? Math.round((inCount / total) * 100) : 0;
            const foodTotal = liveData.foodResources.reduce((s, r) => s + (r.claims_count || 0), 0);
            const swagTotal = liveData.swagResources.reduce((s, r) => s + (r.claims_count || 0), 0);

            doc.setFillColor(248, 250, 252);
            doc.rect(14, y, 182, 20, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(14, y, 182, 20, 'S');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text(`Total Registered: ${total}`, 18, y + 7);
            doc.text(`Admitted / Checked In: ${inCount} (${rate}%)`, 72, y + 7);
            doc.text(`Pending: ${total - inCount}`, 140, y + 7);
            doc.text(`Meals / Lunch Distributed: ${foodTotal}`, 18, y + 15);
            doc.text(`Swag Kits Distributed: ${swagTotal}`, 100, y + 15);
            y += 28;

            // Tracks Table
            if (liveData.tracks.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('2. Track-wise Attendance & Capacities', 14, y);
                y += 6;

                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Track Name', 16, y + 4.5);
                doc.text('Capacity', 110, y + 4.5);
                doc.text('Checked In', 135, y + 4.5);
                doc.text('Remaining', 160, y + 4.5);
                doc.text('Occ %', 182, y + 4.5);
                y += 7;

                doc.setFont('helvetica', 'normal');
                liveData.tracks.forEach((t) => {
                    checkPageBreak(7);
                    const occ = liveData.checkedIn.filter(a => a.assigned_track_id === t.id).length;
                    const cap = t.capacity || 150;
                    const occRate = cap > 0 ? `${Math.round((occ / cap) * 100)}%` : '0%';
                    doc.text(t.name || 'Track', 16, y + 4);
                    doc.text(String(cap), 110, y + 4);
                    doc.text(String(occ), 135, y + 4);
                    doc.text(String(Math.max(0, cap - occ)), 160, y + 4);
                    doc.text(occRate, 182, y + 4);
                    y += 6;
                });
                y += 6;
            }

            // Workshops Table
            if (liveData.workshops.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('3. Workshop-wise Attendance & Hands-On Labs', 14, y);
                y += 6;

                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Workshop Name', 16, y + 4.5);
                doc.text('Speaker', 90, y + 4.5);
                doc.text('Cap', 135, y + 4.5);
                doc.text('Enrolled', 155, y + 4.5);
                doc.text('Left', 180, y + 4.5);
                y += 7;

                doc.setFont('helvetica', 'normal');
                liveData.workshops.forEach((w) => {
                    checkPageBreak(7);
                    const occ = liveData.checkedIn.filter(a => a.assigned_workshop_id === w.id).length;
                    const cap = w.capacity || 30;
                    doc.text(w.name || 'Workshop', 16, y + 4);
                    doc.text(w.speaker || '—', 90, y + 4);
                    doc.text(String(cap), 135, y + 4);
                    doc.text(String(occ), 155, y + 4);
                    doc.text(String(Math.max(0, cap - occ)), 180, y + 4);
                    y += 6;
                });
                y += 6;
            }

            // Food Distribution Table
            if (liveData.foodResources.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('4. Lunch & Food Distribution', 14, y);
                y += 6;

                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Meal Item', 16, y + 4.5);
                doc.text('Window', 90, y + 4.5);
                doc.text('Capacity', 135, y + 4.5);
                doc.text('Claimed', 155, y + 4.5);
                doc.text('Remaining', 180, y + 4.5);
                y += 7;

                doc.setFont('helvetica', 'normal');
                liveData.foodResources.forEach((r) => {
                    checkPageBreak(7);
                    const n = r.claims_count || 0;
                    const cap = r.capacity || 450;
                    doc.text(r.name || 'Meal', 16, y + 4);
                    doc.text(`${r.start_time || 'Open'} - ${r.end_time || 'Open'}`, 90, y + 4);
                    doc.text(String(cap), 135, y + 4);
                    doc.text(String(n), 155, y + 4);
                    doc.text(String(Math.max(0, cap - n)), 180, y + 4);
                    y += 6;
                });
                y += 6;
            }

            // Swag Kit Table
            if (liveData.swagResources.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('5. Swag Kit Distribution', 14, y);
                y += 6;

                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Swag Item', 16, y + 4.5);
                doc.text('Allocated Stock', 110, y + 4.5);
                doc.text('Distributed', 145, y + 4.5);
                doc.text('Remaining Stock', 175, y + 4.5);
                y += 7;

                doc.setFont('helvetica', 'normal');
                liveData.swagResources.forEach((r) => {
                    checkPageBreak(7);
                    const n = r.claims_count || 0;
                    const cap = r.capacity || 400;
                    doc.text(r.name || 'Swag Kit', 16, y + 4);
                    doc.text(String(cap), 110, y + 4);
                    doc.text(String(n), 145, y + 4);
                    doc.text(String(Math.max(0, cap - n)), 175, y + 4);
                    y += 6;
                });
                y += 6;
            }

            // Counters Table
            if (liveData.counters.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('6. Badge Counter Desk Distribution', 14, y);
                y += 6;

                doc.setFillColor(241, 245, 249);
                doc.rect(14, y, 182, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Counter Name', 16, y + 4.5);
                doc.text('Total Badges', 90, y + 4.5);
                doc.text('Checked In', 135, y + 4.5);
                doc.text('Pending Badges', 165, y + 4.5);
                y += 7;

                doc.setFont('helvetica', 'normal');
                liveData.counters.forEach((c) => {
                    checkPageBreak(7);
                    doc.text(c.counter || 'Counter', 16, y + 4);
                    doc.text(String(c.total || 0), 90, y + 4);
                    doc.text(String(c.checked_in || 0), 135, y + 4);
                    doc.text(String(c.pending || 0), 165, y + 4);
                    y += 6;
                });
                y += 6;
            }

            // Section 7: Complete Attendee Check-In Master Roster (All Rows, Columns & Timestamps)
            if (liveData.attendees && liveData.attendees.length > 0) {
                checkPageBreak(40);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(`7. Complete Attendee Directory & Check-In Roster (${liveData.attendees.length} Attendees)`, 14, y);
                y += 6;

                const drawAttendeeHeader = () => {
                    doc.setFillColor(15, 23, 42);
                    doc.rect(14, y, 182, 6.5, 'F');
                    doc.setFontSize(7.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255);
                    doc.text('#', 16, y + 4.5);
                    doc.text('Attendee Name', 24, y + 4.5);
                    doc.text('Booking ID', 68, y + 4.5);
                    doc.text('Ticket / Counter', 100, y + 4.5);
                    doc.text('Status', 135, y + 4.5);
                    doc.text('Check-In Time', 158, y + 4.5);
                    y += 7.5;
                };

                drawAttendeeHeader();

                liveData.attendees.forEach((a, idx) => {
                    if (y + 7 > pageHeight - 16) {
                        doc.addPage();
                        y = 16;
                        drawAttendeeHeader();
                    }

                    const isChecked = a.check_in_status === 'CHECKED_IN';
                    const timeStr = a.check_in_time ? new Date(a.check_in_time).toLocaleString() : '—';
                    const counterStr = a.counter_number ? `Box #${a.counter_number}` : (a.counter || 'Unassigned');
                    const sessionStr = a.workshop_name ? `Lab: ${a.workshop_name}` : (a.track_name || a.ticket_type || 'General');

                    // Alternating background
                    if (idx % 2 === 1) {
                        doc.setFillColor(248, 250, 252);
                        doc.rect(14, y, 182, 6, 'F');
                    }

                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);

                    doc.text(String(idx + 1), 16, y + 4);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(15, 23, 42);
                    doc.text((a.name || 'Attendee').substring(0, 26), 24, y + 4);

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    doc.text((a.booking_id || a.id || '').substring(0, 18), 68, y + 4);

                    doc.setTextColor(51, 65, 85);
                    doc.text(`${(a.ticket_type || 'Attendee').substring(0, 12)} (${counterStr})`.substring(0, 20), 100, y + 4);

                    if (isChecked) {
                        doc.setTextColor(16, 185, 129); // emerald
                        doc.setFont('helvetica', 'bold');
                        doc.text('✓ ADMITTED', 135, y + 4);
                    } else {
                        doc.setTextColor(148, 163, 184); // slate-400
                        doc.setFont('helvetica', 'normal');
                        doc.text('Pending', 135, y + 4);
                    }

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(71, 85, 105);
                    doc.text(timeStr.substring(0, 20), 158, y + 4);

                    y += 6;
                });
            }

            // Page Numbering Footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(`OnePass Event Report • Page ${i} of ${totalPages}`, 14, pageHeight - 8);
                doc.text('CONFIDENTIAL & OFFICIAL EVENT RECORD', 140, pageHeight - 8);
            }

            doc.save(`OnePass_Event_Report_${Date.now()}.pdf`);
        } catch (err) {
            console.error(err);
            alert('Failed to export PDF');
        } finally {
            setExportingPdf(false);
        }
    };

    // Dedicated Full Attendee Check-In Roster PDF (Landscape High-Density Format)
    const handleExportAttendeeRosterPDF = () => {
        if (!liveData || !liveData.attendees || liveData.attendees.length === 0) {
            alert('No attendee data available to export.');
            return;
        }
        setExportingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            let y = 14;

            const drawRosterHeader = () => {
                doc.setFillColor(15, 23, 42); // slate-900
                doc.rect(10, y, pageWidth - 20, 7.5, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('#', 13, y + 5);
                doc.text('Attendee Name', 22, y + 5);
                doc.text('Email / Phone', 75, y + 5);
                doc.text('Booking ID', 135, y + 5);
                doc.text('Ticket Type', 165, y + 5);
                doc.text('Counter Box', 200, y + 5);
                doc.text('Check-In Status', 228, y + 5);
                doc.text('Check-In Timestamp', 255, y + 5);
                y += 8.5;
            };

            // Main Banner on First Page
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text('AWS Community Day — Official Attendee Check-In Master Roster', 12, 10);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${new Date().toLocaleString()} • Total Registered: ${liveData.attendees.length} • Admitted: ${liveData.checkedIn.length}`, 12, 17);
            y = 28;

            drawRosterHeader();

            liveData.attendees.forEach((a, idx) => {
                if (y + 6.5 > pageHeight - 14) {
                    doc.addPage();
                    y = 12;
                    drawRosterHeader();
                }

                const isChecked = a.check_in_status === 'CHECKED_IN';
                const timeStr = a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'Not Checked In';
                const counterStr = a.counter_number ? `Box #${a.counter_number}` : (a.counter || 'Unassigned');
                const contactStr = `${a.email || ''}${a.phone ? ` • ${a.phone}` : ''}`;

                if (idx % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(10, y, pageWidth - 20, 6, 'F');
                }

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(String(idx + 1), 13, y + 4.2);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text((a.name || 'Attendee').substring(0, 28), 22, y + 4.2);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(contactStr.substring(0, 34), 75, y + 4.2);

                doc.setTextColor(100, 116, 139);
                doc.text((a.booking_id || a.id || '').substring(0, 16), 135, y + 4.2);

                doc.setTextColor(51, 65, 85);
                doc.text((a.ticket_type || 'Attendee').substring(0, 18), 165, y + 4.2);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 115, 187); // #0073BB
                doc.text(counterStr.substring(0, 16), 200, y + 4.2);

                if (isChecked) {
                    doc.setTextColor(16, 185, 129); // emerald
                    doc.text('✓ ADMITTED', 228, y + 4.2);
                } else {
                    doc.setTextColor(148, 163, 184); // slate
                    doc.setFont('helvetica', 'normal');
                    doc.text('Pending', 228, y + 4.2);
                }

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(timeStr.substring(0, 22), 255, y + 4.2);

                y += 6;
            });

            // Footers
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(`AWS Community Day Check-In Roster • Page ${i} of ${totalPages}`, 12, pageHeight - 6);
                doc.text(`Official Cloud Record (${Date.now()})`, pageWidth - 60, pageHeight - 6);
            }

            doc.save(`OnePass_Attendee_Roster_${Date.now()}.pdf`);
        } catch (err) {
            console.error(err);
            alert('Failed to generate Attendee Roster PDF');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleDownloadSingle = async (type) => {
        try {
            setDownloading(type);
            const res = await fetch(`/api/onepass/reports?eventId=${eventId}&type=${type}`);
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `onepass_${type}_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('Failed to download report');
        } finally {
            setDownloading(null);
        }
    };

    const REPORTS = [
        { type: 'checkedin',   title: '1. Checked-In Attendees Manifest',         icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',     desc: 'On-site verified attendee manifest with timestamps and counter numbers.' },
        { type: 'tracks',      title: '2. Track Occupancy Report',                icon: Layers,       color: 'text-[#FF9900] bg-[#FF9900]/10 border-[#FF9900]/30',           desc: 'Track-wise attendee occupancy, capacities, and remaining seat counts.' },
        { type: 'workshops',   title: '3. Workshop Assignments',                  icon: BookOpen,     color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',        desc: 'Room assignments, speaker metadata, and hands-on lab enrollment rosters.' },
        { type: 'food',        title: '4. Food & Meal Distribution',              icon: Coffee,       color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',           desc: 'Lunch and meal token distribution count per resource with timing windows.' },
        { type: 'swag',        title: '5. Swag Kit Distribution & Stock',         icon: Award,        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',     desc: 'Swag kit distribution numbers, remaining inventory, and pickup rates.' },
        { type: 'counters',    title: '6. Badge Counter Distribution',            icon: Users,        color: 'text-[#4F8EF7] bg-[#0073BB]/10 border-[#0073BB]/30',           desc: 'Counter box 1..6 breakdown with pending and collected badge statistics.' },
        { type: 'attribution', title: '7. Volunteer Attribution',                 icon: Users,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',           desc: 'Who checked in whom - volunteer names, roles, and check-in counts.' },
        { type: 'attendees',   title: '8. Master Attendee Roster',                icon: Users,        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',             desc: 'Complete roster with IDs, QR codes, check-in statuses, and session allocations.' },
        { type: 'claims',      title: '9. Item Claims Activity Ledger',           icon: FileText,     color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',             desc: 'Itemized claim log with attendee details, timestamps, and scanners.' },
        { type: 'access',      title: '10. Gate Access Logs',                      icon: ShieldAlert,  color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',             desc: 'Gate scans: GRANTED and DENIED attempts with volunteer scanners.' },
        { type: 'audit',       title: '11. Audit & Governance Trail',             icon: ScrollText,   color: 'text-slate-300 bg-[#0C111D] border-[#1a2540]',              desc: 'Timestamped trail of all check-ins, overrides, claims, and state changes.' },
    ];

    const OBar = ({ n, max }) => {
        const p = max > 0 ? Math.min(100, Math.round((n / max) * 100)) : 0;
        const c = p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
        return (
            <div className="w-full">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                    <span>{n}/{max}</span><span>{p}%</span>
                </div>
                <div className="h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
                    <div className={`h-full ${c} rounded-full`} style={{ width: `${p}%` }} />
                </div>
            </div>
        );
    };

    const SC = ({ label, val, sub, color = 'text-[#4F8EF7]' }) => (
        <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">{label}</div>
            <div className={`text-3xl font-black mt-1 ${color}`}>{val}</div>
            {sub && <div className="text-[10px] text-slate-500 font-mono">{sub}</div>}
        </div>
    );

    const generatedScript = `/**
 * AWS Community Day - OnePass Live Google Sheets Auto-Sync
 * Automatically creates & syncs 8 dedicated tabs with live Supabase data:
 * Executive Summary, Check-Ins, Tracks, Workshops, Lunch, Swag, Counters, Leaderboard.
 */
function syncOnePassLiveToGoogleSheets() {
  var SYNC_URL = "${originUrl || 'https://aws.ddu.ac.in'}/api/onepass/sync/googlesheet?eventId=${eventId || ''}&token=onepass_gs_${eventId || ''}";
  
  var response = UrlFetchApp.fetch(SYNC_URL, {
    method: "GET",
    muteHttpExceptions: true
  });

  var statusCode = response.getResponseCode();
  var rawText = response.getContentText();

  if (statusCode !== 200) {
    Logger.log("Error (" + statusCode + ") syncing from OnePass: " + rawText.substring(0, 300));
    return;
  }

  var data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    Logger.log("Failed to parse JSON response. Ensure your OnePass deployment is updated and accessible. Response preview: " + rawText.substring(0, 300));
    return;
  }

  if (!data || !data.sheets) {
    Logger.log("Invalid response payload from OnePass: missing 'sheets' object.");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsMap = data.sheets;

  for (var sheetName in sheetsMap) {
    var rows = sheetsMap[sheetName];
    if (!rows || rows.length === 0) continue;

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    sheet.clearContents();
    var numRows = rows.length;
    var numCols = rows[0].length;
    
    // Write full matrix in a single batch operation
    sheet.getRange(1, 1, numRows, numCols).setValues(rows);

    // Format Header Row
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0073BB");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, numCols);
  }

  Logger.log("OnePass Live Sync Successful! Refreshed at " + new Date());
}

/**
 * Setup recurring trigger (Runs automatically every 1 minute)
 * Note: Google Apps Script valid intervals for everyMinutes are: 1, 5, 10, 15, or 30.
 */
function createAutoSyncTrigger() {
  // Delete old triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // Create fresh 1-minute trigger
  ScriptApp.newTrigger("syncOnePassLiveToGoogleSheets")
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log("1-Minute Auto-Sync Trigger Created Successfully!");
}`;

    const handleCopyScript = () => {
        navigator.clipboard.writeText(generatedScript);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 3000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white">Event Reports &amp; Cloud Analytics</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Live real-time data across tracks, workshops, lunch, swag, counter boxes, and Google Sheets.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleDownloadMasterExcel}
                        disabled={exportingExcel}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{exportingExcel ? 'Building Excel...' : 'Master Excel (.xlsx)'}</span>
                    </button>

                    <button
                        onClick={handleExportAttendeeRosterPDF}
                        disabled={exportingPdf || !liveData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
                    >
                        <Users className="w-4 h-4" />
                        <span>{exportingPdf ? 'Exporting...' : 'Attendee Roster (PDF)'}</span>
                    </button>

                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPdf || !liveData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        <span>{exportingPdf ? 'Exporting PDF...' : 'Full Event PDF Report'}</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 p-1 bg-[#0C111D] border border-[#1a2540] rounded-2xl">
                {TABS.map(t => {
                    const I = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                                activeTab === t.id ? 'bg-[#0073BB] text-white' : 'text-slate-400 hover:text-white hover:bg-[#151c2e]'
                            }`}
                        >
                            <I className="w-4 h-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: LIVE STATS SHEET */}
            {activeTab === 'live' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Supabase Cloud Live{lastRefreshed ? ` · Refreshed ${lastRefreshed}` : ''}
                        </div>
                        <button
                            onClick={() => { setLiveLoading(true); fetchLiveData(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 text-xs rounded-xl transition"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {liveLoading && !liveData ? (
                        <div className="p-16 text-center text-slate-400 text-sm animate-pulse">Loading live cloud data...</div>
                    ) : liveData ? (
                        <div className="space-y-6" ref={printableRef}>
                            {/* Summary Metrics */}
                            <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                                <p className="text-xs font-mono font-bold uppercase text-[#4F8EF7] tracking-wider">Overall Event Check-In Summary</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <SC label="Total Registered" val={liveData.attendees.length} color="text-slate-200" />
                                    <SC
                                        label="Checked In"
                                        val={liveData.checkedIn.length}
                                        color="text-emerald-400"
                                        sub={liveData.attendees.length > 0 ? `${Math.round((liveData.checkedIn.length / liveData.attendees.length) * 100)}% turnout` : ''}
                                    />
                                    <SC label="Pending Check-Ins" val={liveData.attendees.length - liveData.checkedIn.length} color="text-amber-400" />
                                    <SC
                                        label="Meals + Swag Claimed"
                                        val={[...liveData.foodResources, ...liveData.swagResources].reduce((s, r) => s + (r.claims_count || 0), 0)}
                                        color="text-[#FF9900]"
                                    />
                                </div>
                            </div>

                            {/* Track-wise Attendance Table */}
                            {liveData.tracks.length > 0 && (
                                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono font-bold uppercase text-[#FF9900] tracking-wider flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-[#FF9900]" /> Track-wise Attendance &amp; Capacities
                                        </p>
                                        <button
                                            onClick={() => handleDownloadSingle('tracks')}
                                            className="text-[11px] font-mono text-[#4F8EF7] hover:underline flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Export Tracks CSV
                                        </button>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-[#1a2540] text-[10px] font-mono uppercase text-slate-400">
                                                <th className="text-left pb-2">Track Name</th>
                                                <th className="text-right pb-2">Capacity</th>
                                                <th className="text-right pb-2">Checked-In</th>
                                                <th className="text-right pb-2">Available</th>
                                                <th className="text-left pl-4 pb-2 w-36">Occupancy</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1a2540]">
                                            {liveData.tracks.map(t => {
                                                const n = liveData.checkedIn.filter(a => a.assigned_track_id === t.id).length;
                                                const c = t.capacity || 150;
                                                return (
                                                    <tr key={t.id} className="hover:bg-[#0C111D]">
                                                        <td className="py-2.5 font-semibold text-white">{t.name}</td>
                                                        <td className="py-2.5 text-right font-mono text-slate-400">{c}</td>
                                                        <td className="py-2.5 text-right font-mono font-bold text-emerald-400">{n}</td>
                                                        <td className="py-2.5 text-right font-mono text-amber-400">{Math.max(0, c - n)}</td>
                                                        <td className="py-2.5 pl-4"><OBar n={n} max={c} /></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Workshop-wise Attendance Table */}
                            {liveData.workshops.length > 0 && (
                                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 text-purple-400" /> Workshop-wise Hands-On Labs
                                        </p>
                                        <button
                                            onClick={() => handleDownloadSingle('workshops')}
                                            className="text-[11px] font-mono text-purple-300 hover:underline flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Export Workshops CSV
                                        </button>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-[#1a2540] text-[10px] font-mono uppercase text-slate-400">
                                                <th className="text-left pb-2">Workshop Name</th>
                                                <th className="text-left pb-2">Speaker</th>
                                                <th className="text-right pb-2">Capacity</th>
                                                <th className="text-right pb-2">Enrolled</th>
                                                <th className="text-right pb-2">Seats Left</th>
                                                <th className="text-left pl-4 pb-2 w-36">Occupancy</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1a2540]">
                                            {liveData.workshops.map(w => {
                                                const n = liveData.checkedIn.filter(a => a.assigned_workshop_id === w.id).length;
                                                const c = w.capacity || 30;
                                                return (
                                                    <tr key={w.id} className="hover:bg-[#0C111D]">
                                                        <td className="py-2.5 font-semibold text-white">{w.name}</td>
                                                        <td className="py-2.5 text-slate-400 text-[10px] font-mono">{w.speaker || '—'}</td>
                                                        <td className="py-2.5 text-right font-mono text-slate-400">{c}</td>
                                                        <td className="py-2.5 text-right font-mono font-bold text-purple-400">{n}</td>
                                                        <td className="py-2.5 text-right font-mono text-amber-400">{Math.max(0, c - n)}</td>
                                                        <td className="py-2.5 pl-4"><OBar n={n} max={c} /></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Food / Lunch Distribution Cards */}
                            {liveData.foodResources.length > 0 && (
                                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono font-bold uppercase text-[#FF9900] tracking-wider flex items-center gap-1.5">
                                            <Coffee className="w-4 h-4 text-[#FF9900]" /> Lunch &amp; Meal Distribution
                                        </p>
                                        <button
                                            onClick={() => handleDownloadSingle('food')}
                                            className="text-[11px] font-mono text-[#FF9900] hover:underline flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Export Lunch CSV
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {liveData.foodResources.map(r => {
                                            const n = r.claims_count || 0;
                                            const c = r.capacity || 450;
                                            return (
                                                <div key={r.id} className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                                    <p className="font-bold text-white text-sm">{r.name}</p>
                                                    {r.start_time && <p className="text-[10px] font-mono text-slate-400">{r.start_time}–{r.end_time}</p>}
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-2xl font-black text-[#FF9900]">{n}</span>
                                                        <span className="text-xs font-mono text-slate-400">/{c} meals</span>
                                                    </div>
                                                    <OBar n={n} max={c} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Swag Kit Distribution Cards */}
                            {liveData.swagResources.length > 0 && (
                                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                                            <Award className="w-4 h-4 text-emerald-400" /> Swag Kit Distribution &amp; Inventory
                                        </p>
                                        <button
                                            onClick={() => handleDownloadSingle('swag')}
                                            className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Export Swag CSV
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {liveData.swagResources.map(r => {
                                            const n = r.claims_count || 0;
                                            const c = r.capacity || 400;
                                            return (
                                                <div key={r.id} className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                                    <p className="font-bold text-white text-sm">{r.name}</p>
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-2xl font-black text-emerald-400">{n}</span>
                                                        <span className="text-xs font-mono text-slate-400">/{c} distributed</span>
                                                    </div>
                                                    <OBar n={n} max={c} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Counter Station Badges Table */}
                            {liveData.counters && liveData.counters.length > 0 && (
                                <div className="p-5 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono font-bold uppercase text-[#4F8EF7] tracking-wider flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-[#4F8EF7]" /> Badge Counter Station Breakdown
                                        </p>
                                        <button
                                            onClick={() => handleDownloadSingle('counters')}
                                            className="text-[11px] font-mono text-[#4F8EF7] hover:underline flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Export Counters CSV
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                        {liveData.counters.map(c => (
                                            <div key={c.counter} className="p-3 bg-[#0C111D] border border-[#1a2540] rounded-xl text-center space-y-1">
                                                <div className="text-xs font-bold text-white font-mono">{c.counter}</div>
                                                <div className="text-lg font-black text-[#4F8EF7]">{c.checked_in}/{c.total}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{c.pending} pending</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* TAB 2: EXPORT REPORTS (EXCEL & CSV) */}
            {activeTab === 'export' && (
                <div className="space-y-6">
                    {/* Master Excel Export Highlight Box */}
                    <div className="p-6 bg-gradient-to-r from-emerald-950/60 to-[#0C111D] border-2 border-emerald-500/50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                        <div className="space-y-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-400 font-bold text-base">
                                <FileSpreadsheet className="w-5 h-5" />
                                All-in-One Multi-Tab Excel Master Workbook (.xlsx)
                            </div>
                            <p className="text-xs text-slate-300 max-w-xl">
                                Includes separate dedicated tabs for Check-Ins, Track Stats, Workshop Rosters, Lunch Distribution, Swag Kits, Counter Boxes, Volunteer Rankings, and Claims Activity.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadMasterExcel}
                            disabled={exportingExcel}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-2xl transition shadow-xl shrink-0"
                        >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                            <span>{exportingExcel ? 'Generating Multi-Tab .xlsx...' : 'Download Master (.xlsx)'}</span>
                        </button>
                    </div>

                    {/* Individual Report Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {REPORTS.map(r => {
                            const I = r.icon;
                            const busy = downloading === r.type;
                            return (
                                <div key={r.type} className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl flex flex-col justify-between gap-4 shadow-xl">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-2xl border ${r.color}`}><I className="w-5 h-5" /></div>
                                            <div>
                                                <h2 className="font-bold text-white text-sm">{r.title}</h2>
                                                <span className="text-[10px] font-mono text-slate-400 uppercase">CSV / Excel Format</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300">{r.desc}</p>
                                    </div>
                                    <div className="pt-3 border-t border-[#1a2540] flex justify-end">
                                        <button
                                            onClick={() => handleDownloadSingle(r.type)}
                                            disabled={busy}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#0C111D] hover:bg-[#0073BB] disabled:opacity-50 text-white rounded-xl text-xs font-semibold border border-[#1a2540] transition"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            {busy ? 'Generating...' : 'Download CSV'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 3: GOOGLE SHEETS AUTO-SYNC */}
            {activeTab === 'googlesheets' && (
                <div className="space-y-6">
                    {/* Hero Setup Card */}
                    <div className="p-6 bg-gradient-to-r from-[#0073BB]/20 via-[#151c2e] to-[#0C111D] border-2 border-[#0073BB]/60 rounded-3xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#0073BB]/20 border border-[#0073BB]/40 rounded-2xl text-[#4F8EF7]">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white">Automated Google Sheets Live Synchronization</h2>
                                <p className="text-xs text-slate-300">
                                    Keep your Google Sheet automatically up-to-date with Supabase cloud on event day (refreshes automatically every 2 minutes).
                                </p>
                            </div>
                        </div>

                        {/* 4-Step Visual Instructions */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                            <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                <div className="w-6 h-6 rounded-full bg-[#0073BB]/20 border border-[#0073BB]/40 text-[#4F8EF7] font-bold text-xs flex items-center justify-center font-mono">1</div>
                                <p className="font-bold text-white text-xs">Create Sheet</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Open a blank spreadsheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#4F8EF7] underline">sheets.new</a>
                                </p>
                            </div>

                            <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold text-xs flex items-center justify-center font-mono">2</div>
                                <p className="font-bold text-white text-xs">Open Apps Script</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    In Google Sheets menu, click <strong>Extensions &rarr; Apps Script</strong>.
                                </p>
                            </div>

                            <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">3</div>
                                <p className="font-bold text-white text-xs">Paste &amp; Run</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Delete any template code, paste the script below, and click <strong>Save 💾</strong> then <strong>Run ▶️</strong>.
                                </p>
                            </div>

                            <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-2">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">4</div>
                                <p className="font-bold text-white text-xs">Auto 2-Min Refresh</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Select function <code className="text-amber-300 font-mono">createAutoSyncTrigger</code> in dropdown &amp; click <strong>Run</strong> once!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Copyable Apps Script Code Box */}
                    <div className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="font-bold text-white text-sm">Pre-Configured Google Apps Script (Ready to Copy)</h3>
                                <p className="text-xs text-slate-400">
                                    Your event ID and cloud sync endpoint are already pre-filled.
                                </p>
                            </div>

                            <button
                                onClick={handleCopyScript}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                                    copiedScript ? 'bg-emerald-500 text-slate-950' : 'bg-[#0073BB] hover:bg-[#0073BB]/90 text-white'
                                }`}
                            >
                                {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Apps Script Code'}</span>
                            </button>
                        </div>

                        <pre className="p-4 bg-[#0C111D] rounded-2xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-96 border border-[#1a2540] leading-relaxed">
                            {generatedScript}
                        </pre>

                        <div className="p-4 bg-[#0C111D] border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
                            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-white">Tabs Automatically Created in Your Google Sheet:</strong>
                                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono">
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-slate-200">📌 Executive Summary</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-emerald-300">🎟️ Check-Ins</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-amber-300">🚀 Tracks Stats</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-purple-300">🧪 Workshops Stats</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-[#FF9900]">🍱 Lunch Distribution</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-emerald-400">🎁 Swag Kits</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-[#4F8EF7]">🏷️ Badge Counters</span>
                                    <span className="px-2 py-1 bg-[#151c2e] border border-[#1a2540] rounded-lg text-cyan-300">👥 Volunteer Leaderboard</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}