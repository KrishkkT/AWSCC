import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, action, attendeeIds, trackId, workshopId } = body;

        if (!eventId || !action || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
            return NextResponse.json({ error: 'eventId, action, and non-empty attendeeIds array are required' }, { status: 400 });
        }

        if (action === 'DELETE') {
            const auth = await authorizeUser(req, 'ADMIN');
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const deletedCount = OnePassDB.batchDeleteAttendees(attendeeIds, auth.user?.name || 'Admin', auth.user?.role || 'ADMIN');
            return NextResponse.json({
                success: true,
                message: `Successfully deleted ${deletedCount} attendee(s).`,
                count: deletedCount
            });
        }

        if (action === 'UNCHECK_IN') {
            const auth = await authorizeUser(req, null, eventId, 'CHECK_IN');
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const result = await OnePassDB.batchUncheckInAttendees({
                eventId,
                attendeeIds,
                volunteerId: auth.user.id,
                actorName: auth.user.name,
                volunteerRole: auth.user.role || (auth.user.is_admin ? 'ADMIN' : 'VOLUNTEER')
            });

            return NextResponse.json(result);
        }

        if (action === 'CHECK_IN') {
            const auth = await authorizeUser(req, null, eventId, 'CHECK_IN');
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const result = await OnePassDB.batchCheckInAttendees({
                eventId,
                attendeeIds,
                trackId: trackId || null,
                workshopId: workshopId || null,
                volunteerId: auth.user.id,
                actorName: auth.user.name,
                volunteerRole: auth.user.role || (auth.user.is_admin ? 'ADMIN' : 'VOLUNTEER')
            });

            return NextResponse.json(result);
        }

        return NextResponse.json({ error: `Unsupported batch action: ${action}` }, { status: 400 });
    } catch (e) {
        console.error('[OnePass Attendees Batch Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to process batch attendee operation' }, { status: 500 });
    }
}
