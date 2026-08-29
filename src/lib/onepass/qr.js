import crypto from 'crypto';

/**
 * Generate a cryptographically secure, non-guessable QR identifier and token
 */
export function generateQRToken(prefix = 'SCD26') {
    const raw = crypto.randomBytes(12).toString('hex').toUpperCase();
    const qrIdentifier = `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const qrSecretToken = crypto.randomBytes(24).toString('base64url');
    return {
        qr_identifier: qrIdentifier,
        qr_token: qrSecretToken
    };
}

/**
 * Extract clean QR identifier, booking ID, or payload details from any scanned string/URL/JSON/Piped format
 * 
 * Supports:
 * 1. Piped format: "id:10e90612|n:Meet|eid:ab9168b3-c610-4edc-bb16-b45f9517820c"
 * 2. File Name format: "Meet-10e90612.png", "Meet-10e90612", "10e90612.png"
 * 3. JSON format: '{"id":"10e90612","name":"Meet"}'
 * 4. URL format: "https://aws.ddu.ac.in/verify?id=10e90612" or ".../scan/10e90612"
 * 5. Direct IDs: "10e90612", "BK-10E90612", "SCD26-4B8F-9A12", "att_..."
 */
export function parseScannedQR(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return '';
    const trimmed = rawInput.trim();

    // 1. Piped Format: "id:10e90612|n:Meet|eid:..."
    if (trimmed.includes('|') && (trimmed.includes('id:') || trimmed.includes('n:') || trimmed.includes('eid:'))) {
        const parts = trimmed.split('|');
        const map = {};
        for (const part of parts) {
            const [k, ...v] = part.split(':');
            if (k && v.length > 0) {
                map[k.trim().toLowerCase()] = v.join(':').trim();
            }
        }
        // Return the booking/attendee ID if present, otherwise return raw trimmed
        if (map.id) return map.id;
    }

    // 2. JSON Format: {"id":"10e90612", ...}
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.id) return String(parsed.id).trim();
            if (parsed.booking_id) return String(parsed.booking_id).trim();
            if (parsed.qr_identifier) return String(parsed.qr_identifier).trim();
            if (parsed.qr_token) return String(parsed.qr_token).trim();
            if (parsed.token) return String(parsed.token).trim();
        } catch (e) {
            // Not valid JSON, proceed
        }
    }

    // 3. URL with Query Parameters or Path
    try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const url = new URL(trimmed);
            const idParam = url.searchParams.get('id') || url.searchParams.get('token') || url.searchParams.get('qr') || url.searchParams.get('booking_id');
            if (idParam) return idParam.trim();

            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) return parts[parts.length - 1].trim();
        }
    } catch (e) {
        // Not a standard URL
    }

    // 4. File Name Format (e.g. "Meet-10e90612.png" or "Meet-10e90612")
    // If it ends with .png, .jpg, .jpeg, .webp, extract the main token
    let clean = trimmed.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');

    // If it has a pattern like "Name-BookingId" (e.g. "Meet-10e90612")
    if (clean.includes('-')) {
        const segments = clean.split('-');
        const lastSegment = segments[segments.length - 1];
        // If last segment looks like hex or booking ID (e.g. 10e90612), return trimmed for full match or last segment
        if (lastSegment && lastSegment.length >= 4) {
            // Return raw trimmed so exact match works, but getAttendeeByQR will also check last segment
            return trimmed;
        }
    }

    return trimmed;
}

/**
 * Extracts all searchable fragments from a scanned string for multi-key lookups
 */
export function extractQRSearchKeys(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return [];
    const keys = new Set();
    const raw = rawInput.trim();
    keys.add(raw);
    keys.add(raw.toLowerCase());

    // Clean extension
    const noExt = raw.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    keys.add(noExt);
    keys.add(noExt.toLowerCase());

    // Piped format "id:10e90612|n:Meet|eid:..."
    if (raw.includes('|')) {
        const parts = raw.split('|');
        for (const part of parts) {
            const [k, ...v] = part.split(':');
            if (v.length > 0) {
                const val = v.join(':').trim();
                keys.add(val);
                keys.add(val.toLowerCase());
            }
        }
    }

    // Hyphenated format "Meet-10e90612"
    if (noExt.includes('-')) {
        const segs = noExt.split('-');
        for (const seg of segs) {
            const val = seg.trim();
            if (val.length > 0) {
                keys.add(val);
                keys.add(val.toLowerCase());
            }
        }
        const lastSeg = segs[segs.length - 1].trim();
        if (lastSeg) {
            keys.add(lastSeg);
            keys.add(lastSeg.toLowerCase());
        }
    }

    // JSON format
    if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
            const obj = JSON.parse(raw);
            for (const v of Object.values(obj)) {
                if (typeof v === 'string' && v.trim()) {
                    keys.add(v.trim());
                    keys.add(v.trim().toLowerCase());
                }
            }
        } catch (e) {}
    }

    return Array.from(keys);
}
