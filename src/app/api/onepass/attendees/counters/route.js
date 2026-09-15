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

        const stats = OnePassDB.getCounterStats(eventId);
        return NextResponse.json({ success: true, stats });
    } catch (e) {
        console.error('[OnePass Counters GET]', e);
        return NextResponse.json({ error: 'Failed to fetch counter statistics' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, rules = [] } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const result = OnePassDB.allocateCounters(eventId, rules);

        OnePassDB.addAuditLog({
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'ALLOCATE_COUNTERS',
            entity_type: 'EVENT',
            entity_id: eventId,
            metadata: {
                allocated_count: result.allocated_count,
                total_counters: result.counters?.length || 0,
                rules
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully allocated counters for ${result.allocated_count} attendees`,
            ...result
        });
    } catch (e) {
        console.error('[OnePass Counters POST]', e);
        return NextResponse.json({ error: e.message || 'Failed to allocate counters' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const result = OnePassDB.clearCounters(eventId);

        OnePassDB.addAuditLog({
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CLEAR_COUNTERS',
            entity_type: 'EVENT',
            entity_id: eventId,
            metadata: {
                cleared_count: result.cleared_count
            }
        });

        return NextResponse.json({
            success: true,
            message: `Cleared counters for ${result.cleared_count} attendees`,
            ...result
        });
    } catch (e) {
        console.error('[OnePass Counters DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to clear counters' }, { status: 500 });
    }
}
