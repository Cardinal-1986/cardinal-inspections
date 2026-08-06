-- Build 607 — per-item discussion on a punch out.
--
-- RUN THIS BEFORE DEPLOYING index.html. The app reads and writes
-- punch_items.comments; without the column every save fails.
--
-- Shape mirrors the project-level ck.comments exactly, so one renderer and one
-- @mention resolver serve both:
--   [{ by, name, at, text, mentions:[...] }, ...]
--
-- No new RLS policies. The column rides on punch_items' existing policies, so
-- whoever can already read or update a punch item can read or post on it —
-- which is the rule we want and the one already in force for punch itself.
-- Adding a separate punch_comments table would have needed its own policy set
-- and a second place for that rule to drift out of step.
--
-- ✅ APPLIED to production 6 Aug 2026 (migration punch_items_comments_607) and
-- verified: column present as jsonb NOT NULL DEFAULT '[]'::jsonb, 3 of 3 rows
-- hold a valid array, none null. RLS untouched — punch_items still has its four
-- policies (punch_read/insert/update/delete) and the column rides on them.
-- DO NOT re-run this as pending work. It is idempotent, so a re-run is harmless,
-- but it is done.
--
-- Idempotent. Safe to re-run.

alter table public.punch_items
  add column if not exists comments jsonb not null default '[]'::jsonb;

comment on column public.punch_items.comments is
  'Discussion thread for this punch item. Array of {by,name,at,text,mentions}. '
  'Same shape as projects.checklist -> comments so both use one renderer and '
  'one @mention resolver. Mentions fire a push via /api/notify to tagged team '
  'members only (build 607).';

-- Revert, if it ever comes to that:
--   alter table public.punch_items drop column if exists comments;
