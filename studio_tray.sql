-- studio_tray.sql — the holding tray between Cardinal Studio and the Showcase.
-- Idempotent (create-if-not-exists throughout). RUN THIS BEFORE the HTML change.
--
-- WHAT THIS IS: a shortlist. Theo browses the 60,503-photo archive in Studio,
-- ticks the ones worth using, and they collect here. The Showcase's existing
-- pair-builder then reads the tray as a source, where he marks which is BEFORE
-- and which is AFTER (or bad vs Cardinal-standard) and creates the pair.
--
-- WHY A TABLE AND NOT localStorage: Studio and the Showcase are different
-- documents, and Theo ticks on the iPad but may build the pair on the desktop.
-- A tray that does not survive that is not a tray. It also means an accidental
-- tab close costs nothing.
--
-- WHY storage_path IS THE PRIMARY KEY: ticking the same photo twice must be a
-- no-op, not a duplicate row. An upsert on the path gives that for free, and
-- the path is already unique in the bucket. No surrogate id to keep in step.
--
-- ⚠️ WHY THERE IS NO lat/lon HERE, DELIBERATELY.
-- studio_photos carries lat and lon columns and all 60,503 rows are currently
-- NULL — the EXIF/GPS exclusion recorded in CONTRACTOR_VISION_SUITE.md is
-- holding in practice. This table is a path from the archive toward a
-- CLIENT-FACING screen, which makes it exactly the seam where coordinates
-- would leak if anyone copied the row wholesale. It stores the path and enough
-- to identify the photo, and nothing else. Do not add them "for completeness".
--
-- WHY width/height ARE COPIED: the archive averages 1138x1033 and only 40% of
-- it is >=1400px wide. The compare card wants 1224 device pixels at 2x, so the
-- picker needs to warn when a photo is too small BEFORE it lands in front of a
-- customer. Copied rather than joined, for the same reason studio_photos copies
-- project_address: the tray must keep working regardless of the source row.
--
-- WHY NO FOREIGN KEY TO studio_photos: same reasoning again. A tray entry is a
-- decision Theo made about a photograph; it should not evaporate because a
-- re-push rewrote the archive row.

create table if not exists public.studio_tray (
  storage_path    text primary key,
  project_address text,
  project_name    text,
  width           integer,
  height          integer,
  note            text,
  added_by        text        not null,
  added_at        timestamptz not null default now()
);

comment on table public.studio_tray is
  'Shortlist of archive photos picked in Cardinal Studio, consumed by the Showcase pair-builder. Admin-only. Deliberately carries no coordinates.';

create index if not exists studio_tray_added_idx
  on public.studio_tray (added_at desc);

alter table public.studio_tray enable row level security;

-- Admin-only, matching studio_photos exactly. is_cardinal_admin() is
-- security-definer, which is what keeps this from recursing through RLS.
drop policy if exists studio_tray_admin_all on public.studio_tray;
create policy studio_tray_admin_all on public.studio_tray
  for all
  using      (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());

-- Revert, for the record:
--   drop table if exists public.studio_tray;
