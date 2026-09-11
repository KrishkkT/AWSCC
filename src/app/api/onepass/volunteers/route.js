import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser, hashPassword } from '@/lib/onepass/auth';
import { syncVolunteersToSupabase, deleteVolunteerFromSupabase } from '@/lib/onepass/supabaseSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const users = OnePassDB.getUsers();
        const volunteers = users.filter(u => u.role === 'VOLUNTEER');

        // Attach event assignments to each volunteer
        const enriched = volunteers.map(v => {
            const assignments = OnePassDB.getUserEventAssignments(v.id);
            return {
                id: v.id,
                name: v.name,
                email: v.email,
                role: v.role,
                status: v.status,
                created_at: v.created_at,
                assignments: assignments.map(a => {
                    const evt = OnePassDB.getEventById(a.event_id);
                    return {
                        ...a,
                        event_name: evt ? evt.name : a.event_id
                    };
                })
            };
        });

        if (eventId) {
            const eventVolunteers = OnePassDB.getEventVolunteers(eventId);
            const enrichedEV = eventVolunteers.map(ev => {
                const u = OnePassDB.getUserById(ev.user_id);
                return {
                    ...ev,
                    user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status } : null
                };
            });
            return NextResponse.json({ volunteers: enriched, event_volunteers: enrichedEV });
        }

        return NextResponse.json({ volunteers: enriched });
    } catch (e) {
        console.error('[OnePass Volunteers GET]', e);
        return NextResponse.json({ error: 'Failed to fetch volunteers' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { name, email, password, eventId, permissions } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const password_hash = hashPassword(cleanPassword);

        // Check if user already exists
        let user = OnePassDB.getUserByEmail(cleanEmail);
        if (!user) {
            user = OnePassDB.createUser({
                name: name.trim(),
                email: cleanEmail,
                password_hash,
                role: 'VOLUNTEER',
                status: 'ACTIVE'
            });
        } else {
            // Update existing user with newly set credentials
            user = OnePassDB.updateUser(user.id, {
                name: name.trim(),
                password_hash,
                status: 'ACTIVE'
            });
        }

        // Assign to event if eventId provided
        if (eventId) {
            OnePassDB.assignVolunteerToEvent(eventId, user.id, permissions || ['CHECK_IN', 'VIEW_DASHBOARD', 'TRACK_ACCESS', 'WORKSHOP_ACCESS', 'SWAG', 'FOOD']);
        }

        // Audit log
        OnePassDB.addAuditLog({
            event_id: eventId || 'GLOBAL',
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_VOLUNTEER',
            entity_type: 'USER',
            entity_id: user.id,
            metadata: { name: user.name, email: user.email, eventId, permissions }
        });

        // Sync to Supabase
        syncVolunteersToSupabase().catch(() => {});

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (e) {
        console.error('[OnePass Volunteers POST]', e);
        return NextResponse.json({ error: 'Failed to create volunteer' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await OnePassDB.ensureHydrated();
        const body = await req.json();
        const { userId, eventId, permissions, newPassword, status, name } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updates = {};
        if (status) updates.status = status;
        if (name && name.trim()) updates.name = name.trim();
        if (newPassword && newPassword.trim()) {
            updates.password_hash = hashPassword(newPassword.trim());
        }

        if (Object.keys(updates).length > 0) {
            OnePassDB.updateUser(userId, updates);
        }

        if (eventId && permissions) {
            OnePassDB.assignVolunteerToEvent(eventId, userId, permissions);
        }

        OnePassDB.addAuditLog({
            event_id: eventId || 'GLOBAL',
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'UPDATE_VOLUNTEER',
            entity_type: 'USER',
            entity_id: userId,
            metadata: { permissions, status, passwordReset: !!newPassword }
        });

        // Sync to Supabase
        syncVolunteersToSupabase().catch(() => {});

        return NextResponse.json({ success: true, message: 'Volunteer updated successfully' });
    } catch (e) {
        console.error('[OnePass Volunteers PATCH]', e);
        return NextResponse.json({ error: 'Failed to update volunteer' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await OnePassDB.ensureHydrated();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const eventId = searchParams.get('eventId');
        const permanent = searchParams.get('permanent') === 'true';

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const targetUser = OnePassDB.getUserById(userId);

        if (eventId) {
            OnePassDB.removeVolunteerFromEvent(eventId, userId);
        }

        // Complete deletion if permanent or no event assignments remaining
        const remaining = OnePassDB.getUserEventAssignments(userId);
        if (remaining.length === 0 || permanent || !eventId) {
            OnePassDB.deleteUser(userId);
        }

        // Audit log
        OnePassDB.addAuditLog({
            event_id: eventId || 'GLOBAL',
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: eventId ? 'REMOVE_VOLUNTEER_FROM_EVENT' : 'DELETE_VOLUNTEER',
            entity_type: 'USER',
            entity_id: userId,
            metadata: { name: targetUser?.name, email: targetUser?.email, eventId }
        });

        // Delete from Supabase
        deleteVolunteerFromSupabase(userId, eventId, permanent).catch(() => {});

        return NextResponse.json({ success: true, message: 'Volunteer removed successfully' });
    } catch (e) {
        console.error('[OnePass Volunteers DELETE]', e);
        return NextResponse.json({ error: e.message || 'Failed to remove volunteer' }, { status: 500 });
    }
}
