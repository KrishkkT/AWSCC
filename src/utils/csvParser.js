/**
 * Robust RFC 4180-compliant CSV/TSV parser.
 * Handles quoted cells with commas, newlines, escaped quotes, various delimiters, and header matching.
 */

export function parseCSVRecipients(csvText) {
    if (!csvText || typeof csvText !== 'string') {
        return { success: false, recipients: [], error: 'CSV file is empty or invalid.' };
    }

    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
        return { success: false, recipients: [], error: 'CSV file contains no data.' };
    }

    // Determine delimiter (comma, semicolon, or tab)
    const firstLine = cleanText.split(/\r?\n/)[0] || '';
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
        delimiter = ';';
    } else if (firstLine.includes('\t') && !firstLine.includes(',')) {
        delimiter = '\t';
    }

    // Parse rows and columns with quote support
    const rows = parseCSVMatrix(cleanText, delimiter);
    if (rows.length === 0) {
        return { success: false, recipients: [], error: 'No rows detected in CSV.' };
    }

    // Identify header row vs direct data
    const headerRow = rows[0].map(cell => cell.toLowerCase().trim().replace(/["']/g, ''));
    
    let nameIdx = headerRow.findIndex(h => 
        h === 'name' || h === 'full name' || h === 'fullname' || 
        h === 'recipient name' || h === 'recipient' || h === 'participant name' || 
        h === 'attendee name' || h === 'student name' || h === 'student' || h.includes('name')
    );

    let emailIdx = headerRow.findIndex(h => 
        h === 'email' || h === 'email address' || h === 'email id' || 
        h === 'recipient email' || h === 'participant email' || h === 'attendee email' ||
        h === 'mail' || h.includes('email') || h.includes('mail')
    );

    let startRow = 1;

    // If headers weren't found by name, check if row 0 has an email
    if (nameIdx === -1 || emailIdx === -1) {
        const row0HasEmail = rows[0].some(c => isValidEmail(c));
        if (row0HasEmail) {
            // First row is actual data
            startRow = 0;
            emailIdx = rows[0].findIndex(c => isValidEmail(c));
            nameIdx = emailIdx === 0 ? 1 : 0;
        } else {
            // Default fallback indices if row 0 is header without exact match
            if (nameIdx === -1) nameIdx = 0;
            if (emailIdx === -1) emailIdx = 1;
            startRow = 1;
        }
    }

    const recipients = [];
    const seenEmails = new Set();
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) {
            continue;
        }

        const rawName = row[nameIdx] !== undefined ? row[nameIdx].trim() : '';
        const rawEmail = row[emailIdx] !== undefined ? row[emailIdx].trim().toLowerCase() : '';

        // Clean up quotes or extra whitespaces
        const name = rawName.replace(/^["']+|["']+$/g, '').trim();
        const email = rawEmail.replace(/^["']+|["']+$/g, '').trim();

        if (!name || !email || !isValidEmail(email)) {
            invalidCount++;
            continue;
        }

        if (seenEmails.has(email)) {
            duplicateCount++;
            continue;
        }

        seenEmails.add(email);
        recipients.push({
            recipient_name: name,
            recipient_email: email,
            template: 'blue'
        });
    }

    return {
        success: recipients.length > 0,
        recipients,
        totalParsed: recipients.length,
        duplicateCount,
        invalidCount,
        error: recipients.length === 0 ? 'No valid attendee records (Name & valid Email) found in CSV.' : null
    };
}

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Parses raw CSV string respecting RFC 4180 quotes, escaped quotes (""), and line breaks inside quotes.
 */
function parseCSVMatrix(text, delimiter = ',') {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped double quote
                currentCell += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip LF after CR
            }
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c.length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Push the final cell and row
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
}
