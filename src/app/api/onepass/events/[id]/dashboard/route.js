import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, { params }) {
    try {
        await OnePassDB.ensureHydrated();
        const { id } = await params;
        const auth = await authorizeUser(req, null, id, 'VIEW_DASHBOARD');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const metrics = OnePassDB.getLiveMetrics(id);
        if (!metrics) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ metrics }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (e) {
        console.error('[OnePass Event Dashboard Error]', e);
        return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
    }
}
