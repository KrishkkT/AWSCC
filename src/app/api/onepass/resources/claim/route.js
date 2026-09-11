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

        // Asynchronously trigger food or swag claim confirmation email
        if (result.attendee && result.attendee.email) {
            import('@/lib/onepass/email').then(async ({ sendFoodClaimEmail, sendSwagClaimEmail }) => {
                const db = OnePassDB.getSnapshot();
                const event = db.events.find(e => e.id === eventId);
                if (resource.type === 'FOOD') {
                    sendFoodClaimEmail({ attendee: result.attendee, event, resource }).catch(err => console.warn('[OnePass Food Email Error]', err.message));
                } else if (resource.type === 'SWAG') {
                    sendSwagClaimEmail({ attendee: result.attendee, event, resource }).catch(err => console.warn('[OnePass Swag Email Error]', err.message));
                }
            }).catch(() => {});
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Resource Claim Error]', e);
        return NextResponse.json({ error: 'Failed to process resource claim' }, { status: 500 });
    }
}
