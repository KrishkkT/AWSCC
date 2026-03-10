-- ============================================
-- 104 Admin Enhancements Migration
-- ============================================

-- 1. Create Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  action text not null,
  details text,
  level text check (level in ('info', 'success', 'warning', 'error')) default 'info',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Certificates Table
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  recipient_name text not null,
  recipient_email text not null,
  event_name text not null,
  issue_date timestamp with time zone default timezone('utc'::text, now()) not null,
  certificate_url text, -- For storing the generated PDF link
  status text check (status in ('pending', 'verified', 'cancelled')) default 'pending',
  issuer_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Update Events status constraint (if not already handled)
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('draft', 'upcoming', 'active', 'completed', 'past'));

-- 4. Enable RLS
alter table public.audit_logs enable row level security;
alter table public.certificates enable row level security;

-- 5. Policies for Audit Logs
drop policy if exists "Admins can view all audit logs" on audit_logs;
create policy "Admins can view all audit logs"
  on audit_logs for select
  using ( public.is_admin(auth.uid()) );

drop policy if exists "System can insert audit logs" on audit_logs;
create policy "System can insert audit logs"
  on audit_logs for insert
  with check ( true ); -- Allow system-level inserts (security definer functions or service role)

-- 6. Policies for Certificates
drop policy if exists "Certificates are viewable by everyone" on certificates;
create policy "Certificates are viewable by everyone"
  on certificates for select
  using ( true );

drop policy if exists "Admins can manage certificates" on certificates;
create policy "Admins can manage certificates"
  on certificates for all
  using ( public.is_admin(auth.uid()) );

-- 7. Add Audit Logging Function
create or replace function public.log_action(
  p_action text,
  p_details text,
  p_level text default 'info'
)
returns void as $$
begin
  insert into public.audit_logs (user_id, full_name, action, details, level)
  select 
    auth.uid(),
    p.full_name,
    p_action,
    p_details,
    p_level
  from public.profiles p
  where p.id = auth.uid();
end;
$$ language plpgsql security definer;
