/**
 * WhatsApp Gateway Integration for OpenWA (https://open-wa.org)
 * Endpoint: POST /api/sessions/{sessionId}/messages/send-text
 */

const OPENWA_URL = process.env.OPENWA_API_URL || 'http://localhost:2785';
const OPENWA_KEY = process.env.OPENWA_API_KEY || 'owa_k1_0a8ee2daae9a9261e98b27f8543aaf268578c9afc3e78b96b6181414727293e1';

/**
 * Format raw phone number into clean numeric phone (e.g. "919876543210")
 */
export function formatWhatsAppNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');

    // 11-digit starting with 0
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = '91' + cleaned.slice(1);
    }
    // 10-digit Indian number without country code
    else if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned.length >= 10 ? cleaned : '';
}

/**
 * Format phone number into WhatsApp chatId (e.g. "919876543210@c.us")
 */
export function formatWhatsAppChatId(phone) {
    const cleaned = formatWhatsAppNumber(phone);
    if (!cleaned) return '';
    return cleaned.endsWith('@c.us') ? cleaned : `${cleaned}@c.us`;
}


/**
 * Get headers for OpenWA API
 */
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-API-Key': OPENWA_KEY,
        'Authorization': `Bearer ${OPENWA_KEY}`
    };
}

/**
 * Get list of sessions from OpenWA
 */
export async function getOpenWASessions() {
    try {
        const res = await fetch(`${OPENWA_URL}/api/sessions`, {
            method: 'GET',
            headers: getHeaders()
        });
        if (!res.ok) return [];
        const sessions = await res.json();
        return Array.isArray(sessions) ? sessions : [];
    } catch (err) {
        console.error('[OpenWA] Failed to list sessions:', err.message);
        return [];
    }
}

/**
 * Get active/connected session or start the first available session
 */
export async function getActiveSessionId() {
    const sessions = await getOpenWASessions();
    
    // Find connected session first
    const connected = sessions.find(s => s.status === 'connected' || s.status === 'WORKING' || s.status === 'authenticated');
    if (connected) return connected.id;

    // If there is any existing session (e.g. qr_ready or created)
    if (sessions.length > 0) {
        const session = sessions[0];
        // If stopped, try to start it
        if (session.status === 'stopped' || session.status === 'DISCONNECTED') {
            try {
                await fetch(`${OPENWA_URL}/api/sessions/${session.id}/start`, {
                    method: 'POST',
                    headers: getHeaders()
                });
            } catch (e) {
                console.warn('[OpenWA] Start session error:', e.message);
            }
        }
        return session.id;
    }

    // Otherwise create default session
    try {
        const createRes = await fetch(`${OPENWA_URL}/api/sessions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name: 'aws-scd-default' })
        });
        if (createRes.ok) {
            const newSession = await createRes.json();
            return newSession.id;
        }
    } catch (e) {
        console.warn('[OpenWA] Create session error:', e.message);
    }

    return 'default';
}

/**
 * Health check to verify OpenWA status & linked WhatsApp session
 */
export async function checkWhatsAppGatewayHealth() {
    try {
        const sessions = await getOpenWASessions();
        const connectedSession = sessions.find(s => s.status === 'connected' || s.status === 'WORKING');
        
        return {
            online: true,
            sessionsCount: sessions.length,
            sessionStatus: sessions[0]?.status || 'no_session',
            connected: !!connectedSession,
            activeSession: connectedSession || sessions[0] || null
        };
    } catch (err) {
        return { online: false, error: err.message };
    }
}

/**
 * Send a single WhatsApp text message
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. "9876543210")
 * @param {string} options.message - Text body
 * @param {string} [options.sessionId] - Optional session ID
 */
export async function sendWhatsAppText({ to, message, sessionId }) {
    const chatId = formatWhatsAppChatId(to);
    if (!chatId) {
        throw new Error(`Invalid phone number provided: "${to}"`);
    }

    const sid = sessionId || await getActiveSessionId();

    try {
        const url = `${OPENWA_URL}/api/sessions/${sid}/messages/send-text`;
        const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                chatId: chatId,
                text: message
            })
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.message || json.error || `HTTP ${res.status}`);
        }

        return { success: true, response: json };
    } catch (err) {
        console.error(`[WhatsApp] Failed to send text to ${to}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send a WhatsApp message with Media/Image/PDF
 */
export async function sendWhatsAppMedia({ to, mediaUrl, caption = '', filename = 'attachment', sessionId }) {
    const chatId = formatWhatsAppChatId(to);
    if (!chatId) {
        throw new Error(`Invalid phone number provided: "${to}"`);
    }

    const sid = sessionId || await getActiveSessionId();

    try {
        const url = `${OPENWA_URL}/api/sessions/${sid}/messages/send-media`;
        const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                chatId: chatId,
                file: {
                    url: mediaUrl,
                    caption: caption,
                    filename: filename
                }
            })
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.message || json.error || `HTTP ${res.status}`);
        }

        return { success: true, response: json };
    } catch (err) {
        console.error(`[WhatsApp] Failed to send media to ${to}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send WhatsApp messages to a list of recipients with random delay
 */
export async function sendWhatsAppBatch({ recipients, getMessageText, minDelayMs = 1500, maxDelayMs = 3000, onProgress }) {
    const sid = await getActiveSessionId();
    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < recipients.length; i++) {
        const item = recipients[i];
        const message = typeof getMessageText === 'function' ? getMessageText(item) : String(getMessageText);

        const res = await sendWhatsAppText({
            to: item.phone,
            message: message,
            sessionId: sid
        });

        if (res.success) {
            results.sent++;
        } else {
            results.failed++;
            results.errors.push({ phone: item.phone, name: item.name, error: res.error });
        }

        if (onProgress) {
            onProgress({ current: i + 1, total: recipients.length, success: res.success });
        }

        // Delay between messages
        if (i < recipients.length - 1) {
            const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
    }

    return results;
}
