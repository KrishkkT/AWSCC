-- =============================================
-- FIX: Member Management RLS & Constraints
-- =============================================

-- 1. Relax ID constraint to allow adding members who haven't signed up yet
-- First, find the constraint name (usually profiles_id_fkey)
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Re-add it as a nullable reference or just keep it as a UUID PK without strict FK 
-- for flexibility in manual member management. 
-- For now, we'll just keep it as a UUID PK.

-- 2. Add INSERT policy for admins
drop policy if exists "Admins can insert profiles" on profiles;
create policy "Admins can insert profiles"
  on profiles for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role in ('faculty', 'captain')
      and is_active = true
    )
  );

-- 3. Add UPDATE policy for admins (to update ANY profile)
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role in ('faculty', 'captain')
      and is_active = true
    )
  );

-- 4. Add DELETE policy for admins
drop policy if exists "Admins can delete profiles" on profiles;
create policy "Admins can delete profiles"
  on profiles for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role in ('faculty', 'captain')
      and is_active = true
    )
  );

-- 5. Build a unique index on email to prevent duplicates since we might not have ID yet
create unique index if not exists profiles_email_idx on public.profiles (email);
