-- ============================================
-- FIX: RLS policies for proper CRUD access
-- Uses the is_admin() function from migration 102
-- ============================================

-- ──────────── EVENTS TABLE ────────────

-- Fix status constraint to support all statuses
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('draft', 'upcoming', 'active', 'completed', 'past'));

-- Add max_participants column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'max_participants'
  ) then
    alter table public.events add column max_participants integer default 50;
  end if;
end $$;

-- Drop old restrictive policies
drop policy if exists "Events are viewable by everyone" on events;
drop policy if exists "Admins can insert events" on events;
drop policy if exists "Admins can update events" on events;
drop policy if exists "Admins can delete events" on events;

-- New policies using is_admin() function
create policy "Events are viewable by everyone"
  on events for select using (true);

create policy "Admins can insert events"
  on events for insert
  with check ( public.is_admin(auth.uid()) );

create policy "Admins can update events"
  on events for update
  using ( public.is_admin(auth.uid()) );

create policy "Admins can delete events"
  on events for delete
  using ( public.is_admin(auth.uid()) );


-- ──────────── PROFILES TABLE ────────────

-- Admins need to update ANY profile (for role changes, activation)
drop policy if exists "Admins can update all profiles" on profiles;
create policy "Admins can update all profiles"
  on profiles for update
  using ( public.is_admin(auth.uid()) );


-- ──────────── CONTACT MESSAGES ────────────

-- Fix admin read policy
drop policy if exists "Admins can view contact messages" on contact_messages;
create policy "Admins can view contact messages"
  on contact_messages for select
  using ( public.is_admin(auth.uid()) );
