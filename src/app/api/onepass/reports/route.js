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

        // Helper functions to build clean datasets
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

        const getTrackRows = () => tracks.map((t, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_track_id === t.id).length;
            const cap = t.capacity || 150;
            const rate = cap > 0 ? ((occ / cap) * 100).toFixed(1) : '0.0';
            return {
                'S.No': idx + 1,
                'Track Name': t.name || '',
                'Description': t.description || '',
                'Maximum Capacity': cap,
                'Checked-In Occupancy': occ,
                'Remaining Available Seats': Math.max(0, cap - occ),
                'Occupancy Rate': `${rate}%`,
                'Status': occ >= cap ? 'FULL' : 'OPEN'
            };
        });

        const getWorkshopRows = () => workshops.map((w, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_workshop_id === w.id).length;
            const cap = w.capacity || 30;
            const rate = cap > 0 ? ((occ / cap) * 100).toFixed(1) : '0.0';
            return {
                'S.No': idx + 1,
                'Workshop Name': w.name || '',
                'Speaker': w.speaker || '',
                'Location / Room': w.location || w.venue || '',
                'Timing Window': `${w.start_time || ''} - ${w.end_time || ''}`,
                'Maximum Capacity': cap,
                'Enrolled Occupancy': occ,
                'Remaining Seats': Math.max(0, cap - occ),
                'Occupancy Rate': `${rate}%`,
                'Status': occ >= cap ? 'FULL' : 'OPEN'
            };
        });

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
        // MULTI-TAB EXCEL WORKBOOK GENERATOR (.xlsx)
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

            const addSheet = (sheetName, data) => {
                const cleanData = data && data.length > 0 ? data : [{ 'Notice': `No records available for ${sheetName}` }];
                const ws = XLSX.utils.json_to_sheet(cleanData);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            };

            addSheet('Overview Summary', summaryData);
            addSheet('Checked-In Attendees', getCheckedInRows());
            addSheet('Tracks Attendance', getTrackRows());
            addSheet('Workshops Attendance', getWorkshopRows());
            addSheet('Lunch Distribution', getFoodRows());
            addSheet('Swag Distribution', getSwagRows());
            addSheet('Badge Counters', getCounterRows());
            addSheet('Volunteer Attribution', getVolunteerRows());
            addSheet('Master Attendees Roster', getMasterAttendeeRows());
            addSheet('Claims Ledger', getClaimsRows());

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
        // SINGLE CSV EXPORT
        // ═══════════════════════════════════════════════════════════════════
        let csvData = [];
        let filename = `${eventSafeName}_${reportType}_${timestampStr}.csv`;

        if (reportType === 'attendees') csvData = getMasterAttendeeRows();
        else if (reportType === 'checkedin') csvData = getCheckedInRows();
        else if (reportType === 'tracks') csvData = getTrackRows();
        else if (reportType === 'workshops') csvData = getWorkshopRows();
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
