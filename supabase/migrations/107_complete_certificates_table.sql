-- =============================================
-- FIX: Complete Certificates Table Schema
-- =============================================

-- 1. Create certificates table if it doesn't exist
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  recipient_name text not null,
  recipient_email text not null,
  event_id uuid references public.events(id) on delete set null,
  event_name text,
  certificate_type text default 'participation',
  status text default 'verified',
  created_at timestamp with time zone default now()
);

-- 2. Safely add missing columns if table existed
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'certificates' and column_name = 'event_id') then
    alter table public.certificates add column event_id uuid references public.events(id) on delete set null;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'certificates' and column_name = 'event_name') then
    alter table public.certificates add column event_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'certificates' and column_name = 'certificate_type') then
    alter table public.certificates add column certificate_type text default 'participation';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'certificates' and column_name = 'status') then
    alter table public.certificates add column status text default 'verified';
  end if;
end $$;

-- 3. Enable RLS
alter table public.certificates enable row level security;

-- 4. Policies
drop policy if exists "Certificates are viewable by everyone" on certificates;
create policy "Certificates are viewable by everyone" 
  on certificates for select 
  using ( true );

drop policy if exists "Admins can manage certificates" on certificates;
create policy "Admins can manage certificates" 
  on certificates for all 
  using ( 
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('faculty', 'captain', 'admin') 
      and is_active = true
    )
  );

-- 5. Refresh schema cache (implicit on migration)
