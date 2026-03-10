-- ==========================================
-- 1. PROFILES & AUTH (Must be run first)
-- ==========================================

-- Create Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'core', 'faculty', 'admin')),
  updated_at timestamp with time zone,
  
  primary key (id)
);

alter table public.profiles enable row level security;

-- Profiles Policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Auth Trigger for New Users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Drop trigger if exists to avoid duplication error on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- 2. EVENTS SYSTEM
-- ==========================================

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date timestamp with time zone not null,
  location text,
  image_url text,
  registration_link text,
  status text check (status in ('upcoming', 'past', 'draft')) default 'draft',
  created_at timestamp with time zone default now()
);

alter table public.events enable row level security;

-- Events Policies
drop policy if exists "Events are viewable by everyone" on events;
create policy "Events are viewable by everyone" 
  on events for select 
  using ( status != 'draft' or auth.role() = 'service_role' );

drop policy if exists "Admins can insert events" on events;
create policy "Admins can insert events" 
  on events for insert 
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

drop policy if exists "Admins can update events" on events;
create policy "Admins can update events" 
  on events for update 
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

drop policy if exists "Admins can delete events" on events;
create policy "Admins can delete events" 
  on events for delete 
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );


-- ==========================================
-- 3. CONTACT MESSAGES
-- ==========================================

create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text check (status in ('new', 'read', 'replied')) default 'new',
  created_at timestamp with time zone default now()
);

alter table public.contact_messages enable row level security;

-- Contact Policies
drop policy if exists "Anyone can insert contact messages" on contact_messages;
create policy "Anyone can insert contact messages" 
  on contact_messages for insert 
  with check ( true );

drop policy if exists "Admins can view contact messages" on contact_messages;
create policy "Admins can view contact messages" 
  on contact_messages for select 
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );


-- ==========================================
-- 4. SEED DATA
-- ==========================================

-- Seed Events (Only if table is empty)
insert into public.events (title, description, date, location, status, image_url)
select 'Cloud 101 Workshop', 'Introduction to AWS services and cloud computing basics.', now() + interval '7 days', 'Auditorium A', 'upcoming', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1000'
where not exists (select 1 from public.events);

insert into public.events (title, description, date, location, status, image_url)
select 'Serverless Hackathon', 'Build amazing apps using AWS Lambda and DynamoDB.', now() + interval '30 days', 'Lab Complex', 'upcoming', 'https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&q=80&w=1000'
where not exists (select 1 from public.events);

insert into public.events (title, description, date, location, status, image_url)
select 'Tech Talk: AI on Cloud', 'Guest lecture on deploying LLMs on AWS SageMaker.', now() - interval '5 days', 'Seminar Hall', 'past', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1000'
where not exists (select 1 from public.events);
