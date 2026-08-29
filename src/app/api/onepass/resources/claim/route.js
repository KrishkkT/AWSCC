import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, qrToken, resourceId } = body;

        if (!eventId || !qrToken || !resourceId) {
            return NextResponse.json({ error: 'eventId, qrToken and resourceId are required' }, { status: 400 });
        }

        const resource = OnePassDB.getResourceById(resourceId);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        // Check appropriate permission based on resource type
        const requiredPermission = resource.type === 'FOOD' ? 'FOOD' : (resource.type === 'SWAG' ? 'SWAG' : null);
        const auth = await authorizeUser(req, null, eventId, requiredPermission);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const cleanToken = parseScannedQR(qrToken);
        const result = await OnePassDB.claimResource({
            eventId,
            qrToken: cleanToken,
            resourceId,
            volunteerId: auth.user.id,
            volunteerName: auth.user.name
        });

        if (!result.success) {
            const statusCode = result.code === 'INVALID_QR' ? 404 : 409;
            return NextResponse.json(result, { status: statusCode });
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Resource Claim Error]', e);
        return NextResponse.json({ error: 'Failed to process resource claim' }, { status: 500 });
    }
}
