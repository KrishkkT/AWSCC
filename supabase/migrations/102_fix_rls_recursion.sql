-- ============================================
-- FIX: Remove infinite recursion in RLS
-- ============================================

-- 1. Drop ALL existing policies on profiles
drop policy if exists "Profiles are viewable by self" on profiles;
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- 2. Create a SECURITY DEFINER function to check admin role
--    (This bypasses RLS so it won't cause recursion)
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = user_id
    and role in ('faculty', 'captain', 'core')
    and is_active = true
  );
$$ language sql security definer;

-- 3. Recreate policies WITHOUT self-referencing queries
-- Everyone can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using ( auth.uid() = id );

-- Admins can read ALL profiles (uses the safe function)
create policy "Admins can read all profiles"
  on profiles for select
  using ( public.is_admin(auth.uid()) );

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );
