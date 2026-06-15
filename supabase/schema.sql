-- ============================================================
-- Guest Relation Management System — Supabase Schema
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Drop existing tables (safe re-run) ──────────────────────
drop table if exists public.visited_places cascade;
drop table if exists public.guest_visits cascade;
drop table if exists public.guests cascade;
drop table if exists public.profiles cascade;

-- ─── Profiles (extends auth.users) ───────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('super_admin', 'sub_admin')) default 'sub_admin',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── Guest Visits ─────────────────────────────────────────────
create table public.guest_visits (
  id uuid default uuid_generate_v4() primary key,
  guest_name text not null,
  phone_number text not null,
  place text not null,
  district text not null,
  picked_from text,
  guest_returned boolean default false,
  return_time text,
  handled_by text,
  remarks text,
  pdf_url text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

-- ─── Visited Places (child of guest_visits) ───────────────────
create table public.visited_places (
  id uuid default uuid_generate_v4() primary key,
  guest_visit_id uuid references public.guest_visits(id) on delete cascade not null,
  visited_place text not null,
  time_in text,
  time_out text,
  sort_order integer default 0
);

-- ─── Indexes ──────────────────────────────────────────────────
create index idx_guest_visits_created_by on public.guest_visits(created_by);
create index idx_guest_visits_created_at on public.guest_visits(created_at);
create index idx_guest_visits_guest_name on public.guest_visits(guest_name);
create index idx_guest_visits_place on public.guest_visits(place);
create index idx_guest_visits_phone on public.guest_visits(phone_number);
create index idx_visited_places_visit_id on public.visited_places(guest_visit_id);

-- ─── Enable Row Level Security ────────────────────────────────
alter table public.profiles enable row level security;
alter table public.guest_visits enable row level security;
alter table public.visited_places enable row level security;

-- ─── Profiles RLS ─────────────────────────────────────────────
create policy "Super admins can view all profiles" on public.profiles
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Users can view own profile" on public.profiles
  for select using (id = auth.uid());

create policy "Super admins can insert profiles" on public.profiles
  for insert with check (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Super admins can update profiles" on public.profiles
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Super admins can delete profiles" on public.profiles
  for delete using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

-- ─── Guest Visits RLS ────────────────────────────────────────
create policy "Super admins can view all guest visits" on public.guest_visits
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Sub admins can view own guest visits" on public.guest_visits
  for select using (created_by = auth.uid());

create policy "Authenticated users can insert guest visits" on public.guest_visits
  for insert with check (created_by = auth.uid());

create policy "Super admins can update all guest visits" on public.guest_visits
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Sub admins can update own guest visits" on public.guest_visits
  for update using (created_by = auth.uid());

create policy "Super admins can delete all guest visits" on public.guest_visits
  for delete using (
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );

create policy "Sub admins can delete own guest visits" on public.guest_visits
  for delete using (created_by = auth.uid());

-- ─── Visited Places RLS ───────────────────────────────────────
create policy "Users can view visited places for accessible visits" on public.visited_places
  for select using (
    exists (
      select 1 from public.guest_visits gv
      where gv.id = guest_visit_id
      and (
        gv.created_by = auth.uid()
        or (select role from public.profiles where id = auth.uid()) = 'super_admin'
      )
    )
  );

create policy "Users can insert visited places for own visits" on public.visited_places
  for insert with check (
    exists (
      select 1 from public.guest_visits gv
      where gv.id = guest_visit_id and gv.created_by = auth.uid()
    )
  );

create policy "Users can update visited places for accessible visits" on public.visited_places
  for update using (
    exists (
      select 1 from public.guest_visits gv
      where gv.id = guest_visit_id
      and (
        gv.created_by = auth.uid()
        or (select role from public.profiles where id = auth.uid()) = 'super_admin'
      )
    )
  );

create policy "Users can delete visited places for accessible visits" on public.visited_places
  for delete using (
    exists (
      select 1 from public.guest_visits gv
      where gv.id = guest_visit_id
      and (
        gv.created_by = auth.uid()
        or (select role from public.profiles where id = auth.uid()) = 'super_admin'
      )
    )
  );

-- ─── Storage: guest-pdfs bucket policies ─────────────────────
-- NOTE: Create the bucket manually in Supabase Storage UI:
--   Storage > New bucket > Name: "guest-pdfs" > Public: true
-- Then run these policies:

insert into storage.buckets (id, name, public)
values ('guest-pdfs', 'guest-pdfs', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload PDFs" on storage.objects
  for insert with check (
    bucket_id = 'guest-pdfs' and auth.role() = 'authenticated'
  );

create policy "Anyone can view PDFs" on storage.objects
  for select using (bucket_id = 'guest-pdfs');

create policy "Users can delete own PDFs" on storage.objects
  for delete using (
    bucket_id = 'guest-pdfs' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Trigger: auto-create profile on signup ───────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'sub_admin')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Dashboard Stats Function ─────────────────────────────────
create or replace function public.get_dashboard_stats()
returns json as $$
declare
  v_role text;
  v_uid uuid;
  v_total_guests integer;
  v_today_guests integer;
  v_total_visits integer;
  v_total_sub_admins integer;
begin
  v_uid := auth.uid();
  select role into v_role from public.profiles where id = v_uid;

  if v_role = 'super_admin' then
    select count(*) into v_total_guests from public.guest_visits;
    select count(*) into v_today_guests from public.guest_visits where created_at::date = current_date;
    select count(*) into v_total_visits from public.visited_places;
    select count(*) into v_total_sub_admins from public.profiles where role = 'sub_admin';
  else
    select count(*) into v_total_guests from public.guest_visits where created_by = v_uid;
    select count(*) into v_today_guests from public.guest_visits where created_by = v_uid and created_at::date = current_date;
    select count(*) into v_total_visits from public.visited_places vp
      join public.guest_visits gv on gv.id = vp.guest_visit_id
      where gv.created_by = v_uid;
    v_total_sub_admins := 0;
  end if;

  return json_build_object(
    'total_guests', v_total_guests,
    'today_guests', v_today_guests,
    'total_visits', v_total_visits,
    'total_sub_admins', v_total_sub_admins
  );
end;
$$ language plpgsql security definer;
