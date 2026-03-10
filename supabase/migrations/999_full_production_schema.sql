-- ============================================================================
-- AWSCC MASTER PRODUCTION SCHEMA
-- Consolidating Migrations: 99 to 114
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS & FUNCTIONS
-- ============================================================================

-- Function to check if a user is an admin/captain/faculty without causing recursion
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = user_id
    and role in ('faculty', 'captain', 'core', 'admin')
    and is_active = true
  );
$$ language sql security definer;

-- Trigger logic for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'member',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- A. PROFILES (RBAC)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role text default 'member' check (role in ('faculty', 'captain', 'core', 'member', 'admin')),
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- B. EVENTS
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date timestamp with time zone,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  location text,
  image_url text,
  registration_link text,
  status text check (status in ('draft', 'upcoming', 'active', 'completed', 'past')) default 'draft',
  is_visible boolean default true,
  max_participants integer default 50,
  created_at timestamp with time zone default now()
);

-- C. EVENT REGISTRATIONS
create table if not exists public.event_registrations (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade,
    full_name text not null,
    email text not null,
    created_at timestamp with time zone default now(),
    certificate_issued boolean default false
);

-- D. CERTIFICATES
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  recipient_name text not null,
  recipient_email text not null,
  event_id uuid references public.events(id) on delete set null,
  event_name text,
  issue_date timestamp with time zone default now(),
  certificate_url text,
  certificate_type text check (certificate_type in ('participation', 'achievement', 'excellence', 'winner')) default 'participation',
  status text check (status in ('pending', 'verified', 'cancelled')) default 'verified',
  issuer_id uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- E. CONTACT MESSAGES
create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text check (status in ('new', 'read', 'replied')) default 'new',
  created_at timestamp with time zone default now()
);

-- F. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  action text not null,
  details text,
  level text check (level in ('info', 'success', 'warning', 'error')) default 'info',
  timestamp timestamp with time zone default now()
);

-- ============================================================================
-- 3. CONTENT TABLES
-- ============================================================================

