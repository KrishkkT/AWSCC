import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// Paths for OnePass JSON database storage (local backup only)
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'onepass_db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'onepass_db.json');

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE: Persists across hot-reloads in dev, across requests
// in a single serverless invocation container.
// ═══════════════════════════════════════════════════════════════════
if (!globalThis.__onepass_db_cache__) {
    globalThis.__onepass_db_cache__ = null;
}
if (globalThis.__onepass_is_local_writable === undefined) {
    globalThis.__onepass_is_local_writable = null;
}
// Track whether we have already hydrated from Supabase in this container lifecycle
if (!globalThis.__onepass_supabase_hydrated__) {
    globalThis.__onepass_supabase_hydrated__ = false;
}
// Lock to prevent concurrent hydrations
if (!globalThis.__onepass_hydration_promise__) {
    globalThis.__onepass_hydration_promise__ = null;
}

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

function getActiveDbFilePath() {
    if (globalThis.__onepass_is_local_writable === false) {
        return TMP_DB_FILE;
    }
    try {
        if (!fs.existsSync(LOCAL_DATA_DIR)) {
            fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(LOCAL_DB_FILE)) {
            fs.accessSync(LOCAL_DB_FILE, fs.constants.W_OK);
        }
        globalThis.__onepass_is_local_writable = true;
        return LOCAL_DB_FILE;
    } catch (e) {
        // Read-only filesystem detected (e.g. AWS Lambda / Vercel Serverless /var/task)
        globalThis.__onepass_is_local_writable = false;
        return TMP_DB_FILE;
    }
}

// ═══════════════════════════════════════════════════════════════════
// SUPABASE DIRECT HELPERS: Non-blocking, instant writes & deletes
// ═══════════════════════════════════════════════════════════════════
export async function deleteFromSupabaseDirect(tableName, filter) {
    try {
        const { supabase } = await import('@/lib/supabase');
        if (!supabase) return;
        if (typeof filter === 'string') {
            await supabase.from(tableName).delete().eq('id', filter);
        } else if (Array.isArray(filter)) {
            for (let i = 0; i < filter.length; i += 50) {
                const chunk = filter.slice(i, i + 50);
                await supabase.from(tableName).delete().in('id', chunk);
            }
        } else if (typeof filter === 'object' && filter !== null) {
            await supabase.from(tableName).delete().match(filter);
        }
    } catch (e) {
        console.warn(`[Supabase Delete] Notice for ${tableName}:`, e.message);
    }
}

export async function upsertToSupabaseDirect(tableName, recordOrRecords) {
    try {
        const { supabase } = await import('@/lib/supabase');
        if (!supabase) return;
        const rows = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
        if (rows.length === 0) return;
        for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
        }
    } catch (e) {
        console.warn(`[Supabase Upsert] Notice for ${tableName}:`, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════
// SUPABASE HYDRATION: On cold start, pull ALL data from Supabase
// so the local cache reflects the latest cloud state, not a stale
// ═══════════════════════════════════════════════════════════════════
// SUPABASE HYDRATION: On cold start, pull ALL data from Supabase
// as the sole source of truth. If cloud is empty, state is empty.
// ═══════════════════════════════════════════════════════════════════
async function hydrateFromSupabase() {
    // Only hydrate once per container lifecycle
    if (globalThis.__onepass_supabase_hydrated__) return;

    // If another request is already hydrating, wait for it
    if (globalThis.__onepass_hydration_promise__) {
        await globalThis.__onepass_hydration_promise__;
        return;
    }

    globalThis.__onepass_hydration_promise__ = (async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) {
                console.warn('[OnePass DB] Supabase client unavailable');
                return;
            }

            console.log('[OnePass DB] ☁️ Connecting directly to Supabase...');

            // Pull all tables in parallel for speed
            const [
                usersRes,
                eventsRes,
                eventVolunteersRes,
                attendeesRes,
                tracksRes,
                workshopsRes,
                resourcesRes,
                resourceClaimsRes,
                trackAccessRes,
                workshopAccessRes,
                auditRes
            ] = await Promise.allSettled([
                supabase.from('onepass_users').select('*'),
                supabase.from('onepass_events').select('*'),
                supabase.from('onepass_event_volunteers').select('*'),
                supabase.from('onepass_attendees').select('*'),
                supabase.from('onepass_tracks').select('*'),
                supabase.from('onepass_workshops').select('*'),
                supabase.from('onepass_resources').select('*'),
                supabase.from('onepass_resource_claims').select('*'),
                supabase.from('onepass_track_access_logs').select('*'),
                supabase.from('onepass_workshop_access_logs').select('*'),
                supabase.from('onepass_audit_logs').select('*').order('timestamp', { ascending: false }).limit(500)
            ]);

            const extract = (res) => {
                if (res.status === 'fulfilled' && res.value && !res.value.error && Array.isArray(res.value.data)) {
                    return res.value.data;
                }
                return null;
            };

            const cloudUsers = extract(usersRes);
            const cloudEvents = extract(eventsRes);
            const cloudEventVolunteers = extract(eventVolunteersRes);
            const cloudAttendees = extract(attendeesRes);
            const cloudTracks = extract(tracksRes);
            const cloudWorkshops = extract(workshopsRes);
            const cloudResources = extract(resourcesRes);
            const cloudResourceClaims = extract(resourceClaimsRes);
            const cloudTrackAccess = extract(trackAccessRes);
            const cloudWorkshopAccess = extract(workshopAccessRes);
            const cloudAudit = extract(auditRes);

            // Supabase is the sole source of truth. If empty, database is empty.
            const hydratedDb = {
                users: cloudUsers !== null ? cloudUsers : [],
                events: cloudEvents !== null ? cloudEvents : [],
                event_volunteers: cloudEventVolunteers !== null ? cloudEventVolunteers : [],
                attendees: cloudAttendees !== null ? cloudAttendees : [],
                tracks: cloudTracks !== null ? cloudTracks : [],
                workshops: cloudWorkshops !== null ? cloudWorkshops : [],
                resources: cloudResources !== null ? cloudResources : [],
                resource_claims: cloudResourceClaims !== null ? cloudResourceClaims : [],
                track_access_logs: cloudTrackAccess !== null ? cloudTrackAccess : [],
                workshop_access_logs: cloudWorkshopAccess !== null ? cloudWorkshopAccess : [],
                audit_logs: cloudAudit !== null ? cloudAudit : [],
                system_settings: {
                    app_name: 'OnePass',
                    tagline: 'One QR. Every interaction.',
                    allow_self_registration: false,
                    version: '1.0.0',
                    initialized_at: new Date().toISOString()
                }
            };

            globalThis.__onepass_db_cache__ = hydratedDb;
            writeDbToFile(hydratedDb);

            const counts = `users=${hydratedDb.users.length}, events=${hydratedDb.events.length}, attendees=${hydratedDb.attendees.length}`;
            console.log(`[OnePass DB] ✅ Direct Supabase connection active (${counts})`);

            globalThis.__onepass_supabase_hydrated__ = true;
        } catch (e) {
            console.warn('[OnePass DB] ⚠️ Supabase hydration warning:', e.message);
            globalThis.__onepass_supabase_hydrated__ = true;
        }
    })();

    await globalThis.__onepass_hydration_promise__;
    globalThis.__onepass_hydration_promise__ = null;
}

