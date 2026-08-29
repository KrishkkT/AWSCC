import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, qrToken, attendeeId, trackId, workshopId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId, 'CHECK_IN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        let targetAttendeeId = attendeeId;

        // If QR token is provided, lookup attendee first
        if (!targetAttendeeId && qrToken) {
            const cleanToken = parseScannedQR(qrToken);
            const attendee = OnePassDB.getAttendeeByQR(eventId, cleanToken);
            if (!attendee) {
                return NextResponse.json({
                    success: false,
                    code: 'QR_NOT_RECOGNIZED',
                    message: 'QR code not recognized in this event.'
                }, { status: 404 });
            }
            targetAttendeeId = attendee.id;
        }

        if (!targetAttendeeId) {
            return NextResponse.json({ error: 'Either attendeeId or qrToken is required' }, { status: 400 });
        }

        // Execute atomic check-in with mutex locking
        const result = await OnePassDB.atomicCheckIn({
            eventId,
            attendeeId: targetAttendeeId,
            trackId,
            workshopId,
            volunteerId: auth.user.id,
            actorName: auth.user.name
        });

        if (!result.success) {
            // Return appropriate HTTP status (409 for conflict / already checked in / full)
            const status = result.code === 'ATTENDEE_NOT_FOUND' ? 404 : 409;
            return NextResponse.json(result, { status });
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Check-in Error]', e);
        return NextResponse.json({ error: 'Failed to process check-in.' }, { status: 500 });
    }
}
