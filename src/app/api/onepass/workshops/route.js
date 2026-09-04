import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const workshops = OnePassDB.getWorkshops(eventId);
        return NextResponse.json({ workshops });
    } catch (e) {
        console.error('[OnePass Workshops GET]', e);
        return NextResponse.json({ error: 'Failed to fetch workshops' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, name, description, speaker, location, start_time, end_time, capacity } = body;

        if (!eventId || !name) {
            return NextResponse.json({ error: 'eventId and name are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const workshop = OnePassDB.createWorkshop({
            event_id: eventId,
            name,
            description,
            speaker,
            location,
            start_time: start_time || '10:00',
            end_time: end_time || '12:00',
            capacity: parseInt(capacity, 10) || 50
        });

        // Audit log
        OnePassDB.addAuditLog({
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_WORKSHOP',
            entity_type: 'WORKSHOP',
            entity_id: workshop.id,
            metadata: { name: workshop.name, capacity: workshop.capacity }
        });

        return NextResponse.json({ success: true, workshop });
    } catch (e) {
        console.error('[OnePass Workshops POST]', e);
        return NextResponse.json({ error: 'Failed to create workshop' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Workshop id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updated = OnePassDB.updateWorkshop(id, updates);
        return NextResponse.json({ success: true, workshop: updated });
    } catch (e) {
        console.error('[OnePass Workshops PATCH]', e);
        return NextResponse.json({ error: 'Failed to update workshop' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Workshop id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.deleteWorkshop(id);
        return NextResponse.json({ success: true, message: 'Workshop deleted successfully' });
    } catch (e) {
        console.error('[OnePass Workshops DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to delete workshop' }, { status: 400 });
    }
}
