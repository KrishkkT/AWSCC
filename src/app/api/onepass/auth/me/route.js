import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/onepass/auth';
import { OnePassDB } from '@/lib/onepass/db';
import { seedOnePassDatabase } from '@/lib/onepass/seed';

export async function GET(req) {
    try {
        seedOnePassDatabase(false);
        const user = await getSessionFromRequest(req);
        if (!user) {
            return NextResponse.json({ authenticated: false, user: null });
        }

        const assignments = OnePassDB.getUserEventAssignments(user.id);
        const events = OnePassDB.getEvents();

        return NextResponse.json({
            authenticated: true,
            user,
            event_assignments: assignments,
            available_events: user.role === 'ADMIN' ? events : events.filter(e => assignments.some(a => a.event_id === e.id))
        });
    } catch (e) {
        console.error('[OnePass Auth Me Error]', e);
        return NextResponse.json({ authenticated: false, error: 'Failed to verify session' }, { status: 500 });
    }
}
