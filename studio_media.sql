-- studio_media.sql — video, phone photographs, events, and the private room.
-- Written 5 Aug 2026. RUN THIS BEFORE any ingest that fills it.
-- Depends on studio_photos.sql (applied). Independent of studio_findings.sql —
-- either order is fine, they touch different columns.
--
-- WHY A SCHEMA CHANGE COMES FIRST. The next thing to be built is the First
-- Pass: read ~20,000 items off Theo's phone and iPad, report what they are, and
-- move nothing until he says go. Every row of that report is a column that does
-- not exist yet — is this a video, where was it taken, is it a Live Photo's
-- other half, which trip does it belong to. Retrofitting those after twenty
-- thousand personal photographs have landed is the expensive version of this
-- file.

/* ═══ 1 · VIDEO ═══════════════════════════════════════════════════════════
   Video joins the archive; it does not get its own table. It sorts, searches,
   clusters and triages exactly like a photograph — only its bytes behave
   differently, and that difference lives in storage, not here.

   THE BYTES NEVER LEAVE THE SPARK, and this is arithmetic rather than policy.
   A photograph's browsing copy measures ~341 KB in this bucket today. A minute
   of 4K off an iPhone is ~400 MB — about a thousand to one. 1,462 videos as
   poster frames is ~0.5 GB; the same videos copied whole is ~200 GB, which is
   twice the entire plan allowance on its own.

   So for a video row, `storage_path` holds its POSTER FRAME — one still, same
   1400px convention as every photograph, so every grid, search and triage
   screen treats it identically with no special case. `spark_path` still points
   at the real file. Playback streams from the Spark.                        */

alter table studio_photos add column if not exists kind text not null default 'photo';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'studio_photos_kind_ck') then
    alter table studio_photos add constraint studio_photos_kind_ck
      check (kind in ('photo', 'video'));
  end if;
end $$;

-- NULL for photographs, never 0. A zero-length video is a different thing from
-- a still, and the First Pass's "pocket videos" rule (under four seconds, dark,
-- no faces) needs to tell them apart.
alter table studio_photos add column if not exists duration_s real
  check (duration_s is null or duration_s >= 0);


/* ═══ 2 · LIVE PHOTOS ═════════════════════════════════════════════════════
   Every iPhone Live Photo is TWO files: a still and a ~3 second clip. Ingest
   them naively and a 20,000-item library reads as 24,000, every pair looks like
   a duplicate to the dedup pass, and the count in front of Theo is simply
   wrong.

   The pair shares one `live_pair_id`. The still is the row that surfaces; the
   clip carries the same id and `live_is_clip = true` so it can be found,
   played, and NEVER counted. This is a display and counting rule, not a
   deletion — the clip is half the reason Live Photos are worth having.      */

alter table studio_photos add column if not exists live_pair_id text;
alter table studio_photos add column if not exists live_is_clip boolean not null default false;

create index if not exists idx_studio_photos_livepair on studio_photos (live_pair_id)
  where live_pair_id is not null;


/* ═══ 3 · WHERE IT WAS TAKEN ══════════════════════════════════════════════
   A CompanyCam photograph gets its address from the manifest — project_address
   is 100% populated, which is what makes grouping by house work at all. A
   photograph off a phone has no manifest and no job. Its ONLY route into the
   archive is the coordinates in its own EXIF, reverse-geocoded to an address
   and matched against a job Cardinal already has.

   ⚠ THIS IS THE DECISION TAKEN 5 AUG 2026, AND ITS LIMITS ARE PART OF IT.
   Theo reopened the photo-GPS fence "YES, but ADMIN-GATED IN-APP ONLY — never
   public; SEO uses city/area." So:

     · studio_photos is already is_cardinal_admin()-only for every operation,
       which is what makes storing coordinates here permissible at all.
     · safePhoto() in api/companycam.js REMAINS the public-facing shaper and
       MUST keep stripping coordinates. Nothing in this file changes that.
     · A public page must never be able to ASK for these — absent, not gated.
     · strip_exif.py on the Spark still removes GPS from anything headed for a
       website or social. Storing them here does not license publishing them.

   numeric, not float: a coordinate is a fixed-precision measurement and six
   decimal places is ~11 cm, which is far more than enough to match a house. */

alter table studio_photos add column if not exists lat numeric(9,6)
  check (lat is null or (lat between -90 and 90));
alter table studio_photos add column if not exists lon numeric(9,6)
  check (lon is null or (lon between -180 and 180));

-- Which camera it came off. 'companycam' rows leave this null; phone rows carry
-- something like 'iPhone 15 Pro' so a device can be re-imported without
-- duplicating, and so "everything off the iPad" is answerable.
alter table studio_photos add column if not exists device text;

-- Bounding-box lookups for "which job is this photograph standing in front of".
create index if not exists idx_studio_photos_latlon on studio_photos (lat, lon)
  where lat is not null;


/* ═══ 4 · EVENTS ══════════════════════════════════════════════════════════
   The whole premise of the triage flow: you do not sort 20,000 photographs,
   you make ~300 decisions. A holiday is one decision and then "keep these
   eight". Clustering by time and place collapses a camera roll roughly fifty
   to one, and that is the difference between a job nobody starts and an evening.

   Clustering happens on the Spark, where the EXIF already is. This table holds
   the RESULT so the app can group without recomputing anything.             */

