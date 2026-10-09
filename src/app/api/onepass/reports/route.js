import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const reportType = searchParams.get('type') || 'attendees';
        const format = (searchParams.get('format') || 'csv').toLowerCase();

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const event = OnePassDB.getEventById(eventId);
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const db = OnePassDB.getSnapshot();
        const [
            attendees,
            tracks,
            workshops,
            foodResources,
            swagResources,
            counterStats,
            eventVolunteers,
            users,
            resourceClaims
        ] = await Promise.all([
            OnePassDB.getAttendees(eventId),
            OnePassDB.getTracks(eventId),
            OnePassDB.getWorkshops(eventId),
            OnePassDB.getResources(eventId, 'FOOD'),
            OnePassDB.getResources(eventId, 'SWAG'),
            OnePassDB.getCounterStats(eventId),
            OnePassDB.getEventVolunteers(eventId),
            OnePassDB.getUsers(),
            OnePassDB.getResourceClaims(eventId)
        ]);

        const allResources = [...foodResources, ...swagResources];
        const trackLogs = db.track_access_logs ? db.track_access_logs.filter(l => l.event_id === eventId) : [];
        const workshopLogs = db.workshop_access_logs ? db.workshop_access_logs.filter(l => l.event_id === eventId) : [];
        const auditLogs = db.audit_logs ? db.audit_logs.filter(l => l.event_id === eventId || l.event_id === 'GLOBAL') : [];
        const volunteersList = Array.isArray(eventVolunteers) ? eventVolunteers : [];
        const usersList = Array.isArray(users) ? users : [];
        const claimsList = Array.isArray(resourceClaims) ? resourceClaims : [];

        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const eventSafeName = (event.name || 'Event').replace(/\s+/g, '_');

        // ═══════════════════════════════════════════════════════════════════
        // HELPER FUNCTIONS FOR DETAILED DATASETS
        // ═══════════════════════════════════════════════════════════════════
        const getMasterAttendeeRows = () => attendees.map((a, idx) => {
            const trk = tracks.find(t => t.id === a.assigned_track_id);
            const wk = workshops.find(w => w.id === a.assigned_workshop_id);
            return {
                'S.No': idx + 1,
                'Attendee ID': a.id || '',
                'Full Name': a.name || '',
                'Email Address': a.email || '',
                'Phone Number': a.phone || '',
                'Ticket Type': a.ticket_type || 'Attendee',
                'Booking ID': a.booking_id || '',
                'QR Identifier': a.qr_identifier || '',
                'Badge Counter': a.counter || 'Unassigned',
                'Counter Box #': a.counter_number || '',
                'Check-in Status': a.check_in_status || 'NOT_CHECKED_IN',
                'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'Not Checked In',
                'Checked In By': a.checked_in_by_name || 'N/A',
                'Assigned Track': trk ? trk.name : (a.assigned_track_id || 'None'),
                'Assigned Workshop': wk ? wk.name : (a.assigned_workshop_id || 'None'),
                'Registration Date': a.created_at ? new Date(a.created_at).toLocaleString() : ''
            };
        });

        const getCheckedInRows = () => {
            const checkedInList = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
            return checkedInList.map((a, idx) => {
                const trk = tracks.find(t => t.id === a.assigned_track_id);
                const wk = workshops.find(w => w.id === a.assigned_workshop_id);
                return {
                    'S.No': idx + 1,
                    'Full Name': a.name || '',
                    'Email Address': a.email || '',
                    'Phone': a.phone || '',
                    'Ticket Type': a.ticket_type || 'Attendee',
                    'Booking ID': a.booking_id || '',
                    'QR Code': a.qr_identifier || '',
                    'Badge Counter': a.counter || 'Unassigned',
                    'Counter Box #': a.counter_number || '',
                    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : '',
                    'Checked In By': a.checked_in_by_name || 'Volunteer',
                    'Allocated Session': trk ? `Track: ${trk.name}` : (wk ? `Workshop: ${wk.name}` : 'General Admission')
                };
            });
        };

        const getTrackSummaryRows = () => tracks.map((t, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_track_id === t.id).length;
            const assignedTotal = attendees.filter(a => a.assigned_track_id === t.id).length;
            const cap = t.capacity || 150;
            const rate = cap > 0 ? ((occ / cap) * 100).toFixed(1) : '0.0';
            return {
                'S.No': idx + 1,
                'Track Name': t.name || '',
                'Description': t.description || '',
                'Maximum Capacity': cap,
                'Total Assigned': assignedTotal,
                'Checked-In Occupancy': occ,
                'Remaining Available Seats': Math.max(0, cap - occ),
                'Occupancy Rate': `${rate}%`,
                'Status': occ >= cap ? 'FULL' : 'OPEN'
            };
        });

        const getTrackAttendeeRows = (specificTrackId = null) => {
            let filtered = attendees;
            if (specificTrackId) {
                filtered = attendees.filter(a => a.assigned_track_id === specificTrackId);
            } else {
                filtered = attendees.filter(a => !!a.assigned_track_id);
            }
            return filtered.map((a, idx) => {
                const trk = tracks.find(t => t.id === a.assigned_track_id);
                return {
                    'S.No': idx + 1,
                    'Attendee Name': a.name || '',
                    'Email Address': a.email || '',
                    'Phone Number': a.phone || '',
                    'Ticket Type': a.ticket_type || 'Attendee',
                    'Booking ID': a.booking_id || '',
                    'QR Identifier': a.qr_identifier || '',
                    'Badge Counter': a.counter || 'Unassigned',
                    'Counter Box #': a.counter_number || '',
                    'Assigned Track': trk ? trk.name : (a.assigned_track_id || 'None'),
                    'Check-in Status': a.check_in_status || 'NOT_CHECKED_IN',
                    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'Not Checked In',
                    'Checked In By': a.checked_in_by_name || 'N/A'
                };
            });
        };

        const getWorkshopSummaryRows = () => workshops.map((w, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_workshop_id === w.id).length;
            const assignedTotal = attendees.filter(a => a.assigned_workshop_id === w.id).length;
            const cap = w.capacity || 30;
            const rate = cap > 0 ? ((occ / cap) * 100).toFixed(1) : '0.0';
            return {
                'S.No': idx + 1,
                'Workshop Name': w.name || '',
                'Speaker': w.speaker || '',
                'Location / Room': w.location || w.venue || '',
                'Timing Window': `${w.start_time || ''} - ${w.end_time || ''}`,
                'Maximum Capacity': cap,
                'Total Enrolled': assignedTotal,
                'Checked-In Occupancy': occ,
                'Remaining Seats': Math.max(0, cap - occ),
                'Occupancy Rate': `${rate}%`,
                'Status': occ >= cap ? 'FULL' : 'OPEN'
            };
        });

        const getWorkshopAttendeeRows = (specificWorkshopId = null) => {
            let filtered = attendees;
            if (specificWorkshopId) {
                filtered = attendees.filter(a => a.assigned_workshop_id === specificWorkshopId);
            } else {
                filtered = attendees.filter(a => !!a.assigned_workshop_id);
            }
            return filtered.map((a, idx) => {
                const wk = workshops.find(w => w.id === a.assigned_workshop_id);
                return {
                    'S.No': idx + 1,
                    'Attendee Name': a.name || '',
                    'Email Address': a.email || '',
                    'Phone Number': a.phone || '',
                    'Ticket Type': a.ticket_type || 'Attendee',
                    'Booking ID': a.booking_id || '',
                    'QR Identifier': a.qr_identifier || '',
                    'Badge Counter': a.counter || 'Unassigned',
                    'Counter Box #': a.counter_number || '',
                    'Workshop Name': wk ? wk.name : (a.assigned_workshop_id || 'None'),
                    'Speaker': wk ? (wk.speaker || '') : '',
                    'Location / Hall': wk ? (wk.location || wk.venue || '') : '',
                    'Check-in Status': a.check_in_status || 'NOT_CHECKED_IN',
                    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'Not Checked In',
                    'Checked In By': a.checked_in_by_name || 'N/A'
                };
            });
        };

        const getFoodRows = () => foodResources.map((r, idx) => {
            const claims = claimsList.filter(c => c.resource_id === r.id).length;
            const cap = r.capacity || 450;
            const distributed = claims > 0 ? claims : (r.claims_count || 0);
            return {
                'S.No': idx + 1,
                'Meal Item': r.name || '',
                'Description': r.description || '',
                'Start Window': r.start_time || 'Open',
                'End Window': r.end_time || 'Open',
                'Claim Limit Per Attendee': r.claim_limit || 1,
                'Total Meals Distributed': distributed,
                'Total Stock / Capacity': cap,
                'Remaining Stock': Math.max(0, cap - distributed),
                'Distribution Rate': cap > 0 ? `${(((distributed) / cap) * 100).toFixed(1)}%` : 'N/A'
            };
        });

        const getSwagRows = () => swagResources.map((r, idx) => {
            const claims = claimsList.filter(c => c.resource_id === r.id).length;
            const cap = r.capacity || 400;
            const distributed = claims > 0 ? claims : (r.claims_count || 0);
            return {
                'S.No': idx + 1,
                'Swag Item Name': r.name || '',
                'Description': r.description || '',
                'Claim Limit': r.claim_limit || 1,
                'Total Distributed': distributed,
                'Total Allocated Stock': cap,
                'Remaining Stock': Math.max(0, cap - distributed),
                'Distribution Rate': cap > 0 ? `${(((distributed) / cap) * 100).toFixed(1)}%` : 'N/A'
            };
        });

        const getCounterRows = () => counterStats.map((c, idx) => ({
            'S.No': idx + 1,
            'Counter Desk': c.counter || 'Unassigned',
            'Box Number': c.counter_number || 'N/A',
            'Category': c.category || 'General',
            'Total Badges Assigned': c.total || 0,
            'Badges Checked-In': c.checked_in || 0,
            'Badges Pending': c.pending || 0,
            'Collection Rate': c.total > 0 ? `${Math.round((c.checked_in / c.total) * 100)}%` : '0%'
        }));

        const getVolunteerRows = () => {
            const volunteerMap = new Map();
            const checkedInList = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
            const totalCheckedIn = checkedInList.length;

            checkedInList.forEach(a => {
                const volName = a.checked_in_by_name || 'Volunteer / Staff';
                const volRole = a.checked_in_by_role || (volName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');
                if (!volunteerMap.has(volName)) {
                    volunteerMap.set(volName, {
                        volunteer_name: volName,
                        volunteer_role: volRole,
                        count: 0,
                        first_checkin: a.check_in_time,
                        last_checkin: a.check_in_time
                    });
                }
                const entry = volunteerMap.get(volName);
                entry.count += 1;
                if (a.check_in_time) {
                    if (!entry.first_checkin || new Date(a.check_in_time) < new Date(entry.first_checkin)) {
                        entry.first_checkin = a.check_in_time;
                    }
                    if (!entry.last_checkin || new Date(a.check_in_time) > new Date(entry.last_checkin)) {
                        entry.last_checkin = a.check_in_time;
                    }
                }
            });

            const sortedVols = Array.from(volunteerMap.values()).sort((a, b) => b.count - a.count);
            return sortedVols.map((v, idx) => ({
                'Rank': idx + 1,
                'Volunteer / Staff Name': v.volunteer_name,
                'Role': v.volunteer_role,
                'Total Attendees Checked-In': v.count,
                'Share of Total Turnout (%)': totalCheckedIn > 0 ? `${((v.count / totalCheckedIn) * 100).toFixed(1)}%` : '0%',
                'First Check-in Time': v.first_checkin ? new Date(v.first_checkin).toLocaleString() : 'N/A',
                'Last Check-in Time': v.last_checkin ? new Date(v.last_checkin).toLocaleString() : 'N/A'
            }));
        };

        const getClaimsRows = () => claimsList.map((c, idx) => {
            const res = allResources.find(r => r.id === c.resource_id);
            const att = attendees.find(a => a.id === c.attendee_id);
            const vol = usersList.find(u => u.id === c.volunteer_id);
            return {
                'S.No': idx + 1,
                'Claim ID': c.id,
                'Timestamp': c.timestamp ? new Date(c.timestamp).toLocaleString() : '',
                'Resource Item': res ? res.name : (c.resource_id || 'Resource'),
                'Resource Type': res ? res.type : 'RESOURCE',
                'Attendee Name': att ? att.name : 'Unknown',
                'Attendee Email': att ? att.email : '',
                'Attendee QR Code': att ? (att.qr_identifier || att.booking_id || '') : '',
                'Volunteer Scanner': vol ? vol.name : (c.volunteer_id || 'Volunteer')
            };
        });

        // ═══════════════════════════════════════════════════════════════════
        // EXCEL SHEET UTILITIES
        // ═══════════════════════════════════════════════════════════════════
        const sanitizeSheetName = (name, fallback) => {
            let clean = (name || fallback || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').trim();
            if (clean.length > 28) clean = clean.substring(0, 28);
            return clean || fallback || 'Sheet';
        };

        const autoFitColumns = (data) => {
            if (!data || data.length === 0) return [];
            const keys = Object.keys(data[0]);
            return keys.map(key => {
                let maxLen = key.length;
                for (let i = 0; i < Math.min(data.length, 100); i++) {
                    const val = data[i][key];
                    if (val != null) {
                        const len = String(val).length;
                        if (len > maxLen) maxLen = len;
                    }
                }
                return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
            });
        };

        const addSheetToWorkbook = (wb, sheetName, data) => {
            const cleanData = data && data.length > 0 ? data : [{ 'Notice': `No records available for ${sheetName}` }];
            const ws = XLSX.utils.json_to_sheet(cleanData);
            ws['!cols'] = autoFitColumns(cleanData);
            XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName, 'Sheet'));
        };

        const targetTrackId = searchParams.get('trackId') || searchParams.get('track_id');
        const targetWorkshopId = searchParams.get('workshopId') || searchParams.get('workshop_id');

        // ═══════════════════════════════════════════════════════════════════
        // 1. SPECIFIC / MULTI-TRACK ATTENDEE EXCEL OR CSV EXPORT
        // ═══════════════════════════════════════════════════════════════════
        if (reportType === 'track_attendees' || reportType === 'tracks_attendees' || reportType === 'per_track_workbook') {
            if (targetTrackId) {
                const targetTrack = tracks.find(t => t.id === targetTrackId);
                const trackName = targetTrack ? targetTrack.name : 'Track';
                const trackSafeName = trackName.replace(/[^a-zA-Z0-9_-]/g, '_');
                const trackData = getTrackAttendeeRows(targetTrackId);

                if (format === 'xlsx') {
                    const wb = XLSX.utils.book_new();
                    addSheetToWorkbook(wb, trackName, trackData);
                    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                    const filename = `${eventSafeName}_${trackSafeName}_Attendees_${timestampStr}.xlsx`;
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                } else {
                    const csvString = Papa.unparse(trackData.length > 0 ? trackData : [{ 'Notice': `No attendees assigned to track ${trackName}` }], { quotes: true, header: true });
                    const filename = `${eventSafeName}_${trackSafeName}_Attendees_${timestampStr}.csv`;
                    return new Response(csvString, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/csv; charset=utf-8',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                }
            } else {
                // All Tracks Multi-Tab Excel Workbook or Combined CSV
                if (format === 'xlsx' || reportType === 'per_track_workbook') {
                    const wb = XLSX.utils.book_new();
                    addSheetToWorkbook(wb, 'Tracks Overview', getTrackSummaryRows());
                    addSheetToWorkbook(wb, 'All Track Attendees', getTrackAttendeeRows());

                    // Add a dedicated tab for each track
                    tracks.forEach(t => {
                        const tAttendees = getTrackAttendeeRows(t.id);
                        addSheetToWorkbook(wb, t.name, tAttendees);
                    });

                    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                    const filename = `${eventSafeName}_Track_Wise_Attendees_${timestampStr}.xlsx`;
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                } else {
                    const trackData = getTrackAttendeeRows();
                    const csvString = Papa.unparse(trackData.length > 0 ? trackData : [{ 'Notice': 'No attendees assigned to tracks' }], { quotes: true, header: true });
                    const filename = `${eventSafeName}_All_Track_Attendees_${timestampStr}.csv`;
                    return new Response(csvString, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/csv; charset=utf-8',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 2. SPECIFIC / MULTI-WORKSHOP ATTENDEE EXCEL OR CSV EXPORT
        // ═══════════════════════════════════════════════════════════════════
        if (reportType === 'workshop_attendees' || reportType === 'workshops_attendees' || reportType === 'per_workshop_workbook') {
            if (targetWorkshopId) {
                const targetWk = workshops.find(w => w.id === targetWorkshopId);
                const wkName = targetWk ? targetWk.name : 'Workshop';
                const wkSafeName = wkName.replace(/[^a-zA-Z0-9_-]/g, '_');
                const wkData = getWorkshopAttendeeRows(targetWorkshopId);

                if (format === 'xlsx') {
                    const wb = XLSX.utils.book_new();
                    addSheetToWorkbook(wb, wkName, wkData);
                    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                    const filename = `${eventSafeName}_${wkSafeName}_Attendees_${timestampStr}.xlsx`;
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                } else {
                    const csvString = Papa.unparse(wkData.length > 0 ? wkData : [{ 'Notice': `No attendees enrolled in workshop ${wkName}` }], { quotes: true, header: true });
                    const filename = `${eventSafeName}_${wkSafeName}_Attendees_${timestampStr}.csv`;
                    return new Response(csvString, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/csv; charset=utf-8',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                }
            } else {
                // All Workshops Multi-Tab Excel Workbook or Combined CSV
                if (format === 'xlsx' || reportType === 'per_workshop_workbook') {
                    const wb = XLSX.utils.book_new();
                    addSheetToWorkbook(wb, 'Workshops Overview', getWorkshopSummaryRows());
                    addSheetToWorkbook(wb, 'All Workshop Attendees', getWorkshopAttendeeRows());

                    // Add a dedicated tab for each workshop
                    workshops.forEach(w => {
                        const wAttendees = getWorkshopAttendeeRows(w.id);
                        addSheetToWorkbook(wb, w.name, wAttendees);
                    });

                    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                    const filename = `${eventSafeName}_Workshop_Wise_Attendees_${timestampStr}.xlsx`;
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                } else {
                    const wkData = getWorkshopAttendeeRows();
                    const csvString = Papa.unparse(wkData.length > 0 ? wkData : [{ 'Notice': 'No attendees enrolled in workshops' }], { quotes: true, header: true });
                    const filename = `${eventSafeName}_All_Workshop_Attendees_${timestampStr}.csv`;
                    return new Response(csvString, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/csv; charset=utf-8',
                            'Content-Disposition': `attachment; filename="${filename}"`,
                            'Cache-Control': 'no-store, max-age=0'
                        }
                    });
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. MULTI-TAB MASTER EXCEL WORKBOOK GENERATOR (.xlsx)
        // ═══════════════════════════════════════════════════════════════════
        if (format === 'xlsx' || reportType === 'master' || reportType === 'workbook') {
            const wb = XLSX.utils.book_new();

            const checkedInCount = attendees.filter(a => a.check_in_status === 'CHECKED_IN').length;
            const foodClaimsTotal = foodResources.reduce((s, r) => {
                const liveCount = claimsList.filter(c => c.resource_id === r.id).length;
                return s + (liveCount > 0 ? liveCount : (r.claims_count || 0));
            }, 0);
            const swagClaimsTotal = swagResources.reduce((s, r) => {
                const liveCount = claimsList.filter(c => c.resource_id === r.id).length;
                return s + (liveCount > 0 ? liveCount : (r.claims_count || 0));
            }, 0);

            const summaryData = [
                { 'Metric': 'Event Name', 'Value': event.name || 'Community Event' },
                { 'Metric': 'Generated At', 'Value': new Date().toLocaleString() },
                { 'Metric': 'Total Registered Attendees', 'Value': attendees.length },
                { 'Metric': 'Total Checked-In Attendees', 'Value': checkedInCount },
                { 'Metric': 'Pending Check-Ins', 'Value': Math.max(0, attendees.length - checkedInCount) },
                { 'Metric': 'Attendance Turnout Rate', 'Value': attendees.length > 0 ? `${Math.round((checkedInCount / attendees.length) * 100)}%` : '0%' },
                { 'Metric': 'Total Tracks', 'Value': tracks.length },
                { 'Metric': 'Total Workshops', 'Value': workshops.length },
                { 'Metric': 'Total Food/Lunch Claims', 'Value': foodClaimsTotal },
                { 'Metric': 'Total Swag Kit Claims', 'Value': swagClaimsTotal },
                { 'Metric': 'Active Volunteers', 'Value': volunteersList.length }
            ];

            addSheetToWorkbook(wb, 'Overview Summary', summaryData);
            addSheetToWorkbook(wb, 'Checked-In Attendees', getCheckedInRows());
            addSheetToWorkbook(wb, 'Tracks Attendance Stats', getTrackSummaryRows());
            addSheetToWorkbook(wb, 'Track Attendees Roster', getTrackAttendeeRows());
            addSheetToWorkbook(wb, 'Workshops Attendance Stats', getWorkshopSummaryRows());
            addSheetToWorkbook(wb, 'Workshop Attendees Roster', getWorkshopAttendeeRows());
            addSheetToWorkbook(wb, 'Lunch Distribution', getFoodRows());
            addSheetToWorkbook(wb, 'Swag Distribution', getSwagRows());
            addSheetToWorkbook(wb, 'Badge Counters', getCounterRows());
            addSheetToWorkbook(wb, 'Volunteer Attribution', getVolunteerRows());
            addSheetToWorkbook(wb, 'Master Attendees Roster', getMasterAttendeeRows());
            addSheetToWorkbook(wb, 'Claims Ledger', getClaimsRows());

            // Add dedicated per-track attendee tabs
            tracks.forEach(t => {
                const tAttendees = getTrackAttendeeRows(t.id);
                if (tAttendees.length > 0) {
                    addSheetToWorkbook(wb, `Track - ${t.name}`, tAttendees);
                }
            });

            // Add dedicated per-workshop attendee tabs
            workshops.forEach(w => {
                const wAttendees = getWorkshopAttendeeRows(w.id);
                if (wAttendees.length > 0) {
                    addSheetToWorkbook(wb, `Lab - ${w.name}`, wAttendees);
                }
            });

            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            const xlsxFilename = `${eventSafeName}_Master_Report_${timestampStr}.xlsx`;

            return new Response(buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${xlsxFilename}"`,
                    'Cache-Control': 'no-store, max-age=0'
                }
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // 4. SINGLE CSV EXPORT
        // ═══════════════════════════════════════════════════════════════════
        let csvData = [];
        let filename = `${eventSafeName}_${reportType}_${timestampStr}.csv`;

        if (reportType === 'attendees') csvData = getMasterAttendeeRows();
        else if (reportType === 'checkedin') csvData = getCheckedInRows();
        else if (reportType === 'tracks') csvData = getTrackSummaryRows();
        else if (reportType === 'workshops') csvData = getWorkshopSummaryRows();
        else if (reportType === 'food') csvData = getFoodRows();
        else if (reportType === 'swag') csvData = getSwagRows();
        else if (reportType === 'counters') csvData = getCounterRows();
        else if (reportType === 'attribution') csvData = getVolunteerRows();
        else if (reportType === 'claims') csvData = getClaimsRows();
        else if (reportType === 'access') {
            const allAccessLogs = [...trackLogs, ...workshopLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            csvData = allAccessLogs.map((l, idx) => {
                const att = attendees.find(a => a.id === l.attendee_id);
                const trk = l.track_id ? tracks.find(t => t.id === l.track_id) : null;
                const wk = l.workshop_id ? workshops.find(w => w.id === l.workshop_id) : null;
                const vol = usersList.find(u => u.id === l.volunteer_id);
                return {
                    'S.No': idx + 1,
                    'Log ID': l.id,
                    'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                    'Gate Type': trk ? 'Track Gate' : (wk ? 'Workshop Gate' : 'Gate'),
                    'Gate Name': trk ? trk.name : (wk ? wk.name : 'Access Gate'),
                    'Attendee Name': att ? att.name : 'Unknown',
                    'Scan Result': l.result || 'GRANTED',
                    'Scanner': vol ? vol.name : (l.volunteer_id || 'Volunteer')
                };
            });
        } else if (reportType === 'audit') {
            csvData = auditLogs.map((l, idx) => ({
                'S.No': idx + 1,
                'Audit ID': l.id,
                'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                'Actor': l.actor_name || 'System',
                'Role': l.actor_role || 'ADMIN',
                'Action': l.action,
                'Entity': l.entity_type,
                'Result': l.result || 'SUCCESS'
            }));
        }

        if (csvData.length === 0) {
            csvData = [{ 'Notice': `No records found for ${reportType} report.` }];
        }

        const csvString = Papa.unparse(csvData, { quotes: true, header: true });

        return new Response(csvString, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (e) {
        console.error('[OnePass Report Generation Error]', e);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
