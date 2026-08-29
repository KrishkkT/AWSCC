import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const q = searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '';

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        if (!q.trim()) {
            return NextResponse.json({ attendees: [] });
        }

        // 1. Try finding by direct QR / Piped token lookup
        const cleanQR = parseScannedQR(q);
        const directAttendee = OnePassDB.getAttendeeByQR(eventId, cleanQR) || OnePassDB.getAttendeeByQR(eventId, q);

        if (directAttendee) {
            const tracks = OnePassDB.getTracks(eventId);
            const workshops = OnePassDB.getWorkshops(eventId);
            const enriched = {
                ...directAttendee,
                track_name: directAttendee.assigned_track_id ? tracks.find(t => t.id === directAttendee.assigned_track_id)?.name : null,
                workshop_name: directAttendee.assigned_workshop_id ? workshops.find(w => w.id === directAttendee.assigned_workshop_id)?.name : null
            };
            return NextResponse.json({ attendees: [enriched], total: 1 });
        }

        // 2. Perform broad multi-field search
        const attendees = OnePassDB.getAttendees(eventId, { search: q });
        const tracks = OnePassDB.getTracks(eventId);
        const workshops = OnePassDB.getWorkshops(eventId);

        const enriched = attendees.map(a => ({
            ...a,
            track_name: a.assigned_track_id ? tracks.find(t => t.id === a.assigned_track_id)?.name : null,
            workshop_name: a.assigned_workshop_id ? workshops.find(w => w.id === a.assigned_workshop_id)?.name : null
        }));

        return NextResponse.json({ attendees: enriched, total: enriched.length });
    } catch (e) {
        console.error('[OnePass Attendees Search GET]', e);
        return NextResponse.json({ error: 'Failed to search attendees' }, { status: 500 });
    }
}
