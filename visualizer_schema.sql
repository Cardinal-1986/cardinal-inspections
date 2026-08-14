-- ===========================================================================
-- Exterior Visualizer — the contract between all three tiers.
--
--   Tier 1  the Next.js presentation app (visualizer/)  — reads catalog, reads
--           finished renders, WRITES job rows
--   Tier 2  Supabase (this file)                        — IS the queue
--   Tier 3  the DGX Spark worker (spark/)               — CLAIMS jobs, runs
--           ComfyUI, writes results back
--
-- The Spark reaches OUT to Supabase. There is no inbound endpoint, no tunnel,
-- no port to expose, and therefore nothing to secure at the perimeter. This is
-- what lets the settled rule in DGX_SPARK_ILLUSTRATIONS.md hold BY
-- CONSTRUCTION rather than by discipline: an in-home pitch reads finished
-- rows, so a sleeping box or bad wifi cannot produce dead air in front of a
-- customer. It can only mean "this combination hasn't been rendered yet."
--
-- Idempotent. Safe to re-run. Run this BEFORE any app change (the repo rule).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. MATERIALS — siding, trim, windows, gutters.
--
-- ⚠ ROOFING IS DELIBERATELY NOT IN THIS TABLE. `oc_colors` already owns it:
-- 31 colours with verified hexes, families, product lines, discontinued
-- status with named successors, plus 63 photographs in oc_color_photos across
-- nine applied migrations. A second roofing catalog would be two pipelines for
-- one concept — the exact mistake this codebase keeps paying for. The category
-- CHECK below enforces that at the database, not in a comment.
--
-- Owens Corning does not make siding, trim, windows or gutters, so naming
-- James Hardie / ProVia / Simonton here does NOT collide with the settled
-- "Owens Corning throughout, not GAF" decision — that decision is about
-- SHINGLES, and shingles are not in this table.
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),

  category      text not null
                  check (category in ('siding','trim','windows','gutters')),
  manufacturer  text not null,
  product_line  text not null,
  color_name    text not null,

  hex           text,
  -- Whether a human confirmed the hex against a physical sample or the
  -- manufacturer's own published value. Same honesty column as
  -- oc_colors.hex_verified: an unverified colour still renders, it just must
  -- not be presented as a factory match.
  hex_verified  boolean not null default false,

  -- 'smooth' | 'cedarmill' | 'woodgrain' | 'beaded' — the profile's surface.
  finish        text,
  -- Exposure in inches for lap siding (7.25, 8.25). Null where meaningless.
  reveal_in     numeric(4,2),

  -- Swatch image, storage path under photos/materials/. NOT a remote URL:
  -- a manufacturer's CDN link rots and takes the presentation with it.
  swatch_path   text,

  -- THE DIFFUSION TRIGGER. This is the text handed to the inpainting model,
  -- and it is authored per row rather than assembled from the columns because
  -- what reads well to a customer ("Iron Gray") is not what steers a diffusion
  -- model ("fiber cement lap siding, 7 inch reveal, matte iron grey, crisp
  -- horizontal shadow lines"). Keeping them separate is the whole point.
  prompt        text not null,

  -- Anything the model must NOT introduce for this material.
  negative      text,

  status        text not null default 'current'
                  check (status in ('current','new','discontinued')),
  -- Retired colours keep a badged spot rather than vanishing — the settled
  -- OC Colors behaviour, applied here for the same reason: a homeowner may be
  -- matching an existing elevation.
  replaced_by   text,

  sort_order    integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (category, manufacturer, product_line, color_name)
);

create index if not exists materials_category_idx on public.materials (category);
create index if not exists materials_status_idx   on public.materials (status);

alter table public.materials enable row level security;

