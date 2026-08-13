-- ============================================================================
-- punch_steps.sql  ·  build 766  ·  the field SOP checklist on a punch item
-- ============================================================================
-- Run this ONCE against the Cardinal Supabase project BEFORE deploying the
-- build 766 index.html. Idempotent: safe to re-run, safe to run twice.
--
-- WHY A COLUMN AND NOT A TABLE (same reasoning as punch_comments.sql, 607):
-- a separate punch_steps table would need its own RLS policy set, its own
-- read in three modules, and its own join on every render. Riding punch_items
-- as jsonb means the steps inherit punch_read / punch_update exactly, and the
-- one shared data layer (window.CardinalPunch) keeps being the only query
-- path. One pipeline per concept.
--
-- SHAPE of punch_items.steps  ·  a JSON array, ordered, oldest-first:
--   [ { "t": "Re-seat + seal, N gable",   -- the step text
--       "d": false,                        -- done?
--       "req": true,                       -- a note is REQUIRED before it ticks
--       "note": "",                        -- what the tech wrote
--       "by": "scottie@...",               -- who ticked it
--       "at": "2026-08-19T18:41:00.000Z"   -- when
--     }, ... ]
-- Empty array = no checklist on this item, which is the normal case for a
-- one-line punch. Nothing to backfill.
--
-- SHAPE of punch_items.template  ·  text, nullable: which trade template the
-- steps came from ('roofing' | 'siding' | 'gutters'), for display only. NULL
-- means the steps were typed by hand. It is deliberately NOT a foreign key —
-- the templates are a short hardcoded list in index.html at build 766, and a
-- template being retired must never orphan a punch item that used it.
-- ============================================================================

ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS template text;

COMMENT ON COLUMN public.punch_items.steps IS
  'Field SOP checklist: [{t,d,req,note,by,at}], ordered. Rides punch_items RLS (build 766).';

COMMENT ON COLUMN public.punch_items.template IS
  'Trade template the steps were seeded from (roofing|siding|gutters), display only, nullable (build 766).';

-- No RLS changes: steps and template ride the existing punch_read / punch_insert /
-- punch_update / punch_delete policies and the punch_close_guard BEFORE UPDATE
-- trigger, all unchanged. Verify with:
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_name = 'punch_items' and column_name in ('steps','template');
