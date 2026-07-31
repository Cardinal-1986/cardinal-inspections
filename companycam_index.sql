-- companycam_index.sql — a local mirror of CompanyCam photo METADATA.
-- Run this BEFORE deploying the index.html change, per the project's SQL rule.
-- Idempotent: safe to run twice.
--
-- WHY. The account holds 61,649 photos (measured 31 Jul via /api/companycam-status).
-- The CompanyCam v1 API has NO text search — the photo index takes eleven
-- parameters and none of them is a query — so searching captions means paging.
-- api/companycam.js caps that at 8 pages / 800 photos, which is 1.3% of the
-- account. A photo from 2024 could never be found no matter how it was worded.
--
-- So: mirror the metadata once, keep it topped up, and search Postgres instead.
-- 617 API calls to fill, ~7 minutes, zero AI. After that, search is instant,
-- complete and free.
--
-- WHAT IS NOT HERE. No images — only the caption, the date, and the URLs needed
-- to show a thumbnail. No coordinates: a searchable index does not need the
-- customer's latitude and longitude. And nothing flagged `internal` in
-- CompanyCam is ever written, matching what api/companycam.js already refuses.

create table if not exists companycam_photos (
  id            text primary key,          -- CompanyCam ids are STRINGS, measured
  description   text,                      -- the caption the crew typed
  captured_at   timestamptz,               -- when the shutter fired
  cc_created_at timestamptz,               -- when it reached CompanyCam; can differ
  project_id    text,
  creator_name  text,
  annotated     boolean not null default false,
  thumb_url     text,
  preview_url   text,
  synced_at     timestamptz not null default now()
);

comment on table companycam_photos is
  'Searchable mirror of CompanyCam photo metadata. Never holds internal:true photos. Filled by api/companycam-sync.js.';

-- Caption search. websearch_to_tsquery over a GIN index needs no extension and
-- handles "ice dam" as a phrase, which is the shape of every real query here.
create index if not exists companycam_photos_fts
  on companycam_photos using gin (to_tsvector('english', coalesce(description, '')));

-- Recency, for the unfiltered "show me what we have" case.
create index if not exists companycam_photos_captured
  on companycam_photos (captured_at desc nulls last);

-- Answering "how big is the caption gap?" without a sequential scan.
create index if not exists companycam_photos_uncaptioned
  on companycam_photos (id) where description is null or description = '';

-- One row, holding where the sync got to so it can resume.
create table if not exists companycam_sync (
  id           int primary key default 1,
  cursor       text,
  synced       int  not null default 0,
  skipped      int  not null default 0,
  captioned    int  not null default 0,
  total        int,
  started_at   timestamptz,
  finished_at  timestamptz,
  updated_at   timestamptz not null default now(),
  constraint companycam_sync_singleton check (id = 1)
);

insert into companycam_sync (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS. This is company job data, so it follows the same rule as the rest of the
-- admin surface: admins read it, and only the service role writes it. The sync
-- route holds the service key; nothing in the browser can write here.
-- ---------------------------------------------------------------------------
alter table companycam_photos enable row level security;
alter table companycam_sync   enable row level security;

drop policy if exists companycam_photos_admin_read on companycam_photos;
create policy companycam_photos_admin_read
  on companycam_photos for select
  using (is_cardinal_admin());

drop policy if exists companycam_sync_admin_read on companycam_sync;
create policy companycam_sync_admin_read
  on companycam_sync for select
  using (is_cardinal_admin());

-- No insert/update/delete policies at all: writes happen with the service role,
-- which bypasses RLS. Absent policies deny by default, which is the intent —
-- a browser session must never be able to forge a row here.