-- Catalog: every signed-in staff member reads it (the settled "Yes they can
-- see colors" decision, applied to the same kind of surface). Only admins
-- write it — a wrong prompt here silently degrades every future render.
drop policy if exists materials_read   on public.materials;
drop policy if exists materials_write  on public.materials;
drop policy if exists materials_update on public.materials;
drop policy if exists materials_delete on public.materials;

create policy materials_read   on public.materials for select using (is_staff());
create policy materials_write  on public.materials for insert with check (is_cardinal_admin());
create policy materials_update on public.materials for update using (is_cardinal_admin())
                                                          with check (is_cardinal_admin());
create policy materials_delete on public.materials for delete using (is_cardinal_admin());


-- ---------------------------------------------------------------------------
-- 2. DESIGN_JOBS — the queue itself.
-- ---------------------------------------------------------------------------
create table if not exists public.design_jobs (
  id            uuid primary key default gen_random_uuid(),

  -- The CRM lead this belongs to. Nullable: a rep may visualise a house
  -- before the job exists as a record.
  project_id    uuid references public.projects(id) on delete set null,

  -- Storage path of the house photograph, under photos/visualizer/.
  -- ⚠ A PATH, never a signed URL: signed URLs expire, and a job may sit in
  -- the queue overnight. Same lesson as estimates.photos.
  source_path   text not null,

  -- ⚠ FROZEN. The full resolved selection — for each surface, which catalog it
  -- came from, its id, the customer-facing name, AND the exact prompt text
  -- used. Denormalised ON PURPOSE, for two reasons:
  --   (a) re-running a job must reproduce the same image, so the prompt cannot
  --       be allowed to drift when someone edits the catalog row;
  --   (b) this is the record of what was actually shown to a customer.
  -- Same reasoning as "never mutate estimates.photos".
  -- Shape: { "roof":   { "source":"oc_colors", "id":"…", "name":"Onyx Black",
  --                      "prompt":"…" },
  --          "siding": { "source":"materials", "id":"…", … }, … }
  selections    jsonb not null,

  status        text not null default 'queued'
                  check (status in ('queued','claimed','running','done','failed','cancelled')),

  -- Written by the worker: SAM 2's masks, as storage paths per surface, so the
  -- presentation app can overlay them and let a rep tap a region.
  -- { "roof":"visualizer/<id>/mask_roof.png", … }
  masks         jsonb,

  render_path   text,          -- the finished image, photos/visualizer/<id>/render.jpg
  preview_path  text,          -- a small copy for grid tiles (the 633 lesson)

  -- Worker bookkeeping.
  claimed_by    text,          -- worker hostname, so a stuck job names its box
  claimed_at    timestamptz,
  started_at    timestamptz,
  finished_at   timestamptz,
  attempts      integer not null default 0,
  error         text,          -- the worker's own sentence, shown verbatim

  -- Roughly how long it took, so the office learns what a batch really costs.
  duration_ms   integer,

  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The worker's hot path: oldest queued job first.
create index if not exists design_jobs_queue_idx
  on public.design_jobs (status, created_at)
  where status in ('queued','claimed','running');

create index if not exists design_jobs_project_idx on public.design_jobs (project_id);

-- ⚠ NO lat/lon COLUMNS, AND NONE MAY BE ADDED. The EXIF/GPS exclusion in
-- CONTRACTOR_VISION_SUITE.md runs straight through this table: it is a path
-- from a customer's house photograph toward a screen and a PDF. The worker
-- must strip EXIF on ingest (spark/strip_exif.py already exists for this).
-- Do not "complete" this row with coordinates.

alter table public.design_jobs enable row level security;

drop policy if exists design_jobs_read   on public.design_jobs;
drop policy if exists design_jobs_write  on public.design_jobs;
drop policy if exists design_jobs_update on public.design_jobs;
drop policy if exists design_jobs_delete on public.design_jobs;

-- A rep sees the jobs they queued; admins see everything. Deliberately NOT
-- is_staff() for read: a job carries a customer's house and their selections.
create policy design_jobs_read on public.design_jobs for select
  using (is_cardinal_admin() or created_by = my_email());

create policy design_jobs_write on public.design_jobs for insert
  with check (is_staff() and created_by = my_email());

-- The app may cancel its own job; it may not fake a completion. Everything
-- else about a job's lifecycle is the worker's to write, and the worker uses
-- the service role, which bypasses RLS.
create policy design_jobs_update on public.design_jobs for update
  using (is_cardinal_admin() or created_by = my_email())
  with check (is_cardinal_admin() or created_by = my_email());

create policy design_jobs_delete on public.design_jobs for delete
  using (is_cardinal_admin() or created_by = my_email());


-- ---------------------------------------------------------------------------
-- 3. CLAIM — the one piece of real concurrency control.
--
-- Two workers (or one worker restarted mid-run) must never take the same job.
-- FOR UPDATE SKIP LOCKED is the standard Postgres queue primitive: each caller
-- locks a different row instead of blocking on the same one.
--
-- security definer so the worker needs no table grants beyond execute, and
-- so this remains the ONLY way a row leaves 'queued'.
-- ---------------------------------------------------------------------------
create or replace function public.claim_design_job(p_worker text)
returns public.design_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.design_jobs;
begin
  select * into j
    from public.design_jobs
   where status = 'queued'
   order by created_at
   for update skip locked
   limit 1;

  if not found then
    return null;
  end if;

  update public.design_jobs
     set status     = 'claimed',
         claimed_by = p_worker,
         claimed_at = now(),
         attempts   = attempts + 1,
         updated_at = now()
   where id = j.id
   returning * into j;

  return j;
end;
$$;

revoke all on function public.claim_design_job(text) from public, anon, authenticated;
grant execute on function public.claim_design_job(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. REQUEUE — a job whose worker died mid-run.
--
-- A box that loses power leaves rows stuck in 'claimed'/'running' forever.
-- This hands them back after a stale interval, capped at 3 attempts so a job
-- that genuinely crashes the pipeline stops rather than looping.
-- ---------------------------------------------------------------------------
create or replace function public.requeue_stale_design_jobs(p_older_than interval default '30 minutes')
returns integer
language sql
security definer
set search_path = public
as $$
  with bumped as (
    update public.design_jobs
       set status     = case when attempts >= 3 then 'failed' else 'queued' end,
           error      = case when attempts >= 3
                             then 'Gave up after 3 attempts — the render box did not finish this one.'
                             else error end,
           claimed_by = null,
           updated_at = now()
     where status in ('claimed','running')
       and coalesce(claimed_at, created_at) < now() - p_older_than
    returning 1
  )
  select count(*)::int from bumped;
$$;

revoke all on function public.requeue_stale_design_jobs(interval) from public, anon, authenticated;
grant execute on function public.requeue_stale_design_jobs(interval) to service_role;


-- ---------------------------------------------------------------------------
-- 5. DESIGN_RENDERS — the presentable results.
--
-- The previous Designer's table by the same name held ZERO rows and had zero
-- storage objects behind it (verified before this file was written), so this
-- drops and rebuilds rather than migrating. Nothing is lost.
--
-- Separate from design_jobs on purpose: a job is a unit of WORK (retried,
-- failed, abandoned), a render is a unit of PRESENTATION (shown, compared,
-- put in a proposal). Most jobs become one render; a failed job becomes none.
-- ---------------------------------------------------------------------------
drop table if exists public.design_renders cascade;

create table public.design_renders (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.design_jobs(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,

  title         text,
  source_path   text not null,
  render_path   text not null,
  preview_path  text,

  -- The same frozen shape as design_jobs.selections, carried forward so a
  -- proposal can be rebuilt from the render alone.
  selections    jsonb not null,

  -- Which engine produced it, e.g. 'spark/flux-fill+sam2'. Every render must
  -- be able to say what made it.
  via           text,

  -- Whether a human has actually looked at it. The settled Walk rule — AI
  -- proposes, a person confirms, THEN the client sees it — applies here too:
  -- an inpainting model will occasionally melt a dormer, and that must not
  -- reach a kitchen table unreviewed.
  approved      boolean not null default false,
  approved_by   text,
  approved_at   timestamptz,

  created_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists design_renders_project_idx  on public.design_renders (project_id);
create index if not exists design_renders_approved_idx on public.design_renders (approved);

alter table public.design_renders enable row level security;

create policy design_renders_read on public.design_renders for select
  using (is_cardinal_admin() or created_by = my_email());

create policy design_renders_write on public.design_renders for insert
  with check (is_staff() and created_by = my_email());

create policy design_renders_update on public.design_renders for update
  using (is_cardinal_admin() or created_by = my_email())
  with check (is_cardinal_admin() or created_by = my_email());

create policy design_renders_delete on public.design_renders for delete
  using (is_cardinal_admin() or created_by = my_email());


-- ---------------------------------------------------------------------------
-- 6. STORAGE — photos/visualizer/* and photos/materials/*
--
-- The bucket's general authenticated-read policy already covers reads. These
-- add the write side for the two new prefixes, mirroring the studio_objects
-- pattern that has been in production since 3 Aug.
-- ---------------------------------------------------------------------------
drop policy if exists visualizer_objects_write  on storage.objects;
drop policy if exists visualizer_objects_update on storage.objects;
drop policy if exists visualizer_objects_delete on storage.objects;
drop policy if exists materials_objects_write   on storage.objects;

create policy visualizer_objects_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and name like 'visualizer/%' and is_staff());

create policy visualizer_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and name like 'visualizer/%' and is_staff());

create policy visualizer_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and name like 'visualizer/%' and is_cardinal_admin());

-- Swatches are catalog data: admin-written, staff-read via the bucket policy.
create policy materials_objects_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and name like 'materials/%' and is_cardinal_admin());