create table if not exists studio_events (
  id          text primary key,          -- assigned by the clusterer, stable across re-runs
  label       text,                      -- 'Gatlinburg' — Theo's word, or a reverse-geocoded place
  place       text,                      -- the geocoded locality, kept separate from his label
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  -- Denormalised because every event list shows it and recounting 20,000 rows
  -- to render a list of 300 is the wrong trade.
  item_count  integer not null default 0,
  -- The still that represents the event in a list. A poster frame if the best
  -- thing in the cluster happens to be a video.
  cover_id    text references studio_photos(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table studio_photos add column if not exists event_id text
  references studio_events(id) on delete set null;

create index if not exists idx_studio_photos_event on studio_photos (event_id)
  where event_id is not null;
create index if not exists idx_studio_events_span on studio_events (started_at desc);

alter table studio_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename='studio_events'
                    and policyname='studio_events_rw') then
    create policy studio_events_rw on studio_events
      for all using (is_cardinal_admin()) with check (is_cardinal_admin());
  end if;
end $$;


/* ═══ 5 · THE PRIVATE ROOM ════════════════════════════════════════════════
   A SEPARATE TABLE, and the reason is blast radius rather than tidiness.

   is_cardinal_admin() is true for theo@ AND joan@ — it hardcodes both. Every
   row in studio_photos is therefore readable by both of them, which is correct
   for job photographs and wrong for a man's family.

   The alternative was one table with a visibility column and a policy that
   branches. That is defensible and it is not what this does, because the two
   designs fail differently: with a branching policy, ONE mistake in ONE
   predicate exposes family photographs to another admin. With two tables, a
   mistake on the work table cannot reach this one at all. This project has
   already shipped an RLS policy that read `USING (true)` for months
   (estimates, fixed 2 Aug). Assume it can happen again and make the blast
   radius small.

   Ownership, not admin — the same rule estimates_update_policy.sql settled on:
   created_by = my_email(). Joan is an admin and has no route here.          */

create table if not exists studio_private (
  id            text primary key,        -- 'phone:' + hash, same shape as studio_photos
  owner_email   text not null default my_email(),

  kind          text not null default 'photo' check (kind in ('photo','video')),
  duration_s    real check (duration_s is null or duration_s >= 0),

  spark_path    text not null,           -- the true original, on Theo's own hardware
  storage_path  text not null,           -- browsing copy; the POSTER FRAME when kind='video'

  captured_at   timestamptz,
  device        text,
  lat           numeric(9,6) check (lat is null or (lat between -90 and 90)),
  lon           numeric(9,6) check (lon is null or (lon between -180 and 180)),
  place         text,                    -- reverse-geocoded, for "where was this"

  live_pair_id  text,
  live_is_clip  boolean not null default false,

  event_id      text,                    -- deliberately NOT a foreign key: see below
  tags          text[] not null default '{}',

  -- NAMES ONLY. Never a face embedding, never a descriptor, never a bounding
  -- box of a child's face. Face grouping runs on the Spark and stays there;
  -- what crosses is the word Theo typed. The measurements a model makes of a
  -- face are biometric data, and none of them belong in a hosted database.
  people        text[] not null default '{}',

  kept          boolean,                 -- null = not yet triaged, true = kept, false = quiet
  width         integer,
  height        integer,
  pushed_at     timestamptz not null default now()
);

/* event_id here is a plain text column, NOT a reference to studio_events.
   studio_events is admin-readable; a foreign key from a private row into it
   would leak the shape of Theo's personal life through a constraint — which
   events exist, how many, when. Private events live in their own table. */
create table if not exists studio_private_events (
  id          text primary key,
  owner_email text not null default my_email(),
  label       text,
  place       text,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  item_count  integer not null default 0,
  cover_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_studio_private_event   on studio_private (event_id) where event_id is not null;
create index if not exists idx_studio_private_people  on studio_private using gin (people);
create index if not exists idx_studio_private_tags    on studio_private using gin (tags);
create index if not exists idx_studio_private_taken   on studio_private (captured_at desc);
create index if not exists idx_studio_private_untriaged on studio_private (pushed_at) where kept is null;

alter table studio_private        enable row level security;
alter table studio_private_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename='studio_private'
                    and policyname='studio_private_owner') then
    create policy studio_private_owner on studio_private
      for all
      using (owner_email = my_email())
      with check (owner_email = my_email());
  end if;

  if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename='studio_private_events'
                    and policyname='studio_private_events_owner') then
    create policy studio_private_events_owner on studio_private_events
      for all
      using (owner_email = my_email())
      with check (owner_email = my_email());
  end if;
end $$;


/* ═══ 6 · STORAGE ═════════════════════════════════════════════════════════
   studio_private rows point at photos/private/*, which needs its own policy
   carved out of the bucket the same way studio/* already was
   (studio_objects_rls.sql, 3 Aug) — except owner-scoped rather than admin.

   NOT WRITTEN HERE ON PURPOSE. Storage policies are the one thing in this
   stack that cannot be checked by reading them; they need a real signed
   request from a second account to prove they refuse. That belongs in its own
   file, run and verified deliberately, and NOTHING personal should be uploaded
   until it is. A photograph in a bucket with no policy is a photograph anyone
   with the URL can read.                                                    */


/* ═══ REVERT ══════════════════════════════════════════════════════════════
   drop table if exists studio_private_events;
   drop table if exists studio_private;
   alter table studio_photos drop column if exists event_id;
   drop table if exists studio_events;
   alter table studio_photos
     drop column if exists kind,
     drop column if exists duration_s,
     drop column if exists live_pair_id,
     drop column if exists live_is_clip,
     drop column if exists lat,
     drop column if exists lon,
     drop column if exists device;
   ══════════════════════════════════════════════════════════════════════ */
