import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const token = searchParams.get('token');

        let targetEventId = eventId;
        let event = targetEventId ? OnePassDB.getEventById(targetEventId) : null;
        if (!event) {
            const events = OnePassDB.getEvents() || [];
            if (events.length > 0) {
                event = events[0];
                targetEventId = event.id;
            }
        }

        if (!event) {
            return NextResponse.json({ error: 'No active event found in database' }, { status: 404 });
        }

        // Allow access via session cookie, token, or open sync (optional secret protection)
        const auth = await authorizeUser(req, null, targetEventId);
        const headerToken = req.headers.get('x-sync-token') || req.headers.get('authorization') || '';
        const requiredSecret = process.env.ONEPASS_SYNC_TOKEN;

        if (requiredSecret) {
            const matchesSecret = token === requiredSecret || headerToken.includes(requiredSecret);
            if (!auth.authorized && !matchesSecret) {
                return NextResponse.json({ error: 'Unauthorized. Invalid sync token.' }, { status: 401 });
            }
        }

        const db = OnePassDB.getSnapshot();
        const attendees = OnePassDB.getAttendees(targetEventId) || [];
        const tracks = OnePassDB.getTracks(targetEventId) || [];
        const workshops = OnePassDB.getWorkshops(targetEventId) || [];
        const foodResources = OnePassDB.getResources(targetEventId, 'FOOD') || [];
        const swagResources = OnePassDB.getResources(targetEventId, 'SWAG') || [];
        const allResources = db.resources ? db.resources.filter(r => r.event_id === targetEventId) : [];
        const resourceClaims = db.resource_claims ? db.resource_claims.filter(c => c.event_id === targetEventId) : [];
        const counterStats = OnePassDB.getCounterStats(targetEventId) || [];
        const checkedInList = attendees.filter(a => a.check_in_status === 'CHECKED_IN');

        // Tab 1: Executive Summary
        const summaryTab = [
            ['Metric', 'Value'],
            ['Event Name', event.name || 'Community Event'],
            ['Last Cloud Sync Timestamp', new Date().toLocaleString()],
            ['Total Registered Attendees', attendees.length],
            ['Total Admitted / Checked-In', checkedInList.length],
            ['Pending Attendees', attendees.length - checkedInList.length],
            ['Overall Turnout Rate', attendees.length > 0 ? `${Math.round((checkedInList.length / attendees.length) * 100)}%` : '0%'],
            ['Total Track Gate Sessions', tracks.length],
            ['Total Workshops & Labs', workshops.length],
            ['Total Meals / Lunch Claims', foodResources.reduce((s, r) => s + (r.claims_count || 0), 0)],
            ['Total Swag Kit Claims', swagResources.reduce((s, r) => s + (r.claims_count || 0), 0)]
        ];

        // Tab 2: Check-Ins
        const checkInsTab = [
            ['S.No', 'Full Name', 'Email', 'Phone', 'Ticket Type', 'Booking ID', 'QR Token', 'Badge Counter', 'Box #', 'Check-In Time', 'Checked In By', 'Allocated Session']
        ];
        checkedInList.forEach((a, idx) => {
            const trk = tracks.find(t => t.id === a.assigned_track_id);
            const wk = workshops.find(w => w.id === a.assigned_workshop_id);
            checkInsTab.push([
                idx + 1,
                a.name || '',
                a.email || '',
                a.phone || '',
                a.ticket_type || 'Attendee',
                a.booking_id || '',
                a.qr_identifier || '',
                a.counter || 'Unassigned',
                a.counter_number || '',
                a.check_in_time ? new Date(a.check_in_time).toLocaleString() : '',
                a.checked_in_by_name || 'Volunteer',
                trk ? `Track: ${trk.name}` : (wk ? `Workshop: ${wk.name}` : 'General')
            ]);
        });

        // Tab 3: Track Stats
        const tracksTab = [
            ['S.No', 'Track Name', 'Description', 'Capacity', 'Checked-In Count', 'Remaining Seats', 'Occupancy Rate', 'Status']
        ];
        tracks.forEach((t, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_track_id === t.id).length;
            const cap = t.capacity || 150;
            const rate = cap > 0 ? `${Math.round((occ / cap) * 100)}%` : '0%';
            tracksTab.push([
                idx + 1,
                t.name || '',
                t.description || '',
                cap,
                occ,
                Math.max(0, cap - occ),
                rate,
                occ >= cap ? 'FULL' : 'OPEN'
            ]);
        });

        // Tab 4: Workshop Stats
        const workshopsTab = [
            ['S.No', 'Workshop Name', 'Speaker', 'Venue / Hall', 'Time Window', 'Capacity', 'Enrolled Count', 'Remaining Seats', 'Occupancy Rate', 'Status']
        ];
        workshops.forEach((w, idx) => {
            const occ = attendees.filter(a => a.check_in_status === 'CHECKED_IN' && a.assigned_workshop_id === w.id).length;
            const cap = w.capacity || 30;
            const rate = cap > 0 ? `${Math.round((occ / cap) * 100)}%` : '0%';
            workshopsTab.push([
                idx + 1,
                w.name || '',
                w.speaker || '—',
                w.location || w.venue || '',
                `${w.start_time || ''} - ${w.end_time || ''}`,
                cap,
                occ,
                Math.max(0, cap - occ),
                rate,
                occ >= cap ? 'FULL' : 'OPEN'
            ]);
        });

        // Tab 5: Lunch & Food
        const foodTab = [
            ['S.No', 'Meal Resource', 'Description', 'Timing Window', 'Limit Per Attendee', 'Total Distributed', 'Total Stock', 'Remaining Stock', 'Distribution %']
        ];
        foodResources.forEach((r, idx) => {
            const claims = resourceClaims.filter(c => c.resource_id === r.id).length;
            const cap = r.capacity || 450;
            const dist = claims || r.claims_count || 0;
            const rate = cap > 0 ? `${Math.round((dist / cap) * 100)}%` : 'N/A';
            foodTab.push([
                idx + 1,
                r.name || '',
                r.description || '',
                `${r.start_time || 'Open'} - ${r.end_time || 'Open'}`,
                r.claim_limit || 1,
                dist,
                cap,
                Math.max(0, cap - dist),
                rate
            ]);
        });

        // Tab 6: Swag Kits
        const swagTab = [
            ['S.No', 'Swag Item Name', 'Description', 'Limit Per Attendee', 'Total Distributed', 'Allocated Stock', 'Remaining Inventory', 'Distribution %']
        ];
        swagResources.forEach((r, idx) => {
            const claims = resourceClaims.filter(c => c.resource_id === r.id).length;
            const cap = r.capacity || 400;
            const dist = claims || r.claims_count || 0;
            const rate = cap > 0 ? `${Math.round((dist / cap) * 100)}%` : 'N/A';
            swagTab.push([
                idx + 1,
                r.name || '',
                r.description || '',
                r.claim_limit || 1,
                dist,
                cap,
                Math.max(0, cap - dist),
                rate
            ]);
        });

        // Tab 7: Badge Counters
        const countersTab = [
            ['S.No', 'Counter Desk Name', 'Box Number', 'Badge Category', 'Total Badges Assigned', 'Badges Collected', 'Pending Badges', 'Collection %']
        ];
        counterStats.forEach((c, idx) => {
            const rate = c.total > 0 ? `${Math.round((c.checked_in / c.total) * 100)}%` : '0%';
            countersTab.push([
                idx + 1,
                c.counter || 'Counter',
                c.counter_number || 'N/A',
                c.category || 'General',
                c.total || 0,
                c.checked_in || 0,
                c.pending || 0,
                rate
            ]);
        });

        // Tab 8: Volunteer Leaderboard
        const volunteerMap = new Map();
        checkedInList.forEach(a => {
            const volName = a.checked_in_by_name || 'Volunteer / Staff';
            const volRole = a.checked_in_by_role || (volName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');
            if (!volunteerMap.has(volName)) {
                volunteerMap.set(volName, { name: volName, role: volRole, count: 0 });
            }
            volunteerMap.get(volName).count += 1;
        });
        const volLeaderboard = Array.from(volunteerMap.values()).sort((a, b) => b.count - a.count);
        const volunteersTab = [
            ['Rank', 'Volunteer / Staff Name', 'Role', 'Attendees Checked-In', 'Share of Total %']
        ];
        volLeaderboard.forEach((v, idx) => {
            const share = checkedInList.length > 0 ? `${((v.count / checkedInList.length) * 100).toFixed(1)}%` : '0%';
            volunteersTab.push([idx + 1, v.name, v.role, v.count, share]);
        });

        return NextResponse.json({
            success: true,
            event_name: event.name,
            synced_at: new Date().toISOString(),
            sheets: {
                'Executive Summary': summaryTab,
                'Check-Ins': checkInsTab,
                'Tracks Stats': tracksTab,
                'Workshops Stats': workshopsTab,
                'Lunch Distribution': foodTab,
                'Swag Kits': swagTab,
                'Badge Counters': countersTab,
                'Volunteer Leaderboard': volunteersTab
            }
        });
    } catch (e) {
        console.error('[Google Sheet Sync API Error]', e);
        return NextResponse.json({ error: 'Failed to process Google Sheet sync' }, { status: 500 });
    }
}
