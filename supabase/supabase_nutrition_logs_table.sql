-- Run this in Supabase Dashboard → SQL Editor → New query → Run

create table if not exists vitaiq_nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  log_date date not null,           -- local calendar date the meal was logged on
  logged_at timestamptz default now(),
  items jsonb not null,             -- the food items array (name, portion, calories, macros, etc.)
  totals jsonb not null,            -- {calories, protein, carbs, fat} for this meal
  photo_url text,                   -- public URL from Supabase Storage, not the image itself
  created_at timestamptz default now()
);

create index if not exists vitaiq_nutrition_logs_fp_date
  on vitaiq_nutrition_logs (fingerprint, log_date);

alter table vitaiq_nutrition_logs enable row level security;

-- Same open-access pattern as your other tables (no login system —
-- fingerprint is an app-level convention, not an enforced auth boundary)
create policy "public read nutrition logs" on vitaiq_nutrition_logs
  for select using (true);

create policy "public insert nutrition logs" on vitaiq_nutrition_logs
  for insert with check (true);
