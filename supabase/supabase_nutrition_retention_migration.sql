-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run even if you already ran supabase_nutrition_logs_table.sql —
-- "if not exists" / "if not exists" guards make this idempotent.

-- Store the Storage object path separately from the public URL, so we can
-- reliably delete the actual file later without fragile URL-parsing.
alter table vitaiq_nutrition_logs add column if not exists photo_path text;

-- The original policies only allowed read + insert. Cleanup needs to null
-- out photo_url/photo_path (update) and eventually remove year-old rows
-- entirely (delete).
drop policy if exists "public update nutrition logs" on vitaiq_nutrition_logs;
create policy "public update nutrition logs" on vitaiq_nutrition_logs
  for update using (true);

drop policy if exists "public delete nutrition logs" on vitaiq_nutrition_logs;
create policy "public delete nutrition logs" on vitaiq_nutrition_logs
  for delete using (true);
