-- Build 1249 — On hold for punch work (Theo's pick 3C, 7 Oct 2026).
--
-- A punch-out, repair, callback or tarp that cannot move — parts on order,
-- homeowner away, weather, waiting on the adjuster — goes ON HOLD with a
-- reason and a day to look at it again. Until that day it sits in the Punch
-- List's "On hold" group instead of rotting in Past due; on that day it comes
-- back into Today with a "Back from hold" flag.
--
-- On hold is FIELDS, not a status. status stays 'open': 64 places in the app
-- compare status to 'open' / 'done', and a third value would be silently read
-- as one of them. Nothing here touches status, the close guard, or RLS — the
-- existing punch_items update policy governs these columns like any other.
--
-- Additive and idempotent: nullable columns, one CHECK on the reason. A row
-- with hold_reason NULL is not on hold — which is every row today.
-- Revert:
--   alter table public.punch_items drop constraint if exists punch_items_hold_reason_ck;
--   alter table public.punch_items drop column if exists hold_reason, drop column if exists hold_until,
--     drop column if exists hold_note, drop column if exists hold_by, drop column if exists hold_at;

alter table public.punch_items add column if not exists hold_reason text;
alter table public.punch_items add column if not exists hold_until  date;
alter table public.punch_items add column if not exists hold_note   text;
alter table public.punch_items add column if not exists hold_by     text;
alter table public.punch_items add column if not exists hold_at     timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'punch_items_hold_reason_ck') then
    alter table public.punch_items add constraint punch_items_hold_reason_ck
      check (hold_reason is null or hold_reason in ('materials','homeowner','weather','adjuster','other'));
  end if;
end $$;
