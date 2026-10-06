-- Build 1245 — ABC ordering from the client profile: remembered item matches.
--
-- A Materials-tab line reads "Architectural shingles · 34 bundles". ABC needs an
-- item number. The order screen asks a person to match each material to an ABC
-- item ONCE, and this table remembers the answer for every future job, the way
-- AccuLynx keeps its supplier item links.
--
-- Keyed by the material name, normalised (lower case, trimmed, single spaces) —
-- the same normalisation cr-abco-script applies before it reads or writes.
--
-- Who: every signed-in user may READ (a match is not money). Only admins and
-- production — the people allowed to place an ABC order, is_full_access(), the
-- same fence as FULL_ONLY in api/abc.js — may write.
--
-- No money is stored here: no price, no account number. Prices are asked of ABC
-- at the branch at order time.
--
-- Idempotent. The app degrades without it: a match is still kept on that job's
-- own material line, it is simply not remembered across jobs until this runs.
-- Revert: drop table public.abc_item_map;

create table if not exists public.abc_item_map (
  material    text primary key,
  item_number text not null,
  description text,
  uom         text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.abc_item_map enable row level security;

drop policy if exists abc_item_map_read on public.abc_item_map;
create policy abc_item_map_read on public.abc_item_map
  for select to authenticated using (true);

drop policy if exists abc_item_map_insert on public.abc_item_map;
create policy abc_item_map_insert on public.abc_item_map
  for insert to authenticated with check (is_full_access());

drop policy if exists abc_item_map_update on public.abc_item_map;
create policy abc_item_map_update on public.abc_item_map
  for update to authenticated using (is_full_access()) with check (is_full_access());

drop policy if exists abc_item_map_delete on public.abc_item_map;
create policy abc_item_map_delete on public.abc_item_map
  for delete to authenticated using (is_full_access());
