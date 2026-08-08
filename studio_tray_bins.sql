-- studio_tray_bins.sql — a third bin, and a trade that cuts across all of them.
-- Idempotent. RUN THIS BEFORE the HTML change.
--
-- Theo, after 628 shipped two buckets: "Extra bins" — then, asked which:
-- "Colors but also would be nice to have by trades as well."
--
-- ⚠️ THOSE TWO ARE NOT THE SAME KIND OF THING, and the schema has to say so.
--
--   COLOURS is a BUCKET. It is a destination, like showcase and workmanship:
--   Cardinal's own finished roofs, headed for oc_color_photos on the Colors
--   page. A photo is in exactly one bucket, because storage_path is the primary
--   key and a photograph is being kept FOR one purpose.
--
--   TRADE is a FACET. It cuts across every bucket — a before/after can be a
--   roof job or a siding job; a theirs-vs-ours can be gutters. Making it a
--   fourth bucket would force a roofing before/after to choose between being a
--   before/after and being roofing, which is nonsense. So it is its own column,
--   nullable, orthogonal to bucket.
--
-- WHY THESE SIX TRADE VALUES AND NOT A NEW LIST: they are the app's existing
-- TRADES — the same six in `var TRADES` in three places in index.html, the same
-- ones workmanship_pairs.trade already carries, and the same ones crews_trade_ck
-- constrains. One vocabulary, three tables. When one grows they all grow — the
-- standing rule this project applies to STAGES / IC_SKIP / PIPE_SKIP.
--
-- WHY NO color_id HERE: oc_color_photos.color_id is NOT NULL and names a
-- specific Owens Corning colour. That choice belongs on the Colors page, where
-- the swatches are visible — not in Studio, where you are looking at a
-- photograph and cannot see which colour it is meant to sit beside. The tray
-- holds the photo; the destination screen makes the assignment. Same division
-- of labour as the Showcase: the tray shortlists, the pair-builder decides.
--
-- ⚠️ THE GPS FENCE IS UNCHANGED. studio_photos carries lat/lon (all NULL);
-- studio_tray still declares no coordinate columns, toggleTray() still names
-- its fields rather than spreading the archive row, and harness_tray.js asserts
-- both. A bin and a trade do not change that. Do not "complete" the row.

-- ── the third bucket ─────────────────────────────────────────────────────────
-- Replacing the constraint rather than adding a second one: two overlapping
-- CHECKs on the same column is two mechanisms answering one question, and the
-- narrower one silently wins.
alter table public.studio_tray
  drop constraint if exists studio_tray_bucket_ck;

alter table public.studio_tray
  add constraint studio_tray_bucket_ck
  check (bucket in ('showcase', 'workmanship', 'colors'));

-- ── the trade facet ──────────────────────────────────────────────────────────
alter table public.studio_tray
  add column if not exists trade text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.studio_tray'::regclass
       and conname  = 'studio_tray_trade_ck'
  ) then
    alter table public.studio_tray
      add constraint studio_tray_trade_ck
      check (trade is null or trade in
             ('roof', 'siding', 'windows', 'andersen', 'gutters', 'general'));
  end if;
end $$;

comment on column public.studio_tray.trade is
  'Which trade the photo shows. NULL = not yet said, which is the honest default: most of the archive has never been looked at. Orthogonal to bucket — a before/after can be siding. Same six values as workmanship_pairs.trade and crews_trade_ck; when one list grows they all grow.';

comment on column public.studio_tray.bucket is
  'What the photo was picked FOR: showcase = a before/after pair, workmanship = a theirs-vs-ours comparison, colors = one of our finished roofs headed for the Colors page. One bucket per photo, because storage_path is the primary key. Constrained.';

-- The picker reads one bucket at a time and may narrow by trade.
create index if not exists studio_tray_bucket_trade_idx
  on public.studio_tray (bucket, trade, added_at desc);

-- RLS unchanged — studio_tray_admin_all already covers every column, and a new
-- column on an existing table inherits the table's policies.

-- Revert, for the record:
--   drop index if exists public.studio_tray_bucket_trade_idx;
--   alter table public.studio_tray drop constraint if exists studio_tray_trade_ck;
--   alter table public.studio_tray drop column if exists trade;
--   alter table public.studio_tray drop constraint if exists studio_tray_bucket_ck;
--   alter table public.studio_tray add constraint studio_tray_bucket_ck
--     check (bucket in ('showcase','workmanship'));
