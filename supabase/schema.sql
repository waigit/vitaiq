-- VitaIQ Supabase Schema
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── USERS TABLE ──────────────────────────────────────────────────────────────
create table if not exists public.vitaiq_users (
  id            uuid default gen_random_uuid() primary key,
  fingerprint   text unique not null,
  upload_count  integer default 0,
  first_seen    timestamptz default now(),
  last_seen     timestamptz default now(),
  is_pro        boolean default false,
  access_code   text,
  pro_since     timestamptz,
  created_at    timestamptz default now()
);

-- ── UPLOADS TABLE ─────────────────────────────────────────────────────────────
create table if not exists public.vitaiq_uploads (
  id            uuid default gen_random_uuid() primary key,
  fingerprint   text not null,
  file_name     text,
  date_from     text,
  date_to       text,
  duration_days integer,
  uploaded_at   timestamptz default now()
);

-- ── ACCESS CODES TABLE ────────────────────────────────────────────────────────
create table if not exists public.vitaiq_codes (
  code          text primary key,
  is_used       boolean default false,
  used_by       text,
  used_at       timestamptz,
  created_at    timestamptz default now()
);

-- ── SEED ACCESS CODES ─────────────────────────────────────────────────────────
insert into public.vitaiq_codes (code) values
  ('VITA-2W3Y-YZWT-5HC9'),
  ('VITA-BZ8J-8Y5V-583V'),
  ('VITA-TES3-EVW7-UTVA'),
  ('VITA-BG9L-DKXJ-QDTF'),
  ('VITA-Q2JG-CP3Q-T65E'),
  ('VITA-JBSK-S6VR-QTJD'),
  ('VITA-RSTR-NUMG-Z7KE'),
  ('VITA-TWHC-PYV5-WQT5'),
  ('VITA-46K4-MZYF-XQ46'),
  ('VITA-X6LW-P3WX-R4KA')
on conflict (code) do nothing;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
alter table public.vitaiq_users   enable row level security;
alter table public.vitaiq_uploads enable row level security;
alter table public.vitaiq_codes   enable row level security;

create policy "allow_all_users"   on public.vitaiq_users   for all using (true) with check (true);
create policy "allow_all_uploads" on public.vitaiq_uploads for all using (true) with check (true);
create policy "allow_read_codes"  on public.vitaiq_codes   for select using (true);
create policy "allow_update_codes" on public.vitaiq_codes  for update using (true);
