-- walks_schema.sql — "The Walk": AI circles the damage, a person checks it,
-- then it goes in front of the client.
-- Run this BEFORE deploying the index.html change, per the project's SQL rule.
-- Idempotent: safe to run twice.
--
-- WHY, in Theo's words: "circling damage ai and checking first then presenting
-- to client is a good third tab. Doesn't need to be a report, so new feature
-- then." The order in that sentence is the whole design — and the middle step
-- is the one that makes it usable in front of a homeowner.
--
-- THIS IS NOT AN INSPECTION REPORT. inspection_reports already exists, has its
-- own editor and its own print path, and the Showcase links out to it. A walk
-- is a conversation aid: a handful of photographs with damage circled on them,
-- shown one at a time. Nothing here writes to inspection_reports and nothing
-- here should grow into a second reports pipeline.
--
-- THE CIRCLES ARE AN OVERLAY, NEVER BURNED IN. api/detect.js returns normalized
-- box fractions and touches no pixels. The photograph in storage is the
-- photograph the camera took — which is the only version of this feature that
-- can be shown to an insurance adjuster without an argument about it.

-- ── the walk ───────────────────────────────────────────────────────────────
create table if not exists walks (
  id           uuid primary key default gen_random_uuid(),

  -- Nullable on purpose: a walk often happens before the prospect is a project.
  -- on delete set null, not cascade — losing the project must not delete the
  -- evidence gathered on its roof.
  project_id   uuid references projects(id) on delete set null,

  title        text not null,               -- '4212 Wilmington Pike — hail'
  address      text,                        -- masked by the Showcase privacy toggle
  city         text,                        -- still shown when the address is masked
  trade        text,                        -- see the check constraint below
  notes        text,

  sort_order   int  not null default 0,
  published    boolean not null default false,

  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One vocabulary, shared with showcase_pairs, EST_TYPES and api/sortphotos.js.
-- One grows, all grow — and the whitelist ships before any writer, per the
-- normStage lesson (anything unrecognised silently becomes 'Lead' there; here
-- it would be refused outright, which is the same class of trap in reverse).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'walks_trade_ck') then
    alter table walks add constraint walks_trade_ck
      check (trade is null or trade in
        ('roof','siding','windows','andersen','gutters','general'));
  end if;
end $$;

-- ── one photograph in a walk ───────────────────────────────────────────────
create table if not exists walk_shots (
  id           uuid primary key default gen_random_uuid(),
  walk_id      uuid not null references walks(id) on delete cascade,
  sort_order   int  not null default 0,

  -- A storage path in the EXISTING private `photos` bucket, under walks/.
  -- Never a URL: signedPhotoMap() signs it for display and an expiring URL is
  -- never written back onto a row (the saveEstimate lesson).
  path         text not null,

  -- Where the photograph came from. Both sources copy their bytes into walks/
  -- rather than referencing the original — see the note at the bottom of this
  -- file, which is a decision made on measured data and worth reading before
  -- anyone "optimises" it back.
  source       text not null default 'phone',
  origin_photo_id uuid,                     -- project_photos.id when source='job'

  caption      text,

  -- THE LOAD-BEARING CONTRACT: this array only ever holds findings a human
  -- ACCEPTED. The model's proposals live in the browser until someone presses
  -- Save; rejected ones are dropped, not flagged. So reviewed_at IS NULL means
  -- "nobody has walked this yet" and anything in findings has been seen by a
  -- person. Theo's sentence expressed as a schema property instead of as UI
  -- discipline, because UI discipline is what gets edited away later.
  --
  -- Each element, matching api/detect.js verbatim plus one field:
  --   { "defect":"hail_impact", "severity":"crit",
  --     "label":"Impact bruising, south slope", "note":"...",
  --     "box":{"x":0.31,"y":0.42,"w":0.18,"h":0.14},
  --     "confidence":0.8, "edited":true }
  -- box values are FRACTIONS of the image, never pixels, so the same row draws
  -- correctly on a phone, on the iPad and at desktop width.
  -- "edited" records that a person moved or resized the box — a year later,
  -- "did someone actually check this" is then answerable from the row.
  findings     jsonb not null default '[]'::jsonb,

  -- What the model said about the photograph itself ('poor' + why), kept so a
  -- shot with no findings can be told apart from a shot that was too dark to
  -- read. Those are very different facts to put in front of a client.
  ai_quality   text,
  ai_note      text,

  reviewed_by  text,
  reviewed_at  timestamptz,

  created_at   timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'walk_shots_source_ck') then
    alter table walk_shots add constraint walk_shots_source_ck
      check (source in ('phone','job'));
  end if;
  -- findings must be an ARRAY. A bare object or a string here would render as
  -- nothing and look like "the AI found no damage", which is the worst possible
  -- silent failure for this feature.
  if not exists (select 1 from pg_constraint where conname = 'walk_shots_findings_ck') then
    alter table walk_shots add constraint walk_shots_findings_ck
      check (jsonb_typeof(findings) = 'array');
  end if;
end $$;

comment on table walks is
  'The Walk: a small set of photographs with damage circled, shown to a client one at a time. Not an inspection report.';
comment on table walk_shots is
  'One photograph in a walk. findings holds ONLY human-accepted detections, as normalized box fractions. Circles are an overlay; the stored image is never modified.';

create index if not exists walks_order
  on walks (published, sort_order, created_at desc);
create index if not exists walks_project
  on walks (project_id);
create index if not exists walk_shots_walk
  on walk_shots (walk_id, sort_order, created_at);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Settled by Theo: "I meant admins only, sales and productions can view."
-- Enforced here, not only in the UI — a hidden button is not a permission.
-- is_cardinal_admin() is security-definer and already in the database.
alter table walks      enable row level security;
alter table walk_shots enable row level security;

drop policy if exists walks_read on walks;
create policy walks_read on walks
  for select to authenticated
  using (published or is_cardinal_admin());

drop policy if exists walks_admin_insert on walks;
create policy walks_admin_insert on walks
  for insert to authenticated
  with check (is_cardinal_admin());

drop policy if exists walks_admin_update on walks;
create policy walks_admin_update on walks
  for update to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());

-- A delete under RLS with no policy is a silent 204 — the row survives and the
-- caller sees success. The app also selects the id back on delete for this
-- reason; both halves are needed.
drop policy if exists walks_admin_delete on walks;
create policy walks_admin_delete on walks
  for delete to authenticated
  using (is_cardinal_admin());

-- Shots inherit their walk's visibility. Reading a shot whose walk you cannot
-- see would leak the address in the path itself, so the read policy joins
-- rather than simply allowing `authenticated`.
drop policy if exists walk_shots_read on walk_shots;
create policy walk_shots_read on walk_shots
  for select to authenticated
  using (exists (select 1 from walks w
                  where w.id = walk_shots.walk_id
                    and (w.published or is_cardinal_admin())));

drop policy if exists walk_shots_admin_insert on walk_shots;
create policy walk_shots_admin_insert on walk_shots
  for insert to authenticated
  with check (is_cardinal_admin());

drop policy if exists walk_shots_admin_update on walk_shots;
create policy walk_shots_admin_update on walk_shots
  for update to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());

drop policy if exists walk_shots_admin_delete on walk_shots;
create policy walk_shots_admin_delete on walk_shots
  for delete to authenticated
  using (is_cardinal_admin());

-- ── Storage ────────────────────────────────────────────────────────────────
-- Same shape as showcase/ and workmanship/: the EXISTING private `photos`
-- bucket under a walks/ prefix, so the app's signing path works unchanged and
-- no new bucket surface is created.
drop policy if exists walk_objects_read on storage.objects;
create policy walk_objects_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like 'walks/%');

drop policy if exists walk_objects_admin_write on storage.objects;
create policy walk_objects_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and name like 'walks/%' and is_cardinal_admin());

drop policy if exists walk_objects_admin_delete on storage.objects;
create policy walk_objects_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and name like 'walks/%' and is_cardinal_admin());


-- ── Why job photos are COPIED and not referenced ───────────────────────────
-- The first draft of this file referenced the existing storage_path for photos
-- pulled off a job, on the reasoning that the bytes are already in Cardinal's
-- own bucket so there is nothing to outlive. Measuring the table killed that:
--
--   select count(*), count(storage_path) from project_photos;
--   -> 196 rows, 183 with a storage_path
--
-- THIRTEEN of the 196 are inline base64 `data:` URIs with no storage object at
-- all — there is no path to reference, and photoPathOf() correctly returns null
-- for them. Referencing would have silently dropped 1 photo in 15 from the
-- picker, which is exactly the shape of bug this project keeps paying for: code
-- that is correct and does nothing.
--
-- The second reason is deletion. Removing a job photo in the app also removes
-- the storage object, so a referenced walk would blank itself weeks later with
-- nothing to explain it — in front of a client, which is the one place this
-- feature is used.
--
-- So both sources copy. A walk holds a handful of shots, not hundreds, and
-- origin_photo_id keeps the provenance if anyone needs to trace one back.
