import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { sendCampaignBroadcast } from '@/lib/onepass/email';
import { sendWhatsAppText, sendWhatsAppBatch, formatWhatsAppNumber } from '@/lib/whatsapp';
import { interpolateTemplate } from '@/lib/onepass/template';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getPublicDomain() {
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') && !process.env.NEXT_PUBLIC_APP_URL.includes('127.0.0.1')) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    return 'https://aws.ddu.ac.in';
}

function resolveAttendeePassLink(a, options = {}) {
    const { passLinkType, customPassUrlTemplate, passBaseUrl, eventId, publicDomain } = options;
    const KH_EVENT_ID = process.env.KONFHUB_EVENT_ID || 'ab9168b3-c610-4edc-bb16-b45f9517820c';
    const bookingId = a.booking_id || a.id || '';
    const rawTicket = a.ticket_pdf || a.ticket_url || a.pass_link;

    if (passLinkType === 'KONFHUB') {
        if (rawTicket && (rawTicket.includes('konfhub') || rawTicket.startsWith('http'))) {
            return rawTicket;
        }
        return bookingId ? `https://files.konfhub.com/${KH_EVENT_ID}/tickets/${bookingId}_ticket.pdf` : (rawTicket || 'https://konfhub.com');
    }

    if (passLinkType === 'CUSTOM' && customPassUrlTemplate) {
        return interpolateTemplate(customPassUrlTemplate, a);
    }

    if (passLinkType === 'ONEPASS') {
        const base = (passBaseUrl && passBaseUrl.trim()) ? passBaseUrl.trim().replace(/\/$/, '') : (publicDomain || 'https://aws.ddu.ac.in');
        return `${base}/onepass/events/${eventId}/badge/${bookingId}`;
    }

    // AUTO / DEFAULT
    if (rawTicket && typeof rawTicket === 'string' && rawTicket.startsWith('http')) {
        return rawTicket;
    }

    if (passBaseUrl && passBaseUrl.trim()) {
        const trimmed = passBaseUrl.trim().replace(/\/$/, '');
        if (trimmed.includes('konfhub.com/tickets')) {
            return `${trimmed}/${bookingId}`;
        }
        if (trimmed.includes('{{')) {
            return interpolateTemplate(trimmed, a);
        }
        return `${trimmed}/onepass/events/${eventId}/badge/${bookingId}`;
    }

    const base = publicDomain || getPublicDomain();
    return `${base}/onepass/events/${eventId}/badge/${bookingId}`;
}

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const audience = searchParams.get('audience') || 'ALL';
        const filterId = searchParams.get('filterId');
        const channel = searchParams.get('channel') || 'EMAIL';
        const passBaseUrl = searchParams.get('passBaseUrl');
        const passLinkType = searchParams.get('passLinkType') || 'KONFHUB';
        const customPassUrlTemplate = searchParams.get('customPassUrlTemplate');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN', eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const db = OnePassDB.getSnapshot();
        const tracks = db.tracks || [];
        const workshops = db.workshops || [];
        let attendees = (db.attendees || []).filter(a => a.event_id === eventId);

        // Filter based on channel requirements
        if (channel === 'WHATSAPP') {
            attendees = attendees.filter(a => a.phone || a.mobile || a.contact);
        } else {
            attendees = attendees.filter(a => a.email);
        }

        if (audience === 'CHECKED_IN') {
            attendees = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
        } else if (audience === 'NOT_CHECKED_IN') {
            attendees = attendees.filter(a => a.check_in_status === 'NOT_CHECKED_IN');
        } else if (audience === 'TRACK' && filterId) {
            attendees = attendees.filter(a => a.assigned_track_id === filterId);
        } else if (audience === 'WORKSHOP' && filterId) {
            attendees = attendees.filter(a => a.assigned_workshop_id === filterId);
        }

        const publicDomain = (passBaseUrl && passBaseUrl.trim())
            ? passBaseUrl.trim().replace(/\/$/, '')
            : getPublicDomain();

        return NextResponse.json({
            count: attendees.length,
            sample: attendees.slice(0, 10).map((a, idx) => {
                const assignedWk = workshops.find(w => w.id === a.assigned_workshop_id);
                const assignedTrk = tracks.find(t => t.id === a.assigned_track_id);
                const sessionName = assignedWk?.name || assignedTrk?.name || a.session || a.assigned_track_name || 'Cloud & AI Track';
                const locationName = assignedWk?.location || assignedTrk?.location || a.location || 'Main Auditorium / Hall A';
                const ticketLink = resolveAttendeePassLink(a, {
                    passLinkType,
                    customPassUrlTemplate,
                    passBaseUrl,
                    eventId,
                    publicDomain
                });
                const isCheckedIn = a.check_in_status === 'CHECKED_IN';
                const checkinStatus = isCheckedIn ? 'Checked In' : 'Not Checked In';
                const checkinTime = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Not Checked In';

                return {
                    id: a.id,
                    name: a.name || `Attendee ${idx + 1}`,
                    first_name: (a.name || 'Attendee').split(' ')[0],
                    email: a.email || '',
                    phone: a.phone || a.mobile || a.contact || '',
                    booking_id: a.booking_id || a.id || `BK-SCD-${1000 + idx}`,
                    counter: a.counter || a.counter_assigned || `Counter ${Math.floor(idx / 30) + 1}`,
                    ticket: a.ticket_type || 'General Pass',
                    ticket_type: a.ticket_type || 'General Pass',
                    ticket_pdf: a.ticket_pdf || '',
                    pass_link: ticketLink,
                    ticket_url: ticketLink,
                    session: sessionName,
                    location: locationName,
                    check_in_status: a.check_in_status || 'NOT_CHECKED_IN',
                    checkin_status: checkinStatus,
                    check_in_time: a.check_in_time || null,
                    checkin_time: checkinTime,
                    checked_in_by: a.checked_in_by_name || 'Registration Desk'
                };
            })
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
        const {
            eventId,
            channel = 'EMAIL', // 'EMAIL' | 'WHATSAPP'
            audience,
            filterId,
            subject,
            messageBody,
            templateType,
            testEmail,
            testPhone,
            customRecipients, // Array of recipients from uploaded Excel
            passBaseUrl, // Optional base domain override (e.g. http://172.20.10.7:4000 or custom)
            passLinkType = 'KONFHUB', // 'KONFHUB' | 'ONEPASS' | 'CUSTOM' | 'SHEET'
            customPassUrlTemplate
        } = body;

        if (!eventId || !messageBody) {
            return NextResponse.json({ error: 'eventId and messageBody are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN', eventId);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const db = OnePassDB.getSnapshot();
        const event = (db.events || []).find(e => e.id === eventId);
        const eventName = event?.name || 'AWS Students Community Day';
        const venue = event?.venue || 'Dharmsinh Desai University (DDU)';
        const tracks = db.tracks || [];
        const workshops = db.workshops || [];

        const publicDomain = (passBaseUrl && passBaseUrl.trim())
            ? passBaseUrl.trim().replace(/\/$/, '')
            : getPublicDomain();

        // ══════════════════════════════════════════════════════
        // WHATSAPP CHANNEL
        // ══════════════════════════════════════════════════════
        if (channel === 'WHATSAPP') {
            // Test single message
            if (testPhone) {
                const formatted = formatWhatsAppNumber(testPhone);
                if (!formatted) {
                    return NextResponse.json({ error: 'Invalid test phone number. Please enter a 10-digit or 12-digit number.' }, { status: 400 });
                }

                const sampleAttendee = {
                    name: auth.user?.name || 'Attendee',
                    phone: formatted,
                    email: auth.user?.email || 'admin@ddu.ac.in',
                    counter: 'Counter 1',
                    ticket: 'Confirmed Delegate Pass',
                    booking_id: '933008fc',
                    registration_id: 'pay_TcEFCY1ssQ9lke',
                    session: 'Keynote & AI Agent Architecture',
                    location: 'Main Auditorium / Hall A',
                    check_in_status: 'CHECKED_IN',
                    checkin_status: 'Checked In',
                    check_in_time: new Date().toISOString(),
                    checkin_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                    checked_in_by: auth.user?.name || 'Desk 1'
                };

                const testPassLink = resolveAttendeePassLink(sampleAttendee, {
                    passLinkType,
                    customPassUrlTemplate,
                    passBaseUrl,
                    eventId,
                    publicDomain
                });

                // Render test message with sample data using robust interpolation
                const sampleMsg = interpolateTemplate(messageBody, {
                    ...sampleAttendee,
                    pass_link: testPassLink,
                    ticket_url: testPassLink
                }, { venue, eventName, passLink: testPassLink });

                const res = await sendWhatsAppText({ to: formatted, message: sampleMsg });
                if (!res.success) {
                    return NextResponse.json({ error: res.error || 'WhatsApp Gateway failed to send' }, { status: 502 });
                }
                return NextResponse.json({ success: true, testSent: true, to: formatted });
            }

            // Determine recipient list
            let targetList = [];
            if (Array.isArray(customRecipients) && customRecipients.length > 0) {
                targetList = customRecipients;
            } else {
                let dbAttendees = (db.attendees || []).filter(a => a.event_id === eventId);
                if (audience === 'CHECKED_IN') {
                    dbAttendees = dbAttendees.filter(a => a.check_in_status === 'CHECKED_IN');
                } else if (audience === 'NOT_CHECKED_IN') {
                    dbAttendees = dbAttendees.filter(a => a.check_in_status === 'NOT_CHECKED_IN');
                } else if (audience === 'TRACK' && filterId) {
                    dbAttendees = dbAttendees.filter(a => a.assigned_track_id === filterId);
                } else if (audience === 'WORKSHOP' && filterId) {
                    dbAttendees = dbAttendees.filter(a => a.assigned_workshop_id === filterId);
                }
                targetList = dbAttendees.map((a, idx) => {
                    const assignedWk = workshops.find(w => w.id === a.assigned_workshop_id);
                    const assignedTrk = tracks.find(t => t.id === a.assigned_track_id);
                    const sessionName = assignedWk?.name || assignedTrk?.name || a.session || a.assigned_track_name || 'Cloud & AI Track';
                    const locationName = assignedWk?.location || assignedTrk?.location || a.location || 'Main Auditorium / Hall A';
                    const ticketLink = resolveAttendeePassLink(a, {
                        passLinkType,
                        customPassUrlTemplate,
                        passBaseUrl,
                        eventId,
                        publicDomain
                    });
                    const isCheckedIn = a.check_in_status === 'CHECKED_IN';
                    const checkinStatus = isCheckedIn ? 'Checked In' : 'Not Checked In';
                    const checkinTime = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Not Checked In';

                    return {
                        ...a,
                        phone: a.phone || a.mobile || a.contact,
                        name: a.name || `Attendee ${idx + 1}`,
                        first_name: (a.name || 'Attendee').split(' ')[0],
                        counter: a.counter || a.counter_assigned || `Counter ${Math.floor(idx / 30) + 1}`,
                        ticket: a.ticket_type || 'General Pass',
                        ticket_type: a.ticket_type || 'General Pass',
                        booking_id: a.booking_id || a.id || `BK-${idx + 1}`,
                        pass_link: ticketLink,
                        ticket_url: ticketLink,
                        session: sessionName,
                        location: locationName,
                        check_in_status: a.check_in_status || 'NOT_CHECKED_IN',
                        checkin_status: checkinStatus,
                        check_in_time: a.check_in_time || null,
                        checkin_time: checkinTime,
                        checked_in_by: a.checked_in_by_name || 'Registration Desk'
                    };
                });
            }

            // Filter out empty phone numbers
            targetList = targetList.filter(r => r.phone && cleanPhone(r.phone));

            if (targetList.length === 0) {
                return NextResponse.json({ error: 'No valid recipients with phone numbers found' }, { status: 400 });
            }

            // Helper to interpolate variables per attendee
            const getPersonalizedText = (item) => {
                const passLink = resolveAttendeePassLink(item, {
                    passLinkType,
                    customPassUrlTemplate,
                    passBaseUrl,
                    eventId,
                    publicDomain
                });
                return interpolateTemplate(messageBody, {
                    ...item,
                    pass_link: passLink,
                    ticket_url: passLink
                }, { venue, eventName, passLink });
            };

            const batchResult = await sendWhatsAppBatch({
                recipients: targetList,
                getMessageText: getPersonalizedText,
                minDelayMs: 1500,
                maxDelayMs: 3000
            });

            // Audit log
            const now = new Date().toISOString();
            if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
            db.audit_logs.unshift({
                id: `aud_${Date.now()}`,
                event_id: eventId,
                actor_id: auth.user.id,
                actor_name: auth.user.name,
                actor_role: 'ADMIN',
                action: 'WHATSAPP_CAMPAIGN_BROADCAST',
                entity_type: 'CAMPAIGN',
                entity_id: templateType || 'CUSTOM',
                metadata: {
                    audience,
                    targeted: batchResult.total,
                    sent: batchResult.sent,
                    failed: batchResult.failed
                },
                timestamp: now,
                result: 'SUCCESS'
            });
            OnePassDB.saveDb(db);

            return NextResponse.json({
                success: true,
                totalTargeted: batchResult.total,
                sentCount: batchResult.sent,
                failedCount: batchResult.failed,
                errors: batchResult.errors
            });
        }

        // ══════════════════════════════════════════════════════
        // EMAIL CHANNEL
        // ══════════════════════════════════════════════════════
        if (testEmail) {
            const { sendTestCampaignEmail } = await import('@/lib/onepass/email');
            const res = await sendTestCampaignEmail({
                eventId,
                subject: subject || 'Test Broadcast',
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
            subject: subject || 'Announcement',
            messageBody,
            templateType: templateType || 'CUSTOM'
        });

        // Audit log broadcast campaign
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

function cleanPhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
}
