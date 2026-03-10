-- ============================================
-- FIX: Patch existing profiles table
-- ============================================

-- 1. Drop the old check constraint that's blocking updates
alter table public.profiles drop constraint if exists profiles_role_check;

-- 2. Add missing columns safely
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
    alter table public.profiles add column role text default 'member';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamp with time zone default now();
  end if;
end $$;

-- 3. Add the correct check constraint back
alter table public.profiles add constraint profiles_role_check
  check (role in ('faculty', 'captain', 'core', 'member'));

-- 4. Enable RLS
alter table public.profiles enable row level security;

-- 5. Policies
drop policy if exists "Profiles are viewable by self" on profiles;
create policy "Profiles are viewable by self"
  on profiles for select using ( auth.uid() = id );

drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select using (
    exists (
      select 1 from profiles where id = auth.uid()
      and role in ('faculty', 'captain') and is_active = true
    )
  );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using ( auth.uid() = id );

-- 6. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'member', false
  ) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 7. PROMOTE YOURSELF — Update your email below!
-- ============================================
update public.profiles
  set role = 'captain', is_active = true
  where email = 'krishthakker508@gmail.com';
