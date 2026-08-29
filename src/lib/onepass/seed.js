import { OnePassDB } from './db';
import { hashPassword } from './auth';

export function seedOnePassDatabase(force = false) {
    const current = OnePassDB.getSnapshot();
    if (!force && current.users && current.users.length > 0) {
        return { message: 'Database already initialized', usersCount: current.users.length };
    }

    console.log('[OnePass] Setting master admin account...');

    // Master Admin User
    const adminPasswordHash = hashPassword('Aws@2025#Scd');

    const adminUser = {
        id: 'usr_admin_master',
        name: 'Administrator',
        email: 'admin@onepass.ddu.ac.in',
        password_hash: adminPasswordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const cleanDB = {
        users: [adminUser],
        events: [],
        event_volunteers: [],
        attendees: [],
        tracks: [],
        workshops: [],
        resources: [],
        resource_claims: [],
        track_access_logs: [],
        workshop_access_logs: [],
        audit_logs: [
            {
                id: 'aud_init',
                event_id: 'SYSTEM',
                actor_id: 'usr_admin_master',
                actor_name: 'Administrator',
                actor_role: 'ADMIN',
                action: 'INITIALIZE_ONEPASS',
                entity_type: 'SYSTEM',
                entity_id: 'SYSTEM',
                metadata: { note: 'OnePass Platform initialized for admin@onepass.ddu.ac.in' },
                timestamp: new Date().toISOString(),
                result: 'SUCCESS'
            }
        ]
    };

    OnePassDB.save(cleanDB);
    console.log('[OnePass] Admin account configured: admin@onepass.ddu.ac.in');

    return {
        message: 'Admin account setup complete (admin@onepass.ddu.ac.in).',
        usersCount: 1,
        eventsCount: 0,
        attendeesCount: 0
    };
}
