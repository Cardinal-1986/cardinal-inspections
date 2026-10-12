-- owner_review.sql — the table behind Owner Review (build 1322; Theo, 12 Oct 2026: "flag certain
-- clients for owner review and put them in an admin only area, but still workable by the rep",
-- picks "1 silent").
--
-- SILENT BY CONSTRUCTION: every row is is_cardinal_admin() only, read and write. A rep cannot
-- read this table, so the app has nothing to show him and nothing to leak — the job itself is
-- untouched and he keeps working it exactly as before. Nothing here is written to projects,
-- the job thread, notes, notifications or any table a rep can read.
--
-- A row is one review of one job:
--   project_id   the job (NULL for a job not in the app yet — e.g. still in AccuLynx;
--                client_name / rep_email / trail then carry what Theo entered)
--   source       'manual' (Theo or Joan flagged it) or 'auto' (a rule in build 1325)
--   rule         for auto rows, the rule key — the unique index stops a rule flagging the
--                same job twice, and keeps a DISMISSED auto flag from coming back
--   notes        [{ at, by, text }] — owner-only notes, newest last
--   status       open · resolved · dismissed
--
-- Additive only: one new table, no existing table or policy is touched.
-- Revert: drop table public.owner_reviews;

create table if not exists public.owner_reviews (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid,   -- deliberately NO foreign key: any DDL that locks public.projects hangs
                       --   (see field_role.sql's header); a review row outliving its job is harmless
  client_name  text,
  rep_email    text,
  source       text not null default 'manual' check (source in ('manual','auto')),
  rule         text,
  reason       text,
  notes        jsonb not null default '[]'::jsonb,
  trail        jsonb,
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_by   text default auth.email(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  text
);

create unique index if not exists owner_reviews_rule_once
  on public.owner_reviews (project_id, rule) where rule is not null;

alter table public.owner_reviews enable row level security;

drop policy if exists owner_reviews_admin on public.owner_reviews;
create policy owner_reviews_admin on public.owner_reviews for all to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());
