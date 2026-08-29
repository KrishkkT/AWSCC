import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const clonedEvent = OnePassDB.cloneEvent(id, body);

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: clonedEvent.id,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CLONE_EVENT',
            entity_type: 'EVENT',
            entity_id: clonedEvent.id,
            metadata: { source_event_id: id, new_event_name: clonedEvent.name },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

        return NextResponse.json({ success: true, event: clonedEvent });
    } catch (e) {
        console.error('[OnePass Event Clone Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to clone event' }, { status: 500 });
    }
}
