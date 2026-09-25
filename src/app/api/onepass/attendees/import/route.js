import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser } from '@/lib/onepass/auth';
import { generateQRToken } from '@/lib/onepass/qr';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { eventId, rows, mapping, counter_rules, dryRun = false } = body;

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

            // Map fields according to provided mapping or common column header variations
            const rawFirst = (rawRow['First Name'] || rawRow['first_name'] || rawRow['FirstName'] || rawRow['Given Name'] || '').trim();
            const rawLast = (rawRow['Last Name'] || rawRow['last_name'] || rawRow['LastName'] || rawRow['Surname'] || '').trim();
            const combinedFirstLast = [rawFirst, rawLast].filter(Boolean).join(' ');

            let name = (rawRow[mapping?.name || 'name'] || rawRow['Name'] || rawRow['Full Name'] || rawRow['Attendee Name'] || rawRow['Attendee'] || combinedFirstLast || '').trim();
            if (rawFirst && rawLast && (!name || name.toLowerCase() === rawFirst.toLowerCase())) {
                name = combinedFirstLast;
            }
            let email = (rawRow[mapping?.email || 'email'] || rawRow['Email'] || rawRow['Email Address'] || rawRow['Mail'] || '').trim().toLowerCase();
            let phone = (rawRow[mapping?.phone || 'phone'] || rawRow['Phone'] || rawRow['Contact'] || rawRow['Mobile'] || rawRow['Contact Number'] || '').trim();
            let bookingId = (rawRow[mapping?.booking_id || 'booking_id'] || rawRow['Booking ID'] || rawRow['BookingId'] || rawRow['Order ID'] || rawRow['Ticket ID'] || '').trim();
            let registrationId = (rawRow[mapping?.registration_id || 'registration_id'] || rawRow['Registration ID'] || rawRow['Ref ID'] || rawRow['Payment ID'] || '').trim();
            let ticketType = (rawRow[mapping?.ticket_type || 'ticket_type'] || rawRow['Ticket Type'] || rawRow['Ticket'] || 'Attendee').trim();
            let qrCode = (rawRow[mapping?.qr_code || 'qr_code'] || rawRow['QR Code'] || rawRow['QR Data'] || rawRow['QR Value'] || rawRow['QR'] || '').trim();
            let qrFileName = (rawRow[mapping?.qr_file_name || 'qr_file_name'] || rawRow['QR File Name'] || rawRow['QR Filename'] || rawRow['QR File'] || rawRow['File Name'] || rawRow['QR Image'] || '').trim();
            let qrIdentifier = (rawRow[mapping?.qr_identifier || 'qr_identifier'] || qrFileName || qrCode || '').trim();
            let ticketUrl = (rawRow[mapping?.ticket_url || 'ticket_url'] || rawRow['Ticket URL'] || rawRow['Ticket Link'] || rawRow['Ticket PDF'] || rawRow['PDF Link'] || rawRow['Download Ticket'] || rawRow['Download Link'] || rawRow['Pass Link'] || rawRow['KonfHub URL'] || rawRow['Invoice URL'] || rawRow['Ticket Download URL'] || '').trim();

            // Smart extraction from QR Code (e.g. "id:10e90612|n:Meet Patel|eid:ab9168b3-c610-4edc-bb16-b45f9517820c")
            if (qrCode && qrCode.includes('|')) {
                const parts = qrCode.split('|');
                for (const part of parts) {
                    const [k, ...v] = part.split(':');
                    if (k && v.length > 0) {
                        const val = v.join(':').trim();
                        if (k.toLowerCase() === 'id' && !bookingId) bookingId = val;
                        if (k.toLowerCase() === 'n' && !name) name = val;
                    }
                }
            }

            // Smart extraction from QR File Name (e.g. "Meet Patel-10e90612.png" or "Meet_Patel-10e90612")
            if (qrFileName) {
                const cleanFile = qrFileName.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
                if (cleanFile.includes('-')) {
                    const lastDashIdx = cleanFile.lastIndexOf('-');
                    const potentialName = cleanFile.substring(0, lastDashIdx).replace(/_/g, ' ').trim();
                    const potentialId = cleanFile.substring(lastDashIdx + 1).trim();
                    if (!name && potentialName) name = potentialName;
                    if (!bookingId && potentialId) bookingId = potentialId;
                }
            }

            // Fallback for Name if still empty
            if (!name) {
                name = bookingId ? `Attendee ${bookingId}` : `Attendee ${rowIndex}`;
            }

            // Fallback for Booking ID if empty
            if (!bookingId) {
                bookingId = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            }

            // Fallback for Email if missing in sheet
            if (!email) {
                const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                email = `${safeName || 'attendee'}.${bookingId.toLowerCase()}@scd2026.ddu.ac.in`;
            }

            const errors = [];

            if (!email.includes('@')) {
                errors.push('Invalid email format');
            }

            // Check duplicate in file
            if (email && seenFileEmails.has(email)) {
                errors.push('Duplicate email within imported file');
            }
            if (bookingId && seenFileBookingIds.has(bookingId.toLowerCase())) {
                errors.push('Duplicate booking ID within imported file');
            }

            // Check duplicate in database
            if (email && existingEmails.has(email)) {
                errors.push('Email already registered for this event');
            }
            if (bookingId && existingBookingIds.has(bookingId.toLowerCase())) {
                errors.push('Booking ID already exists in database');
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

            // Assign proper QR identifier and QR token
            let finalQRIdentifier = qrIdentifier || qrFileName || qrCode;
            let finalQRToken = qrCode || qrFileName || qrIdentifier;

            if (!finalQRIdentifier) {
                const generated = generateQRToken('SCD26');
                finalQRIdentifier = generated.qr_identifier;
                finalQRToken = generated.qr_token;
                warnings.push({ row_number: rowIndex, name, message: `Auto-generated QR code: ${finalQRIdentifier}` });
            }

            validRecords.push({
                name,
                email,
                phone,
                booking_id: bookingId,
                registration_id: registrationId || `REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                ticket_type: ticketType,
                qr_identifier: finalQRIdentifier,
                qr_token: finalQRToken,
                ticket_url: ticketUrl || (bookingId ? `https://konfhub.com/tickets/${bookingId}` : null),
                ticket_pdf: ticketUrl || null
            });
        }

        // Apply Counter Allocation Rules automatically (Workshop: 30/desk starting at 1, Tracks/General: 30/desk starting after workshop)
        let counterStatsList = [];
        const effectiveRules = (Array.isArray(counter_rules) && counter_rules.length > 0)
            ? counter_rules
            : [
                { name: 'Workshop', pattern: 'workshop', capacity: 30, startCounter: 1, prefix: 'Counter ' },
                { name: 'Tracks / General', pattern: '*', capacity: 30, startCounter: undefined, prefix: 'Counter ' }
            ];

        if (effectiveRules.length > 0) {
            let currentCounterNumber = 1;
            const processedIndices = new Set();
            const counterStats = {};

            for (let rIdx = 0; rIdx < effectiveRules.length; rIdx++) {
                const rule = effectiveRules[rIdx];
                const capacity = Math.max(1, parseInt(rule.capacity) || 30);
                const prefix = rule.prefix !== undefined ? rule.prefix : 'Counter ';

                let startNum = rule.startCounter !== null && rule.startCounter !== undefined && !isNaN(parseInt(rule.startCounter))
                    ? parseInt(rule.startCounter)
                    : currentCounterNumber;

                let ruleMaxCounter = startNum;

                const matchingIndices = [];
                for (let i = 0; i < validRecords.length; i++) {
                    if (processedIndices.has(i)) continue;
                    const rec = validRecords[i];
                    if (rule.pattern === '*' || !rule.pattern) {
                        matchingIndices.push(i);
                    } else {
                        const pat = rule.pattern.toLowerCase().trim();
                        const tType = (rec.ticket_type || '').toLowerCase();
                        if (tType.includes(pat)) {
                            matchingIndices.push(i);
                        }
                    }
                }

                for (let m = 0; m < matchingIndices.length; m++) {
                    const idx = matchingIndices[m];
                    processedIndices.add(idx);

                    const counterIndexInGroup = Math.floor(m / capacity);
                    const assignedCounterNum = startNum + counterIndexInGroup;
                    const assignedCounterName = `${prefix}${assignedCounterNum}`;

                    validRecords[idx].counter = assignedCounterName;
                    validRecords[idx].counter_number = assignedCounterNum;
                    validRecords[idx].counter_category = rule.name || 'General';

                    if (!counterStats[assignedCounterName]) {
                        counterStats[assignedCounterName] = {
                            counter: assignedCounterName,
                            counter_number: assignedCounterNum,
                            category: rule.name || 'General',
                            count: 0
                        };
                    }
                    counterStats[assignedCounterName].count++;
                    ruleMaxCounter = Math.max(ruleMaxCounter, assignedCounterNum);
                }

                if (matchingIndices.length > 0) {
                    currentCounterNumber = ruleMaxCounter + 1;
                }
            }
            counterStatsList = Object.values(counterStats);
        }

        const summary = {
            total_rows: rows.length,
            valid_count: validRecords.length,
            invalid_count: invalidRecords.length,
            duplicate_count: duplicateRecords.length,
            warnings_count: warnings.length,
            invalid_records: invalidRecords,
            duplicate_records: duplicateRecords,
            warnings: warnings,
            counters: counterStatsList
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
        const created = await OnePassDB.batchCreateAttendees(eventId, validRecords);

        // Audit log
        OnePassDB.addAuditLog({
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
            }
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
