import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const attendee = OnePassDB.getAttendeeProfile(eventId, id);
        if (!attendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        return NextResponse.json({ attendee });
    } catch (e) {
        console.error('[OnePass Attendee GET]', e);
        return NextResponse.json({ error: 'Failed to fetch attendee details' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updates = await req.json();
        const updated = OnePassDB.updateAttendee(id, updates);
        if (!updated) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, attendee: updated });
    } catch (e) {
        console.error('[OnePass Attendee PATCH]', e);
        return NextResponse.json({ error: 'Failed to update attendee' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.deleteAttendee(id, auth.user?.name || 'Admin', auth.user?.role || 'ADMIN');
        return NextResponse.json({ success: true, message: 'Attendee deleted successfully' });
    } catch (e) {
        console.error('[OnePass Attendee DELETE]', e);
        return NextResponse.json({ error: 'Failed to delete attendee' }, { status: 500 });
    }
}
