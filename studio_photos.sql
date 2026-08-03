-- studio_photos.sql — the backend curation library, decoupled from the CRM.
-- APPLIED to production 2026-08-03. Idempotent (create-if-not-exists throughout).
--
-- WHAT THIS IS: a searchable, tag-organized library of photos, built from the
-- Spark archive (CompanyCam + phone), for one purpose — finding a good example
-- of something ("nail pops", "aerial", "123 Main") when curating a Showcase
-- pair, a Walk, or training data. It is admin-only and never rendered to a
-- client. Nothing in the client-facing app (showcase_pairs, Showroom, share
-- cards) reads this table or depends on it existing.
--
-- WHY NO FOREIGN KEY INTO projects: this table has to keep working even if the
-- job it came from is edited or deleted in the CRM. project_address and
-- project_name are plain COPIED strings, captured at push time — the same
-- reasoning walks_schema.sql already used for job photos ("copy the bytes, do
-- not reference the path"). This is not an oversight; a live FK would be the
-- exact CRM coupling this table was built to avoid.
--
-- WHY "BACKEND ONLY" DOES NOT MEAN "NO ADDRESS": the privacy rule that matters
-- is what a CLIENT can see, and that rule lives entirely in showcase_pairs and
-- its share-card/Showroom code (address never reaches drawCard(), the release
-- badge is hidden in Showroom, privacy mode shows city not street). This table
-- is never in that path, so it is free to carry project_address plainly —
-- that's what makes "search an address, find that house's photos" possible at
-- all. Removing address here would have broken the one workflow this table
-- exists to serve, for a privacy rule it was never subject to in the first
-- place. See the 2026-08-03 conversation in cardinal_build_log.md.
--
-- WHERE ROWS COME FROM: Hermes tags photos on the Spark, offline, and writes
-- one local file (studio_tags.jsonl — see spark/STUDIO_TAGGING.md). A separate
-- push script (spark/push_studio_tags.py) joins that against manifest.jsonl
-- for CompanyCam-sourced rows, generates a browsing-size thumbnail, and
-- upserts here. The tagger never touches Supabase and needs no credential.

create table if not exists studio_photos (
  id              text primary key,
  -- 'companycam' rows reuse the id manifest.jsonl already assigns (that photo's
  -- CompanyCam id) so the push script can join by a plain dict lookup, no
  -- hashing required. 'phone' rows have no external id authority, so the
  -- tagger assigns its own ("phone:" + a hash of the relative path).
  source          text not null check (source in ('companycam','phone')),
  -- Relative to the Spark's /data/cardinal/ root (spark/README.md's own tree),
  -- e.g. 'companycam/originals/Dayton-OH/.../abc123.jpg'. A locator for the
  -- TRUE master file on the Spark — never rendered as if it were an address,
  -- just how a human finds the original later if the browsing copy isn't enough.
  spark_path      text not null,
  -- The browsing copy actually served by the app: Cardinal's own `photos`
  -- bucket, prefix studio/ — same bucket showcase/ and walks/ already share,
  -- resized to the app's existing DISP convention (1400px, q .82). This is
  -- NOT a presentation master; the Spark archive is. A full-resolution copy is
  -- only ever made at the moment something here gets promoted into a real
  -- Showcase pair, same as job photos already work.
  storage_path    text not null,
  tags            text[] not null default '{}',
  confidence      jsonb,
  project_address text,
  project_name    text,
  captured_at     timestamptz,
  -- Of the ORIGINAL on the Spark, not the thumbnail — so a later "is this
  -- good enough for a presentation pair" decision has real information.
  width           integer,
  height          integer,
  tagged_at       timestamptz,
  pushed_at       timestamptz not null default now()
);

-- Two purpose-built indexes, not one combined tsvector. First attempt tried a
-- GENERATED column folding tags + address + name into one tsvector; Postgres
-- refused it ("generation expression is not immutable"). Re-tried as a plain
-- functional index instead — same refusal, because functional indexes ALSO
-- require every function in the expression to be IMMUTABLE, not merely STABLE.
-- Checked pg_proc directly rather than guess a third time: to_tsvector(regconfig,
-- text) genuinely IS immutable once qualified — array_to_string(anyarray,text)
-- is the one that's STABLE, and it was the only thing actually blocking this.
-- Splitting also fits the real query shapes better: tags are a controlled
-- vocabulary (exact / contains), address and name are human-typed free text
-- (approximate) — two different kinds of query, not one overloaded mechanism.
create index if not exists idx_studio_photos_tags on studio_photos using gin (tags);

create index if not exists idx_studio_photos_addr_search on studio_photos
  using gin (to_tsvector('pg_catalog.english'::regconfig,
    coalesce(project_address, '') || ' ' || coalesce(project_name, '')));

alter table studio_photos enable row level security;

-- Same shape as crew_rates_rw / crew_payments_rw — one ALL policy, admin only.
-- This is Theo's own backend curation tool; nobody else has a reason to be in
-- it, and unlike crew_rates there isn't even a "reps read their own" tier to
-- carve out.
create policy studio_photos_rw on studio_photos
  for all
  using (is_cardinal_admin())
  with check (is_cardinal_admin());
