import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const reportType = searchParams.get('type') || 'attendees';

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
        const attendees = OnePassDB.getAttendees(eventId) || [];
        const tracks = OnePassDB.getTracks(eventId) || [];
        const workshops = OnePassDB.getWorkshops(eventId) || [];
        const foodResources = OnePassDB.getResources(eventId, 'FOOD') || [];
        const swagResources = OnePassDB.getResources(eventId, 'SWAG') || [];
        const allResources = db.resources ? db.resources.filter(r => r.event_id === eventId) : [];
        const resourceClaims = db.resource_claims ? db.resource_claims.filter(c => c.event_id === eventId) : [];
        const trackLogs = db.track_access_logs ? db.track_access_logs.filter(l => l.event_id === eventId) : [];
        const workshopLogs = db.workshop_access_logs ? db.workshop_access_logs.filter(l => l.event_id === eventId) : [];
        const auditLogs = db.audit_logs ? db.audit_logs.filter(l => l.event_id === eventId || l.event_id === 'GLOBAL') : [];
        const eventVolunteers = OnePassDB.getEventVolunteers(eventId) || [];

        let csvData = [];
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        let filename = `${(event.name || 'Event').replace(/\s+/g, '_')}_${reportType}_${timestampStr}.csv`;

        if (reportType === 'attendees') {
            csvData = attendees.map((a, idx) => {
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
                    'Registration ID': a.registration_id || '',
                    'QR Identifier': a.qr_identifier || '',
                    'Check-in Status': a.check_in_status || 'NOT_CHECKED_IN',
                    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'Not Checked In',
                    'Checked In By': a.checked_in_by_name || 'N/A',
                    'Volunteer Role': a.checked_in_by_role || (a.checked_in_by_name ? 'VOLUNTEER' : 'N/A'),
                    'Assigned Track': trk ? trk.name : (a.assigned_track_id || 'None'),
                    'Assigned Workshop': wk ? wk.name : (a.assigned_workshop_id || 'None'),
                    'Created At': a.created_at ? new Date(a.created_at).toLocaleString() : ''
                };
            });
        } else if (reportType === 'checkedin') {
            const checkedInList = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
            csvData = checkedInList.map((a, idx) => {
                const trk = tracks.find(t => t.id === a.assigned_track_id);
                const wk = workshops.find(w => w.id === a.assigned_workshop_id);
                return {
                    'S.No': idx + 1,
                    'Attendee ID': a.id,
                    'Full Name': a.name,
                    'Email Address': a.email,
                    'Phone Number': a.phone || '',
                    'Ticket Type': a.ticket_type || 'Attendee',
                    'Booking ID': a.booking_id,
                    'QR Code': a.qr_identifier,
                    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : '',
                    'Checked In By': a.checked_in_by_name || 'Volunteer',
                    'Volunteer Role': a.checked_in_by_role || 'VOLUNTEER',
                    'Session Allocated': trk ? `Track: ${trk.name}` : (wk ? `Workshop: ${wk.name}` : 'General Entry')
                };
            });
        } else if (reportType === 'attribution') {
            // Group check-ins by volunteer
            const volunteerMap = new Map();
            const checkedInList = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
            const totalCheckedIn = checkedInList.length;

            checkedInList.forEach(a => {
                const volId = a.checked_in_by_id || 'unknown';
                const volName = a.checked_in_by_name || 'Volunteer / Staff';
                const volRole = a.checked_in_by_role || (volName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');

                if (!volunteerMap.has(volName)) {
                    volunteerMap.set(volName, {
                        volunteer_id: volId,
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
            csvData = sortedVols.map((v, idx) => ({
                'Rank': idx + 1,
                'Volunteer / Staff Name': v.volunteer_name,
                'Role': v.volunteer_role,
                'Total Attendees Checked-In': v.count,
                'Share of Total Turnout (%)': totalCheckedIn > 0 ? `${((v.count / totalCheckedIn) * 100).toFixed(1)}%` : '0%',
                'First Check-in Time': v.first_checkin ? new Date(v.first_checkin).toLocaleString() : 'N/A',
                'Last Check-in Time': v.last_checkin ? new Date(v.last_checkin).toLocaleString() : 'N/A'
            }));
        } else if (reportType === 'tracks') {
            csvData = tracks.map((t, idx) => {
                const occupancyRate = t.capacity > 0 ? ((t.occupancy / t.capacity) * 100).toFixed(1) : '0.0';
                return {
                    'S.No': idx + 1,
                    'Track ID': t.id,
                    'Track Name': t.name,
                    'Description': t.description || '',
                    'Maximum Capacity': t.capacity,
                    'Checked-In Occupancy': t.occupancy,
                    'Remaining Available Seats': t.remaining,
                    'Occupancy Rate': `${occupancyRate}%`,
                    'Status': t.is_full ? 'FULL' : t.status
                };
            });
        } else if (reportType === 'workshops') {
            csvData = workshops.map((w, idx) => {
                const occupancyRate = w.capacity > 0 ? ((w.occupancy / w.capacity) * 100).toFixed(1) : '0.0';
                return {
                    'S.No': idx + 1,
                    'Workshop ID': w.id,
                    'Workshop Name': w.name,
                    'Speaker': w.speaker || '',
                    'Location / Hall': w.location || '',
                    'Timing': `${w.start_time || ''} - ${w.end_time || ''}`,
                    'Maximum Capacity': w.capacity,
                    'Enrolled Occupancy': w.occupancy,
                    'Remaining Seats': w.remaining,
                    'Occupancy Rate': `${occupancyRate}%`,
                    'Status': w.is_full ? 'FULL' : w.status
                };
            });
        } else if (reportType === 'food') {
            csvData = foodResources.map((r, idx) => ({
                'S.No': idx + 1,
                'Meal Resource ID': r.id,
                'Meal Name': r.name,
                'Description': r.description || '',
                'Start Window': r.start_time || 'Open',
                'End Window': r.end_time || 'Open',
                'Claim Limit Per Person': r.claim_limit || 1,
                'Total Meals Distributed': r.claims_count || 0,
                'Allocated Capacity': r.capacity || 'Unlimited',
                'Remaining Stock': r.remaining !== null ? r.remaining : 'Unlimited',
                'Status': r.status
            }));
        } else if (reportType === 'swag') {
            csvData = swagResources.map((r, idx) => ({
                'S.No': idx + 1,
                'Swag Item ID': r.id,
                'Item Name': r.name,
                'Description': r.description || '',
                'Claim Limit': r.claim_limit || 1,
                'Total Distributed': r.claims_count || 0,
                'Total Allocated Stock': r.capacity || 0,
                'Remaining Stock': r.remaining !== null ? r.remaining : 'N/A',
                'Distribution Rate': r.capacity > 0 ? `${(((r.claims_count || 0) / r.capacity) * 100).toFixed(1)}%` : 'N/A',
                'Status': r.status
            }));
        } else if (reportType === 'claims') {
            csvData = resourceClaims.map((c, idx) => {
                const res = allResources.find(r => r.id === c.resource_id);
                const att = attendees.find(a => a.id === c.attendee_id);
                const vol = (db.users || []).find(u => u.id === c.volunteer_id);
                return {
                    'S.No': idx + 1,
                    'Claim ID': c.id,
                    'Timestamp': c.timestamp ? new Date(c.timestamp).toLocaleString() : '',
                    'Resource Item': res ? res.name : c.resource_id,
                    'Resource Type': res ? res.type : 'RESOURCE',
                    'Attendee Name': att ? att.name : 'Unknown',
                    'Attendee Email': att ? att.email : '',
                    'Attendee QR Code': att ? att.qr_identifier : '',
                    'Volunteer Scanner': vol ? vol.name : (c.volunteer_id || 'Volunteer'),
                    'Status': c.status || 'CLAIMED'
                };
            });
        } else if (reportType === 'access') {
            const allAccessLogs = [...trackLogs, ...workshopLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            csvData = allAccessLogs.map((l, idx) => {
                const att = attendees.find(a => a.id === l.attendee_id);
                const trk = l.track_id ? tracks.find(t => t.id === l.track_id) : null;
                const wk = l.workshop_id ? workshops.find(w => w.id === l.workshop_id) : null;
                const vol = (db.users || []).find(u => u.id === l.volunteer_id);
                return {
                    'S.No': idx + 1,
                    'Log ID': l.id,
                    'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                    'Gate Type': trk ? 'Track Gate' : (wk ? 'Workshop Gate' : 'Gate'),
                    'Gate / Session Name': trk ? trk.name : (wk ? wk.name : 'Access Gate'),
                    'Attendee Name': att ? att.name : 'Unknown',
                    'Attendee QR Code': att ? att.qr_identifier : '',
                    'Scan Result': l.result || 'GRANTED',
                    'Reason / Notice': l.reason || 'Verified',
                    'Volunteer Scanner': vol ? vol.name : (l.volunteer_id || 'Scanner Staff')
                };
            });
        } else if (reportType === 'volunteers') {
            csvData = eventVolunteers.map((ev, idx) => ({
                'S.No': idx + 1,
                'Volunteer User ID': ev.user?.id || ev.user_id,
                'Full Name': ev.user?.name || 'Unknown',
                'Email': ev.user?.email || 'N/A',
                'Global Role': ev.user?.role || 'VOLUNTEER',
                'Assigned Event Permissions': (ev.permissions || []).join(', '),
                'Assignment Date': ev.assigned_at ? new Date(ev.assigned_at).toLocaleString() : ''
            }));
        } else if (reportType === 'audit') {
            csvData = auditLogs.map((l, idx) => ({
                'S.No': idx + 1,
                'Audit ID': l.id,
                'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                'Actor Name': l.actor_name || 'System',
                'Actor Role': l.actor_role || 'ADMIN',
                'Action': l.action,
                'Entity Type': l.entity_type,
                'Entity ID': l.entity_id || '',
                'Result': l.result || 'SUCCESS',
                'Metadata Details': JSON.stringify(l.metadata || {})
            }));
        }

        // If no records found, return a formatted empty header row
        if (csvData.length === 0) {
            csvData = [{ 'Notice': `No records found for ${reportType} report.` }];
        }

        const csvString = Papa.unparse(csvData, {
            quotes: true,
            header: true
        });

        return new Response(csvString, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });
    } catch (e) {
        console.error('[OnePass Report Generation Error]', e);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}

