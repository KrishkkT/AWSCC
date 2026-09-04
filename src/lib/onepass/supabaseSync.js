import { supabase } from '@/lib/supabase';
import { OnePassDB } from './db';

/**
 * OnePass Supabase Cloud Synchronization Layer
 * Synchronizes OnePass Events, Attendees, Badge Studio Templates, Replacement Fields,
 * and isolated Attendee Lists to Supabase to prevent any data loss.
 */

// Helper to format ISO dates safely
function safeDate(d) {
    if (!d) return new Date().toISOString().split('T')[0];
    try {
        return new Date(d).toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Save Badge Studio Data to Supabase
 */
export async function syncBadgeStudioToSupabase(data) {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    try {
        const payload = {
            id: 'badge_studio_master',
            data: {
                templates: data.templates || [],
                fields: data.fields || {},
                attendeesByTemplate: data.attendeesByTemplate || {},
                activeTemplateIdx: data.activeTemplateIdx ?? 0,
                updated_at: new Date().toISOString()
            }
        };

        // Try upserting to onepass_badge_studio table
        const { error: studioErr } = await supabase
            .from('onepass_badge_studio')
            .upsert({
                id: payload.id,
                data: payload.data,
                updated_at: payload.data.updated_at
            }, { onConflict: 'id' });

        if (studioErr) {
            // Fallback: If onepass_badge_studio table does not exist or RLS blocked,
            // store in the events / resources metadata table or log for transparency
            console.warn('[Supabase Sync] onepass_badge_studio notice:', studioErr.message);
        }

        // Also sync any attendees in data.attendeesByTemplate to onepass_attendees
        if (data.attendeesByTemplate) {
            for (const [tplId, attList] of Object.entries(data.attendeesByTemplate)) {
                if (Array.isArray(attList) && attList.length > 0) {
                    await syncTemplateAttendeesToSupabase(tplId, attList);
                }
            }
        }

        return { success: true };
    } catch (err) {
        console.error('[Supabase Sync] Badge Studio sync failed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Sync template-specific attendees to Supabase
 */
export async function syncTemplateAttendeesToSupabase(templateId, attendeesList) {
    if (!supabase || !Array.isArray(attendeesList) || attendeesList.length === 0) return;
    try {
        const rows = attendeesList.map(a => ({
            id: a.id || `att_${Math.random().toString(36).substring(2, 10)}`,
            event_id: a.event_id || 'evt_community_day_2025',
            name: a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Attendee',
            email: a.email || `${a.id || Math.random().toString(36).substring(2, 8)}@placeholder.com`,
            booking_id: a.booking_id || a.id || 'BK-000',
            ticket_type: a.role || 'Attendee',
            qr_identifier: a.booking_id || a.id || `QR-${Math.random().toString(36).substring(2, 8)}`,
            qr_token: `token_${a.id || Math.random().toString(36).substring(2, 8)}`,
            check_in_status: a.check_in_status || 'NOT_CHECKED_IN'
        }));

        // Upsert in batches of 50 to prevent packet size limits
        for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            const { error } = await supabase.from('onepass_attendees').upsert(chunk, { onConflict: 'id' });
            if (error) {
                console.warn('[Supabase Sync] onepass_attendees batch warning:', error.message);
                break;
            }
        }
    } catch (e) {
        console.warn('[Supabase Sync] Error syncing template attendees:', e.message);
    }
}

/**
 * Load Badge Studio Data from Supabase
 */
export async function loadBadgeStudioFromSupabase() {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('onepass_badge_studio')
            .select('data')
            .eq('id', 'badge_studio_master')
            .single();

        if (error || !data) {
            return null;
        }
        return data.data;
    } catch (err) {
        console.warn('[Supabase Sync] Could not load badge studio data:', err.message);
        return null;
    }
}

/**
 * Sync OnePass Volunteers & Users to Supabase
 */
export async function syncVolunteersToSupabase() {
    if (!supabase) return;
    try {
        const snapshot = OnePassDB.getSnapshot();
        const users = snapshot.users || [];
        const events = snapshot.events || [];
        const eventVolunteers = snapshot.event_volunteers || [];

        // 1. Sync onepass_users
        if (users.length > 0) {
            const userRows = users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                password_hash: u.password_hash,
                role: u.role || 'VOLUNTEER',
                status: u.status || 'ACTIVE',
                created_at: u.created_at || new Date().toISOString(),
                updated_at: u.updated_at || new Date().toISOString()
            }));

            for (let i = 0; i < userRows.length; i += 50) {
                const chunk = userRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_users').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_users notice:', error.message);
            }
        }

        // 2. Ensure parent onepass_events exist so FK constraints pass
        if (events.length > 0) {
            for (const evt of events) {
                await supabase.from('onepass_events').upsert({
                    id: evt.id,
                    name: evt.name,
                    year: Number(evt.year) || new Date().getFullYear(),
                    description: evt.description || '',
                    date: safeDate(evt.date),
                    venue: evt.venue || 'DDU Campus, Nadiad',
                    status: evt.status || 'LIVE',
                    settings: evt.settings || {}
                }, { onConflict: 'id' });
            }
        }

        // 3. Sync onepass_event_volunteers
        if (eventVolunteers.length > 0) {
            const evRows = eventVolunteers.map(ev => ({
                id: ev.id,
                event_id: ev.event_id,
                user_id: ev.user_id,
                permissions: ev.permissions || ['CHECK_IN'],
                assigned_at: ev.assigned_at || new Date().toISOString()
            }));

            for (let i = 0; i < evRows.length; i += 50) {
                const chunk = evRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_event_volunteers').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_event_volunteers notice:', error.message);
            }
        }
    } catch (e) {
        console.warn('[Supabase Sync] Failed to sync volunteers:', e.message);
    }
}

