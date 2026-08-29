import crypto from 'crypto';
import { OnePassDB } from './db.js';

const SESSION_SECRET = process.env.ONEPASS_SECRET || 'onepass_jwt_secure_session_secret_ddu_aws_2026';
const COOKIE_NAME = 'onepass_session';

// Password Hashing with crypto PBKDF2
export function hashPassword(password, salt = null) {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
    return `${generatedSalt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

// Session Token Generation
export function createSessionToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // 'ADMIN' | 'VOLUNTEER'
        iat: Date.now(),
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };
    const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(serialized).digest('base64url');
    return `${serialized}.${signature}`;
}

export function verifySessionToken(token) {
    if (!token) return null;
    try {
        const [serialized, signature] = token.split('.');
        if (!serialized || !signature) return null;

        const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(serialized).digest('base64url');
        if (signature !== expectedSig) return null;

        const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
        if (Date.now() > payload.exp) return null; // expired

        return payload;
    } catch (e) {
        return null;
    }
}

// Server-side authentication from NextRequest headers / cookies
export async function getSessionFromRequest(req) {
    let token = null;

    // Check cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
    }));

    if (cookies[COOKIE_NAME]) {
        token = cookies[COOKIE_NAME];
    } else {
        // Check Authorization header
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;

    const user = OnePassDB.getUserById(payload.userId);
    if (!user || user.status === 'DISABLED') return null;

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
    };
}

// RBAC & Event-level permission checking
export async function authorizeUser(req, requiredRole = null, eventId = null, requiredPermission = null) {
    const user = await getSessionFromRequest(req);
    if (!user) {
        return { authorized: false, error: 'Unauthorized. Please login.', status: 401 };
    }

    // Admin has universal superuser access
    if (user.role === 'ADMIN') {
        return { authorized: true, user };
    }

    // If only admin was requested and user is not admin
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
        return { authorized: false, error: 'Forbidden. Administrator privileges required.', status: 403 };
    }

    // If an event-specific action is checked for a volunteer
    if (eventId) {
        const assignments = OnePassDB.getUserEventAssignments(user.id);
        const eventAssignment = assignments.find(a => a.event_id === eventId);

        if (!eventAssignment) {
            return { authorized: false, error: 'Forbidden. You are not assigned to this event.', status: 403 };
        }

        if (requiredPermission) {
            const hasPerm = eventAssignment.permissions && eventAssignment.permissions.includes(requiredPermission);
            if (!hasPerm) {
                return {
                    authorized: false,
                    error: `Forbidden. You lack the '${requiredPermission}' permission for this event.`,
                    status: 403
                };
            }
        }
    }

    return { authorized: true, user };
}

export { COOKIE_NAME };
