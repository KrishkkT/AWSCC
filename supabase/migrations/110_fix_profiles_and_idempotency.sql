-- =============================================
-- FIX PROFILES & IDEMPOTENT POLICIES (v2)
-- =============================================

-- 1. Add created_at to profiles if it doesn't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name='profiles' and table_schema='public' and column_name='created_at') then
        alter table public.profiles add column created_at timestamp with time zone default now();
    end if;
end $$;

-- 2. Safe Policy Management for Dynamic Content
-- We check for table existence before attempting to drop/create policies

do $$ 
begin
    -- Resources
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'resources') then
        drop policy if exists "Resources are viewable by everyone" on public.resources;
        create policy "Resources are viewable by everyone" on public.resources for select using (is_active = true);
        
        drop policy if exists "Admins can manage resources" on public.resources;
        create policy "Admins can manage resources" on public.resources for all 
          using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));
    end if;

    -- Articles
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'knowledge_articles') then
        drop policy if exists "Articles are viewable by everyone" on public.knowledge_articles;
        create policy "Articles are viewable by everyone" on public.knowledge_articles for select using (is_published = true);
        
        drop policy if exists "Admins/Core can manage articles" on public.knowledge_articles;
        create policy "Admins/Core can manage articles" on public.knowledge_articles for all 
          using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty', 'core')));
    end if;

    -- Topics
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'community_topics') then
        drop policy if exists "Topics are viewable by everyone" on public.community_topics;
        create policy "Topics are viewable by everyone" on public.community_topics for select using (true);
        
        drop policy if exists "Admins/Core can manage topics" on public.community_topics;
        create policy "Admins/Core can manage topics" on public.community_topics for all 
          using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty', 'core')));
    end if;

    -- Team
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'team_members') then
        drop policy if exists "Team members are viewable by everyone" on public.team_members;
        create policy "Team members are viewable by everyone" on public.team_members for select using (true);
        
        drop policy if exists "Admins can manage team" on public.team_members;
        create policy "Admins can manage team" on public.team_members for all 
          using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));
    end if;
end $$;

-- 3. Create Storage Bucket for Avatars (Safe)
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

-- Storage Policies for Avatars (Safe)
do $$ 
begin
    drop policy if exists "Avatar images are publicly accessible" on storage.objects;
    create policy "Avatar images are publicly accessible"
    on storage.objects for select
    using ( bucket_id = 'avatars' );

    drop policy if exists "Admins can upload avatars" on storage.objects;
    create policy "Admins can upload avatars"
    on storage.objects for insert
    with check ( 
        bucket_id = 'avatars' AND 
        exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty'))
    );

    drop policy if exists "Admins can update avatars" on storage.objects;
    create policy "Admins can update avatars"
    on storage.objects for update
    using ( 
        bucket_id = 'avatars' AND 
        exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty'))
    );

    drop policy if exists "Admins can delete avatars" on storage.objects;
    create policy "Admins can delete avatars"
    on storage.objects for delete
    using ( 
        bucket_id = 'avatars' AND 
        exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty'))
    );
end $$;
