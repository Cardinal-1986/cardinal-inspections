-- owner_review_rules.sql — the on/off switches for Owner Review's automatic flags (build 1325;
-- Theo, 12 Oct 2026: "4 all on", each switchable).
--
-- ADMIN-ONLY, read and write, like owner_reviews itself. Deliberately NOT a row in app_settings:
-- that table is readable by every signed-in user (app_settings_staff_read), so a key named after
-- these rules would tell a rep they exist. Silent means silent.
--
-- One row per rule key. A MISSING row means ON — the rules arrive switched on, as Theo picked.
--   price_drop · below_ins · ded_uncollected · extra_no_co · done_unpaid · invoiced_no_price
--
-- Additive only: one new table, nothing existing is touched. No foreign keys.
-- Revert: drop table public.owner_review_rules;

create table if not exists public.owner_review_rules (
  rule        text primary key,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  text default auth.email()
);

alter table public.owner_review_rules enable row level security;

drop policy if exists owner_review_rules_admin on public.owner_review_rules;
create policy owner_review_rules_admin on public.owner_review_rules for all to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());

-- Applied 12 Oct 2026, one statement per call (the tooling times out on multi-statement runs).
-- Verified: a sales rep's JWT reads 0 rows and cannot insert.
