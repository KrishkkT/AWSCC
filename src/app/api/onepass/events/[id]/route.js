import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, null, id);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const event = OnePassDB.getEventById(id);
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ event });
    } catch (e) {
        console.error('[OnePass Event GET]', e);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updates = await req.json();
        const updated = OnePassDB.updateEvent(id, updates);
        if (!updated) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Audit log
        OnePassDB.addAuditLog({
            event_id: id,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'UPDATE_EVENT',
            entity_type: 'EVENT',
            entity_id: id,
            metadata: updates
        });

        return NextResponse.json({ success: true, event: updated });
    } catch (e) {
        console.error('[OnePass Event PATCH]', e);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.deleteEvent(id);
        return NextResponse.json({ success: true, message: 'Event deleted successfully' });
    } catch (e) {
        console.error('[OnePass Event DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to delete event' }, { status: 400 });
    }
}
