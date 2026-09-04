import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, qrToken, attendeeId, trackId, workshopId, sessionId, sessionType } = body;

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

        // Resolve trackId vs workshopId from unified session selection
        let resolvedTrackId = trackId;
        let resolvedWorkshopId = workshopId;
        let resolvedSessionType = sessionType;

        if (sessionId && sessionType) {
            if (sessionType === 'WORKSHOP') {
                resolvedWorkshopId = sessionId;
                resolvedTrackId = null;
            } else {
                resolvedTrackId = sessionId;
                resolvedWorkshopId = null;
            }
        }

        // Execute atomic check-in with mutex locking and accurate attribution
        const result = await OnePassDB.atomicCheckIn({
            eventId,
            attendeeId: targetAttendeeId,
            trackId: resolvedTrackId || null,
            workshopId: resolvedWorkshopId || null,
            sessionType: resolvedSessionType || (resolvedWorkshopId ? 'WORKSHOP' : resolvedTrackId ? 'TRACK' : null),
            volunteerId: auth.user.id,
            actorName: auth.user.name,
            volunteerRole: auth.user.role || (auth.user.is_admin ? 'ADMIN' : 'VOLUNTEER')
        });

        if (!result.success) {
            const status = result.code === 'ATTENDEE_NOT_FOUND' ? 404 : 409;
            return NextResponse.json(result, { status });
        }

        // Immediately trigger post-checkin email with session room guidance
        if (result.attendee && result.attendee.email) {
            import('@/lib/onepass/email').then(async ({ sendCheckInWelcomeEmail }) => {
                const db = OnePassDB.getSnapshot();
                const event = db.events.find(e => e.id === eventId);
                sendCheckInWelcomeEmail({
                    attendee: result.attendee,
                    event,
                    track: result.track,
                    workshop: result.workshop
                }).catch(err => console.warn('[OnePass Welcome Email Warning]', err.message));
            }).catch(e => console.warn('[Email Module Import Error]', e));
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Check-in Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to process check-in.' }, { status: 500 });
    }
}
