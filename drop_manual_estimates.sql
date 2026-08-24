-- drop_manual_estimates.sql — build 1030 (24 Aug 2026, audit item F-4; Theo's pick, verbatim: "drop it")
--
-- WHY: `manual_estimates` fed the original standalone Estimates screen. Build 568
-- repointed that screen at `estimates` (the real table, with the data); this one
-- kept ZERO rows, no reader, no writer — and an any-authenticated
-- `ALL USING(true) WITH CHECK(true)` RLS policy: an open write surface on dead
-- weight. The last code references (three explanatory comments in
-- cr-estimates-script) describe it as retired.
--
-- SAFETY: run the check below first — this file refuses meaning if the table
-- has rows. Verified 0 rows on 2026-08-24 immediately before applying.
--
-- REVERT (recreates the shape as recorded from information_schema on 2026-08-24;
-- the RLS policy is deliberately NOT recorded for recreation — it was the defect):
--   create table public.manual_estimates (
--     id           uuid primary key default gen_random_uuid(),
--     project_id   uuid not null,
--     title        text not null,
--     template_key text,
--     line_items   jsonb not null default '[]'::jsonb,
--     subtotal     numeric not null default 0,
--     tax_rate     numeric not null default 0,
--     tax_amount   numeric not null default 0,
--     total        numeric not null default 0,
--     notes        text,
--     status       text not null default 'draft',
--     archived     boolean not null default false,
--     created_at   timestamptz not null default now(),
--     updated_at   timestamptz not null default now(),
--     created_by   text,
--     hide_units   boolean not null default false,
--     tax_enabled  boolean not null default true
--   );

do $$
declare n bigint;
begin
  select count(*) into n from public.manual_estimates;
  if n > 0 then
    raise exception 'manual_estimates holds % row(s) — NOT dropping. Investigate first.', n;
  end if;
end $$;

drop table public.manual_estimates;
