-- estimate_assemblies.sql — Build 1098. Saved multi-line assemblies (section templates).
--
-- A saved assembly is a named bundle of estimate lines that injects into an
-- estimate as one titled section (build 1097's shape). Default templates ship
-- in-code inside index.html; THIS table holds the custom ones staff save with
-- "Save as Assembly", so they sync across every device.
--
-- APPLY THIS BEFORE deploying the 1098 index.html. The app degrades gracefully
-- if the table is absent (built-in defaults still insert; only custom
-- load/save/delete no-op with a toast) — but custom assemblies won't persist
-- until this runs. Idempotent: safe to run more than once.

create table if not exists public.estimate_assemblies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  trade      text,
  lines      jsonb not null default '[]'::jsonb,
  created_by text default my_email(),          -- auto-fills to the signer; the client never sends it
  created_at timestamptz not null default now()
);

alter table public.estimate_assemblies enable row level security;

-- Shared library: any signed-in staff member reads every saved assembly.
drop policy if exists ea_read on public.estimate_assemblies;
create policy ea_read on public.estimate_assemblies
  for select to authenticated using (true);

-- Insert: the row's created_by must be the signer (the column default supplies it).
drop policy if exists ea_insert on public.estimate_assemblies;
create policy ea_insert on public.estimate_assemblies
  for insert to authenticated with check (created_by = my_email());

-- Edit / delete only your own — admins (Theo, Joan) may curate any.
drop policy if exists ea_update on public.estimate_assemblies;
create policy ea_update on public.estimate_assemblies
  for update to authenticated
  using (is_cardinal_admin() or created_by = my_email())
  with check (is_cardinal_admin() or created_by = my_email());

drop policy if exists ea_delete on public.estimate_assemblies;
create policy ea_delete on public.estimate_assemblies
  for delete to authenticated
  using (is_cardinal_admin() or created_by = my_email());

grant select, insert, update, delete on public.estimate_assemblies to authenticated;

-- Revert:
--   drop table if exists public.estimate_assemblies;
