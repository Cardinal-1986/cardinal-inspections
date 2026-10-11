-- 1296 · callback cause + original crew (Theo's pick 1B, 10 Oct 2026)
--
-- A Callback punch-out records WHY the client called back and WHICH crew did the
-- original work, so each crew's page under Crews can list its callbacks.
--
--   callback_cause  — one of five words; null until someone picks.
--   orig_crew_id    — crews.id of the crew on the original job (from its crew
--                     work order, editable). No FK on purpose: an archived or
--                     deleted crew must not erase the callback's history.
--   orig_crew_name  — the crew's name AT THE TIME, stored beside the id because
--                     crews and crew_work_orders are is_full_access() RLS: a
--                     sales rep opening a callback cannot read crews, and must
--                     still see who did the job.
--
-- Additive only. No RLS change: the columns ride punch_items' existing policies.
-- Idempotent. Safe to re-run. Run BEFORE the 1296 index.html ships.

alter table punch_items
  add column if not exists callback_cause text,
  add column if not exists orig_crew_id   uuid,
  add column if not exists orig_crew_name text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'punch_items_callback_cause_ck') then
    alter table punch_items add constraint punch_items_callback_cause_ck
      check (callback_cause is null or callback_cause in ('workmanship','material','storm','homeowner','other'));
  end if;
end $$;

create index if not exists punch_items_orig_crew_idx on punch_items (orig_crew_id) where orig_crew_id is not null;

comment on column punch_items.callback_cause is '1296: why a callback happened — workmanship | material | storm | homeowner | other.';
comment on column punch_items.orig_crew_id   is '1296: the crew on the original job (crews.id, no FK — history survives the crew).';
comment on column punch_items.orig_crew_name is '1296: that crew''s name at the time, readable by reps who cannot read crews.';