create table if not exists public.resources (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null,
  url text not null,
  type text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.knowledge_articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  excerpt text,
  category text not null,
  author_id uuid references public.profiles(id) on delete set null,
  image_url text,
  is_published boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.community_topics (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text not null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  role_title text not null,
  category text not null,
  avatar_url text,
  github_url text,
  linkedin_url text,
  instagram_url text,
  display_order int default 0,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

create table if not exists public.gallery (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  event text,
  url text not null,
  created_at timestamp with time zone default now()
);

-- H. GLOBAL SETTINGS
create table if not exists public.global_settings (
  id text primary key default '1',
  maintenance_mode boolean default false,
  announcement_banner text,
  join_link text,
  instagram_url text,
  linkedin_url text,
  updated_at timestamp with time zone default now()
);

-- Insert default settings if not exists
insert into public.global_settings (id, maintenance_mode)
values ('1', false)
on conflict (id) do nothing;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.certificates enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.resources enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.community_topics enable row level security;
alter table public.team_members enable row level security;
alter table public.gallery enable row level security;
alter table public.global_settings enable row level security;

-- ... (skipping to policies)

-- PROFILES POLICIES
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Admins can read all profiles" on profiles;
create policy "Admins can read all profiles" on profiles for select using (public.is_admin(auth.uid()));
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Admins can manage profiles" on profiles;
create policy "Admins can manage profiles" on profiles for all using (public.is_admin(auth.uid()));

-- EVENTS POLICIES
drop policy if exists "Events are viewable by everyone" on events;
create policy "Events are viewable by everyone" on events for select using (status != 'draft' or public.is_admin(auth.uid()));
drop policy if exists "Admins can manage events" on events;
create policy "Admins can manage events" on events for all using (public.is_admin(auth.uid()));

-- REGISTRATIONS POLICIES
drop policy if exists "Public can register" on event_registrations;
create policy "Public can register" on event_registrations for insert with check (true);
drop policy if exists "Admins can manage registrations" on event_registrations;
create policy "Admins can manage registrations" on event_registrations for all using (public.is_admin(auth.uid()));

-- CERTIFICATES POLICIES
drop policy if exists "Certificates viewable by everyone" on certificates;
create policy "Certificates viewable by everyone" on certificates for select using (true);
drop policy if exists "Admins can manage certificates" on certificates;
create policy "Admins can manage certificates" on certificates for all using (public.is_admin(auth.uid()));

-- AUDIT LOGS POLICIES
drop policy if exists "Admins can view logs" on audit_logs;
create policy "Admins can view logs" on audit_logs for select using (public.is_admin(auth.uid()));
drop policy if exists "System can log" on audit_logs;
create policy "System can log" on audit_logs for insert with check (true);

-- DYNAMIC CONTENT POLICIES
drop policy if exists "Content viewable by everyone" on resources;
create policy "Content viewable by everyone" on resources for select using (is_active = true);
drop policy if exists "Articles viewable by everyone" on knowledge_articles;
create policy "Articles viewable by everyone" on knowledge_articles for select using (is_published = true);
drop policy if exists "Team viewable by everyone" on team_members;
create policy "Team viewable by everyone" on team_members for select using (true);
drop policy if exists "Gallery is viewable by everyone" on gallery;
create policy "Gallery is viewable by everyone" on gallery for select using (true);

drop policy if exists "Admins can manage content" on resources;
create policy "Admins can manage content" on resources for all using (public.is_admin(auth.uid()));
drop policy if exists "Admins can manage articles" on knowledge_articles;
create policy "Admins can manage articles" on knowledge_articles for all using (public.is_admin(auth.uid()));
drop policy if exists "Admins can manage team" on team_members;
create policy "Admins can manage team" on team_members for all using (public.is_admin(auth.uid()));
drop policy if exists "Admins can manage gallery" on gallery;
create policy "Admins can manage gallery" on gallery for all using (public.is_admin(auth.uid()));

-- GLOBAL SETTINGS POLICIES
drop policy if exists "Global settings are viewable by everyone" on global_settings;
create policy "Global settings are viewable by everyone" on global_settings for select using (true);
drop policy if exists "Admins can manage global settings" on global_settings;
create policy "Admins can manage global settings" on global_settings for all using (public.is_admin(auth.uid()));

-- ============================================================================
-- 5. STORAGE & AUTOMATION
-- ============================================================================

-- Storage Buckets
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

insert into storage.buckets (id, name, public)
select 'gallery', 'gallery', true
where not exists (select 1 from storage.buckets where id = 'gallery');

insert into storage.buckets (id, name, public)
select 'event-images', 'event-images', true
where not exists (select 1 from storage.buckets where id = 'event-images');

-- Storage Policies
drop policy if exists "Public storage access" on storage.objects;
create policy "Public storage access" on storage.objects for select 
  using (bucket_id in ('avatars', 'gallery', 'event-images'));

drop policy if exists "Admins can manage storage" on storage.objects;
create policy "Admins can manage storage" on storage.objects for all 
  using (bucket_id in ('avatars', 'gallery', 'event-images') and public.is_admin(auth.uid()));

-- Auth Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Audit Logging Helper
create or replace function public.log_action(p_action text, p_details text, p_level text default 'info')
returns void as $$
begin
  insert into public.audit_logs (user_id, full_name, action, details, level)
  select auth.uid(), p.full_name, p_action, p_details, p_level
  from public.profiles p where p.id = auth.uid();
end;
$$ language plpgsql security definer;


-- ============================================================================
-- 6. PERMISSIONS & CACHE REFRESH
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Force Schema Refresh
notify pgrst, 'reload schema';

-- ============================================================================
-- 7. SEED DATA
-- ============================================================================

insert into public.events (title, description, start_time, location, status, image_url)
select 'Cloud 101 Workshop', 'Introduction to AWS services and cloud computing basics.', now() + interval '7 days', 'Auditorium A', 'upcoming', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1000'
where not exists (select 1 from public.events);

insert into public.resources (title, description, category, url, type)
select 'AWS Documentation', 'Official AWS docs.', 'Cloud', 'https://docs.aws.amazon.com/', 'Tool'
where not exists (select 1 from public.resources);

-- PROMOTE INITIAL ADMIN
update public.profiles set role = 'captain', is_active = true where email = 'krishthakker508@gmail.com';
