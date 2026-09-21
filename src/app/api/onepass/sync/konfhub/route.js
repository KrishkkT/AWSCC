import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Direct Live Sync from KonfHub Developer API
 * Endpoint: https://api.konfhub.com/developers/event/:event-id/attendees/private
 */
export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json().catch(() => ({}));
        const eventId = body?.eventId;
        const apiKey = (body?.konfhubApiKey || process.env.KONFHUB_API_KEY || '').trim();
        const khEventId = (body?.konfhubEventId || process.env.KONFHUB_EVENT_ID || '').trim();

        if (!eventId || !khEventId || !apiKey) {
            return NextResponse.json({
                error: 'eventId, konfhubEventId, and konfhubApiKey are required (or set in .env.local)'
            }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN', eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // Fetch attendees directly from KonfHub Private API
        let allAttendees = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const url = `https://api.konfhub.com/developers/event/${khEventId}/attendees/private?limit=${limit}&offset=${offset}`;
            const res = await fetch(url, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`KonfHub API returned ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const list = data.attendees || data.data || (Array.isArray(data) ? data : []);
            allAttendees = allAttendees.concat(list);

            if (list.length < limit || allAttendees.length >= 50000) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        if (allAttendees.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No attendees found in this KonfHub event.' });
        }

        // Map and save into OnePassDB
        const db = OnePassDB.getSnapshot();
        if (!Array.isArray(db.attendees)) db.attendees = [];

        let addedCount = 0;
        let updatedCount = 0;

        allAttendees.forEach((kh, idx) => {
            const bookingId = kh.booking_id || kh.order_id || kh.id || `KH-${idx + 1}`;
            const email = (kh.email || kh.email_id || '').toLowerCase().trim();
            const name = (kh.name || kh.full_name || kh.attendee_name || `Attendee ${idx + 1}`).trim();
            const phone = (kh.phone || kh.mobile || kh.contact || kh.phone_number || '').trim();
            const ticketType = kh.ticket_name || kh.ticket_type || 'General Pass';
            const ticketPdf = kh.ticket_pdf || kh.pdf_url || kh.download_ticket_url || kh.ticket_url || kh.ticket_link || '';
            const qrCodeUrl = kh.qr_code || kh.qr_code_url || kh.qr_url || '';

            // Check if attendee already exists in database
            const existingIdx = db.attendees.findIndex(a =>
                (a.event_id === eventId) &&
                ((a.booking_id && a.booking_id === bookingId) || (email && a.email === email))
            );

            const attendeeRecord = {
                id: existingIdx !== -1 ? db.attendees[existingIdx].id : `att_${Date.now()}_${idx}`,
                event_id: eventId,
                name,
                email: email || `${bookingId.toLowerCase()}@scd2026.ddu.ac.in`,
                phone,
                booking_id: bookingId,
                ticket_type: ticketType,
                ticket_url: ticketPdf || `https://aws.ddu.ac.in/onepass/events/${eventId}/badge/${bookingId}`,
                ticket_pdf: ticketPdf,
                qr_code_url: qrCodeUrl,
                check_in_status: existingIdx !== -1 ? db.attendees[existingIdx].check_in_status : 'NOT_CHECKED_IN',
                counter_assigned: existingIdx !== -1 ? db.attendees[existingIdx].counter_assigned : `Counter ${Math.floor(idx / 30) + 1}`,
                raw_konfhub: kh,
                updated_at: new Date().toISOString()
            };

            if (existingIdx !== -1) {
                db.attendees[existingIdx] = { ...db.attendees[existingIdx], ...attendeeRecord };
                updatedCount++;
            } else {
                db.attendees.push(attendeeRecord);
                addedCount++;
            }
        });

        OnePassDB.saveDb(db);

        return NextResponse.json({
            success: true,
            totalFetched: allAttendees.length,
            added: addedCount,
            updated: updatedCount
        });
    } catch (err) {
        console.error('[KonfHub API Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
