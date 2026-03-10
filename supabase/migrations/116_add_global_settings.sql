-- =============================================
-- Migration 116: Add Global Settings Table
-- For Maintenance Mode and Platform Parameters
-- =============================================

-- Create the table
create table if not exists public.global_settings (
    id text primary key default '1',
    maintenance_mode boolean default false,
    announcement_banner text,
    join_link text,
    instagram_url text,
    linkedin_url text,
    updated_at timestamp with time zone default now()
);

-- Insert initial row if not exists
insert into public.global_settings (id, maintenance_mode)
values ('1', false)
on conflict (id) do nothing;

-- Enable RLS
alter table public.global_settings enable row level security;

-- Policies
drop policy if exists "Global settings are viewable by everyone" on public.global_settings;
create policy "Global settings are viewable by everyone" 
on public.global_settings for select using (true);

drop policy if exists "Admins can manage global settings" on public.global_settings;
create policy "Admins can manage global settings" 
on public.global_settings for all using (
    exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('faculty', 'captain', 'core', 'admin')
        and is_active = true
    )
);

-- Note: This is required for the maintenance mode toggling in Settings page.
