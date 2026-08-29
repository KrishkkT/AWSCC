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
 * Extract clean QR identifier or token from scanned string/URL
 * E.g. raw string "SCD26-4B8F-9A12" or url "https://aws.ddu.ac.in/onepass/scan?id=SCD26-4B8F-9A12"
 */
export function parseScannedQR(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return '';
    const trimmed = rawInput.trim();
    
    // Check if it's a full URL with query parameters
    try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const url = new URL(trimmed);
            const idParam = url.searchParams.get('id') || url.searchParams.get('token') || url.searchParams.get('qr');
            if (idParam) return idParam.trim();
            
            // Extract trailing slug if any
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) return parts[parts.length - 1];
        }
    } catch (e) {
        // Not a standard URL, fallback to raw string
    }

    return trimmed;
}
