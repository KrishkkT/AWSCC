import { NextResponse } from 'next/server';
import { syncBadgeStudioToSupabase, loadBadgeStudioFromSupabase, syncOnePassFullDatabaseToSupabase } from '@/lib/onepass/supabaseSync';
import { OnePassDB } from '@/lib/onepass/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const cloudData = await loadBadgeStudioFromSupabase();
        return NextResponse.json({
            success: true,
            data: cloudData
        });
    } catch (e) {
        console.error('[API onepass/sync GET]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        
        // 1. Sync Badge Studio data if provided
        if (body.type === 'badge_studio' || body.templates || body.attendeesByTemplate) {
            await syncBadgeStudioToSupabase(body);
        }

        // 2. Sync Full OnePass Database if requested
        if (body.type === 'full' || body.syncDatabase) {
            await syncOnePassFullDatabaseToSupabase();
        }

        return NextResponse.json({
            success: true,
            syncedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('[API onepass/sync POST]', e);
        return NextResponse.json({ success: false, error: e.message, stack: e.stack }, { status: 500 });
    }
}
