-- app_settings.sql — Build 1157 (30 Aug 2026)
-- A tiny company-wide key/value settings store, created for the automatic
-- payment reminders MASTER SWITCH (Theo: "toggle this feature on and off in
-- the admin area"). Checked first: no settings-store table existed anywhere
-- in the schema or the client — this is a new primitive, not a duplicate.
--
-- Shape: one row per setting, jsonb value. Staff can READ (the AR header
-- paints the switch); only admins can WRITE (the toggle lives on the
-- admin-only Invoices & AR view, and RLS enforces it server-side too).
-- api/remind.js reads it with the service role before doing anything.
--
-- ⚠ THE SEED IS 'false' — the reminders feature ARRIVES SWITCHED OFF.
-- Nothing texts a client until Theo turns it on from the AR header. A
-- missing row also reads as OFF in api/remind.js, so the fail state is
-- silence, never a surprise text.
--
-- Run BEFORE deploying build 1157 (with payment_reminders.sql, either order).
-- Idempotent; safe to re-run — the seed never overwrites a stored choice.

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_staff_read on public.app_settings;
create policy app_settings_staff_read on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings
  for insert to authenticated with check (public.is_cardinal_admin());

drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings
  for update to authenticated
  using (public.is_cardinal_admin()) with check (public.is_cardinal_admin());

insert into public.app_settings (key, value, updated_by)
  values ('payment_reminders_enabled', 'false'::jsonb, 'seed')
  on conflict (key) do nothing;
