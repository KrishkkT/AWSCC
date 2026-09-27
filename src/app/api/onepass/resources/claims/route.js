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
        const resourceId = searchParams.get('resourceId');
        const filterStatus = searchParams.get('status') || 'all'; // 'all' | 'unclaimed' | 'claimed'
        const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

        if (!eventId || !resourceId) {
            return NextResponse.json({ error: 'eventId and resourceId are required' }, { status: 400 });
        }

        const resource = await OnePassDB.getResourceById(resourceId);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        const requiredPermission = resource.type === 'FOOD' ? 'FOOD' : (resource.type === 'SWAG' ? 'SWAG' : null);
        const auth = await authorizeUser(req, null, eventId, requiredPermission);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const [allAttendees, claims, tracks, workshops] = await Promise.all([
            OnePassDB.getAttendees(eventId),
            OnePassDB.getResourceClaims(eventId),
            OnePassDB.getTracks(eventId),
            OnePassDB.getWorkshops(eventId)
        ]);

        // Only attendees who have completed Event Check-In
        const eventCheckedInAttendees = allAttendees.filter(a => a.check_in_status === 'CHECKED_IN');
        const claimsForResource = claims.filter(c => c.resource_id === resourceId);
        const claimMap = new Map();
        claimsForResource.forEach(c => {
            claimMap.set(c.attendee_id, c);
        });

        const mappedAttendees = eventCheckedInAttendees.map(a => {
            const claim = claimMap.get(a.id);
            const trk = tracks.find(t => t.id === a.assigned_track_id);
            const wk = workshops.find(w => w.id === a.assigned_workshop_id);
            return {
                id: a.id,
                name: a.name,
                email: a.email,
                phone: a.phone || '',
                ticket_type: a.ticket_type || 'Attendee',
                booking_id: a.booking_id || '',
                qr_identifier: a.qr_identifier || '',
                counter: a.counter || 'Unassigned',
                counter_number: a.counter_number || null,
                check_in_time: a.check_in_time,
                checked_in_by_name: a.checked_in_by_name || 'Volunteer',
                track_name: trk ? trk.name : null,
                workshop_name: wk ? wk.name : null,
                is_claimed: !!claim,
                claim_time: claim ? claim.timestamp : null,
                claim_id: claim ? claim.id : null
            };
        });

        // Filter by claim status
        let filtered = mappedAttendees;
        if (filterStatus === 'unclaimed') {
            filtered = filtered.filter(a => !a.is_claimed);
        } else if (filterStatus === 'claimed') {
            filtered = filtered.filter(a => a.is_claimed);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(a =>
                (a.name && a.name.toLowerCase().includes(searchQuery)) ||
                (a.email && a.email.toLowerCase().includes(searchQuery)) ||
                (a.phone && a.phone.toLowerCase().includes(searchQuery)) ||
                (a.booking_id && a.booking_id.toLowerCase().includes(searchQuery)) ||
                (a.qr_identifier && a.qr_identifier.toLowerCase().includes(searchQuery)) ||
                (a.counter && a.counter.toLowerCase().includes(searchQuery)) ||
                (a.counter_number && String(a.counter_number).includes(searchQuery)) ||
                (a.track_name && a.track_name.toLowerCase().includes(searchQuery)) ||
                (a.workshop_name && a.workshop_name.toLowerCase().includes(searchQuery))
            );
        }

        const summary = {
            total_registered: allAttendees.length,
            event_checked_in: eventCheckedInAttendees.length,
            resource_claimed: claimsForResource.length,
            unclaimed_count: Math.max(0, eventCheckedInAttendees.length - claimsForResource.length),
            capacity: resource.capacity || null,
            resource_name: resource.name,
            resource_type: resource.type
        };

        return NextResponse.json({
            summary,
            attendees: filtered,
            total_filtered: filtered.length
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (e) {
        console.error('[OnePass Resource Claims GET]', e);
        return NextResponse.json({ error: 'Failed to fetch resource claims status' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, resourceId, attendeeId, attendeeIds } = body;

        if (!eventId || !resourceId || (!attendeeId && (!Array.isArray(attendeeIds) || attendeeIds.length === 0))) {
            return NextResponse.json({ error: 'eventId, resourceId and attendeeId (or attendeeIds) are required' }, { status: 400 });
        }

        const resource = await OnePassDB.getResourceById(resourceId);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        const requiredPermission = resource.type === 'FOOD' ? 'FOOD' : (resource.type === 'SWAG' ? 'SWAG' : null);
        const auth = await authorizeUser(req, null, eventId, requiredPermission);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        if (Array.isArray(attendeeIds) && attendeeIds.length > 0) {
            // Batch claim
            const result = await OnePassDB.claimResourceBatch({
                eventId,
                attendeeIds,
                resourceId,
                volunteerId: auth.user.id,
                volunteerName: auth.user.name
            });
            return NextResponse.json(result);
        } else {
            // Single claim by attendeeId
            const result = await OnePassDB.claimResource({
                eventId,
                attendeeId,
                resourceId,
                volunteerId: auth.user.id,
                volunteerName: auth.user.name
            });
            if (!result.success) {
                return NextResponse.json(result, { status: 400 });
            }
            return NextResponse.json(result);
        }
    } catch (e) {
        console.error('[OnePass Resource Claims POST]', e);
        return NextResponse.json({ error: 'Failed to process batch resource claim' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        let body = {};
        try {
            body = await req.json();
        } catch (e) {}

        const eventId = body.eventId || searchParams.get('eventId');
        const resourceId = body.resourceId || searchParams.get('resourceId');
        const attendeeId = body.attendeeId || searchParams.get('attendeeId');
        const attendeeIds = body.attendeeIds || [];
        const claimId = body.claimId || searchParams.get('claimId');

        if (!eventId || !resourceId || (!attendeeId && !claimId && attendeeIds.length === 0)) {
            return NextResponse.json({ error: 'eventId, resourceId and (attendeeId, claimId or attendeeIds) are required' }, { status: 400 });
        }

        const resource = await OnePassDB.getResourceById(resourceId);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        const requiredPermission = resource.type === 'FOOD' ? 'FOOD' : (resource.type === 'SWAG' ? 'SWAG' : null);
        const auth = await authorizeUser(req, null, eventId, requiredPermission);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        if (Array.isArray(attendeeIds) && attendeeIds.length > 0) {
            const result = await OnePassDB.revertResourceClaimBatch({
                eventId,
                resourceId,
                attendeeIds,
                volunteerId: auth.user.id,
                volunteerName: auth.user.name
            });
            return NextResponse.json(result);
        } else {
            const result = await OnePassDB.revertResourceClaim({
                eventId,
                resourceId,
                attendeeId,
                claimId,
                volunteerId: auth.user.id,
                volunteerName: auth.user.name
            });
            return NextResponse.json(result);
        }
    } catch (e) {
        console.error('[OnePass Resource Claims DELETE]', e);
        return NextResponse.json({ error: 'Failed to revert resource claim' }, { status: 500 });
    }
}
