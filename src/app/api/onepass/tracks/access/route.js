import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, qrToken, trackId } = body;

        if (!eventId || !qrToken || !trackId) {
            return NextResponse.json({ error: 'eventId, qrToken and trackId are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId, 'TRACK_ACCESS');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const cleanToken = parseScannedQR(qrToken);
        const result = await OnePassDB.recordTrackAccess({
            eventId,
            qrToken: cleanToken,
            trackId,
            volunteerId: auth.user.id,
            volunteerName: auth.user.name
        });

        const statusCode = result.granted ? 200 : 403;
        return NextResponse.json(result, { status: statusCode });
    } catch (e) {
        console.error('[OnePass Track Access Gate Error]', e);
        return NextResponse.json({ error: 'Failed to evaluate track gate access' }, { status: 500 });
    }
}
