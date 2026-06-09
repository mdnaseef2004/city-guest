-- ============================================================
-- SQL Schema for PWA Background Push Notifications
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Create the push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  constraint unique_user_endpoint unique(user_id, endpoint)
);

-- Enable Row Level Security (RLS)
alter table public.push_subscriptions enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.push_subscriptions;

-- Policies for push_subscriptions:
-- Users can manage their own subscriptions
create policy "Users can view own subscriptions" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "Users can insert own subscriptions" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "Users can delete own subscriptions" on public.push_subscriptions
  for delete using (user_id = auth.uid());
