/**
 * Robust Universal Template Variable Interpolation Utility
 * Handles case-insensitivity, spaces inside brackets {{ name }}, 
 * special characters in column names, semantic synonyms, 
 * formatted check-in status/time, and context fallbacks.
 */

function escapeRegExp(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatCheckinTime(val) {
    if (!val) return 'Not Checked In';
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'pending' || str.toLowerCase() === 'not checked in' || str.toLowerCase() === 'null') {
        return 'Not Checked In';
    }
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    } catch {
        // Fall back to original string
    }
    return str;
}

function formatCheckinStatus(val, hasTime = false) {
    if (!val && !hasTime) return 'Not Checked In';
    if (!val && hasTime) return 'Checked In';
    const s = String(val).toUpperCase().trim();
    if (['CHECKED_IN', 'CHECKED IN', 'YES', 'TRUE', '1', 'ATTENDED', 'PRESENT', 'SUCCESS'].includes(s)) {
        return 'Checked In';
    }
    if (['NOT_CHECKED_IN', 'NOT CHECKED IN', 'NO', 'FALSE', '0', 'PENDING', 'ABSENT', 'UNCHECKED'].includes(s)) {
        return 'Not Checked In';
    }
    return String(val);
}

export function interpolateTemplate(template, data = {}, context = {}) {
    if (!template) return '';
    let text = String(template);

    // 1. Resolve semantic fields with friendly formatting
    const name = data.name || data['Full Name'] || data['Attendee Name'] || data['Name'] || data['buyer_name'] || context.name || 'Attendee';
    const firstName = data.first_name || data['First Name'] || (name && name !== 'Attendee' ? name.split(' ')[0] : 'Attendee');
    const phone = data.phone || data.mobile || data.contact || data['Phone Number'] || data['Mobile'] || data['Phone'] || data['WhatsApp'] || context.phone || '';
    const email = data.email || data['Email'] || data['Email Address'] || data['Email ID'] || context.email || '';
    const ticket = data.ticket || data.ticket_type || data.ticket_name || data['Ticket Type'] || data['Ticket Name'] || data['Ticket'] || data['Category'] || data['Pass'] || 'General Pass';
    const bookingId = data.booking_id || data.bookingId || data.order_id || data.orderId || data['Booking ID'] || data['Order ID'] || data['Ticket ID'] || data['Registration ID'] || data.id || '';
    const counter = data.counter || data.counter_assigned || data['Counter'] || data['Counter Desk'] || data['Desk'] || 'Counter 1';
    const passLink = data.pass_link || data.ticket_pdf || data.ticket_url || data['Ticket URL'] || data['Ticket PDF'] || data['PDF Link'] || data['Pass Link'] || context.passLink || '';
    const venue = context.venue || data.venue || data['Venue'] || 'Dharmsinh Desai University (DDU)';
    const eventName = context.eventName || data.event_name || data['Event Name'] || data['Event'] || 'AWS Students Community Day 2026';
    const session = data.session || data.assigned_workshop_name || data.assigned_track_name || data['Session'] || data['Track'] || data['Workshop'] || 'Main Track';
    const location = data.location || data.room || data['Location'] || data['Room'] || data['Hall'] || 'Main Auditorium / Hall A';
    
    // Check-in status & time formatting
    const rawCheckinTime = data.check_in_time || data.checkin_time || data.checked_in_at || data['Check-in Time'] || data['Checkin Time'] || data['Time'] || null;
    const rawCheckinStatus = data.check_in_status || data.checkin_status || data.status || data['Check-in Status'] || data['Checkin Status'] || data['Status'] || (rawCheckinTime ? 'CHECKED_IN' : 'NOT_CHECKED_IN');
    const checkinStatus = formatCheckinStatus(rawCheckinStatus, Boolean(rawCheckinTime));
    const checkinTime = formatCheckinTime(rawCheckinTime);
    const checkedInBy = data.checked_in_by_name || data.checked_in_by || data['Checked In By'] || data['Volunteer'] || 'Registration Desk';

    const aliasMap = [
        { aliases: ['name', 'full_name', 'full name', 'attendee_name', 'attendee name', 'buyer_name'], value: name },
        { aliases: ['first_name', 'firstname', 'first name'], value: firstName },
        { aliases: ['phone', 'mobile', 'contact', 'whatsapp', 'phone_number', 'phone number', 'mobile_number', 'mobile number'], value: phone },
        { aliases: ['email', 'email_address', 'email address', 'email_id', 'email id'], value: email },
        { aliases: ['ticket', 'ticket_type', 'ticket type', 'ticket_name', 'ticket name', 'pass_type', 'pass type', 'category', 'ticket category'], value: ticket },
        { aliases: ['booking_id', 'booking id', 'order_id', 'order id', 'ticket_id', 'ticket id', 'registration_id', 'registration id'], value: bookingId },
        { aliases: ['counter', 'counter_assigned', 'counter desk', 'counter_desk', 'desk', 'booth', 'badge_counter', 'counter_number'], value: counter },
        { aliases: ['pass_link', 'pass link', 'ticket_url', 'ticket url', 'ticket_pdf', 'ticket pdf', 'e-ticket', 'eticket', 'qr_link', 'download_ticket_url'], value: passLink },
        { aliases: ['venue', 'location_venue', 'event_venue'], value: venue },
        { aliases: ['event_name', 'event name', 'event', 'event_title'], value: eventName },
        { aliases: ['session', 'track', 'workshop', 'session_name', 'track_name', 'workshop_name'], value: session },
        { aliases: ['location', 'room', 'hall', 'room_name', 'venue_room'], value: location },
        { aliases: ['checkin_status', 'check_in_status', 'status', 'attendance', 'check-in status'], value: checkinStatus },
        { aliases: ['checkin_time', 'check_in_time', 'checked_in_at', 'time', 'check-in time'], value: checkinTime },
        { aliases: ['checked_in_by', 'checked_in_by_name', 'volunteer', 'checked in by'], value: checkedInBy }
    ];

    // 2. Perform alias replacements first so synonyms and formatted check-in statuses are respected
    for (const { aliases, value } of aliasMap) {
        for (const alias of aliases) {
            const escapedAlias = escapeRegExp(alias);
            const regex = new RegExp(`{{\\s*${escapedAlias}\\s*}}`, 'gi');
            text = text.replace(regex, String(value ?? ''));
        }
    }

    // 3. Direct key-value replacement for any remaining custom Excel columns or raw keys
    if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
            if (val !== undefined && val !== null) {
                const escapedKey = escapeRegExp(String(key).trim());
                if (escapedKey) {
                    const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'gi');
                    text = text.replace(regex, String(val));
                }
            }
        }
    }

    return text;
}
