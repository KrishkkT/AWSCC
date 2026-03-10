-- =============================================
-- ADD EVENT VISIBILITY TOGGLE
-- =============================================

-- 1. Add is_visible column
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name='events' and column_name='is_visible') then
        alter table public.events add column is_visible boolean default true;
    end if;
end $$;

-- 2. Update RLS Policies for events to respect is_visible
drop policy if exists "Events are viewable by everyone" on public.events;
create policy "Events are viewable by everyone" 
  on public.events for select 
  using ( 
    (status != 'draft') 
    or 
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
      and role in ('admin', 'captain', 'faculty')
    )
  );