/**
 * Read database from local file only (no cache, no Supabase).
 * Used internally during hydration to get the local baseline.
 */
function loadDbFromFile() {
    const activeFile = getActiveDbFilePath();

    // If running in /tmp and file does not exist yet, copy initial snapshot from bundled file
    if (activeFile === TMP_DB_FILE && !fs.existsSync(TMP_DB_FILE)) {
        try {
            if (fs.existsSync(LOCAL_DB_FILE)) {
                const initialRaw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
                fs.writeFileSync(TMP_DB_FILE, initialRaw, 'utf8');
            }
        } catch (e) {
            console.warn('[OnePass DB] Could not seed /tmp DB from local snapshot:', e.message);
        }
    }

    if (fs.existsSync(activeFile)) {
        try {
            const raw = fs.readFileSync(activeFile, 'utf8');
            return JSON.parse(raw);
        } catch (e) {
            console.error('[OnePass DB] Failed to read from active DB disk file:', e.message);
        }
    }

    return {
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
}

/**
 * Write database to local file only (no cache update, no Supabase).
 * Used internally to persist a backup.
 */
function writeDbToFile(data) {
    const activeFile = getActiveDbFilePath();
    try {
        fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        if (err.code === 'EROFS' || err.code === 'EACCES') {
            globalThis.__onepass_is_local_writable = false;
            try {
                fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
            } catch (tmpErr) {
                console.error('[OnePass DB /tmp Save Error]', tmpErr);
            }
        } else {
            console.error('[OnePass DB Save Error]', err);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// CORE loadDb / saveDb — The in-memory cache is the primary read
// source. File reads only happen on first load (before hydration).
// ═══════════════════════════════════════════════════════════════════
function loadDb() {
    // If we have an in-memory cache, use it directly (fast path — no disk I/O)
    if (globalThis.__onepass_db_cache__) {
        return globalThis.__onepass_db_cache__;
    }

    // No cache yet — read from local file as initial bootstrap
    const data = loadDbFromFile();
    globalThis.__onepass_db_cache__ = data;
    return data;
}

function saveDb(data) {
    // 1. Update in-memory cache immediately
    globalThis.__onepass_db_cache__ = data;

    // 2. Write to local file as backup
    writeDbToFile(data);

    // 3. Trigger Supabase sync (debounced but fast)
    triggerBackgroundSupabaseSync();
}

let syncTimeout = null;
function triggerBackgroundSupabaseSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const { syncOnePassFullDatabaseToSupabase } = await import('./supabaseSync.js');
            await syncOnePassFullDatabaseToSupabase();
        } catch (e) {
            // Non-blocking background sync — log but don't crash
            console.warn('[OnePass DB] Background Supabase sync error:', e.message);
        }
    }, 1500); // 1.5s debounce — fast enough to capture changes, slow enough to batch
}


