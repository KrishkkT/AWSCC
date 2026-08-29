-- ============================================================
-- ONEPASS: PRODUCTION POSTGRESQL & SUPABASE MIGRATION SCHEMA
-- Run this script in your Supabase SQL Editor or PostgreSQL Console
-- ============================================================

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS onepass_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'VOLUNTEER', -- 'ADMIN' | 'VOLUNTEER'
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'DISABLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENTS
CREATE TABLE IF NOT EXISTS onepass_events (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '18:00',
    venue VARCHAR(255) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
    logo TEXT,
    banner TEXT,
    settings JSONB DEFAULT '{"require_track_selection": true, "allow_workshop_selection": true, "allow_reentry": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EVENT VOLUNTEERS & PERMISSION ASSIGNMENTS
CREATE TABLE IF NOT EXISTS onepass_event_volunteers (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES onepass_users(id) ON DELETE CASCADE,
    permissions TEXT[] NOT NULL DEFAULT ARRAY['CHECK_IN']::TEXT[], -- CHECK_IN, TRACK_ACCESS, WORKSHOP_ACCESS, FOOD, SWAG, VIEW_DASHBOARD
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 4. TRACKS
CREATE TABLE IF NOT EXISTS onepass_tracks (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INT NOT NULL DEFAULT 100 CHECK (capacity >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'INACTIVE'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WORKSHOPS
CREATE TABLE IF NOT EXISTS onepass_workshops (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    speaker VARCHAR(255),
    location VARCHAR(255),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 50 CHECK (capacity >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RESOURCES (FOOD / SWAG / OTHER CLAIMS)
CREATE TABLE IF NOT EXISTS onepass_resources (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'FOOD', -- 'FOOD' | 'SWAG' | 'OTHER'
    description TEXT,
    capacity INT CHECK (capacity IS NULL OR capacity >= 0),
    claim_limit INT NOT NULL DEFAULT 1 CHECK (claim_limit > 0),
    start_time TIME,
    end_time TIME,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ATTENDEES
CREATE TABLE IF NOT EXISTS onepass_attendees (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    ticket_type VARCHAR(128) NOT NULL DEFAULT 'Attendee',
    booking_id VARCHAR(128) NOT NULL,
    registration_id VARCHAR(128),
    qr_identifier VARCHAR(128) NOT NULL,
    qr_token VARCHAR(255) NOT NULL,
    check_in_status VARCHAR(32) NOT NULL DEFAULT 'NOT_CHECKED_IN', -- 'NOT_CHECKED_IN' | 'CHECKED_IN'
    check_in_time TIMESTAMPTZ,
    assigned_track_id VARCHAR(64) REFERENCES onepass_tracks(id) ON DELETE SET NULL,
    assigned_workshop_id VARCHAR(64) REFERENCES onepass_workshops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, qr_identifier),
    UNIQUE(event_id, booking_id),
    UNIQUE(event_id, email)
);

-- 8. RESOURCE CLAIMS (FOOD / SWAG)
CREATE TABLE IF NOT EXISTS onepass_resource_claims (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    resource_id VARCHAR(64) NOT NULL REFERENCES onepass_resources(id) ON DELETE CASCADE,
    attendee_id VARCHAR(64) NOT NULL REFERENCES onepass_attendees(id) ON DELETE CASCADE,
    volunteer_id VARCHAR(64) REFERENCES onepass_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'CLAIMED',
    UNIQUE(resource_id, attendee_id)
);

-- 9. ACCESS LOGS
CREATE TABLE IF NOT EXISTS onepass_track_access_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    attendee_id VARCHAR(64) NOT NULL REFERENCES onepass_attendees(id) ON DELETE CASCADE,
    track_id VARCHAR(64) NOT NULL REFERENCES onepass_tracks(id) ON DELETE CASCADE,
    volunteer_id VARCHAR(64) REFERENCES onepass_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result VARCHAR(32) NOT NULL, -- 'GRANTED' | 'DENIED'
    reason TEXT
);

CREATE TABLE IF NOT EXISTS onepass_workshop_access_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    attendee_id VARCHAR(64) NOT NULL REFERENCES onepass_attendees(id) ON DELETE CASCADE,
    workshop_id VARCHAR(64) NOT NULL REFERENCES onepass_workshops(id) ON DELETE CASCADE,
    volunteer_id VARCHAR(64) REFERENCES onepass_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result VARCHAR(32) NOT NULL,
    reason TEXT
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS onepass_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES onepass_events(id) ON DELETE CASCADE,
    actor_id VARCHAR(64),
    actor_name VARCHAR(255),
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result VARCHAR(32) NOT NULL DEFAULT 'SUCCESS'
);

-- 11. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_onepass_attendees_qr ON onepass_attendees(event_id, qr_identifier);
CREATE INDEX IF NOT EXISTS idx_onepass_attendees_email ON onepass_attendees(event_id, email);
CREATE INDEX IF NOT EXISTS idx_onepass_attendees_booking ON onepass_attendees(event_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_onepass_attendees_checkin ON onepass_attendees(event_id, check_in_status);
CREATE INDEX IF NOT EXISTS idx_onepass_claims_resource ON onepass_resource_claims(event_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_onepass_audit_timestamp ON onepass_audit_logs(event_id, timestamp DESC);

-- 12. INITIAL ADMINISTRATOR (Email: admin@onepass.ddu.ac.in / Password: Aws@2025#Scd)
INSERT INTO onepass_users (id, name, email, password_hash, role, status)
VALUES (
    'usr_admin_master',
    'Administrator',
    'admin@onepass.ddu.ac.in',
    '9f4c3a2b1d8e7f605a4b3c2d1e0f9a8b:f6c3d4a273fcfe578f26cb6625e22051e67110b97f161afd0f0db1543cef38f4c45b7e300d86b4fa0709c2183fc92865033cd62e943f019f149a975f267edddd',
    'ADMIN',
    'ACTIVE'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    status = 'ACTIVE';
