-- studio_archive.sql — soft-archive for the Studio work library
--
-- Theo, 7 Aug 2026: "The 66000 photos only 20% are useful most likely. I need
-- to be able to delete by address tho as some were inspections I never got the
-- bid on. I would need to have way less photos to choose from to be effective."
--
-- The stated goal is SIGNAL, not disk — 9.57 GB costs nothing. So the first
-- stage is reversible: archiving a site drops every photo at that address out
-- of Studio immediately, and it can be restored. Permanent deletion is a
-- separate, deliberate act on the Bin, and is NOT part of this migration.
--
-- Safe to re-run. Adding a nullable column with no default is metadata-only in
-- Postgres — no table rewrite, no backfill, instant on 60,503 rows.
--
-- REVERT:
--   drop index if exists public.studio_photos_archived_idx;
--   drop index if exists public.studio_photos_address_idx;
--   alter table public.studio_photos drop column if exists archived_at;

alter table public.studio_photos
  add column if not exists archived_at timestamptz;

comment on column public.studio_photos.archived_at is
  'NULL = live. Set = hidden from Studio and listed in the Bin. Photos are '
  'never destroyed by archiving; permanent deletion is a separate action that '
  'must also remove the object from storage via the Storage API.';

-- The Bin lists only archived rows, so a partial index on NOT NULL stays tiny
-- (0 rows today) instead of indexing the whole table.
create index if not exists studio_photos_archived_idx
  on public.studio_photos (archived_at)
  where archived_at is not null;

-- Archiving updates every row at one address, and the Sites lens groups by it.
create index if not exists studio_photos_address_idx
  on public.studio_photos (project_address);

-- No RLS change. studio_photos_rw is already cmd=ALL / is_cardinal_admin(),
-- so UPDATE (archive, restore) and DELETE are confined to theo@ and joan@.
-- Production and Sales cannot reach this table at all.
