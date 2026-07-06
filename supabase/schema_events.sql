-- ============================================================
-- Events Table Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  event_name text not null,
  event_place text not null,
  members_count integer not null default 0,
  organized_by text not null,
  event_date date not null,
  handled_by text not null,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_events_event_date on public.events(event_date);
create index if not exists idx_events_created_by on public.events(created_by);

alter table public.events enable row level security;

-- Super admins can do everything
create policy "Super admins can view all events" on public.events
  for select using ((select role from public.profiles where id = auth.uid()) = ''super_admin'');

create policy "Super admins can insert events" on public.events
  for insert with check ((select role from public.profiles where id = auth.uid()) in (''super_admin'', ''sub_admin''));

create policy "Sub admins can insert own events" on public.events
  for insert with check (created_by = auth.uid());

create policy "Sub admins can view own events" on public.events
  for select using (created_by = auth.uid());

create policy "Super admins can update events" on public.events
  for update using ((select role from public.profiles where id = auth.uid()) = ''super_admin'');

create policy "Super admins can delete events" on public.events
  for delete using ((select role from public.profiles where id = auth.uid()) = ''super_admin'');
