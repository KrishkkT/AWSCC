import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const type = searchParams.get('type') || null;

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const resources = OnePassDB.getResources(eventId, type);
        return NextResponse.json({ resources });
    } catch (e) {
        console.error('[OnePass Resources GET]', e);
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, ...resourceData } = body;

        if (!eventId || !resourceData.name) {
            return NextResponse.json({ error: 'eventId and resource name are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const resource = OnePassDB.createResource({
            ...resourceData,
            event_id: eventId
        });

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_RESOURCE',
            entity_type: 'RESOURCE',
            entity_id: resource.id,
            metadata: { name: resource.name, type: resource.type, capacity: resource.capacity },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

        return NextResponse.json({ success: true, resource });
    } catch (e) {
        console.error('[OnePass Resources POST]', e);
        return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, eventId, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Resource id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updated = OnePassDB.updateResource(id, updates);
        return NextResponse.json({ success: true, resource: updated });
    } catch (e) {
        console.error('[OnePass Resources PATCH]', e);
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Resource id is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.deleteResource(id);
        return NextResponse.json({ success: true, message: 'Resource deleted successfully' });
    } catch (e) {
        console.error('[OnePass Resources DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to delete resource' }, { status: 400 });
    }
}
