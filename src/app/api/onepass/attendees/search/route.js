import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { parseScannedQR } from '@/lib/onepass/qr';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const q = searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '';

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, null, eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        if (!q.trim()) {
            return NextResponse.json({ attendees: [] });
        }

        // 1. Combine direct QR lookup and multi-field search results
        const cleanQR = parseScannedQR(q);
        const directAttendee = OnePassDB.getAttendeeByQR(eventId, cleanQR) || OnePassDB.getAttendeeByQR(eventId, q);
        const searchList = await OnePassDB.getAttendees(eventId, { search: q });

        const resultMap = new Map();
        if (directAttendee) {
            resultMap.set(directAttendee.id, directAttendee);
        }
        for (const att of searchList) {
            if (!resultMap.has(att.id)) {
                resultMap.set(att.id, att);
            }
        }
        const combined = Array.from(resultMap.values());

        const [tracks, workshops] = await Promise.all([
            OnePassDB.getTracks(eventId),
            OnePassDB.getWorkshops(eventId)
        ]);

        const enriched = combined.map(a => ({
            ...a,
            track_name: a.assigned_track_id ? tracks.find(t => t.id === a.assigned_track_id)?.name : null,
            workshop_name: a.assigned_workshop_id ? workshops.find(w => w.id === a.assigned_workshop_id)?.name : null
        }));

        return NextResponse.json({ attendees: enriched, total: enriched.length }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (e) {
        console.error('[OnePass Attendees Search GET]', e);
        return NextResponse.json({ error: 'Failed to search attendees' }, { status: 500 });
    }
}
