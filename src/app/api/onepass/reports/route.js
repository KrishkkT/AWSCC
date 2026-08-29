import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import Papa from 'papaparse';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const reportType = searchParams.get('type') || 'attendees'; // 'attendees' | 'tracks' | 'workshops' | 'food' | 'swag' | 'access' | 'volunteers' | 'audit'

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
        let csvData = [];
        let filename = `onepass_${reportType}_${eventId}_${Date.now()}.csv`;

        if (reportType === 'attendees') {
            const attendees = OnePassDB.getAttendees(eventId);
            const tracks = OnePassDB.getTracks(eventId);
            const workshops = OnePassDB.getWorkshops(eventId);

            csvData = attendees.map(a => {
                const trk = tracks.find(t => t.id === a.assigned_track_id);
                const wk = workshops.find(w => w.id === a.assigned_workshop_id);
                return {
                    'Attendee ID': a.id,
                    'Full Name': a.name,
                    'Email Address': a.email,
                    'Phone Number': a.phone || '',
                    'Ticket Type': a.ticket_type,
                    'Booking ID': a.booking_id,
                    'Registration ID': a.registration_id || '',
                    'QR Identifier': a.qr_identifier,
                    'Check-in Status': a.check_in_status,
                    'Check-in Timestamp': a.check_in_time ? new Date(a.check_in_time).toLocaleString() : 'N/A',
                    'Assigned Track': trk ? trk.name : 'None',
                    'Assigned Workshop': wk ? wk.name : 'None'
                };
            });
        } else if (reportType === 'tracks') {
            const tracks = OnePassDB.getTracks(eventId);
            csvData = tracks.map(t => ({
                'Track ID': t.id,
                'Track Name': t.name,
                'Description': t.description,
                'Capacity': t.capacity,
                'Occupancy': t.occupancy,
                'Remaining Seats': t.remaining,
                'Status': t.is_full ? 'FULL' : t.status,
                'Occupancy Rate': `${((t.occupancy / (t.capacity || 1)) * 100).toFixed(1)}%`
            }));
        } else if (reportType === 'workshops') {
            const workshops = OnePassDB.getWorkshops(eventId);
            csvData = workshops.map(w => ({
                'Workshop ID': w.id,
                'Workshop Name': w.name,
                'Speaker': w.speaker,
                'Location': w.location,
                'Timing': `${w.start_time} - ${w.end_time}`,
                'Capacity': w.capacity,
                'Occupancy': w.occupancy,
                'Remaining Seats': w.remaining,
                'Status': w.is_full ? 'FULL' : w.status
            }));
        } else if (reportType === 'food') {
            const resources = OnePassDB.getResources(eventId, 'FOOD');
            csvData = resources.map(r => ({
                'Resource ID': r.id,
                'Meal Name': r.name,
                'Description': r.description,
                'Start Time': r.start_time || 'N/A',
                'End Time': r.end_time || 'N/A',
                'Claim Limit': r.claim_limit,
                'Total Claims': r.claims_count,
                'Capacity': r.capacity || 'Unlimited',
                'Remaining Stock': r.remaining !== null ? r.remaining : 'Unlimited'
            }));
        } else if (reportType === 'swag') {
            const resources = OnePassDB.getResources(eventId, 'SWAG');
            csvData = resources.map(r => ({
                'Resource ID': r.id,
                'Swag Item Name': r.name,
                'Total Allocated Capacity': r.capacity || 0,
                'Total Claimed': r.claims_count,
                'Remaining Stock': r.remaining !== null ? r.remaining : 'N/A',
                'Status': r.status
            }));
        } else if (reportType === 'access') {
            const logs = db.track_access_logs.filter(l => l.event_id === eventId);
            csvData = logs.map(l => {
                const att = db.attendees.find(a => a.id === l.attendee_id);
                const trk = db.tracks.find(t => t.id === l.track_id);
                const vol = db.users.find(u => u.id === l.volunteer_id);
                return {
                    'Log ID': l.id,
                    'Timestamp': new Date(l.timestamp).toLocaleString(),
                    'Attendee Name': att ? att.name : 'Unknown',
                    'QR Code': att ? att.qr_identifier : 'N/A',
                    'Track Gate': trk ? trk.name : l.track_id,
                    'Result': l.result,
                    'Reason': l.reason || '',
                    'Volunteer': vol ? vol.name : (l.volunteer_id || 'System')
                };
            });
        } else if (reportType === 'volunteers') {
            const eventVolunteers = OnePassDB.getEventVolunteers(eventId);
            csvData = eventVolunteers.map(ev => ({
                'Volunteer ID': ev.user?.id || ev.user_id,
                'Name': ev.user?.name || 'Unknown',
                'Email': ev.user?.email || 'N/A',
                'Assigned Permissions': (ev.permissions || []).join('; '),
                'Assigned At': new Date(ev.assigned_at).toLocaleString()
            }));
        } else if (reportType === 'audit') {
            const logs = db.audit_logs.filter(l => l.event_id === eventId);
            csvData = logs.map(l => ({
                'Audit ID': l.id,
                'Timestamp': new Date(l.timestamp).toLocaleString(),
                'Actor Name': l.actor_name,
                'Actor Role': l.actor_role,
                'Action': l.action,
                'Entity Type': l.entity_type,
                'Entity ID': l.entity_id,
                'Result': l.result,
                'Metadata Details': JSON.stringify(l.metadata || {})
            }));
        }

        const csvString = Papa.unparse(csvData);

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
