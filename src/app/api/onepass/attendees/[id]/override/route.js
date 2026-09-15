import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { eventId, updates, reason } = body;

        if (!eventId || !updates) {
            return NextResponse.json({ error: 'eventId and updates object are required' }, { status: 400 });
        }

        const updated = OnePassDB.adminOverride({
            eventId,
            attendeeId: id,
            updates,
            adminId: auth.user.id,
            adminName: auth.user.name,
            reason: reason || 'Manual Administrator Correction'
        });

        const profile = OnePassDB.getAttendeeProfile(eventId, id);

        return NextResponse.json({
            success: true,
            message: 'Attendee record overridden successfully.',
            attendee: profile
        });
    } catch (e) {
        console.error('[OnePass Admin Override Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to apply admin override' }, { status: 500 });
    }
}
