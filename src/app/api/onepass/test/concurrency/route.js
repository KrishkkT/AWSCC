import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const testCapacity = body.capacity || 1;
        const totalConcurrentAttempts = body.attempts || 10;

        console.log(`[Concurrency Test] Starting test with track capacity=${testCapacity} and ${totalConcurrentAttempts} concurrent requests...`);

        // 1. Create a temporary isolated test event
        const testEvent = OnePassDB.createEvent({
            name: `Concurrency Stress Test (${Date.now()})`,
            year: 2026,
            venue: 'Virtual Test Bench',
            status: 'LIVE'
        });

        // 2. Create a track with strictly 1 seat (or testCapacity)
        const testTrack = OnePassDB.createTrack({
            event_id: testEvent.id,
            name: 'Stress Test Track (Cap=1)',
            capacity: testCapacity
        });

        // 3. Create N attendees
        const attendees = [];
        for (let i = 1; i <= totalConcurrentAttempts; i++) {
            const att = OnePassDB.createAttendee({
                event_id: testEvent.id,
                name: `Test Attendee ${i}`,
                email: `test${i}_${Date.now()}@onepass.local`,
                booking_id: `TEST-BK-${i}`,
                qr_identifier: `TEST-QR-${i}`
            });
            attendees.push(att);
        }

        // 4. Fire all check-ins SIMULTANEOUSLY using Promise.all
        const promises = attendees.map(att =>
            OnePassDB.atomicCheckIn({
                eventId: testEvent.id,
                attendeeId: att.id,
                trackId: testTrack.id,
                volunteerId: auth.user.id,
                actorName: 'Automated Concurrency Tester'
            })
        );

        const results = await Promise.all(promises);

        const successful = results.filter(r => r.success === true);
        const rejected = results.filter(r => r.success === false && r.code === 'TRACK_FULL');
        const otherFailures = results.filter(r => r.success === false && r.code !== 'TRACK_FULL');

        // Check final occupancy in DB
        const finalTrack = OnePassDB.getTrackById(testTrack.id);

        const isConcurrencySafe = successful.length === testCapacity &&
            rejected.length === (totalConcurrentAttempts - testCapacity) &&
            finalTrack.occupancy === testCapacity;

        return NextResponse.json({
            success: true,
            is_concurrency_safe: isConcurrencySafe,
            test_parameters: {
                track_capacity: testCapacity,
                concurrent_requests: totalConcurrentAttempts
            },
            results: {
                total_attempted: totalConcurrentAttempts,
                successful_assignments: successful.length,
                rejected_track_full: rejected.length,
                other_errors: otherFailures.length,
                final_track_occupancy: `${finalTrack.occupancy} / ${finalTrack.capacity}`
            },
            verdict: isConcurrencySafe
                ? 'PASSED: Zero race conditions detected. Mutex locks successfully prevented over-allocation.'
                : 'FAILED: Race condition detected! Capacity was violated.'
        });
    } catch (e) {
        console.error('[Concurrency Test Error]', e);
        return NextResponse.json({ error: e.message || 'Concurrency test failed' }, { status: 500 });
    }
}
