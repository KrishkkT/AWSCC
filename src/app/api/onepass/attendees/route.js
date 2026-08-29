import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { generateQRToken } from '@/lib/onepass/qr';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const search = searchParams.get('search') || '';
        const checkInStatus = searchParams.get('check_in_status') || '';
        const trackId = searchParams.get('track_id') || '';
        const qr = searchParams.get('qr') || '';

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // Direct QR lookup
        if (qr) {
            const attendee = OnePassDB.getAttendeeByQR(eventId, qr);
            if (!attendee) {
                return NextResponse.json({ found: false, attendee: null });
            }
            const profile = OnePassDB.getAttendeeProfile(eventId, attendee.id);
            return NextResponse.json({ found: true, attendee: profile });
        }

        const attendees = OnePassDB.getAttendees(eventId, {
            search,
            check_in_status: checkInStatus || undefined,
            assigned_track_id: trackId || undefined
        });

        // Enrich with track names for easy table display
        const tracks = OnePassDB.getTracks(eventId);
        const workshops = OnePassDB.getWorkshops(eventId);

        const enriched = attendees.map(a => ({
            ...a,
            track_name: a.assigned_track_id ? tracks.find(t => t.id === a.assigned_track_id)?.name : null,
            workshop_name: a.assigned_workshop_id ? workshops.find(w => w.id === a.assigned_workshop_id)?.name : null
        }));

        return NextResponse.json({ attendees: enriched, total: enriched.length });
    } catch (e) {
        console.error('[OnePass Attendees GET]', e);
        return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, ...attendeeData } = body;

        if (!eventId || !attendeeData.name || !attendeeData.email) {
            return NextResponse.json({ error: 'eventId, name and email are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // Check for duplicate email in event
        const existingAttendees = OnePassDB.getAttendees(eventId);
        if (existingAttendees.some(a => a.email.toLowerCase() === attendeeData.email.toLowerCase())) {
            return NextResponse.json({ error: 'An attendee with this email already exists in this event.' }, { status: 409 });
        }

        // Generate QR token if not provided
        if (!attendeeData.qr_identifier) {
            const tokenObj = generateQRToken('SCD26');
            attendeeData.qr_identifier = tokenObj.qr_identifier;
            attendeeData.qr_token = tokenObj.qr_token;
        }

        const attendee = OnePassDB.createAttendee({
            ...attendeeData,
            event_id: eventId
        });

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_ATTENDEE',
            entity_type: 'ATTENDEE',
            entity_id: attendee.id,
            metadata: { name: attendee.name, email: attendee.email, qr_identifier: attendee.qr_identifier },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

        return NextResponse.json({ success: true, attendee });
    } catch (e) {
        console.error('[OnePass Attendees POST]', e);
        return NextResponse.json({ error: 'Failed to create attendee' }, { status: 500 });
    }
}
