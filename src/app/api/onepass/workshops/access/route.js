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
        const { eventId, qrToken, workshopId } = body;

        if (!eventId || !qrToken || !workshopId) {
            return NextResponse.json({ error: 'eventId, qrToken and workshopId are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId, 'WORKSHOP_ACCESS');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const cleanToken = parseScannedQR(qrToken);
        const result = await OnePassDB.recordWorkshopAccess({
            eventId,
            qrToken: cleanToken,
            workshopId,
            volunteerId: auth.user.id,
            volunteerName: auth.user.name
        });

        const statusCode = result.granted ? 200 : 403;
        return NextResponse.json(result, { status: statusCode });
    } catch (e) {
        console.error('[OnePass Workshop Access Gate Error]', e);
        return NextResponse.json({ error: 'Failed to verify workshop access' }, { status: 500 });
    }
}
