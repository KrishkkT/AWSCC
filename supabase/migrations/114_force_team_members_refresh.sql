-- =============================================
-- RESILIENT TEAM_MEMBERS CREATION & REFRESH
-- =============================================

-- 1. Ensure table exists (Repeated from 109 for safety)
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  role_title text not null,
  category text not null,
  avatar_url text,
  github_url text,
  linkedin_url text,
  instagram_url text, -- Use the updated column name
  display_order int default 0,
  created_at timestamp with time zone default now()
);

-- 2. Rename trick to force PostgREST to invalidate cache
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
        ALTER TABLE public.team_members RENAME TO team_members_refreshing;
        ALTER TABLE public.team_members_refreshing RENAME TO team_members;
    END IF;
END $$;

-- 3. Resilient Grants (Wait until table definitely exists)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.team_members TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Enable RLS and Policies (Repeated from 109 for safety)
alter table public.team_members enable row level security;

drop policy if exists "Team members are viewable by everyone" on team_members;
create policy "Team members are viewable by everyone" on team_members for select using (true);

drop policy if exists "Admins can manage team" on team_members;
create policy "Admins can manage team" on team_members for all 
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));

-- 5. Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- 6. Temporary table creation/deletion to trigger DDL detection
CREATE TABLE IF NOT EXISTS public.schema_refresh_trigger_team_v2 ();
DROP TABLE public.schema_refresh_trigger_team_v2;
