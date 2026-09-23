'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    Search, Plus, Filter, QrCode, CheckCircle2, XCircle, Clock,
    MoreHorizontal, ShieldCheck, RefreshCw, Edit, AlertCircle,
    User, Mail, Phone, Ticket, Layers, Coffee, Award, Sparkles, X, Trash2,
    Download, CheckSquare, Square, MinusSquare, RotateCcw, ChevronDown, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useOnePass } from '@/components/onepass/OnePassContext';

export default function AttendeesDirectoryPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();

    const [attendees, setAttendees] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [trackFilter, setTrackFilter] = useState('');
    const [volunteerFilter, setVolunteerFilter] = useState('');
    const [counterFilter, setCounterFilter] = useState('');

    // Counter Allocation State
    const [counterModalOpen, setCounterModalOpen] = useState(false);
    const [counterStats, setCounterStats] = useState(null);
    const [allocatingCounters, setAllocatingCounters] = useState(false);
    const [counterRules, setCounterRules] = useState([
        { id: 1, name: 'Workshop Attendees', pattern: 'workshop', capacity: 30, startCounter: 1, prefix: 'Counter ' },
        { id: 2, name: 'Tracks / General Attendees', pattern: '*', capacity: 30, startCounter: '', prefix: 'Counter ' }
    ]);

    // Multi-Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkOperating, setBulkOperating] = useState(false);
    const [bulkCheckInModalOpen, setBulkCheckInModalOpen] = useState(false);
    const [bulkSelectedTrack, setBulkSelectedTrack] = useState('');
    const [bulkSelectedWorkshop, setBulkSelectedWorkshop] = useState('');

    // Modals & Drawers
    const [selectedAttendee, setSelectedAttendee] = useState(null);
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Override Form State
    const [overrideTrackId, setOverrideTrackId] = useState('');
    const [overrideWorkshopId, setOverrideWorkshopId] = useState('');
    const [overrideCheckInStatus, setOverrideCheckInStatus] = useState('');
    const [overrideCounter, setOverrideCounter] = useState('');
    const [overrideCounterCategory, setOverrideCounterCategory] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideSubmitting, setOverrideSubmitting] = useState(false);

    // New Attendee Form
    const [newAttendee, setNewAttendee] = useState({
        name: '',
        email: '',
        phone: '',
        ticket_type: 'Attendee',
        booking_id: '',
        qr_identifier: '',
        counter: ''
    });

    const fetchCounterStats = async () => {
        try {
            const res = await fetch(`/api/onepass/attendees/counters?eventId=${eventId}`);
            const data = await res.json();
            if (data.stats) {
                setCounterStats(data.stats);
            }
        } catch (e) {
            console.error('Failed to fetch counter stats', e);
        }
    };

    const fetchAttendees = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                eventId,
                search,
                check_in_status: statusFilter,
                track_id: trackFilter,
                checked_in_by: volunteerFilter,
                counter: counterFilter
            });
            const res = await fetch(`/api/onepass/attendees?${queryParams.toString()}`);
            const data = await res.json();
            setAttendees(data.attendees || []);

            const trkRes = await fetch(`/api/onepass/tracks?eventId=${eventId}`);
            const trkData = await trkRes.json();
            setTracks(trkData.tracks || []);

            const wkRes = await fetch(`/api/onepass/workshops?eventId=${eventId}`);
            const wkData = await wkRes.json();
            setWorkshops(wkData.workshops || []);

            const volRes = await fetch(`/api/onepass/volunteers?eventId=${eventId}`);
            const volData = await volRes.json();
            setVolunteers(volData.volunteers || []);

            fetchCounterStats();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchAttendees();
        }, 250);
        return () => clearTimeout(timeout);
    }, [eventId, search, statusFilter, trackFilter, volunteerFilter, counterFilter]);

    // Multi-Selection Logic
    const allVisibleIds = useMemo(() => attendees.map(a => a.id), [attendees]);
    const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));
    const isPartiallySelected = selectedIds.length > 0 && !isAllSelected;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allVisibleIds);
        }
    };

    const toggleSelectAttendee = (attendeeId, e) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => {
            if (prev.includes(attendeeId)) {
                return prev.filter(id => id !== attendeeId);
            } else {
                return [...prev, attendeeId];
            }
        });
    };

    const selectOnlyCheckedIn = () => {
        const checkedInIds = attendees.filter(a => a.check_in_status === 'CHECKED_IN').map(a => a.id);
        setSelectedIds(checkedInIds);
    };

    const selectOnlyPending = () => {
        const pendingIds = attendees.filter(a => a.check_in_status !== 'CHECKED_IN').map(a => a.id);
        setSelectedIds(pendingIds);
    };

    const openProfile = async (attendeeId) => {
        try {
            const res = await fetch(`/api/onepass/attendees/${attendeeId}?eventId=${eventId}`);
            const data = await res.json();
            if (data.attendee) {
                setSelectedAttendee(data.attendee);
                setOverrideTrackId(data.attendee.assigned_track_id || '');
                setOverrideWorkshopId(data.attendee.assigned_workshop_id || '');
                setOverrideCheckInStatus(data.attendee.check_in_status || 'NOT_CHECKED_IN');
                setOverrideCounter(data.attendee.counter || '');
                setOverrideCounterCategory(data.attendee.counter_category || '');
                setOverrideReason('');
                setProfileDrawerOpen(true);
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    };

    const handleAdminOverride = async (e) => {
        e.preventDefault();
        if (!selectedAttendee || !overrideReason.trim()) return;

        setOverrideSubmitting(true);
        try {
            const res = await fetch(`/api/onepass/attendees/${selectedAttendee.id}/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    updates: {
                        assigned_track_id: overrideTrackId || null,
                        assigned_workshop_id: overrideWorkshopId || null,
                        check_in_status: overrideCheckInStatus,
                        check_in_time: overrideCheckInStatus === 'CHECKED_IN' ? (selectedAttendee.check_in_time || new Date().toISOString()) : null,
                        counter: overrideCounter || null,
                        counter_category: overrideCounterCategory || null
                    },
                    reason: overrideReason
                })
            });

            const data = await res.json();
            if (res.ok) {
                setOverrideModalOpen(false);
                openProfile(selectedAttendee.id);
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to apply override');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setOverrideSubmitting(false);
        }
    };

    // Run Counter Allocation on Existing Attendees
    const handleRunCounterAllocation = async (e) => {
        if (e) e.preventDefault();
        setAllocatingCounters(true);
        try {
            const res = await fetch('/api/onepass/attendees/counters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    rules: counterRules.map(r => ({
                        name: r.name,
                        pattern: r.pattern,
                        capacity: Number(r.capacity) || 30,
                        startCounter: r.startCounter ? Number(r.startCounter) : undefined,
                        prefix: r.prefix || 'Counter '
                    }))
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Successfully allocated counters! Assigned: ${data.assignedCount} attendees across ${data.totalCounters} desk(s).`);
                setCounterModalOpen(false);
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to allocate counters');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to connect to server');
        } finally {
            setAllocatingCounters(false);
        }
    };

    // Clear all desk counters
    const handleClearCounters = async () => {
        if (!confirm('Are you sure you want to clear all counter desk assignments for this event?')) return;
        setAllocatingCounters(true);
        try {
            const res = await fetch(`/api/onepass/attendees/counters?eventId=${eventId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert('Cleared counter assignments for all attendees.');
                setCounterModalOpen(false);
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to clear counters');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAllocatingCounters(false);
        }
    };

    // Single Uncheck-In
    const handleUncheckIn = async (attendeeId, attendeeName) => {
        if (!confirm(`Are you sure you want to uncheck-in "${attendeeName}"? This will revert their check-in status and release allocated session seats.`)) return;
        try {
            const res = await fetch('/api/onepass/checkin/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, attendeeId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (selectedAttendee && selectedAttendee.id === attendeeId) {
                    openProfile(attendeeId);
                }
                fetchAttendees();
            } else {
                alert(data.error || data.message || 'Failed to uncheck-in attendee');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to communicate with server');
        }
    };

    // Bulk Uncheck-In
    const handleBulkUncheckIn = async () => {
        const selectedCheckedIn = attendees.filter(a => selectedIds.includes(a.id) && a.check_in_status === 'CHECKED_IN');
        if (selectedCheckedIn.length === 0) {
            alert('None of the selected attendees are currently checked in.');
            return;
        }

        if (!confirm(`Are you sure you want to uncheck-in ${selectedCheckedIn.length} attendee(s)? This will revert their check-in status and release allocated session seats.`)) {
            return;
        }

        setBulkOperating(true);
        try {
            const res = await fetch('/api/onepass/checkin/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    attendeeIds: selectedCheckedIn.map(a => a.id)
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSelectedIds([]);
                fetchAttendees();
            } else {
                alert(data.error || data.message || 'Failed to bulk uncheck-in attendees.');
            }
        } catch (err) {
            console.error(err);
            alert('Communication error with server.');
        } finally {
            setBulkOperating(false);
        }
    };

    // Bulk Check-In
    const handleBulkCheckInSubmit = async (e) => {
        if (e) e.preventDefault();
        const selectedPending = attendees.filter(a => selectedIds.includes(a.id) && a.check_in_status !== 'CHECKED_IN');
        if (selectedPending.length === 0) {
            alert('All selected attendees are already checked in.');
            return;
        }

        setBulkOperating(true);
        try {
            const res = await fetch('/api/onepass/attendees/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    action: 'CHECK_IN',
                    attendeeIds: selectedPending.map(a => a.id),
                    trackId: bulkSelectedTrack || null,
                    workshopId: bulkSelectedWorkshop || null
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setBulkCheckInModalOpen(false);
                setSelectedIds([]);
                fetchAttendees();
            } else {
                alert(data.error || data.message || 'Failed to bulk check-in attendees.');
            }
        } catch (err) {
            console.error(err);
            alert('Communication error with server.');
        } finally {
            setBulkOperating(false);
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`CRITICAL: Are you sure you want to permanently delete ${selectedIds.length} attendee(s)? This cannot be undone.`)) {
            return;
        }

        setBulkOperating(true);
        try {
            const res = await fetch('/api/onepass/attendees/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    action: 'DELETE',
                    attendeeIds: selectedIds
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSelectedIds([]);
                fetchAttendees();
            } else {
                alert(data.error || data.message || 'Failed to bulk delete attendees.');
            }
        } catch (err) {
            console.error(err);
            alert('Communication error with server.');
        } finally {
            setBulkOperating(false);
        }
    };

    // Bulk Export to CSV
    const handleExportSelectedCSV = () => {
        const selectedList = attendees.filter(a => selectedIds.includes(a.id));
        if (selectedList.length === 0) return;

        const headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Booking ID', 'QR Identifier', 'Counter Desk', 'Counter Category', 'Check-In Status', 'Check-In Time', 'Checked In By', 'Session / Track'];
        const rows = selectedList.map(a => [
            `"${(a.name || '').replace(/"/g, '""')}"`,
            `"${(a.email || '').replace(/"/g, '""')}"`,
            `"${(a.phone || '').replace(/"/g, '""')}"`,
            `"${(a.ticket_type || '').replace(/"/g, '""')}"`,
            `"${(a.booking_id || '').replace(/"/g, '""')}"`,
            `"${(a.qr_identifier || '').replace(/"/g, '""')}"`,
            `"${(a.counter || 'Unassigned').replace(/"/g, '""')}"`,
            `"${(a.counter_category || '').replace(/"/g, '""')}"`,
            `"${(a.check_in_status || 'NOT_CHECKED_IN').replace(/"/g, '""')}"`,
            `"${(a.check_in_time ? new Date(a.check_in_time).toLocaleString() : '').replace(/"/g, '""')}"`,
            `"${(a.checked_in_by_name || '').replace(/"/g, '""')}"`,
            `"${(a.workshop_name ? `Lab: ${a.workshop_name}` : a.track_name || 'Unassigned').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `onepass_attendees_${eventId}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export Attendees Roster to PDF (Landscape Format with all fields & timestamps)
    const handleExportPDF = (listToExport = null) => {
        const list = listToExport || (selectedIds.length > 0 ? attendees.filter(a => selectedIds.includes(a.id)) : attendees);
        if (!list || list.length === 0) {
            alert('No attendees to export.');
            return;
        }

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            let y = 14;

            const drawHeader = () => {
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
                doc.text('Status', 228, y + 5);
                doc.text('Check-In Timestamp', 255, y + 5);
                y += 8.5;
            };

            // Main Banner on First Page
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text('AWS Community Day — Attendees Check-In Roster', 12, 10);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            const checkedCount = list.filter(a => a.check_in_status === 'CHECKED_IN').length;
            doc.text(`Generated: ${new Date().toLocaleString()} • Exported: ${list.length} Attendees • Checked-In: ${checkedCount}`, 12, 17);
            y = 28;

            drawHeader();

            list.forEach((a, idx) => {
                if (y + 6.5 > pageHeight - 14) {
                    doc.addPage();
                    y = 12;
                    drawHeader();
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
                doc.text(`AWS Community Day Attendee Manifest • Page ${i} of ${totalPages}`, 12, pageHeight - 6);
                doc.text(`Official Cloud Record (${Date.now()})`, pageWidth - 60, pageHeight - 6);
            }

            doc.save(`OnePass_Attendees_${Date.now()}.pdf`);
        } catch (e) {
            console.error('PDF export failed:', e);
            alert('Failed to generate Attendees PDF');
        }
    };

    const handleDeleteAttendee = async (attendeeId, attendeeName) => {
        if (!confirm(`Are you sure you want to permanently delete attendee "${attendeeName}"?`)) return;
        try {
            const res = await fetch(`/api/onepass/attendees/${attendeeId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setProfileDrawerOpen(false);
                setSelectedAttendee(null);
                fetchAttendees();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete attendee');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAttendee = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/onepass/attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newAttendee
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCreateModalOpen(false);
                setNewAttendee({ name: '', email: '', phone: '', ticket_type: 'Attendee', booking_id: '', qr_identifier: '', counter: '' });
                fetchAttendees();
            } else {
                alert(data.error || 'Failed to create attendee');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate unique counters for filter dropdown
    const availableCounters = useMemo(() => {
        const counters = new Set();
        attendees.forEach(a => {
            if (a.counter) counters.add(a.counter);
        });
        return Array.from(counters).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }, [attendees]);

    // Calculate selection statistics
    const selectedCount = selectedIds.length;
    const selectedCheckedInCount = attendees.filter(a => selectedIds.includes(a.id) && a.check_in_status === 'CHECKED_IN').length;
    const selectedPendingCount = attendees.filter(a => selectedIds.includes(a.id) && a.check_in_status !== 'CHECKED_IN').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Attendees Directory</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Search, multi-select, check-in, uncheck-in, allocate registration desk counters, and export records.
                    </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button
                        onClick={() => handleExportPDF()}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                        title="Export current attendees as a PDF manifest"
                    >
                        <Printer className="w-4 h-4 text-purple-400" />
                        <span>Export PDF</span>
                    </button>

                    <button
                        onClick={() => setCounterModalOpen(true)}
                        className="flex items-center space-x-2 px-3.5 py-2 bg-[#151c2e] hover:bg-[#1a2540] text-[#4F8EF7] border border-[#0073BB]/40 font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                        title="Configure and assign attendee registration desks"
                    >
                        <Sparkles className="w-4 h-4 text-[#0073BB]" />
                        <span>Allocate Desks</span>
                        {counterStats && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#0073BB]/20 text-white font-mono text-[10px]">
                                {counterStats.totalAssigned}/{counterStats.totalAttendees}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Attendee</span>
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3 relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search Name, Email, Booking ID, or QR..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB]"
                    />
                </div>

                <div className="sm:col-span-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Statuses</option>
                        <option value="CHECKED_IN">Checked In</option>
                        <option value="NOT_CHECKED_IN">Pending</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <select
                        value={counterFilter}
                        onChange={(e) => setCounterFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Desks / Counters</option>
                        {availableCounters.map(c => (
                            <option key={c} value={c}>🏷️ {c}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Tracks</option>
                        {tracks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-3">
                    <select
                        value={volunteerFilter}
                        onChange={(e) => setVolunteerFilter(e.target.value)}
                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#0073BB]"
                    >
                        <option value="">All Volunteers / Staff</option>
                        {volunteers.map(v => (
                            <option key={v.id} value={v.id}>👤 {v.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Selection Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] text-slate-500">Quick Select:</span>
                    <button
                        onClick={toggleSelectAll}
                        className="px-2.5 py-1 rounded-lg bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 transition text-[11px]"
                    >
                        {isAllSelected ? 'Deselect All' : 'Select All Filtered'}
                    </button>
                    <button
                        onClick={selectOnlyCheckedIn}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition text-[11px]"
                    >
                        All Checked-In ({attendees.filter(a => a.check_in_status === 'CHECKED_IN').length})
                    </button>
                    <button
                        onClick={selectOnlyPending}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition text-[11px]"
                    >
                        All Pending ({attendees.filter(a => a.check_in_status !== 'CHECKED_IN').length})
                    </button>
                </div>
                {selectedCount > 0 && (
                    <div className="font-mono text-[11px] text-[#4F8EF7] font-semibold">
                        {selectedCount} attendee{selectedCount !== 1 ? 's' : ''} selected
                    </div>
                )}
            </div>

            {/* Attendees Table */}
            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0C111D] border-b border-[#1a2540] text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                                <th className="w-12 px-4 py-3.5 text-center">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="text-slate-400 hover:text-white transition flex items-center justify-center mx-auto"
                                        title={isAllSelected ? 'Deselect All' : 'Select All'}
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="w-4 h-4 text-[#0073BB]" />
                                        ) : isPartiallySelected ? (
                                            <MinusSquare className="w-4 h-4 text-[#0073BB]" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-3.5">Attendee</th>
                                <th className="px-4 py-3.5">Ticket</th>
                                <th className="px-4 py-3.5">Desk / Counter</th>
                                <th className="px-4 py-3.5">QR Identifier</th>
                                <th className="px-4 py-3.5">Assigned Session</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="px-4 py-3.5">Checked In By</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2540] text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0073BB]" />
                                        <span>Loading attendee roster...</span>
                                    </td>
                                </tr>
                            ) : attendees.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                        No attendees found matching the filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                attendees.map((a) => {
                                    const isCheckedIn = a.check_in_status === 'CHECKED_IN';
                                    const isSelected = selectedIds.includes(a.id);
                                    const sessionDisplay = a.workshop_name ? (
                                        <span className="text-amber-300 font-medium font-mono text-[11px]">Lab: {a.workshop_name}</span>
                                    ) : a.track_name ? (
                                        <span className="text-white font-medium">{a.track_name}</span>
                                    ) : (
                                        <span className="text-slate-600 font-mono">Unassigned</span>
                                    );

                                    return (
                                        <tr
                                            key={a.id}
                                            onClick={() => openProfile(a.id)}
                                            className={`cursor-pointer transition ${
                                                isSelected
                                                    ? 'bg-[#0073BB]/15 hover:bg-[#0073BB]/25'
                                                    : 'hover:bg-[#1a2540]/50'
                                            }`}
                                        >
                                            <td
                                                className="w-12 px-4 py-3.5 text-center"
                                                onClick={(e) => toggleSelectAttendee(a.id, e)}
                                            >
                                                <button
                                                    type="button"
                                                    className="flex items-center justify-center mx-auto text-slate-400 hover:text-white transition"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-[#0073BB]" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-white">{a.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{a.email}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="px-2 py-0.5 rounded bg-[#0C111D] text-slate-300 text-[10px] font-medium border border-[#1a2540]">
                                                    {a.ticket_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {a.counter ? (
                                                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border whitespace-nowrap ${
                                                        (a.counter_category || '').toLowerCase().includes('workshop')
                                                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                                            : 'bg-[#0073BB]/15 text-[#4F8EF7] border-[#0073BB]/30'
                                                    }`}>
                                                        🏷️ {a.counter}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 font-mono text-[10px]">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-[#4F8EF7] font-semibold">
                                                {a.qr_identifier}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {sessionDisplay}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {isCheckedIn ? (
                                                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Checked In</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center space-x-1 text-slate-400 bg-[#0C111D] px-2 py-0.5 rounded-full text-[11px] border border-[#1a2540]">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Pending</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {isCheckedIn && a.checked_in_by_name ? (
                                                    <div>
                                                        <div className="font-semibold text-white flex items-center space-x-1">
                                                            <span className="text-[10px]">👤</span>
                                                            <span className="text-[#4F8EF7]">{a.checked_in_by_name}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </div>
                                                    </div>
                                                ) : isCheckedIn ? (
                                                    <span className="text-slate-400 font-mono text-[11px]">Verified</span>
                                                ) : (
                                                    <span className="text-slate-600 font-mono">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                {isCheckedIn && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUncheckIn(a.id, a.name)}
                                                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition text-xs font-medium inline-flex items-center space-x-1"
                                                        title="Revert Check-In & Release Seat"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        <span>Uncheck-In</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openProfile(a.id)}
                                                    className="px-3 py-1.5 bg-[#1a2540] hover:bg-[#0073BB] text-white rounded-lg transition text-xs font-medium"
                                                >
                                                    Profile
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAttendee(a.id, a.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#0C111D] transition"
                                                    title="Delete Attendee"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="px-6 py-3 bg-[#0C111D] border-t border-[#1a2540] text-xs text-slate-400 flex items-center justify-between font-mono">
                    <span>Showing {attendees.length} attendees</span>
                    <span>Total Database: {attendees.length}</span>
                </div>
            </div>

            {/* FLOATING MULTI-SELECT ACTION BAR */}
            {selectedCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl bg-[#0C111D]/95 backdrop-blur-md border border-[#0073BB]/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/40 rounded-full font-mono text-xs font-bold">
                            {selectedCount} Selected
                        </span>
                        <span className="text-xs text-slate-300 hidden sm:inline">
                            ({selectedCheckedInCount} Checked In, {selectedPendingCount} Pending)
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedCheckedInCount > 0 && (
                            <button
                                type="button"
                                onClick={handleBulkUncheckIn}
                                disabled={bulkOperating}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition disabled:opacity-50"
                                title="Revert Check-In for selected attendees"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${bulkOperating ? 'animate-spin' : ''}`} />
                                <span>Uncheck-In ({selectedCheckedInCount})</span>
                            </button>
                        )}

                        {selectedPendingCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setBulkCheckInModalOpen(true)}
                                disabled={bulkOperating}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition disabled:opacity-50"
                                title="Check In selected attendees"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Check-In ({selectedPendingCount})</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleExportSelectedCSV}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a2540] hover:bg-[#1a2540]/80 text-white rounded-xl text-xs font-semibold transition"
                            title="Export selected records to CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-[#0073BB]" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={bulkOperating}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                            title="Delete selected attendees"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2540] transition"
                            title="Clear Selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Check-In Modal */}
            {bulkCheckInModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span>Bulk Check-In ({selectedPendingCount} Attendees)</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Check in selected pending attendees and optionally assign them to a Track or Workshop session.
                            </p>
                        </div>

                        <form onSubmit={handleBulkCheckInSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Assign Track (Optional)</label>
                                <select
                                    value={bulkSelectedTrack}
                                    onChange={(e) => {
                                        setBulkSelectedTrack(e.target.value);
                                        if (e.target.value) setBulkSelectedWorkshop('');
                                    }}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Track Assignment (General Entry)</option>
                                    {tracks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.occupancy}/{t.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Or Assign Workshop (Optional)</label>
                                <select
                                    value={bulkSelectedWorkshop}
                                    onChange={(e) => {
                                        setBulkSelectedWorkshop(e.target.value);
                                        if (e.target.value) setBulkSelectedTrack('');
                                    }}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Workshop Assignment</option>
                                    {workshops.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.occupancy}/{w.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setBulkCheckInModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bulkOperating}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    {bulkOperating ? 'Processing...' : `Confirm Check-In (${selectedPendingCount})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Drawer */}
            {profileDrawerOpen && selectedAttendee && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setProfileDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#151c2e] border-l border-[#1a2540] h-full p-6 overflow-y-auto space-y-6 z-10 shadow-2xl">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-[#1a2540]">
                            <div>
                                <h2 className="text-lg font-bold text-white">{selectedAttendee.name}</h2>
                                <p className="text-xs text-[#4F8EF7] font-mono">{selectedAttendee.qr_identifier}</p>
                            </div>
                            <button
                                onClick={() => setProfileDrawerOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Fast Action Buttons */}
                        <div className="space-y-2">
                            {selectedAttendee.check_in_status === 'CHECKED_IN' && (
                                <button
                                    type="button"
                                    onClick={() => handleUncheckIn(selectedAttendee.id, selectedAttendee.name)}
                                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Uncheck-In Attendee</span>
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOverrideModalOpen(true)}
                                    className="flex items-center justify-center space-x-1.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Override</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDeleteAttendee(selectedAttendee.id, selectedAttendee.name)}
                                    className="flex items-center justify-center space-x-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>

                        {/* Attendee Details Card */}
                        <div className="p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Booking Reference</span>
                                <span className="font-mono text-white font-semibold">{selectedAttendee.booking_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Email Address</span>
                                <span className="text-white">{selectedAttendee.email}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Phone Number</span>
                                <span className="text-white">{selectedAttendee.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Ticket Category</span>
                                <span className="px-2 py-0.5 bg-[#151c2e] rounded text-[#4F8EF7] font-medium border border-[#1a2540]">{selectedAttendee.ticket_type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Registration Desk / Counter</span>
                                <span className="font-mono font-bold">
                                    {selectedAttendee.counter ? (
                                        <span className={`px-2 py-0.5 rounded border text-[11px] ${
                                            (selectedAttendee.counter_category || '').toLowerCase().includes('workshop')
                                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                                : 'bg-[#0073BB]/15 text-[#4F8EF7] border-[#0073BB]/30'
                                        }`}>
                                            🏷️ {selectedAttendee.counter} {selectedAttendee.counter_category ? `(${selectedAttendee.counter_category})` : ''}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">Unassigned</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]">
                                <span className="text-slate-400">Check-in Status</span>
                                <span className={selectedAttendee.check_in_status === 'CHECKED_IN' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                    {selectedAttendee.check_in_status}
                                </span>
                            </div>
                            {selectedAttendee.check_in_time && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Check-in Timestamp</span>
                                    <span className="font-mono text-slate-300">{new Date(selectedAttendee.check_in_time).toLocaleString()}</span>
                                </div>
                            )}
                            {selectedAttendee.checked_in_by_name && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Checked In By</span>
                                    <span className="px-2 py-0.5 rounded bg-[#0073BB]/15 text-[#4F8EF7] font-semibold border border-[#0073BB]/30 font-mono text-[11px]">
                                        👤 {selectedAttendee.checked_in_by_name} ({selectedAttendee.checked_in_by_role || 'VOLUNTEER'})
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Assigned Track</span>
                                <span className="text-white font-semibold">{selectedAttendee.assigned_track?.name || 'None'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Assigned Workshop</span>
                                <span className="text-amber-300 font-semibold">{selectedAttendee.assigned_workshop?.name || 'None'}</span>
                            </div>
                        </div>

                        {/* Meal & Swag Claims Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Resource & Meal Claims</h3>
                            <div className="space-y-2">
                                {(!selectedAttendee.claims || selectedAttendee.claims.length === 0) ? (
                                    <div className="p-3 bg-[#0C111D] rounded-xl text-xs text-slate-500 text-center">No meals or swag claimed yet.</div>
                                ) : (
                                    selectedAttendee.claims.map((c) => (
                                        <div key={c.id} className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540] flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-white">{c.resource?.name || 'Resource'}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{new Date(c.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">CLAIMED</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Gate Access Logs */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Gate Access Attempts</h3>
                            <div className="space-y-2">
                                {(!selectedAttendee.track_access_logs || selectedAttendee.track_access_logs.length === 0) ? (
                                    <div className="p-3 bg-[#0C111D] rounded-xl text-xs text-slate-500 text-center">No gate access logs recorded.</div>
                                ) : (
                                    selectedAttendee.track_access_logs.map((l) => (
                                        <div key={l.id} className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540] flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-white">{l.track?.name || 'Track Gate'}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{new Date(l.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${l.result === 'GRANTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {l.result}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Override Modal */}
            {overrideModalOpen && selectedAttendee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                <ShieldCheck className="w-5 h-5 text-[#FF9900]" />
                                <span>Administrator Override</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Modify desk counter, track, workshop, or check-in status for <strong>{selectedAttendee.name}</strong>. All changes are permanently audited.
                            </p>
                        </div>

                        <form onSubmit={handleAdminOverride} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Desk Counter</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Counter 1"
                                        value={overrideCounter}
                                        onChange={(e) => setOverrideCounter(e.target.value)}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB] font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Counter Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Workshop or Tracks"
                                        value={overrideCounterCategory}
                                        onChange={(e) => setOverrideCounterCategory(e.target.value)}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Assigned Track</label>
                                <select
                                    value={overrideTrackId}
                                    onChange={(e) => setOverrideTrackId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Track Assigned</option>
                                    {tracks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.occupancy}/{t.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Assigned Workshop</label>
                                <select
                                    value={overrideWorkshopId}
                                    onChange={(e) => setOverrideWorkshopId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">No Workshop Assigned</option>
                                    {workshops.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.occupancy}/{w.capacity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Check-in Status</label>
                                <select
                                    value={overrideCheckInStatus}
                                    onChange={(e) => setOverrideCheckInStatus(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                >
                                    <option value="NOT_CHECKED_IN">NOT CHECKED IN</option>
                                    <option value="CHECKED_IN">CHECKED IN</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Override Reason (Mandatory for Audit Trail)</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="e.g. Attendee assigned to different registration desk / session at support helpdesk."
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOverrideModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={overrideSubmitting || !overrideReason.trim()}
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    {overrideSubmitting ? 'Applying Override...' : 'Confirm Override'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Counter Allocation Modal */}
            {counterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between pb-4 border-b border-[#1a2540]">
                            <div className="space-y-1">
                                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0073BB]/20 text-[#4F8EF7] text-xs font-mono font-bold">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Smart Desk Allocation Engine</span>
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Allocate Registration Desks / Counters</h2>
                                <p className="text-xs text-slate-400">
                                    Group attendees into physical check-in counters (e.g. 30 per counter) for Workshop vs Tracks/General tickets.
                                </p>
                            </div>
                            <button
                                onClick={() => setCounterModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2540] transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Current Stats Overview */}
                        {counterStats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540]">
                                <div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500">Total Attendees</div>
                                    <div className="text-lg font-extrabold text-white font-mono">{counterStats.totalAttendees}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500">Desks Assigned</div>
                                    <div className="text-lg font-extrabold text-emerald-400 font-mono">{counterStats.totalAssigned}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500">Unassigned</div>
                                    <div className="text-lg font-extrabold text-amber-400 font-mono">{counterStats.unassigned}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500">Active Counters</div>
                                    <div className="text-lg font-extrabold text-[#4F8EF7] font-mono">{counterStats.counters?.length || 0}</div>
                                </div>
                            </div>
                        )}

                        {/* Rules Configuration */}
                        <form onSubmit={handleRunCounterAllocation} className="space-y-4 text-xs">
                            <div className="space-y-3">
                                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono">
                                    Sequential Counter Allocation Rules
                                </label>

                                {counterRules.map((rule, idx) => (
                                    <div key={rule.id} className="p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white font-mono flex items-center space-x-2">
                                                <span className="w-5 h-5 rounded-full bg-[#0073BB] text-white flex items-center justify-center text-[10px]">
                                                    {idx + 1}
                                                </span>
                                                <span>{rule.name}</span>
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                Pattern: <code className="text-[#4F8EF7]">{rule.pattern}</code>
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-slate-400 text-[11px]">Rule Name / Category</label>
                                                <input
                                                    type="text"
                                                    value={rule.name}
                                                    onChange={(e) => {
                                                        const updated = [...counterRules];
                                                        updated[idx].name = e.target.value;
                                                        setCounterRules(updated);
                                                    }}
                                                    className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-slate-400 text-[11px]">Capacity Per Counter Desk</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="500"
                                                    value={rule.capacity}
                                                    onChange={(e) => {
                                                        const updated = [...counterRules];
                                                        updated[idx].capacity = Number(e.target.value) || 30;
                                                        setCounterRules(updated);
                                                    }}
                                                    className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#0073BB]"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-slate-400 text-[11px]">
                                                    {idx === 0 ? 'Start Counter #' : 'Start Counter # (Auto if empty)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Auto sequential"
                                                    value={rule.startCounter}
                                                    onChange={(e) => {
                                                        const updated = [...counterRules];
                                                        updated[idx].startCounter = e.target.value;
                                                        setCounterRules(updated);
                                                    }}
                                                    className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#0073BB]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Existing Counter Breakdown Pills */}
                            {counterStats?.counters && counterStats.counters.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-[#1a2540]">
                                    <div className="text-[11px] font-mono text-slate-400 uppercase">Existing Assigned Desks:</div>
                                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                                        {counterStats.counters.map(c => (
                                            <span
                                                key={c.counter}
                                                className="px-2.5 py-1 rounded-xl bg-[#0C111D] border border-[#1a2540] font-mono text-[11px] text-slate-300 flex items-center space-x-1.5"
                                            >
                                                <span className="font-bold text-[#4F8EF7]">{c.counter}</span>
                                                <span className="text-slate-500">({c.count} attendees)</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1a2540]">
                                <button
                                    type="button"
                                    onClick={handleClearCounters}
                                    disabled={allocatingCounters}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl transition disabled:opacity-50 text-xs"
                                >
                                    Clear All Counters
                                </button>

                                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setCounterModalOpen(false)}
                                        className="px-4 py-2.5 text-slate-400 hover:text-white rounded-xl transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={allocatingCounters}
                                        className="flex items-center space-x-2 px-6 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-extrabold rounded-xl transition shadow-lg shadow-[#0073BB]/25 disabled:opacity-50 text-xs"
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${allocatingCounters ? 'animate-spin' : ''}`} />
                                        <span>{allocatingCounters ? 'Allocating...' : 'Run Desk Allocation'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Single Attendee Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <h2 className="text-lg font-bold text-white">Add Attendee</h2>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAttendee} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newAttendee.name}
                                    onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={newAttendee.email}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Phone</label>
                                    <input
                                        type="text"
                                        value={newAttendee.phone}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Ticket Type</label>
                                    <select
                                        value={newAttendee.ticket_type}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, ticket_type: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    >
                                        <option value="Attendee">Attendee</option>
                                        <option value="VIP Attendee">VIP Attendee</option>
                                        <option value="Speaker">Speaker</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Volunteer">Volunteer</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Booking ID (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if empty"
                                        value={newAttendee.booking_id}
                                        onChange={(e) => setNewAttendee({ ...newAttendee, booking_id: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Registration Desk / Counter (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Counter 1"
                                    value={newAttendee.counter || ''}
                                    onChange={(e) => setNewAttendee({ ...newAttendee, counter: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#0073BB] font-mono"
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
                                    className="px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl"
                                >
                                    Save Attendee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
