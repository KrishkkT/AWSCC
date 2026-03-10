-- =============================================
-- FORCE: PostgREST Schema Cache Refresh
-- =============================================

-- Method 1: Use the built-in notify command if supported
NOTIFY pgrst, 'reload schema';

-- Method 2: Perform a "no-op" DDL change to trigger a reload
-- PostgREST usually reloads when it detects DDL changes.
create table if not exists public.temp_schema_refresh_trigger ();
drop table public.temp_schema_refresh_trigger;

-- Method 3: Grant permissions again (sometimes helps reset internal state)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
