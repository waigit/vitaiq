-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Creates the table that will actually persist affiliate links across deploys.

create table if not exists vitaiq_affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commission text,
  url text not null unique,
  icon text,
  color text,
  created_at timestamptz default now()
);

alter table vitaiq_affiliates enable row level security;

-- Matches the same open-access pattern already used by vitaiq_users /
-- vitaiq_uploads in this project (no login system, anon key does everything).
create policy "public read affiliates" on vitaiq_affiliates
  for select using (true);

create policy "public insert affiliates" on vitaiq_affiliates
  for insert with check (true);

create policy "public delete affiliates" on vitaiq_affiliates
  for delete using (true);
