-- =============================================
-- AUTOMATED CERTIFICATE ISSUANCE & REGISTRATIONS
-- =============================================

-- 1. Enhance events table with start/end times and fix date constraint
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name='events' and column_name='start_time') then
        alter table public.events add column start_time timestamp with time zone;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='events' and column_name='end_time') then
        alter table public.events add column end_time timestamp with time zone;
    end if;
    
    -- Migrate existing date to start_time if start_time is null
    update public.events set start_time = date where start_time is null;
    
    -- Make date nullable
    alter table public.events alter column date drop not null;
end $$;

-- 2. Create event_registrations table
create table if not exists public.event_registrations (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade,
    full_name text not null,
    email text not null,
    created_at timestamp with time zone default now(),
    certificate_issued boolean default false
);

-- 3. RLS Policies for registrations
alter table public.event_registrations enable row level security;

-- Admins can do everything
drop policy if exists "Admins can manage registrations" on public.event_registrations;
create policy "Admins can manage registrations" on public.event_registrations
    for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));

-- Public can register
drop policy if exists "Public can register for events" on public.event_registrations;
create policy "Public can register for events" on public.event_registrations
    for insert with check (true);

-- Users can view their own registrations by email (optional, for simple verification)
drop policy if exists "Users can view their own registrations" on public.event_registrations;
create policy "Users can view their own registrations" on public.event_registrations
    for select using (true); -- Keeping it simple for public view for now, or restrict by email if needed

-- 4. Improve indexes
create index if not exists idx_event_registrations_event_id on public.event_registrations(event_id);
create index if not exists idx_event_registrations_email on public.event_registrations(email);
