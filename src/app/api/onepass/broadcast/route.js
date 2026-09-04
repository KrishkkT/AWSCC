import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { sendCampaignBroadcast } from '@/lib/onepass/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const audience = searchParams.get('audience') || 'ALL';
        const filterId = searchParams.get('filterId');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN', eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const db = OnePassDB.getSnapshot();
        let attendees = (db.attendees || []).filter(a => a.event_id === eventId && a.email);

        if (audience === 'CHECKED_IN') {
            attendees = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
        } else if (audience === 'NOT_CHECKED_IN') {
            attendees = attendees.filter(a => a.check_in_status === 'NOT_CHECKED_IN');
        } else if (audience === 'TRACK' && filterId) {
            attendees = attendees.filter(a => a.assigned_track_id === filterId);
        } else if (audience === 'WORKSHOP' && filterId) {
            attendees = attendees.filter(a => a.assigned_workshop_id === filterId);
        }

        return NextResponse.json({
            count: attendees.length,
            sample: attendees.slice(0, 5).map(a => ({ name: a.name, email: a.email, booking_id: a.booking_id }))
        });
    } catch (e) {
        console.error('[OnePass Broadcast GET Error]', e);
        return NextResponse.json({ error: 'Failed to calculate audience preview' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, audience, filterId, subject, messageBody, templateType, testEmail } = body;

        if (!eventId || !subject || !messageBody) {
            return NextResponse.json({ error: 'eventId, subject, and messageBody are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN', eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // If this is a test email send
        if (testEmail) {
            const { sendTestCampaignEmail } = await import('@/lib/onepass/email');
            const res = await sendTestCampaignEmail({
                eventId,
                subject,
                messageBody,
                testEmail: testEmail.trim(),
                templateType: templateType || 'CUSTOM'
            });
            return NextResponse.json({ success: res.success !== undefined ? res.success : true, testSent: true, to: testEmail });
        }

        const result = await sendCampaignBroadcast({
            eventId,
            audience: audience || 'ALL',
            filterId: filterId || null,
            subject,
            messageBody,
            templateType: templateType || 'CUSTOM'
        });

        // Audit log broadcast campaign
        const db = OnePassDB.getSnapshot();
        const now = new Date().toISOString();
        if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
        db.audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'EMAIL_CAMPAIGN_BROADCAST',
            entity_type: 'CAMPAIGN',
            entity_id: templateType || 'CUSTOM',
            metadata: {
                subject,
                audience,
                targeted: result.totalTargeted,
                sent: result.sentCount,
                failed: result.failedCount
            },
            timestamp: now,
            result: 'SUCCESS'
        });
        OnePassDB.saveDb(db);

        return NextResponse.json(result);
    } catch (e) {
        console.error('[OnePass Broadcast POST Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to send campaign broadcast.' }, { status: 500 });
    }
}
