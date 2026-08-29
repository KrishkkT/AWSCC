import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const action = searchParams.get('action');
        const role = searchParams.get('role');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const logs = OnePassDB.getAuditLogs(eventId, {
            action: action || undefined,
            actor_role: role || undefined
        });

        return NextResponse.json({ logs, total: logs.length });
    } catch (e) {
        console.error('[OnePass Audit GET]', e);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }
}
