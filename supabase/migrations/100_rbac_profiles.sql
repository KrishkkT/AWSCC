-- ============================================
-- RBAC Profiles Migration (Safe / Idempotent)
-- ============================================

-- 1. Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'member' check (role in ('faculty', 'captain', 'core', 'member')),
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. If table already existed, safely add missing columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active'
  ) then
    alter table public.profiles add column is_active boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles add column role text default 'member' check (role in ('faculty', 'captain', 'core', 'member'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
end $$;

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Policies (idempotent)
drop policy if exists "Profiles are viewable by self" on profiles;
create policy "Profiles are viewable by self"
  on profiles for select
  using ( auth.uid() = id );

drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using ( 
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role in ('faculty', 'captain')
      and is_active = true
    )
  );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 5. Auto-create profile on signup
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
