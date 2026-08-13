-- design_renders.sql — saved AI exterior designs for the Exterior Designer (build 761).
-- Run this BEFORE deploying the index.html change, per the project's SQL rule.
-- Idempotent: safe to run twice.
--
-- WHY. The Exterior Designer is a kitchen-table sales surface: a rep photographs
-- the client's house and shows it re-roofed / re-sided / re-trimmed in Cardinal's
-- materials, live. This table holds the designs worth keeping, so the rep can
-- pull the same house back up on the next visit.
--
-- WHAT IS HERE. Storage PATHS into the existing private `photos` bucket, under a
-- designer/ prefix — never URLs (saveEstimate's lesson: an expiring URL written
-- to a row corrupts it forever). The app signs them for display with
-- signedPhotoMap(), same as job photos and showcase pairs.
--
-- ⚠ THE FENCE, stated where the data lives (CONTRACTOR_VISION_SUITE.md,
-- decision 4 — presentation-only): every render_path points at an AI-GENERATED
-- IMAGE, not a photograph. The app burns an "AI CONCEPT" mark into the pixels
-- before upload and badges it on screen. Nothing under designer/ may ever be
-- copied into project_photos, estimate photos, inspection reports, claims,
-- supplements or CompanyCam — an AI-altered image of a real roof reaching an
-- insurance file is an altered-evidence problem. This table has no columns that
-- join it to the claims pipeline, deliberately. Do not "complete" it.
--
-- PERMISSIONS. This is a sales resource (Theo, 12 Aug 2026: "This is a sales
-- resource in front of clients"), so it is NOT admin-only like showcase_pairs:
-- every signed-in Cardinal user may create and read designs; a design is
-- deleted by its creator or an admin. my_email() and is_cardinal_admin() are
-- the existing helpers (estimates_update_policy.sql uses the same pair).

create table if not exists design_renders (
  id           uuid primary key default gen_random_uuid(),

  title        text,                       -- 'Duration — Onyx Black · White trim'
  project_id   uuid,                       -- optional link to projects; usually null

  -- Storage paths inside the private `photos` bucket:
  --   designer/<id>/source.jpg   the client-supplied photograph, untouched
  --   designer/<id>/render.jpg   the AI concept, with the burned-in mark
  source_path  text not null,
  render_path  text not null,

  -- What was asked for, verbatim — { roof: {...}, trim: {...}, ... }. Kept so a
  -- design can say what it shows without re-parsing a prompt, and so the same
  -- selections can be re-run against a better model later.
  choices      jsonb,
  via          text,                       -- which model produced it

  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table design_renders is
  'Saved AI exterior design concepts (Exterior Designer, build 761). render_path is an AI-GENERATED image with a burned-in AI CONCEPT mark — presentation-only, never to be copied into project photos, reports, claims or CompanyCam. Bytes live in the photos bucket under designer/.';

create index if not exists design_renders_order
  on design_renders (created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table design_renders enable row level security;

drop policy if exists design_renders_read on design_renders;
create policy design_renders_read on design_renders
  for select to authenticated
  using (true);

-- created_by must be the caller's own address — a row that claims someone
-- else's authorship would break the delete rule below.
drop policy if exists design_renders_insert on design_renders;
create policy design_renders_insert on design_renders
  for insert to authenticated
  with check (created_by = my_email());

drop policy if exists design_renders_update on design_renders;
create policy design_renders_update on design_renders
  for update to authenticated
  using (is_cardinal_admin() or created_by = my_email())
  with check (is_cardinal_admin() or created_by = my_email());

-- A delete under RLS with no matching policy is a silent 204 — the row survives
-- and the caller sees success. The app selects the id back on delete, same as
-- showcase_pairs.
drop policy if exists design_renders_delete on design_renders;
create policy design_renders_delete on design_renders
  for delete to authenticated
  using (is_cardinal_admin() or created_by = my_email());

-- ── Storage ───────────────────────────────────────────────────────────────
-- The designer/ prefix rides the photos bucket's EXISTING general policies:
-- photos_read grants authenticated SELECT on everything except studio/%
-- (studio_objects_rls.sql), and photos_upload / photos_write grant
-- authenticated INSERT bucket-wide. So reads and writes both already work with
-- no new grant. The dedicated read policy below is added anyway, matching the
-- walk_objects_read / workmanship_objects_read pattern: if the general grant is
-- ever narrowed, designer/ keeps working instead of failing silently.
drop policy if exists designer_objects_read on storage.objects;
create policy designer_objects_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like 'designer/%');

-- REVERT:
--   drop policy if exists designer_objects_read on storage.objects;
--   drop table if exists design_renders;
--   -- storage objects under designer/ are removed via the dashboard or
--   -- storage API; dropping the table does not touch them.
