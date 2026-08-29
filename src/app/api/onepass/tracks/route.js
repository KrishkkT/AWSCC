import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const tracks = OnePassDB.getTracks(eventId);
        return NextResponse.json({ tracks });
    } catch (e) {
        console.error('[OnePass Tracks GET]', e);
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, name, description, capacity } = body;

        if (!eventId || !name) {
            return NextResponse.json({ error: 'eventId and name are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const track = OnePassDB.createTrack({
            event_id: eventId,
            name,
            description,
            capacity: parseInt(capacity, 10) || 100
        });

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_TRACK',
            entity_type: 'TRACK',
            entity_id: track.id,
            metadata: { name: track.name, capacity: track.capacity },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

        return NextResponse.json({ success: true, track });
    } catch (e) {
        console.error('[OnePass Tracks POST]', e);
        return NextResponse.json({ error: 'Failed to create track' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, eventId, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Track id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updated = OnePassDB.updateTrack(id, updates);
        return NextResponse.json({ success: true, track: updated });
    } catch (e) {
        console.error('[OnePass Tracks PATCH]', e);
        return NextResponse.json({ error: 'Failed to update track' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Track id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.deleteTrack(id);
        return NextResponse.json({ success: true, message: 'Track deleted successfully' });
    } catch (e) {
        console.error('[OnePass Tracks DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to delete track' }, { status: 400 });
    }
}
