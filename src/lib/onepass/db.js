import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Path for OnePass local JSON database storage for guaranteed persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'onepass_db.json');

// Mutex locks for atomic operations (e.g. track seat assignment, food claim)
class AsyncMutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }

    async acquire() {
        return new Promise((resolve) => {
            const execute = () => {
                this.locked = true;
                resolve(() => this.release());
            };

            if (!this.locked) {
                execute();
            } else {
                this.queue.push(execute);
            }
        });
    }

    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        } else {
            this.locked = false;
        }
    }
}

const mutexes = new Map();
function getMutex(key) {
    if (!mutexes.has(key)) {
        mutexes.set(key, new AsyncMutex());
    }
    return mutexes.get(key);
}

// In-memory DB cache
let memoryDb = null;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadDb() {
    if (memoryDb) return memoryDb;
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            memoryDb = JSON.parse(raw);
            return memoryDb;
        } catch (e) {
            console.error('[OnePass DB] Failed to parse DB file, reinitializing', e);
        }
    }

    memoryDb = {
        users: [],
        events: [],
        event_volunteers: [],
        attendees: [],
        tracks: [],
        workshops: [],
        resources: [],
        track_access_logs: [],
        workshop_access_logs: [],
        resource_claims: [],
        audit_logs: [],
        system_settings: {
            app_name: 'OnePass',
            tagline: 'One QR. Every interaction.',
            allow_self_registration: false,
            version: '1.0.0',
            initialized_at: new Date().toISOString()
        }
    };
    saveDb(memoryDb);
    return memoryDb;
}

function saveDb(data) {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    memoryDb = data;
}

