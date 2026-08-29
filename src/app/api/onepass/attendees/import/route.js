import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { generateQRToken } from '@/lib/onepass/qr';

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventId, rows, mapping, dryRun = false } = body;

        if (!eventId || !rows || !Array.isArray(rows)) {
            return NextResponse.json({ error: 'eventId and array of rows are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const event = OnePassDB.getEventById(eventId);
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const existingAttendees = OnePassDB.getAttendees(eventId);
        const existingEmails = new Set(existingAttendees.map(a => a.email.toLowerCase()));
        const existingBookingIds = new Set(existingAttendees.map(a => a.booking_id?.toLowerCase()).filter(Boolean));
        const existingQRs = new Set(existingAttendees.map(a => a.qr_identifier?.toLowerCase()).filter(Boolean));

        const seenFileEmails = new Set();
        const seenFileBookingIds = new Set();
        const seenFileQRs = new Set();

        const validRecords = [];
        const invalidRecords = [];
        const duplicateRecords = [];
        const warnings = [];

        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            const rowIndex = i + 1;

            // Map fields according to provided mapping
            const name = (rawRow[mapping?.name || 'name'] || rawRow['Name'] || rawRow['Full Name'] || rawRow['Attendee Name'] || '').trim();
            const email = (rawRow[mapping?.email || 'email'] || rawRow['Email'] || rawRow['Email Address'] || '').trim().toLowerCase();
            const phone = (rawRow[mapping?.phone || 'phone'] || rawRow['Phone'] || rawRow['Contact'] || rawRow['Mobile'] || '').trim();
            const bookingId = (rawRow[mapping?.booking_id || 'booking_id'] || rawRow['Booking ID'] || rawRow['Order ID'] || rawRow['Ticket ID'] || '').trim();
            const registrationId = (rawRow[mapping?.registration_id || 'registration_id'] || rawRow['Registration ID'] || rawRow['Ref ID'] || '').trim();
            const ticketType = (rawRow[mapping?.ticket_type || 'ticket_type'] || rawRow['Ticket Type'] || rawRow['Ticket'] || 'Attendee').trim();
            let qrIdentifier = (rawRow[mapping?.qr_identifier || 'qr_identifier'] || rawRow['QR Code'] || rawRow['QR Identifier'] || rawRow['QR'] || '').trim();

            const errors = [];

            if (!name) {
                errors.push('Missing name');
            }

            if (!email) {
                errors.push('Missing email address');
            } else if (!email.includes('@') || !email.includes('.')) {
                errors.push('Invalid email format');
            }

            // Check duplicate in file
            if (email && seenFileEmails.has(email)) {
                errors.push('Duplicate email within imported file');
            }
            if (bookingId && seenFileBookingIds.has(bookingId.toLowerCase())) {
                errors.push('Duplicate booking ID within imported file');
            }
            if (qrIdentifier && seenFileQRs.has(qrIdentifier.toLowerCase())) {
                errors.push('Duplicate QR code within imported file');
            }

            // Check duplicate in database
            if (email && existingEmails.has(email)) {
                errors.push('Email already registered for this event');
            }
            if (bookingId && existingBookingIds.has(bookingId.toLowerCase())) {
                errors.push('Booking ID already exists in database');
            }
            if (qrIdentifier && existingQRs.has(qrIdentifier.toLowerCase())) {
                errors.push('QR identifier already assigned to another attendee');
            }

            if (errors.length > 0) {
                const isDuplicate = errors.some(e => e.includes('Duplicate') || e.includes('already'));
                const recordInfo = {
                    row_number: rowIndex,
                    name: name || '[Empty]',
                    email: email || '[Empty]',
                    booking_id: bookingId,
                    errors
                };

                if (isDuplicate) {
                    duplicateRecords.push(recordInfo);
                } else {
                    invalidRecords.push(recordInfo);
                }
                continue;
            }

            // Mark as seen
            if (email) seenFileEmails.add(email);
            if (bookingId) seenFileBookingIds.add(bookingId.toLowerCase());
            if (qrIdentifier) seenFileQRs.add(qrIdentifier.toLowerCase());

            // Auto-generate QR if not present
            let qrToken = '';
            if (!qrIdentifier) {
                const generated = generateQRToken('SCD26');
                qrIdentifier = generated.qr_identifier;
                qrToken = generated.qr_token;
                warnings.push({ row_number: rowIndex, name, message: `Auto-generated QR code: ${qrIdentifier}` });
            } else {
                qrToken = qrIdentifier;
            }

            validRecords.push({
                name,
                email,
                phone,
                booking_id: bookingId || `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                registration_id: registrationId || `REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                ticket_type: ticketType,
                qr_identifier: qrIdentifier,
                qr_token: qrToken
            });
        }

        const summary = {
            total_rows: rows.length,
            valid_count: validRecords.length,
            invalid_count: invalidRecords.length,
            duplicate_count: duplicateRecords.length,
            warnings_count: warnings.length,
            invalid_records: invalidRecords,
            duplicate_records: duplicateRecords,
            warnings: warnings
        };

        if (dryRun) {
            return NextResponse.json({
                success: true,
                dry_run: true,
                summary,
                preview: validRecords.slice(0, 10)
            });
        }

        // Execute batch insert
        const created = OnePassDB.batchCreateAttendees(eventId, validRecords);

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId,
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'IMPORT_ATTENDEES',
            entity_type: 'ATTENDEE',
            entity_id: `batch_${created.length}`,
            metadata: {
                total_rows: rows.length,
                imported_count: created.length,
                duplicates: duplicateRecords.length,
                invalid: invalidRecords.length
            },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

        return NextResponse.json({
            success: true,
            summary: {
                ...summary,
                imported_count: created.length
            }
        });
    } catch (e) {
        console.error('[OnePass Import Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to process attendee import' }, { status: 500 });
    }
}