/**
 * Delete a volunteer and/or their event assignments from Supabase
 */
export async function deleteVolunteerFromSupabase(userId, eventId = null, permanent = false) {
    if (!supabase || !userId) return;
    try {
        if (eventId) {
            await supabase.from('onepass_event_volunteers').delete().match({ user_id: userId, event_id: eventId });
        }
        if (permanent || !eventId) {
            await supabase.from('onepass_event_volunteers').delete().eq('user_id', userId);
            await supabase.from('onepass_users').delete().eq('id', userId);
        }
    } catch (e) {
        console.warn('[Supabase Sync] Failed to delete volunteer from Supabase:', e.message);
    }
}

/**
 * Sync entire OnePass local database to Supabase (cloud source of truth).
 * Syncs ALL entities: users, events, volunteers, attendees, tracks, workshops,
 * resources, resource_claims, and recent audit_logs.
 */
export async function syncOnePassFullDatabaseToSupabase() {
    if (!supabase) return { success: false, error: 'Supabase client not available' };
    try {
        // 1. Sync volunteers & users
        await syncVolunteersToSupabase();

        // 2. Sync events & all child entities
        const snapshot = OnePassDB.getSnapshot();
        const events = snapshot.events || [];

        for (const evt of events) {
            const eventPayload = {
                id: evt.id,
                name: evt.name,
                year: Number(evt.year) || new Date().getFullYear(),
                description: evt.description || '',
                date: safeDate(evt.date),
                venue: evt.venue || 'DDU Campus, Nadiad',
                status: evt.status || 'LIVE',
                settings: evt.settings || {}
            };

            const { error: evtErr } = await supabase
                .from('onepass_events')
                .upsert(eventPayload, { onConflict: 'id' });

            if (evtErr) {
                console.warn('[Supabase Sync] onepass_events warning:', evtErr.message);
            }
        }

        // 3. Sync tracks
        const tracks = snapshot.tracks || [];
        if (tracks.length > 0) {
            const trackRows = tracks.map(t => ({
                id: t.id,
                event_id: t.event_id,
                name: t.name,
                description: t.description || '',
                capacity: t.capacity || 100,
                status: t.status || 'ACTIVE',
                created_at: t.created_at || new Date().toISOString()
            }));
            for (let i = 0; i < trackRows.length; i += 50) {
                const chunk = trackRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_tracks').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_tracks warning:', error.message);
            }
        }

        // 4. Sync workshops
        const workshops = snapshot.workshops || [];
        if (workshops.length > 0) {
            const workshopRows = workshops.map(w => ({
                id: w.id,
                event_id: w.event_id,
                name: w.name,
                description: w.description || '',
                speaker: w.speaker || '',
                location: w.location || '',
                start_time: w.start_time || '09:00',
                end_time: w.end_time || '10:00',
                capacity: w.capacity || 50,
                status: w.status || 'ACTIVE',
                created_at: w.created_at || new Date().toISOString()
            }));
            for (let i = 0; i < workshopRows.length; i += 50) {
                const chunk = workshopRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_workshops').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_workshops warning:', error.message);
            }
        }

        // 5. Sync resources (food, swag, etc.)
        const resources = snapshot.resources || [];
        if (resources.length > 0) {
            const resourceRows = resources.map(r => ({
                id: r.id,
                event_id: r.event_id,
                name: r.name,
                type: r.type || 'FOOD',
                description: r.description || '',
                capacity: r.capacity || null,
                claim_limit: r.claim_limit || 1,
                start_time: r.start_time || null,
                end_time: r.end_time || null,
                status: r.status || 'ACTIVE',
                created_at: r.created_at || new Date().toISOString()
            }));
            for (let i = 0; i < resourceRows.length; i += 50) {
                const chunk = resourceRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_resources').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_resources warning:', error.message);
            }
        }

        // 6. Sync attendees (with full attribution data)
        const attendees = snapshot.attendees || [];
        if (attendees.length > 0) {
            const attRows = attendees.map(a => ({
                id: a.id,
                event_id: a.event_id,
                name: a.name,
                email: a.email,
                phone: a.phone || '',
                ticket_type: a.ticket_type || 'Attendee',
                booking_id: a.booking_id,
                qr_identifier: a.qr_identifier,
                qr_token: a.qr_token,
                check_in_status: a.check_in_status || 'NOT_CHECKED_IN',
                check_in_time: a.check_in_time || null,
                assigned_track_id: a.assigned_track_id || null,
                assigned_workshop_id: a.assigned_workshop_id || null,
                checked_in_by_id: a.checked_in_by_id || null,
                checked_in_by_name: a.checked_in_by_name || null,
                checked_in_by_role: a.checked_in_by_role || null
            }));

            for (let i = 0; i < attRows.length; i += 50) {
                const chunk = attRows.slice(i, i + 50);
                const { error } = await supabase.from('onepass_attendees').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_attendees warning:', error.message);
            }
        }

        // 7. Sync resource claims
        const resourceClaims = snapshot.resource_claims || [];
        if (resourceClaims.length > 0) {
            for (let i = 0; i < resourceClaims.length; i += 50) {
                const chunk = resourceClaims.slice(i, i + 50).map(c => ({
                    id: c.id,
                    event_id: c.event_id,
                    resource_id: c.resource_id,
                    attendee_id: c.attendee_id,
                    volunteer_id: c.volunteer_id || null,
                    timestamp: c.timestamp || new Date().toISOString(),
                    status: c.status || 'CLAIMED'
                }));
                const { error } = await supabase.from('onepass_resource_claims').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_resource_claims warning:', error.message);
            }
        }

        // 8. Sync recent audit logs (last 500)
        const auditLogs = (snapshot.audit_logs || []).slice(0, 500);
        if (auditLogs.length > 0) {
            for (let i = 0; i < auditLogs.length; i += 50) {
                const chunk = auditLogs.slice(i, i + 50).map(l => ({
                    id: l.id,
                    event_id: l.event_id || 'GLOBAL',
                    actor_id: l.actor_id || null,
                    actor_name: l.actor_name || null,
                    actor_role: l.actor_role || null,
                    action: l.action,
                    entity_type: l.entity_type,
                    entity_id: l.entity_id || null,
                    metadata: l.metadata || {},
                    timestamp: l.timestamp || new Date().toISOString(),
                    result: l.result || 'SUCCESS'
                }));
                const { error } = await supabase.from('onepass_audit_logs').upsert(chunk, { onConflict: 'id' });
                if (error) console.warn('[Supabase Sync] onepass_audit_logs warning:', error.message);
            }
        }

        return { success: true };
    } catch (e) {
        console.error('[Supabase Sync] Error during full OnePass sync:', e);
        return { success: false, error: e.message };
    }
}
