-- =============================================
-- Migration 115: Fix Gallery Table and Storage RLS
-- =============================================

-- 1. Create Gallery Table if missing
create table if not exists public.gallery (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    event text,
    url text not null,
    created_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.gallery enable row level security;

-- 3. Gallery Table Policies
drop policy if exists "Gallery is viewable by everyone" on public.gallery;
create policy "Gallery is viewable by everyone" 
on public.gallery for select 
using (true);

drop policy if exists "Admins can manage gallery" on public.gallery;
create policy "Admins can manage gallery" 
on public.gallery for all 
using (public.is_admin(auth.uid()));

-- 4. Create Missing Storage Buckets
insert into storage.buckets (id, name, public)
values 
    ('gallery', 'gallery', true),
    ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- 5. Storage RLS Policies (Fixing Hardcoded 'avatars' constraint)

-- Allow public read access to appropriate buckets
drop policy if exists "Public storage access" on storage.objects;
create policy "Public storage access"
on storage.objects for select
using (bucket_id in ('avatars', 'gallery', 'event-images'));

-- Allow admins full access to appropriate buckets
drop policy if exists "Admins can manage storage" on storage.objects;
create policy "Admins can manage storage"
on storage.objects for all
using (
    bucket_id in ('avatars', 'gallery', 'event-images') 
    and public.is_admin(auth.uid())
);

-- Grant permissions for storage
grant all on storage.objects to authenticated;
grant all on storage.buckets to authenticated;

-- Force Schema Refresh
notify pgrst, 'reload schema';
