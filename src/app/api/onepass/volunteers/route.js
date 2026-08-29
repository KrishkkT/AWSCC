import { NextResponse } from 'next/server';
import { OnePassDB } from '@/lib/onepass/db';
import { authorizeUser, hashPassword } from '@/lib/onepass/auth';

export async function GET(req) {
    try {
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
            return NextResponse.json({ volunteers: enriched, event_volunteers: eventVolunteers });
        }

        return NextResponse.json({ volunteers: enriched });
    } catch (e) {
        console.error('[OnePass Volunteers GET]', e);
        return NextResponse.json({ error: 'Failed to fetch volunteers' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, password, eventId, permissions } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // Check if user already exists
        let user = OnePassDB.getUserByEmail(email);
        if (!user) {
            const password_hash = hashPassword(password);
            user = OnePassDB.createUser({
                name,
                email,
                password_hash,
                role: 'VOLUNTEER',
                status: 'ACTIVE'
            });
        }

        // Assign to event if eventId provided
        if (eventId) {
            OnePassDB.assignVolunteerToEvent(eventId, user.id, permissions || ['CHECK_IN', 'VIEW_DASHBOARD']);
        }

        // Audit log
        OnePassDB.getSnapshot().audit_logs.unshift({
            id: `aud_${Date.now()}`,
            event_id: eventId || 'GLOBAL',
            actor_id: auth.user.id,
            actor_name: auth.user.name,
            actor_role: 'ADMIN',
            action: 'CREATE_VOLUNTEER',
            entity_type: 'USER',
            entity_id: user.id,
            metadata: { name: user.name, email: user.email, eventId, permissions },
            timestamp: new Date().toISOString(),
            result: 'SUCCESS'
        });

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
        const body = await req.json();
        const { userId, eventId, permissions, newPassword, status } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const updates = {};
        if (status) updates.status = status;
        if (newPassword) updates.password_hash = hashPassword(newPassword);

        if (Object.keys(updates).length > 0) {
            OnePassDB.updateUser(userId, updates);
        }

        if (eventId && permissions) {
            OnePassDB.assignVolunteerToEvent(eventId, userId, permissions);
        }

        return NextResponse.json({ success: true, message: 'Volunteer updated successfully' });
    } catch (e) {
        console.error('[OnePass Volunteers PATCH]', e);
        return NextResponse.json({ error: 'Failed to update volunteer' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const eventId = searchParams.get('eventId');

        if (!userId || !eventId) {
            return NextResponse.json({ error: 'userId and eventId are required' }, { status: 400 });
        }

        const auth = await authorizeUser(req, 'ADMIN');
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        OnePassDB.removeVolunteerFromEvent(eventId, userId);
        return NextResponse.json({ success: true, message: 'Volunteer removed from event' });
    } catch (e) {
        console.error('[OnePass Volunteers DELETE]', e);
        return NextResponse.json({ error: 'Failed to remove volunteer' }, { status: 500 });
    }
}