export const OnePassDB = {
    // Acquire a lock for key
    async withLock(lockKey, callback) {
        const mutex = getMutex(lockKey);
        const release = await mutex.acquire();
        try {
            const result = await callback();
            return result;
        } finally {
            release();
        }
    },

    // Get snapshot of database
    getSnapshot() {
        return loadDb();
    },

    // Save entire database snapshot
    saveSnapshot(data) {
        saveDb(data);
    },

    // USERS
    getUsers() {
        return loadDb().users || [];
    },

    getUserByEmail(email) {
        if (!email) return null;
        const users = loadDb().users || [];
        return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    getUserById(id) {
        if (!id) return null;
        const users = loadDb().users || [];
        return users.find(u => u.id === id) || null;
    },

    createUser(userData) {
        const db = loadDb();
        const user = {
            id: userData.id || `usr_${crypto.randomBytes(8).toString('hex')}`,
            name: userData.name,
            email: userData.email.toLowerCase(),
            password_hash: userData.password_hash,
            role: userData.role || 'VOLUNTEER', // 'ADMIN' | 'VOLUNTEER'
            status: userData.status || 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.users.push(user);
        saveDb(db);
        return user;
    },

    updateUser(id, updates) {
        const db = loadDb();
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) return null;
        db.users[index] = {
            ...db.users[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        saveDb(db);
        return db.users[index];
    },

    // EVENTS
    getEvents() {
        return loadDb().events || [];
    },

    getEventById(id) {
        if (!id) return null;
        const events = loadDb().events || [];
        return events.find(e => e.id === id) || null;
    },

    createEvent(eventData) {
        const db = loadDb();
        const event = {
            id: eventData.id || `evt_${crypto.randomBytes(8).toString('hex')}`,
            name: eventData.name,
            year: eventData.year || new Date().getFullYear(),
            description: eventData.description || '',
            date: eventData.date || new Date().toISOString().split('T')[0],
            start_time: eventData.start_time || '09:00',
            end_time: eventData.end_time || '18:00',
            venue: eventData.venue || 'Main Campus',
            timezone: eventData.timezone || 'Asia/Kolkata',
            status: eventData.status || 'DRAFT', // 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
            logo: eventData.logo || '/images/og-image.jpg',
            banner: eventData.banner || null,
            settings: eventData.settings || {
                require_track_selection: true,
                allow_workshop_selection: true,
                allow_reentry: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.events.push(event);
        saveDb(db);
        return event;
    },

    updateEvent(id, updates) {
        const db = loadDb();
        const index = db.events.findIndex(e => e.id === id);
        if (index === -1) return null;
        db.events[index] = {
            ...db.events[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        saveDb(db);
        return db.events[index];
    },

    deleteEvent(id) {
        const db = loadDb();
        db.events = db.events.filter(e => e.id !== id);
        db.tracks = db.tracks.filter(t => t.event_id !== id);
        db.workshops = db.workshops.filter(w => w.event_id !== id);
        db.resources = db.resources.filter(r => r.event_id !== id);
        db.attendees = db.attendees.filter(a => a.event_id !== id);
        db.resource_claims = db.resource_claims.filter(c => c.event_id !== id);
        db.track_access_logs = db.track_access_logs.filter(l => l.event_id !== id);
        db.workshop_access_logs = db.workshop_access_logs.filter(l => l.event_id !== id);
        db.event_volunteers = db.event_volunteers.filter(ev => ev.event_id !== id);
        saveDb(db);
        return true;
    },

    // EVENT VOLUNTEERS & PERMISSIONS
    getEventVolunteers(eventId) {
        const db = loadDb();
        const assignments = db.event_volunteers.filter(ev => ev.event_id === eventId);
        return assignments.map(ev => {
            const user = db.users.find(u => u.id === ev.user_id);
            return {
                ...ev,
                user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } : null
            };
        });
    },

    getUserEventAssignments(userId) {
        const db = loadDb();
        return db.event_volunteers.filter(ev => ev.user_id === userId);
    },

    assignVolunteerToEvent(eventId, userId, permissions) {
        const db = loadDb();
        const index = db.event_volunteers.findIndex(ev => ev.event_id === eventId && ev.user_id === userId);
        const record = {
            id: index >= 0 ? db.event_volunteers[index].id : `ev_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId,
            user_id: userId,
            permissions: permissions || ['CHECK_IN'], // Array of permissions: CHECK_IN, TRACK_ACCESS, WORKSHOP_ACCESS, FOOD, SWAG, VIEW_DASHBOARD
            assigned_at: new Date().toISOString()
        };

        if (index >= 0) {
            db.event_volunteers[index] = record;
        } else {
            db.event_volunteers.push(record);
        }
        saveDb(db);
        return record;
    },

    removeVolunteerFromEvent(eventId, userId) {
        const db = loadDb();
        db.event_volunteers = db.event_volunteers.filter(ev => !(ev.event_id === eventId && ev.user_id === userId));
        saveDb(db);
        return true;
    },

    // TRACKS
    getTracks(eventId) {
        const db = loadDb();
        const tracks = db.tracks.filter(t => t.event_id === eventId);
        // compute dynamic occupancy
        return tracks.map(t => {
            const occupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_track_id === t.id).length;
            return {
                ...t,
                occupancy,
                remaining: Math.max(0, t.capacity - occupancy),
                is_full: occupancy >= t.capacity
            };
        });
    },

    getTrackById(id) {
        const db = loadDb();
        const track = db.tracks.find(t => t.id === id);
        if (!track) return null;
        const occupancy = db.attendees.filter(a => a.event_id === track.event_id && a.assigned_track_id === track.id).length;
        return {
            ...track,
            occupancy,
            remaining: Math.max(0, track.capacity - occupancy),
            is_full: occupancy >= track.capacity
        };
    },

    createTrack(trackData) {
        const db = loadDb();
        const track = {
            id: trackData.id || `trk_${crypto.randomBytes(6).toString('hex')}`,
            event_id: trackData.event_id,
            name: trackData.name,
            description: trackData.description || '',
            capacity: parseInt(trackData.capacity, 10) || 100,
            status: trackData.status || 'ACTIVE',
            created_at: new Date().toISOString()
        };
        db.tracks.push(track);
        saveDb(db);
        return track;
    },

    updateTrack(id, updates) {
        const db = loadDb();
        const index = db.tracks.findIndex(t => t.id === id);
        if (index === -1) return null;
        db.tracks[index] = {
            ...db.tracks[index],
            ...updates,
            capacity: updates.capacity !== undefined ? parseInt(updates.capacity, 10) : db.tracks[index].capacity
        };
        saveDb(db);
        return db.tracks[index];
    },

    deleteTrack(id) {
        const db = loadDb();
        // check if attendees assigned
        const hasAssignments = db.attendees.some(a => a.assigned_track_id === id);
        if (hasAssignments) {
            throw new Error('Cannot delete track with existing attendee assignments. Archive or disable it instead.');
        }
        db.tracks = db.tracks.filter(t => t.id !== id);
        saveDb(db);
        return true;
    },

    // WORKSHOPS
    getWorkshops(eventId) {
        const db = loadDb();
        const workshops = db.workshops.filter(w => w.event_id === eventId);
        return workshops.map(w => {
            const occupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_workshop_id === w.id).length;
            return {
                ...w,
                occupancy,
                remaining: Math.max(0, w.capacity - occupancy),
                is_full: occupancy >= w.capacity
            };
        });
    },

    getWorkshopById(id) {
        const db = loadDb();
        const w = db.workshops.find(ws => ws.id === id);
        if (!w) return null;
        const occupancy = db.attendees.filter(a => a.event_id === w.event_id && a.assigned_workshop_id === w.id).length;
        return {
            ...w,
            occupancy,
            remaining: Math.max(0, w.capacity - occupancy),
            is_full: occupancy >= w.capacity
        };
    },

    createWorkshop(workshopData) {
        const db = loadDb();
        const workshop = {
            id: workshopData.id || `wks_${crypto.randomBytes(6).toString('hex')}`,
            event_id: workshopData.event_id,
            name: workshopData.name,
            description: workshopData.description || '',
            speaker: workshopData.speaker || '',
            location: workshopData.location || '',
            start_time: workshopData.start_time || '10:00',
            end_time: workshopData.end_time || '12:00',
            capacity: parseInt(workshopData.capacity, 10) || 50,
            status: workshopData.status || 'ACTIVE',
            created_at: new Date().toISOString()
        };
        db.workshops.push(workshop);
        saveDb(db);
        return workshop;
    },

    updateWorkshop(id, updates) {
        const db = loadDb();
        const index = db.workshops.findIndex(w => w.id === id);
        if (index === -1) return null;
        db.workshops[index] = {
            ...db.workshops[index],
            ...updates,
            capacity: updates.capacity !== undefined ? parseInt(updates.capacity, 10) : db.workshops[index].capacity
        };
        saveDb(db);
        return db.workshops[index];
    },

    deleteWorkshop(id) {
        const db = loadDb();
        db.workshops = db.workshops.filter(w => w.id !== id);
        db.workshop_access_logs = db.workshop_access_logs.filter(l => l.workshop_id !== id);
        saveDb(db);
        return true;
    },

    // RESOURCES (Food / Swag / Other items)
    getResources(eventId, type = null) {
        const db = loadDb();
        let list = db.resources.filter(r => r.event_id === eventId);
        if (type) {
            list = list.filter(r => r.type === type);
        }
        return list.map(r => {
            const claimsCount = db.resource_claims.filter(c => c.resource_id === r.id).length;
            return {
                ...r,
                claims_count: claimsCount,
                remaining: r.capacity ? Math.max(0, r.capacity - claimsCount) : null
            };
        });
    },

    getResourceById(id) {
        const db = loadDb();
        const r = db.resources.find(item => item.id === id);
        if (!r) return null;
        const claimsCount = db.resource_claims.filter(c => c.resource_id === r.id).length;
        return {
            ...r,
            claims_count: claimsCount,
            remaining: r.capacity ? Math.max(0, r.capacity - claimsCount) : null
        };
    },

    createResource(resData) {
        const db = loadDb();
        const res = {
            id: resData.id || `res_${crypto.randomBytes(6).toString('hex')}`,
            event_id: resData.event_id,
            name: resData.name,
            type: resData.type || 'FOOD', // 'FOOD' | 'SWAG' | 'OTHER'
            description: resData.description || '',
            capacity: resData.capacity ? parseInt(resData.capacity, 10) : null,
            claim_limit: parseInt(resData.claim_limit, 10) || 1,
            start_time: resData.start_time || null,
            end_time: resData.end_time || null,
            status: resData.status || 'ACTIVE',
            created_at: new Date().toISOString()
        };
        db.resources.push(res);
        saveDb(db);
        return res;
    },

    updateResource(id, updates) {
        const db = loadDb();
        const index = db.resources.findIndex(r => r.id === id);
        if (index === -1) return null;
        db.resources[index] = {
            ...db.resources[index],
            ...updates,
            capacity: updates.capacity !== undefined ? (updates.capacity ? parseInt(updates.capacity, 10) : null) : db.resources[index].capacity
        };
        saveDb(db);
        return db.resources[index];
    },

    deleteResource(id) {
        const db = loadDb();
        db.resources = db.resources.filter(r => r.id !== id);
        db.resource_claims = db.resource_claims.filter(c => c.resource_id !== id);
        saveDb(db);
        return true;
    },

    // ATTENDEES
    getAttendees(eventId, options = {}) {
        const db = loadDb();
        let list = db.attendees.filter(a => a.event_id === eventId);
        if (options.search) {
            const rawQ = options.search.trim();
            const q = rawQ.toLowerCase();

            // Extract candidate keywords if rawQ is a piped, filename, or composite token
            const keywords = [q];
            if (rawQ.includes('|')) {
                rawQ.split('|').forEach(part => {
                    const [k, ...v] = part.split(':');
                    if (v.length > 0) keywords.push(v.join(':').trim().toLowerCase());
                });
            }
            const cleanNoExt = rawQ.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
            if (cleanNoExt.includes('-')) {
                cleanNoExt.split('-').forEach(seg => keywords.push(seg.trim().toLowerCase()));
            }

            list = list.filter(a => {
                return keywords.some(k => {
                    if (!k) return false;
                    return (
                        (a.name && a.name.toLowerCase().includes(k)) ||
                        (a.email && a.email.toLowerCase().includes(k)) ||
                        (a.phone && a.phone.toLowerCase().includes(k)) ||
                        (a.booking_id && a.booking_id.toLowerCase().includes(k)) ||
                        (a.registration_id && a.registration_id.toLowerCase().includes(k)) ||
                        (a.qr_identifier && a.qr_identifier.toLowerCase().includes(k)) ||
                        (a.qr_token && a.qr_token.toLowerCase().includes(k)) ||
                        (a.id && a.id.toLowerCase().includes(k))
                    );
                });
            });
        }
        if (options.check_in_status) {
            list = list.filter(a => a.check_in_status === options.check_in_status);
        }
        if (options.assigned_track_id) {
            list = list.filter(a => a.assigned_track_id === options.assigned_track_id);
        }
        return list;
    },

    getAttendeeById(id) {
        const db = loadDb();
        return db.attendees.find(a => a.id === id) || null;
    },

    getAttendeeByQR(eventId, qrIdentifierOrToken) {
        if (!qrIdentifierOrToken) return null;
        const db = loadDb();
        const term = qrIdentifierOrToken.trim();
        const termLower = term.toLowerCase();

        // 1. Direct and Exact Matches in this event
        let attendee = db.attendees.find(a =>
            a.event_id === eventId && (
                a.qr_identifier === term ||
                a.qr_token === term ||
                a.booking_id === term ||
                a.id === term ||
                a.registration_id === term ||
                (a.qr_identifier && a.qr_identifier.toLowerCase() === termLower) ||
                (a.booking_id && a.booking_id.toLowerCase() === termLower) ||
                (a.qr_token && a.qr_token.toLowerCase() === termLower) ||
                (a.registration_id && a.registration_id.toLowerCase() === termLower) ||
                (a.email && a.email.toLowerCase() === termLower)
            )
        );
        if (attendee) return attendee;

        // 2. Parse candidate keys from piped format, filenames, or hyphenated booking IDs
        const candidateKeys = [];
        candidateKeys.push(term);
        candidateKeys.push(term.replace(/\.(png|jpg|jpeg|webp|svg)$/i, ''));

        // Handle piped format "id:10e90612|n:Meet|eid:..."
        if (term.includes('|')) {
            const parts = term.split('|');
            for (const part of parts) {
                const [k, ...v] = part.split(':');
                if (v.length > 0) {
                    candidateKeys.push(v.join(':').trim());
                }
            }
        }

        // Handle filename / hyphen format (e.g. "Meet-10e90612.png" or "Meet-10e90612")
        const cleanNoExt = term.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
        if (cleanNoExt.includes('-')) {
            const segs = cleanNoExt.split('-');
            for (const seg of segs) {
                candidateKeys.push(seg.trim());
            }
            candidateKeys.push(segs[segs.length - 1].trim());
        }

        for (const key of candidateKeys) {
            if (!key) continue;
            const kLower = key.toLowerCase();
            attendee = db.attendees.find(a =>
                a.event_id === eventId && (
                    (a.booking_id && a.booking_id.toLowerCase() === kLower) ||
                    (a.qr_identifier && a.qr_identifier.toLowerCase().includes(kLower)) ||
                    (a.qr_token && a.qr_token.toLowerCase().includes(kLower)) ||
                    (a.registration_id && a.registration_id.toLowerCase() === kLower) ||
                    (a.id && a.id.toLowerCase() === kLower) ||
                    (a.email && a.email.toLowerCase() === kLower)
                )
            );
            if (attendee) return attendee;
        }

        // 3. Fallback across all attendees if eventId has changed or was re-imported
        for (const key of candidateKeys) {
            if (!key) continue;
            const kLower = key.toLowerCase();
            attendee = db.attendees.find(a =>
                (a.booking_id && a.booking_id.toLowerCase() === kLower) ||
                (a.qr_identifier && a.qr_identifier.toLowerCase().includes(kLower)) ||
                (a.qr_token && a.qr_token.toLowerCase().includes(kLower)) ||
                (a.registration_id && a.registration_id.toLowerCase() === kLower) ||
                (a.id && a.id.toLowerCase() === kLower) ||
                (a.email && a.email.toLowerCase() === kLower)
            );
            if (attendee) return attendee;
        }

        return null;
    },

    createAttendee(attendeeData) {
        const db = loadDb();
        const attendee = {
            id: attendeeData.id || `att_${crypto.randomBytes(8).toString('hex')}`,
            event_id: attendeeData.event_id,
            name: attendeeData.name,
            email: attendeeData.email ? attendeeData.email.toLowerCase().trim() : '',
            phone: attendeeData.phone || '',
            ticket_type: attendeeData.ticket_type || 'Attendee',
            booking_id: attendeeData.booking_id || `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            registration_id: attendeeData.registration_id || `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            qr_identifier: attendeeData.qr_identifier || `SCD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            qr_token: attendeeData.qr_token || crypto.randomBytes(16).toString('hex'),
            check_in_status: attendeeData.check_in_status || 'NOT_CHECKED_IN', // 'NOT_CHECKED_IN' | 'CHECKED_IN'
            check_in_time: attendeeData.check_in_time || null,
            assigned_track_id: attendeeData.assigned_track_id || null,
            assigned_workshop_id: attendeeData.assigned_workshop_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.attendees.push(attendee);
        saveDb(db);
        return attendee;
    },

    batchCreateAttendees(eventId, attendeeList) {
        const db = loadDb();
        const created = [];
        for (const data of attendeeList) {
            const attendee = {
                id: `att_${crypto.randomBytes(8).toString('hex')}`,
                event_id: eventId,
                name: data.name,
                email: data.email ? data.email.toLowerCase().trim() : '',
                phone: data.phone || '',
                ticket_type: data.ticket_type || 'Attendee',
                booking_id: data.booking_id || `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                registration_id: data.registration_id || `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                qr_identifier: data.qr_identifier || `SCD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                qr_token: data.qr_token || crypto.randomBytes(16).toString('hex'),
                check_in_status: 'NOT_CHECKED_IN',
                check_in_time: null,
                assigned_track_id: null,
                assigned_workshop_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            db.attendees.push(attendee);
            created.push(attendee);
        }
        saveDb(db);
        return created;
    },

    updateAttendee(id, updates) {
        const db = loadDb();
        const index = db.attendees.findIndex(a => a.id === id);
        if (index === -1) return null;
        db.attendees[index] = {
            ...db.attendees[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        saveDb(db);
        return db.attendees[index];
    },

    deleteAttendee(id) {
        const db = loadDb();
        db.attendees = db.attendees.filter(a => a.id !== id);
        db.resource_claims = db.resource_claims.filter(c => c.attendee_id !== id);
        db.track_access_logs = db.track_access_logs.filter(l => l.attendee_id !== id);
        db.workshop_access_logs = db.workshop_access_logs.filter(l => l.attendee_id !== id);
        saveDb(db);
        return true;
    },

    // ATOMIC CHECK-IN WITH CONCURRENT TRACK ALLOCATION
    async atomicCheckIn({ eventId, attendeeId, trackId, workshopId = null, volunteerId = null, actorName = 'Volunteer' }) {
        return this.withLock(`event_${eventId}_checkin`, async () => {
            const db = loadDb();
            const attendeeIndex = db.attendees.findIndex(a => a.id === attendeeId && a.event_id === eventId);
            if (attendeeIndex === -1) {
                return { success: false, code: 'ATTENDEE_NOT_FOUND', message: 'Attendee record not found for this event.' };
            }

            const attendee = db.attendees[attendeeIndex];
            if (attendee.check_in_status === 'CHECKED_IN') {
                const track = db.tracks.find(t => t.id === attendee.assigned_track_id);
                return {
                    success: false,
                    code: 'ALREADY_CHECKED_IN',
                    message: `This attendee was already checked in at ${attendee.check_in_time ? new Date(attendee.check_in_time).toLocaleTimeString() : 'earlier'}.`,
                    attendee,
                    assigned_track: track || null
                };
            }

            // Validate Track Capacity
            let selectedTrack = null;
            if (trackId) {
                const track = db.tracks.find(t => t.id === trackId && t.event_id === eventId);
                if (!track) {
                    return { success: false, code: 'TRACK_NOT_FOUND', message: 'Selected track does not exist.' };
                }
                const currentOccupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_track_id === trackId).length;
                if (currentOccupancy >= track.capacity) {
                    return {
                        success: false,
                        code: 'TRACK_FULL',
                        message: `${track.name} is now full (${currentOccupancy}/${track.capacity}). Please select another track.`,
                        track
                    };
                }
                selectedTrack = track;
            }

            // Validate Workshop Capacity if supplied
            let selectedWorkshop = null;
            if (workshopId) {
                const workshop = db.workshops.find(w => w.id === workshopId && w.event_id === eventId);
                if (!workshop) {
                    return { success: false, code: 'WORKSHOP_NOT_FOUND', message: 'Selected workshop does not exist.' };
                }
                const currentWorkshopOccupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_workshop_id === workshopId).length;
                if (currentWorkshopOccupancy >= workshop.capacity) {
                    return {
                        success: false,
                        code: 'WORKSHOP_FULL',
                        message: `${workshop.name} is now full (${currentWorkshopOccupancy}/${workshop.capacity}).`,
                        workshop
                    };
                }
                selectedWorkshop = workshop;
            }

            // Perform check-in update
            const now = new Date().toISOString();
            db.attendees[attendeeIndex] = {
                ...attendee,
                check_in_status: 'CHECKED_IN',
                check_in_time: now,
                assigned_track_id: trackId || null,
                assigned_workshop_id: workshopId || null,
                updated_at: now
            };

            // Log Audit entry
            const auditEntry = {
                id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                actor_id: volunteerId,
                actor_name: actorName,
                actor_role: 'VOLUNTEER',
                action: 'CHECK_IN',
                entity_type: 'ATTENDEE',
                entity_id: attendeeId,
                metadata: {
                    attendee_name: attendee.name,
                    assigned_track: selectedTrack ? selectedTrack.name : null,
                    assigned_workshop: selectedWorkshop ? selectedWorkshop.name : null
                },
                timestamp: now,
                result: 'SUCCESS'
            };
            db.audit_logs.unshift(auditEntry);

            saveDb(db);

            return {
                success: true,
                attendee: db.attendees[attendeeIndex],
                track: selectedTrack,
                workshop: selectedWorkshop
            };
        });
    },

    // TRACK ACCESS VERIFICATION & LOGGING
    async recordTrackAccess({ eventId, qrToken, trackId, volunteerId, volunteerName }) {
        const db = loadDb();
        const attendee = this.getAttendeeByQR(eventId, qrToken);
        const track = db.tracks.find(t => t.id === trackId && t.event_id === eventId);
        const now = new Date().toISOString();

        if (!track) {
            return { granted: false, code: 'TRACK_NOT_FOUND', message: 'Invalid track gate.' };
        }

        if (!attendee) {
            return {
                granted: false,
                code: 'INVALID_QR',
                message: 'QR code not recognized in this event.'
            };
        }

        if (attendee.check_in_status !== 'CHECKED_IN') {
            const logEntry = {
                id: `tal_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                attendee_id: attendee.id,
                track_id: trackId,
                volunteer_id: volunteerId,
                timestamp: now,
                result: 'DENIED',
                reason: 'Attendee has not checked in at the main gate.'
            };
            db.track_access_logs.unshift(logEntry);
            saveDb(db);

            return {
                granted: false,
                code: 'NOT_CHECKED_IN',
                message: 'Attendee has not checked in at the main gate.',
                attendee
            };
        }

        if (attendee.assigned_track_id !== trackId) {
            const assignedTrack = db.tracks.find(t => t.id === attendee.assigned_track_id);
            const logEntry = {
                id: `tal_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                attendee_id: attendee.id,
                track_id: trackId,
                volunteer_id: volunteerId,
                timestamp: now,
                result: 'DENIED',
                reason: `Assigned to ${assignedTrack ? assignedTrack.name : 'another track'}.`
            };
            db.track_access_logs.unshift(logEntry);
            saveDb(db);

            return {
                granted: false,
                code: 'WRONG_TRACK',
                message: `Access denied. Attendee is assigned to ${assignedTrack ? assignedTrack.name : 'another track'}.`,
                attendee,
                assigned_track: assignedTrack
            };
        }

        // Access Granted
        const logEntry = {
            id: `tal_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId,
            attendee_id: attendee.id,
            track_id: trackId,
            volunteer_id: volunteerId,
            timestamp: now,
            result: 'GRANTED',
            reason: 'Valid track ticket.'
        };
        db.track_access_logs.unshift(logEntry);
        saveDb(db);

        return {
            granted: true,
            code: 'ACCESS_GRANTED',
            message: `Access granted to ${track.name}.`,
            attendee,
            track
        };
    },

    // WORKSHOP ACCESS VERIFICATION & LOGGING
    async recordWorkshopAccess({ eventId, qrToken, workshopId, volunteerId, volunteerName }) {
        const db = loadDb();
        const attendee = this.getAttendeeByQR(eventId, qrToken);
        const workshop = db.workshops.find(w => w.id === workshopId && w.event_id === eventId);
        const now = new Date().toISOString();

        if (!workshop) {
            return { granted: false, code: 'WORKSHOP_NOT_FOUND', message: 'Workshop not found.' };
        }

        if (!attendee) {
            return { granted: false, code: 'INVALID_QR', message: 'QR code not recognized.' };
        }

        if (attendee.check_in_status !== 'CHECKED_IN') {
            return {
                granted: false,
                code: 'NOT_CHECKED_IN',
                message: 'Attendee has not checked in at the main gate.',
                attendee
            };
        }

        if (attendee.assigned_workshop_id && attendee.assigned_workshop_id !== workshopId) {
            const assignedWk = db.workshops.find(w => w.id === attendee.assigned_workshop_id);
            return {
                granted: false,
                code: 'WRONG_WORKSHOP',
                message: `Assigned to ${assignedWk ? assignedWk.name : 'another workshop'}.`,
                attendee,
                assigned_workshop: assignedWk
            };
        }

        const logEntry = {
            id: `wal_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId,
            attendee_id: attendee.id,
            workshop_id: workshopId,
            volunteer_id: volunteerId,
            timestamp: now,
            result: 'GRANTED'
        };
        db.workshop_access_logs.unshift(logEntry);
        saveDb(db);

        return {
            granted: true,
            code: 'ACCESS_GRANTED',
            message: `Access granted to ${workshop.name}.`,
            attendee,
            workshop
        };
    },

    // ATOMIC RESOURCE CLAIM (FOOD / SWAG / OTHER)
    async claimResource({ eventId, qrToken, resourceId, volunteerId, volunteerName }) {
        return this.withLock(`claim_res_${resourceId}`, async () => {
            const db = loadDb();
            const attendee = this.getAttendeeByQR(eventId, qrToken);
            const resource = db.resources.find(r => r.id === resourceId && r.event_id === eventId);
            const now = new Date().toISOString();

            if (!resource) {
                return { success: false, code: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' };
            }

            if (!attendee) {
                return { success: false, code: 'INVALID_QR', message: 'QR code not recognized in this event.' };
            }

            if (attendee.check_in_status !== 'CHECKED_IN') {
                return {
                    success: false,
                    code: 'NOT_CHECKED_IN',
                    message: 'Attendee has not checked in to the event.',
                    attendee
                };
            }

            // Check if already claimed
            const existingClaims = db.resource_claims.filter(c => c.resource_id === resourceId && c.attendee_id === attendee.id);
            const claimLimit = resource.claim_limit || 1;

            if (existingClaims.length >= claimLimit) {
                const firstClaim = existingClaims[0];
                return {
                    success: false,
                    code: 'ALREADY_CLAIMED',
                    message: `${resource.name} was already claimed by ${attendee.name} at ${new Date(firstClaim.timestamp).toLocaleTimeString()}.`,
                    attendee,
                    resource,
                    previous_claim: firstClaim
                };
            }

            // Check capacity limit if set
            if (resource.capacity) {
                const totalClaims = db.resource_claims.filter(c => c.resource_id === resourceId).length;
                if (totalClaims >= resource.capacity) {
                    return {
                        success: false,
                        code: 'CAPACITY_EXHAUSTED',
                        message: `${resource.name} is completely out of stock (${totalClaims}/${resource.capacity}).`,
                        resource
                    };
                }
            }

            // Record Claim
            const newClaim = {
                id: `clm_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                resource_id: resourceId,
                attendee_id: attendee.id,
                volunteer_id: volunteerId || null,
                timestamp: now,
                status: 'CLAIMED'
            };
            db.resource_claims.push(newClaim);

            // Audit log
            const auditEntry = {
                id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                actor_id: volunteerId,
                actor_name: volunteerName || 'Volunteer',
                actor_role: 'VOLUNTEER',
                action: 'CLAIM_RESOURCE',
                entity_type: 'RESOURCE',
                entity_id: resourceId,
                metadata: {
                    resource_name: resource.name,
                    resource_type: resource.type,
                    attendee_name: attendee.name,
                    attendee_id: attendee.id
                },
                timestamp: now,
                result: 'SUCCESS'
            };
            db.audit_logs.unshift(auditEntry);

            saveDb(db);

            return {
                success: true,
                code: 'CLAIMED_SUCCESSFULLY',
                message: `${resource.name} successfully claimed for ${attendee.name}.`,
                attendee,
                resource,
                claim: newClaim
            };
        });
    },

    // GET ATTENDEE FULL PROFILE & HISTORY
    getAttendeeProfile(eventId, attendeeId) {
        const db = loadDb();
        const attendee = db.attendees.find(a => a.id === attendeeId && a.event_id === eventId);
        if (!attendee) return null;

        const assignedTrack = db.tracks.find(t => t.id === attendee.assigned_track_id) || null;
        const assignedWorkshop = db.workshops.find(w => w.id === attendee.assigned_workshop_id) || null;

        const claims = db.resource_claims.filter(c => c.attendee_id === attendee.id).map(c => {
            const res = db.resources.find(r => r.id === c.resource_id);
            return {
                ...c,
                resource: res || null
            };
        });

        const trackAccessLogs = db.track_access_logs.filter(l => l.attendee_id === attendee.id).map(l => {
            const trk = db.tracks.find(t => t.id === l.track_id);
            return { ...l, track: trk || null };
        });

        const workshopAccessLogs = db.workshop_access_logs.filter(l => l.attendee_id === attendee.id).map(l => {
            const wk = db.workshops.find(w => w.id === l.workshop_id);
            return { ...l, workshop: wk || null };
        });

        return {
            ...attendee,
            assigned_track: assignedTrack,
            assigned_workshop: assignedWorkshop,
            claims,
            track_access_logs: trackAccessLogs,
            workshop_access_logs: workshopAccessLogs
        };
    },

    // ADMIN OVERRIDE
    adminOverride({ eventId, attendeeId, updates, adminId, adminName, reason }) {
        const db = loadDb();
        const index = db.attendees.findIndex(a => a.id === attendeeId && a.event_id === eventId);
        if (index === -1) throw new Error('Attendee not found');

        const prev = { ...db.attendees[index] };
        db.attendees[index] = {
            ...db.attendees[index],
            ...updates,
            updated_at: new Date().toISOString()
        };

        // If resetting claims
        if (updates.reset_resource_id) {
            db.resource_claims = db.resource_claims.filter(c => !(c.attendee_id === attendeeId && c.resource_id === updates.reset_resource_id));
        }

        const now = new Date().toISOString();
        const auditEntry = {
            id: `aud_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId,
            actor_id: adminId,
            actor_name: adminName || 'Administrator',
            actor_role: 'ADMIN',
            action: 'ADMIN_OVERRIDE',
            entity_type: 'ATTENDEE',
            entity_id: attendeeId,
            metadata: {
                reason: reason || 'Manual Admin correction',
                previous_state: prev,
                new_state: db.attendees[index]
            },
            timestamp: now,
            result: 'SUCCESS'
        };
        db.audit_logs.unshift(auditEntry);

        saveDb(db);
        return db.attendees[index];
    },

    // AUDIT LOGS
    getAuditLogs(eventId, filter = {}) {
        const db = loadDb();
        let list = db.audit_logs.filter(l => l.event_id === eventId);
        if (filter.action) {
            list = list.filter(l => l.action === filter.action);
        }
        if (filter.actor_role) {
            list = list.filter(l => l.actor_role === filter.actor_role);
        }
        return list;
    },

    // LIVE DASHBOARD METRICS
    getLiveMetrics(eventId) {
        const db = loadDb();
        const event = db.events.find(e => e.id === eventId);
        if (!event) return null;

        const attendees = db.attendees.filter(a => a.event_id === eventId);
        const totalAttendees = attendees.length;
        const checkedIn = attendees.filter(a => a.check_in_status === 'CHECKED_IN').length;
        const notCheckedIn = totalAttendees - checkedIn;
        const checkInRate = totalAttendees > 0 ? ((checkedIn / totalAttendees) * 100).toFixed(1) : 0;

        const tracks = this.getTracks(eventId);
        const workshops = this.getWorkshops(eventId);
        const foodResources = this.getResources(eventId, 'FOOD');
        const swagResources = this.getResources(eventId, 'SWAG');

        const trackAccessLogs = db.track_access_logs.filter(l => l.event_id === eventId);
        const totalAccessAttempts = trackAccessLogs.length;
        const deniedAccessAttempts = trackAccessLogs.filter(l => l.result === 'DENIED').length;

        const recentAudits = db.audit_logs.filter(l => l.event_id === eventId).slice(0, 15);

        return {
            event,
            summary: {
                total_attendees: totalAttendees,
                checked_in: checkedIn,
                not_checked_in: notCheckedIn,
                check_in_rate: `${checkInRate}%`,
                total_access_attempts: totalAccessAttempts,
                denied_access_attempts: deniedAccessAttempts
            },
            tracks,
            workshops,
            food: foodResources,
            swag: swagResources,
            recent_activity: recentAudits
        };
    },

    // CLONE EVENT
    cloneEvent(sourceEventId, newEventData) {
        const db = loadDb();
        const sourceEvent = db.events.find(e => e.id === sourceEventId);
        if (!sourceEvent) throw new Error('Source event not found.');

        const newEvent = this.createEvent({
            ...newEventData,
            name: newEventData.name || `${sourceEvent.name} (Copy)`,
            year: newEventData.year || sourceEvent.year + 1,
            description: newEventData.description || sourceEvent.description,
            venue: newEventData.venue || sourceEvent.venue,
            timezone: sourceEvent.timezone,
            status: 'DRAFT',
            logo: sourceEvent.logo,
            banner: sourceEvent.banner,
            settings: sourceEvent.settings
        });

        // Copy track structure
        const sourceTracks = db.tracks.filter(t => t.event_id === sourceEventId);
        for (const t of sourceTracks) {
            this.createTrack({
                event_id: newEvent.id,
                name: t.name,
                description: t.description,
                capacity: t.capacity,
                status: 'ACTIVE'
            });
        }

        // Copy workshop structure
        const sourceWorkshops = db.workshops.filter(w => w.event_id === sourceEventId);
        for (const w of sourceWorkshops) {
            this.createWorkshop({
                event_id: newEvent.id,
                name: w.name,
                description: w.description,
                speaker: w.speaker,
                location: w.location,
                start_time: w.start_time,
                end_time: w.end_time,
                capacity: w.capacity,
                status: 'ACTIVE'
            });
        }

        // Copy food/swag resources
        const sourceResources = db.resources.filter(r => r.event_id === sourceEventId);
        for (const r of sourceResources) {
            this.createResource({
                event_id: newEvent.id,
                name: r.name,
                type: r.type,
                description: r.description,
                capacity: r.capacity,
                claim_limit: r.claim_limit,
                start_time: r.start_time,
                end_time: r.end_time,
                status: 'ACTIVE'
            });
        }

        return newEvent;
    }
};
