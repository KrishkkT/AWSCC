import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const clonedEvent = OnePassDB.cloneEvent(id, body);

        // Audit log
        OnePassDB.addAuditLog({
            event_id: clonedEvent.id,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CLONE_EVENT',
            entity_type: 'EVENT',
            entity_id: clonedEvent.id,
            metadata: { source_event_id: id, new_event_name: clonedEvent.name }
        });

        return NextResponse.json({ success: true, event: clonedEvent });
    } catch (e) {
        console.error('[OnePass Event Clone Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to clone event' }, { status: 500 });
    }
}
