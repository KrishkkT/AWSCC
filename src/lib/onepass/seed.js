import { OnePassDB } from './db';
import { hashPassword } from './auth';

export function seedOnePassDatabase(force = false) {
    const current = OnePassDB.getSnapshot();
    if (!Array.isArray(current.users)) current.users = [];
    if (!Array.isArray(current.events)) current.events = [];
    if (!Array.isArray(current.attendees)) current.attendees = [];
    if (!Array.isArray(current.tracks)) current.tracks = [];
    if (!Array.isArray(current.workshops)) current.workshops = [];
    if (!Array.isArray(current.resources)) current.resources = [];
    if (!Array.isArray(current.resource_claims)) current.resource_claims = [];
    if (!Array.isArray(current.track_access_logs)) current.track_access_logs = [];
    if (!Array.isArray(current.workshop_access_logs)) current.workshop_access_logs = [];
    if (!Array.isArray(current.audit_logs)) current.audit_logs = [];

    const existingAdmin = current.users.find(u => u.id === 'usr_admin_master' || u.email === 'admin@onepass.ddu.ac.in');
    if (!force && existingAdmin) {
        return { message: 'Master admin already initialized', usersCount: current.users.length };
    }

    console.log('[OnePass] Ensuring master admin account exists...');

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

    if (existingAdmin) {
        const idx = current.users.findIndex(u => u.id === 'usr_admin_master' || u.email === 'admin@onepass.ddu.ac.in');
        current.users[idx] = adminUser;
    } else {
        current.users.unshift(adminUser);
    }

    // Preserve ALL existing events, attendees, tracks, workshops, etc. Never wipe them!
    OnePassDB.save(current);
    console.log('[OnePass] Admin account configured: admin@onepass.ddu.ac.in');

    return {
        message: 'Admin account setup complete (admin@onepass.ddu.ac.in).',
        usersCount: current.users.length,
        eventsCount: current.events.length,
        attendeesCount: current.attendees.length
    };
}
