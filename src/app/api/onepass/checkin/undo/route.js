import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, attendeeId, attendeeIds } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId, 'CHECK_IN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const volunteerRole = auth.user.role || (auth.user.is_admin ? 'ADMIN' : 'VOLUNTEER');

        // Support bulk / batch uncheck-in if attendeeIds array is provided
        if (Array.isArray(attendeeIds) && attendeeIds.length > 0) {
            const result = await OnePassDB.batchUncheckInAttendees({
                eventId,
                attendeeIds,
                volunteerId: auth.user.id,
                actorName: auth.user.name,
                volunteerRole
            });
            return NextResponse.json(result);
        }

        const targetId = (attendeeId || body.id || body.qr_identifier || body.booking_id || '').toString().trim();
        if (!targetId) {
            return NextResponse.json({ error: 'attendeeId or attendeeIds is required' }, { status: 400 });
        }

        const result = await OnePassDB.uncheckInAttendee({
            eventId,
            attendeeId: targetId,
            volunteerId: auth.user.id,
            actorName: auth.user.name,
            volunteerRole
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Uncheck-in Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to uncheck-in attendee.' }, { status: 500 });
    }
}

