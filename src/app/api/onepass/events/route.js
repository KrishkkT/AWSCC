import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { seedOnePassDatabase } from '@/lib/onepass/seed';

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        seedOnePassDatabase(false);
        const auth = await authorizeUser(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const events = OnePassDB.getEvents();
        const user = auth.user;

        // If volunteer, only show assigned events
        let visibleEvents = events;
        if (user.role !== 'ADMIN') {
            const assignments = OnePassDB.getUserEventAssignments(user.id);
            visibleEvents = events.filter(e => assignments.some(a => a.event_id === e.id));
        }

        // Attach quick summary stats to each event
        const enriched = visibleEvents.map(e => {
            const attendees = OnePassDB.getAttendees(e.id);
            const checkedIn = attendees.filter(a => a.check_in_status === 'CHECKED_IN').length;
            const tracks = OnePassDB.getTracks(e.id);
            return {
                ...e,
                total_attendees: attendees.length,
                checked_in: checkedIn,
                tracks_count: tracks.length
            };
        });

        return NextResponse.json({ events: enriched });
    } catch (e) {
        console.error('[OnePass Events GET]', e);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        if (!body.name) {
            return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
        }

        const newEvent = OnePassDB.createEvent(body);

        // Audit log
        OnePassDB.addAuditLog({
            event_id: newEvent.id,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_EVENT',
            entity_type: 'EVENT',
            entity_id: newEvent.id,
            metadata: { name: newEvent.name, year: newEvent.year, status: newEvent.status }
        });

        return NextResponse.json({ success: true, event: newEvent });
    } catch (e) {
        console.error('[OnePass Events POST]', e);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