export const OnePassDB = {
    /**
     * Ensure the database is hydrated from Supabase (cloud source of truth).
     * Call this at the start of every API route handler.
     * It only fetches from Supabase ONCE per container lifecycle (cold start).
     * Subsequent calls are instant no-ops.
     */
    async ensureHydrated() {
        await hydrateFromSupabase();
    },

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
    saveDb(data) {
        saveDb(data);
    },
    save(data) {
        saveDb(data);
    },

    // Append an audit log safely and persist to storage
    addAuditLog(entry) {
        try {
            const db = loadDb();
            if (!Array.isArray(db.audit_logs)) {
                db.audit_logs = [];
            }
            db.audit_logs.unshift({
                id: entry.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                event_id: entry.event_id || 'GLOBAL',
                actor_id: entry.actor_id || 'SYSTEM',
                actor_name: entry.actor_name || 'System',
                actor_role: entry.actor_role || 'ADMIN',
                action: entry.action || 'ACTION',
                entity_type: entry.entity_type || 'SYSTEM',
                entity_id: entry.entity_id || null,
                metadata: entry.metadata || {},
                timestamp: entry.timestamp || new Date().toISOString(),
                result: entry.result || 'SUCCESS'
            });
            saveDb(db);
        } catch (err) {
            console.error('[OnePassDB] Failed to save audit log:', err);
        }
    },

    // USERS
    getUsers() {
        return loadDb().users || [];
    },

    getUserByEmail(email) {
        if (!email) return null;
        const clean = email.trim().toLowerCase();
        const users = loadDb().users || [];
        return users.find(u => u.email && u.email.trim().toLowerCase() === clean) || null;
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
        upsertToSupabaseDirect('onepass_users', user);
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
        upsertToSupabaseDirect('onepass_users', db.users[index]);
        return db.users[index];
    },

    deleteUser(id) {
        const db = loadDb();
        db.users = (db.users || []).filter(u => u.id !== id);
        db.event_volunteers = (db.event_volunteers || []).filter(ev => ev.user_id !== id);
        saveDb(db);
        deleteFromSupabaseDirect('onepass_users', id);
        deleteFromSupabaseDirect('onepass_event_volunteers', { user_id: id });
        return true;
    },

    // EVENT VOLUNTEERS
    getEventVolunteers(eventId) {
        const db = loadDb();
        if (!Array.isArray(db.event_volunteers)) db.event_volunteers = [];
        return db.event_volunteers.filter(ev => ev.event_id === eventId);
    },

    getUserEventAssignments(userId) {
        const db = loadDb();
        if (!Array.isArray(db.event_volunteers)) db.event_volunteers = [];
        return db.event_volunteers.filter(ev => ev.user_id === userId);
    },

    assignVolunteerToEvent(eventId, userId, permissions = ['CHECK_IN']) {
        const db = loadDb();
        if (!Array.isArray(db.event_volunteers)) db.event_volunteers = [];
        const existingIdx = db.event_volunteers.findIndex(ev => ev.event_id === eventId && ev.user_id === userId);
        const record = {
            id: existingIdx >= 0 ? db.event_volunteers[existingIdx].id : `ev_${crypto.randomBytes(8).toString('hex')}`,
            event_id: eventId,
            user_id: userId,
            permissions: Array.isArray(permissions) ? permissions : ['CHECK_IN'],
            assigned_at: new Date().toISOString()
        };

        if (existingIdx >= 0) {
            db.event_volunteers[existingIdx] = record;
        } else {
            db.event_volunteers.push(record);
        }
        saveDb(db);
        upsertToSupabaseDirect('onepass_event_volunteers', record);
        return record;
    },

    removeVolunteerFromEvent(eventId, userId) {
        const db = loadDb();
        if (!Array.isArray(db.event_volunteers)) db.event_volunteers = [];
        db.event_volunteers = db.event_volunteers.filter(ev => !(ev.event_id === eventId && ev.user_id === userId));
        saveDb(db);
        deleteFromSupabaseDirect('onepass_event_volunteers', { event_id: eventId, user_id: userId });
        return true;
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
        upsertToSupabaseDirect('onepass_events', event);
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
        upsertToSupabaseDirect('onepass_events', db.events[index]);
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
        deleteFromSupabaseDirect('onepass_events', id);
        deleteFromSupabaseDirect('onepass_tracks', { event_id: id });
        deleteFromSupabaseDirect('onepass_workshops', { event_id: id });
        deleteFromSupabaseDirect('onepass_resources', { event_id: id });
        deleteFromSupabaseDirect('onepass_attendees', { event_id: id });
        deleteFromSupabaseDirect('onepass_event_volunteers', { event_id: id });
        return true;
    },

    // LIVE DASHBOARD METRICS
    getLiveMetrics(eventId) {
        const db = loadDb();
        const event = db.events.find(e => e.id === eventId);
        if (!event) return null;

        const attendees = db.attendees.filter(a => a.event_id === eventId);
        const total_attendees = attendees.length;
        const checked_in = attendees.filter(a => a.check_in_status === 'CHECKED_IN').length;
        const not_checked_in = total_attendees - checked_in;
        const check_in_rate = total_attendees > 0 ? `${Math.round((checked_in / total_attendees) * 100)}%` : '0%';

        const tracks = (db.tracks || [])
            .filter(t => t.event_id === eventId)
            .map(t => {
                const occupancy = attendees.filter(a => a.assigned_track_id === t.id && a.check_in_status === 'CHECKED_IN').length;
                return {
                    ...t,
                    occupancy
                };
            });

        const workshops = (db.workshops || [])
            .filter(w => w.event_id === eventId)
            .map(w => {
                const occupancy = attendees.filter(a => a.assigned_workshop_id === w.id && a.check_in_status === 'CHECKED_IN').length;
                return {
                    ...w,
                    occupancy
                };
            });

        const food = (db.resources || [])
            .filter(r => r.event_id === eventId && r.type === 'FOOD')
            .map(r => {
                const claims_count = (db.resource_claims || []).filter(c => c.resource_id === r.id).length;
                return {
                    ...r,
                    claims_count
                };
            });

        const swag = (db.resources || [])
            .filter(r => r.event_id === eventId && r.type === 'SWAG')
            .map(r => {
                const claims_count = (db.resource_claims || []).filter(c => c.resource_id === r.id).length;
                return {
                    ...r,
                    claims_count
                };
            });

        const recent_activity = (db.audit_logs || [])
            .filter(l => l.event_id === eventId || l.event_id === 'GLOBAL')
            .slice(0, 10);

        return {
            event,
            summary: {
                total_attendees,
                checked_in,
                not_checked_in,
                check_in_rate
            },
            tracks,
            workshops,
            food,
            swag,
            recent_activity
        };
    },

    // TRACKS
    getTracks(eventId) {
        const db = loadDb();
        const tracks = db.tracks.filter(t => t.event_id === eventId);
        // compute dynamic occupancy for checked-in attendees
        return tracks.map(t => {
            const occupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_track_id === t.id && a.check_in_status === 'CHECKED_IN').length;
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
        const occupancy = db.attendees.filter(a => a.event_id === track.event_id && a.assigned_track_id === track.id && a.check_in_status === 'CHECKED_IN').length;
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
        upsertToSupabaseDirect('onepass_tracks', track);
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
        upsertToSupabaseDirect('onepass_tracks', db.tracks[index]);
        return db.tracks[index];
    },

    deleteTrack(id) {
        const db = loadDb();
        const hasAssignments = db.attendees.some(a => a.assigned_track_id === id);
        if (hasAssignments) {
            throw new Error('Cannot delete track with existing attendee assignments. Archive or disable it instead.');
        }
        db.tracks = db.tracks.filter(t => t.id !== id);
        saveDb(db);
        deleteFromSupabaseDirect('onepass_tracks', id);
        return true;
    },

    // WORKSHOPS
    getWorkshops(eventId) {
        const db = loadDb();
        const workshops = db.workshops.filter(w => w.event_id === eventId);
        return workshops.map(w => {
            const occupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_workshop_id === w.id && a.check_in_status === 'CHECKED_IN').length;
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
        const occupancy = db.attendees.filter(a => a.event_id === w.event_id && a.assigned_workshop_id === w.id && a.check_in_status === 'CHECKED_IN').length;
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
        upsertToSupabaseDirect('onepass_workshops', workshop);
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
        upsertToSupabaseDirect('onepass_workshops', db.workshops[index]);
        return db.workshops[index];
    },

    deleteWorkshop(id) {
        const db = loadDb();
        db.workshops = db.workshops.filter(w => w.id !== id);
        db.workshop_access_logs = db.workshop_access_logs.filter(l => l.workshop_id !== id);
        saveDb(db);
        deleteFromSupabaseDirect('onepass_workshops', id);
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
        upsertToSupabaseDirect('onepass_resources', res);
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
        upsertToSupabaseDirect('onepass_resources', db.resources[index]);
        return db.resources[index];
    },

    deleteResource(id) {
        const db = loadDb();
        db.resources = db.resources.filter(r => r.id !== id);
        db.resource_claims = db.resource_claims.filter(c => c.resource_id !== id);
        saveDb(db);
        deleteFromSupabaseDirect('onepass_resources', id);
        deleteFromSupabaseDirect('onepass_resource_claims', { resource_id: id });
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
        if (options.assigned_workshop_id) {
            list = list.filter(a => a.assigned_workshop_id === options.assigned_workshop_id);
        }
        if (options.checked_in_by) {
            list = list.filter(a => a.checked_in_by_id === options.checked_in_by || a.checked_in_by_name === options.checked_in_by);
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
            checked_in_by_id: attendeeData.checked_in_by_id || null,
            checked_in_by_name: attendeeData.checked_in_by_name || null,
            checked_in_by_role: attendeeData.checked_in_by_role || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.attendees.push(attendee);
        saveDb(db);
        upsertToSupabaseDirect('onepass_attendees', attendee);
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
                checked_in_by_id: null,
                checked_in_by_name: null,
                checked_in_by_role: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            db.attendees.push(attendee);
            created.push(attendee);
        }
        saveDb(db);
        upsertToSupabaseDirect('onepass_attendees', created);
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
        upsertToSupabaseDirect('onepass_attendees', db.attendees[index]);
        return db.attendees[index];
    },

    deleteAttendee(id, actorName = 'Admin', actorRole = 'ADMIN') {
        const db = loadDb();
        const existing = db.attendees.find(a => a.id === id);
        if (!existing) return false;

        const eventId = existing.event_id;
        db.attendees = db.attendees.filter(a => a.id !== id);
        db.resource_claims = (db.resource_claims || []).filter(c => c.attendee_id !== id);
        db.track_access_logs = (db.track_access_logs || []).filter(l => l.attendee_id !== id);
        db.workshop_access_logs = (db.workshop_access_logs || []).filter(l => l.attendee_id !== id);

        const auditEntry = {
            id: `aud_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId || 'GLOBAL',
            actor_name: actorName,
            actor_role: actorRole,
            action: 'DELETE_ATTENDEE',
            entity_type: 'ATTENDEE',
            entity_id: id,
            metadata: {
                deleted_attendee_name: existing.name,
                deleted_attendee_email: existing.email,
                deleted_booking_id: existing.booking_id
            },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        };
        if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
        db.audit_logs.unshift(auditEntry);

        saveDb(db);
        deleteFromSupabaseDirect('onepass_attendees', id);
        deleteFromSupabaseDirect('onepass_resource_claims', { attendee_id: id });
        deleteFromSupabaseDirect('onepass_track_access_logs', { attendee_id: id });
        deleteFromSupabaseDirect('onepass_workshop_access_logs', { attendee_id: id });
        upsertToSupabaseDirect('onepass_audit_logs', auditEntry);
        return true;
    },

    batchDeleteAttendees(attendeeIds, actorName = 'Admin', actorRole = 'ADMIN') {
        if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) return 0;
        const db = loadDb();
        const idsSet = new Set(attendeeIds);
        const deletedAttendees = db.attendees.filter(a => idsSet.has(a.id));
        const initialCount = db.attendees.length;

        db.attendees = db.attendees.filter(a => !idsSet.has(a.id));
        db.resource_claims = (db.resource_claims || []).filter(c => !idsSet.has(c.attendee_id));
        db.track_access_logs = (db.track_access_logs || []).filter(l => !idsSet.has(l.attendee_id));
        db.workshop_access_logs = (db.workshop_access_logs || []).filter(l => !idsSet.has(l.attendee_id));

        const eventId = deletedAttendees[0]?.event_id || 'GLOBAL';
        const auditEntry = {
            id: `aud_${crypto.randomBytes(6).toString('hex')}`,
            event_id: eventId,
            actor_name: actorName,
            actor_role: actorRole,
            action: 'BATCH_DELETE_ATTENDEES',
            entity_type: 'ATTENDEE',
            entity_id: `batch_${attendeeIds.length}`,
            metadata: {
                deleted_count: deletedAttendees.length,
                deleted_ids: attendeeIds.slice(0, 10)
            },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        };
        if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
        db.audit_logs.unshift(auditEntry);

        saveDb(db);
        deleteFromSupabaseDirect('onepass_attendees', attendeeIds);
        upsertToSupabaseDirect('onepass_audit_logs', auditEntry);
        return initialCount - db.attendees.length;
    },

    // ATOMIC CHECK-IN WITH 1-CHOICE MUTUALLY EXCLUSIVE SESSION ALLOCATION (TRACK OR WORKSHOP)
    async atomicCheckIn({ eventId, attendeeId, trackId = null, workshopId = null, sessionType = null, volunteerId = null, actorName = 'Volunteer', volunteerRole = null }) {
        return this.withLock(`event_${eventId}_checkin`, async () => {
            const db = loadDb();
            let attendeeIndex = db.attendees.findIndex(a => a.id === attendeeId && a.event_id === eventId);
            if (attendeeIndex === -1) {
                // Fallback check by ID across the database in case of event binding mismatch
                attendeeIndex = db.attendees.findIndex(a => a.id === attendeeId || a.booking_id === attendeeId || a.qr_identifier === attendeeId);
                if (attendeeIndex !== -1) {
                    db.attendees[attendeeIndex].event_id = eventId;
                }
            }

            if (attendeeIndex === -1) {
                return { success: false, code: 'ATTENDEE_NOT_FOUND', message: 'Attendee record not found for this event.' };
            }

            const attendee = db.attendees[attendeeIndex];
            if (attendee.check_in_status === 'CHECKED_IN') {
                const assignedTrk = db.tracks.find(t => t.id === attendee.assigned_track_id);
                const assignedWk = db.workshops.find(w => w.id === attendee.assigned_workshop_id);
                return {
                    success: false,
                    code: 'ALREADY_CHECKED_IN',
                    message: `This attendee was already checked in at ${attendee.check_in_time ? new Date(attendee.check_in_time).toLocaleTimeString() : 'earlier'}.`,
                    attendee,
                    assigned_track: assignedTrk || null,
                    assigned_workshop: assignedWk || null
                };
            }

            // Determine Mutually Exclusive Session Choice (Either 1 Track OR 1 Workshop)
            let finalTrackId = null;
            let finalWorkshopId = null;
            let selectedTrack = null;
            let selectedWorkshop = null;

            if (sessionType === 'WORKSHOP' || (workshopId && !trackId)) {
                // Attendee chose a Workshop
                const workshop = db.workshops.find(w => w.id === workshopId && w.event_id === eventId) || db.workshops.find(w => w.id === workshopId);
                if (!workshop) {
                    return { success: false, code: 'WORKSHOP_NOT_FOUND', message: 'Selected workshop does not exist.' };
                }
                const currentOccupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_workshop_id === workshop.id && a.check_in_status === 'CHECKED_IN').length;
                if (currentOccupancy >= workshop.capacity) {
                    return {
                        success: false,
                        code: 'WORKSHOP_FULL',
                        message: `${workshop.name} is now full (${currentOccupancy}/${workshop.capacity}). Please select another option.`,
                        workshop
                    };
                }
                selectedWorkshop = workshop;
                finalWorkshopId = workshop.id;
                finalTrackId = null;
            } else if (sessionType === 'TRACK' || trackId) {
                // Attendee chose a Track
                const track = (trackId ? (db.tracks.find(t => t.id === trackId && t.event_id === eventId) || db.tracks.find(t => t.id === trackId)) : null) || db.tracks.find(t => t.event_id === eventId);
                if (track) {
                    const currentOccupancy = db.attendees.filter(a => a.event_id === eventId && a.assigned_track_id === track.id && a.check_in_status === 'CHECKED_IN').length;
                    if (currentOccupancy >= track.capacity) {
                        return {
                            success: false,
                            code: 'TRACK_FULL',
                            message: `${track.name} is now full (${currentOccupancy}/${track.capacity}). Please select another option.`,
                            track
                        };
                    }
                    selectedTrack = track;
                    finalTrackId = track.id;
                    finalWorkshopId = null;
                }
            }

            // Perform check-in update with volunteer attribution
            const now = new Date().toISOString();
            const calculatedRole = volunteerRole || (actorName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');
            db.attendees[attendeeIndex] = {
                ...attendee,
                check_in_status: 'CHECKED_IN',
                check_in_time: now,
                assigned_track_id: finalTrackId,
                assigned_workshop_id: finalWorkshopId,
                checked_in_by_id: volunteerId || null,
                checked_in_by_name: actorName || 'Volunteer',
                checked_in_by_role: calculatedRole,
                updated_at: now
            };

            // Log Audit entry
            const sessionName = selectedTrack ? `Track: ${selectedTrack.name}` : selectedWorkshop ? `Workshop: ${selectedWorkshop.name}` : 'General Entry';
            const auditEntry = {
                id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                actor_id: volunteerId,
                actor_name: actorName,
                actor_role: calculatedRole,
                action: 'CHECK_IN',
                entity_type: 'ATTENDEE',
                entity_id: attendee.id,
                metadata: {
                    attendee_name: attendee.name,
                    session_choice: sessionName,
                    assigned_track: selectedTrack ? selectedTrack.name : null,
                    assigned_workshop: selectedWorkshop ? selectedWorkshop.name : null,
                    checked_in_by: actorName
                },
                timestamp: now,
                result: 'SUCCESS'
            };
            if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
            db.audit_logs.unshift(auditEntry);

            saveDb(db);
            upsertToSupabaseDirect('onepass_attendees', db.attendees[attendeeIndex]);
            upsertToSupabaseDirect('onepass_audit_logs', auditEntry);

            return {
                success: true,
                attendee: db.attendees[attendeeIndex],
                track: selectedTrack,
                workshop: selectedWorkshop,
                session_choice: sessionName
            };
        });
    },

    // UNCHECK-IN ATTENDEE (REVERT CHECK-IN & RELEASE SEAT ALLOCATION)
    async uncheckInAttendee({ eventId, attendeeId, volunteerId = null, actorName = 'Volunteer', volunteerRole = null }) {
        return this.withLock(`event_${eventId}_checkin`, async () => {
            const db = loadDb();
            const idToFind = (attendeeId || '').toString().trim();
            const idLower = idToFind.toLowerCase();

            let attendeeIndex = db.attendees.findIndex(a => 
                (a.id === idToFind || 
                 a.booking_id === idToFind || 
                 a.qr_identifier === idToFind || 
                 a.qr_token === idToFind || 
                 a.registration_id === idToFind ||
                 (a.booking_id && a.booking_id.toLowerCase() === idLower) ||
                 (a.qr_identifier && a.qr_identifier.toLowerCase() === idLower) ||
                 (a.qr_token && a.qr_token.toLowerCase() === idLower) ||
                 (a.registration_id && a.registration_id.toLowerCase() === idLower)
                ) && a.event_id === eventId
            );

            if (attendeeIndex === -1) {
                attendeeIndex = db.attendees.findIndex(a => 
                    a.id === idToFind || 
                    a.booking_id === idToFind || 
                    a.qr_identifier === idToFind || 
                    a.qr_token === idToFind || 
                    a.registration_id === idToFind ||
                    (a.booking_id && a.booking_id.toLowerCase() === idLower) ||
                    (a.qr_identifier && a.qr_identifier.toLowerCase() === idLower) ||
                    (a.qr_token && a.qr_token.toLowerCase() === idLower) ||
                    (a.registration_id && a.registration_id.toLowerCase() === idLower)
                );
                if (attendeeIndex !== -1) {
                    db.attendees[attendeeIndex].event_id = eventId;
                }
            }

            if (attendeeIndex === -1) {
                return { success: false, message: 'Attendee not found.' };
            }

            const prev = db.attendees[attendeeIndex];
            const now = new Date().toISOString();
            const effectiveRole = volunteerRole || (actorName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');

            db.attendees[attendeeIndex] = {
                ...prev,
                check_in_status: 'NOT_CHECKED_IN',
                check_in_time: null,
                assigned_track_id: null,
                assigned_workshop_id: null,
                checked_in_by_id: null,
                checked_in_by_name: null,
                checked_in_by_role: null,
                updated_at: now
            };

            const auditEntry = {
                id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                event_id: eventId,
                actor_id: volunteerId,
                actor_name: actorName,
                actor_role: effectiveRole,
                action: 'UNCHECK_IN',
                entity_type: 'ATTENDEE',
                entity_id: prev.id,
                metadata: {
                    attendee_name: prev.name,
                    previous_status: prev.check_in_status,
                    previous_track: prev.assigned_track_id,
                    previous_workshop: prev.assigned_workshop_id,
                    uncheck_in_by: actorName
                },
                timestamp: now,
                result: 'SUCCESS'
            };
            if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
            db.audit_logs.unshift(auditEntry);

            saveDb(db);
            upsertToSupabaseDirect('onepass_attendees', db.attendees[attendeeIndex]);
            upsertToSupabaseDirect('onepass_audit_logs', auditEntry);

            const profile = this.getAttendeeProfile(eventId, db.attendees[attendeeIndex].id) || db.attendees[attendeeIndex];

            return {
                success: true,
                message: `${prev.name} has been successfully un-checked in.`,
                attendee: profile
            };
        });
    },

    // BATCH UNCHECK-IN ATTENDEES
    async batchUncheckInAttendees({ eventId, attendeeIds, volunteerId = null, actorName = 'Volunteer', volunteerRole = null }) {
        if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
            return { success: false, message: 'No attendee IDs provided.' };
        }
        return this.withLock(`event_${eventId}_checkin`, async () => {
            const db = loadDb();
            const now = new Date().toISOString();
            const effectiveRole = volunteerRole || (actorName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');
            let count = 0;
            const updatedAttendees = [];
            const auditEntries = [];

            for (const attendeeId of attendeeIds) {
                const idToFind = (attendeeId || '').toString().trim();
                const idLower = idToFind.toLowerCase();

                let idx = db.attendees.findIndex(a => 
                    (a.id === idToFind || 
                     a.booking_id === idToFind || 
                     a.qr_identifier === idToFind || 
                     a.qr_token === idToFind || 
                     a.registration_id === idToFind ||
                     (a.booking_id && a.booking_id.toLowerCase() === idLower) ||
                     (a.qr_identifier && a.qr_identifier.toLowerCase() === idLower) ||
                     (a.qr_token && a.qr_token.toLowerCase() === idLower) ||
                     (a.registration_id && a.registration_id.toLowerCase() === idLower)
                    ) && a.event_id === eventId
                );

                if (idx === -1) {
                    idx = db.attendees.findIndex(a => 
                        a.id === idToFind || 
                        a.booking_id === idToFind || 
                        a.qr_identifier === idToFind || 
                        a.qr_token === idToFind || 
                        a.registration_id === idToFind ||
                        (a.booking_id && a.booking_id.toLowerCase() === idLower) ||
                        (a.qr_identifier && a.qr_identifier.toLowerCase() === idLower) ||
                        (a.qr_token && a.qr_token.toLowerCase() === idLower) ||
                        (a.registration_id && a.registration_id.toLowerCase() === idLower)
                    );
                    if (idx !== -1) {
                        db.attendees[idx].event_id = eventId;
                    }
                }

                if (idx === -1) continue;

                const prev = db.attendees[idx];
                db.attendees[idx] = {
                    ...prev,
                    check_in_status: 'NOT_CHECKED_IN',
                    check_in_time: null,
                    assigned_track_id: null,
                    assigned_workshop_id: null,
                    checked_in_by_id: null,
                    checked_in_by_name: null,
                    checked_in_by_role: null,
                    updated_at: now
                };

                const auditEntry = {
                    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                    event_id: eventId,
                    actor_id: volunteerId,
                    actor_name: actorName,
                    actor_role: effectiveRole,
                    action: 'UNCHECK_IN',
                    entity_type: 'ATTENDEE',
                    entity_id: prev.id,
                    metadata: {
                        attendee_name: prev.name,
                        previous_status: prev.check_in_status,
                        previous_track: prev.assigned_track_id,
                        previous_workshop: prev.assigned_workshop_id,
                        uncheck_in_by: actorName,
                        bulk: true
                    },
                    timestamp: now,
                    result: 'SUCCESS'
                };
                if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
                db.audit_logs.unshift(auditEntry);
                auditEntries.push(auditEntry);

                updatedAttendees.push(db.attendees[idx]);
                count++;
            }

            saveDb(db);
            upsertToSupabaseDirect('onepass_attendees', updatedAttendees);
            upsertToSupabaseDirect('onepass_audit_logs', auditEntries);

            return {
                success: true,
                message: `Successfully un-checked in ${count} attendee(s).`,
                count,
                attendees: updatedAttendees
            };
        });
    },

    // BATCH CHECK-IN ATTENDEES
    async batchCheckInAttendees({ eventId, attendeeIds, trackId = null, workshopId = null, volunteerId = null, actorName = 'Volunteer', volunteerRole = null }) {
        if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
            return { success: false, message: 'No attendee IDs provided.' };
        }
        return this.withLock(`event_${eventId}_checkin`, async () => {
            const db = loadDb();
            const now = new Date().toISOString();
            const effectiveRole = volunteerRole || (actorName.toLowerCase().includes('admin') ? 'ADMIN' : 'VOLUNTEER');
            let count = 0;
            const updatedAttendees = [];
            const auditEntries = [];

            for (const attendeeId of attendeeIds) {
                let idx = db.attendees.findIndex(a => a.id === attendeeId && a.event_id === eventId);
                if (idx === -1) {
                    idx = db.attendees.findIndex(a => a.id === attendeeId || a.booking_id === attendeeId || a.qr_identifier === attendeeId);
                }
                if (idx === -1) continue;

                const prev = db.attendees[idx];
                db.attendees[idx] = {
                    ...prev,
                    check_in_status: 'CHECKED_IN',
                    check_in_time: now,
                    assigned_track_id: trackId || null,
                    assigned_workshop_id: workshopId || null,
                    checked_in_by_id: volunteerId || null,
                    checked_in_by_name: actorName || 'Volunteer',
                    checked_in_by_role: effectiveRole,
                    updated_at: now
                };

                const auditEntry = {
                    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
                    event_id: eventId,
                    actor_id: volunteerId,
                    actor_name: actorName,
                    actor_role: effectiveRole,
                    action: 'CHECK_IN',
                    entity_type: 'ATTENDEE',
                    entity_id: prev.id,
                    metadata: {
                        attendee_name: prev.name,
                        assigned_track_id: trackId,
                        assigned_workshop_id: workshopId,
                        checked_in_by: actorName,
                        bulk: true
                    },
                    timestamp: now,
                    result: 'SUCCESS'
                };
                if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
                db.audit_logs.unshift(auditEntry);
                auditEntries.push(auditEntry);

                updatedAttendees.push(db.attendees[idx]);
                count++;
            }

            saveDb(db);
            upsertToSupabaseDirect('onepass_attendees', updatedAttendees);
            upsertToSupabaseDirect('onepass_audit_logs', auditEntries);

            return {
                success: true,
                message: `Successfully checked in ${count} attendee(s).`,
                count,
                attendees: updatedAttendees
            };
        });
    },

    // TRACK ACCESS VERIFICATION & LOGGING
    async recordTrackAccess({ eventId, qrToken, trackId, volunteerId, volunteerName }) {
        const db = loadDb();
        const attendee = this.getAttendeeByQR(eventId, qrToken);
        const track = db.tracks.find(t => t.id === trackId && t.event_id === eventId) || db.tracks.find(t => t.id === trackId);
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
            if (!Array.isArray(db.track_access_logs)) db.track_access_logs = [];
            db.track_access_logs.unshift(logEntry);
            saveDb(db);

            return {
                granted: false,
                code: 'NOT_CHECKED_IN',
                message: 'Attendee has not checked in at the main gate.',
                attendee
            };
        }

        // If enrolled in a workshop instead of a track
        if (attendee.assigned_workshop_id && !attendee.assigned_track_id) {
            const assignedWorkshop = db.workshops.find(w => w.id === attendee.assigned_workshop_id);
            return {
                granted: false,
                code: 'ENROLLED_IN_WORKSHOP',
                message: `Access denied. Attendee is enrolled in Workshop: "${assignedWorkshop ? assignedWorkshop.name : 'Workshop'}" instead of Track.`,
                attendee,
                assigned_workshop: assignedWorkshop
            };
        }

        // If assigned to a different track
        if (attendee.assigned_track_id && attendee.assigned_track_id !== trackId) {
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
            if (!Array.isArray(db.track_access_logs)) db.track_access_logs = [];
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
        if (!Array.isArray(db.track_access_logs)) db.track_access_logs = [];
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
        const workshop = db.workshops.find(w => w.id === workshopId && w.event_id === eventId) || db.workshops.find(w => w.id === workshopId);
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

        // If enrolled in a track instead of a workshop
        if (attendee.assigned_track_id && !attendee.assigned_workshop_id) {
            const assignedTrack = db.tracks.find(t => t.id === attendee.assigned_track_id);
            return {
                granted: false,
                code: 'ENROLLED_IN_TRACK',
                message: `Access denied. Attendee is assigned to Track: "${assignedTrack ? assignedTrack.name : 'Track'}" instead of Workshop.`,
                attendee,
                assigned_track: assignedTrack
            };
        }

        // If assigned to a different workshop
        if (attendee.assigned_workshop_id && attendee.assigned_workshop_id !== workshopId) {
            const assignedWk = db.workshops.find(w => w.id === attendee.assigned_workshop_id);
            return {
                granted: false,
                code: 'WRONG_WORKSHOP',
                message: `Access denied. Attendee is assigned to Workshop: "${assignedWk ? assignedWk.name : 'another workshop'}".`,
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
        if (!Array.isArray(db.workshop_access_logs)) db.workshop_access_logs = [];
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
            upsertToSupabaseDirect('onepass_resource_claims', newClaim);
            upsertToSupabaseDirect('onepass_audit_logs', auditEntry);

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
            deleteFromSupabaseDirect('onepass_resource_claims', { attendee_id: attendeeId, resource_id: updates.reset_resource_id });
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
        upsertToSupabaseDirect('onepass_attendees', db.attendees[index]);
        upsertToSupabaseDirect('onepass_audit_logs', auditEntry);
        return db.attendees[index];
    },

    // AUDIT LOGS
    getAuditLogs(eventId, filter = {}) {
        const db = loadDb();
        const logs = Array.isArray(db.audit_logs) ? db.audit_logs : [];
        let list = logs.filter(l => l.event_id === eventId || l.event_id === 'GLOBAL');
        if (filter.action) {
            list = list.filter(l => l.action === filter.action);
        }
        if (filter.actor_role) {
            list = list.filter(l => l.actor_role === filter.actor_role);
        }
        return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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

        const trackAccessLogs = (db.track_access_logs || []).filter(l => l.event_id === eventId);
        const totalAccessAttempts = trackAccessLogs.length;
        const deniedAccessAttempts = trackAccessLogs.filter(l => l.result === 'DENIED').length;

        const recentAudits = (Array.isArray(db.audit_logs) ? db.audit_logs : [])
            .filter(l => l.event_id === eventId || l.event_id === 'GLOBAL')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 15);

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
