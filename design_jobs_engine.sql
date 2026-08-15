-- design_jobs.engine — WHICH renderer answers this job.
--
-- ─────────────────────────────────────────────────────────────────────────
-- WHY
--
-- Two renderers now exist and they are good at opposite things, proven on
-- real Cardinal photographs on 15 Aug:
--
--   spark   the DGX box: segment, then recolour in LAB inside the mask.
--           Hits the Owens Corning hex to within 2-4 of 255, measured on the
--           delivered pixels. Cannot paint a surface that is not in the mask,
--           so it structurally cannot repaint siding you did not select.
--           Free to run. Its weakness is the segmenter missing a roof plane.
--
--   gemini  /api/design: one image-to-image press, ~2s, no segmentation at
--           all, so it never "misses a plane". Its weakness is the opposite
--           and unfixable from our side — asked for the roof only, it came
--           back with the siding a different colour, once gave a standing-seam
--           porch deck brown architectural shingles, and produced a mint roof,
--           a tan roof and a re-framed scene from one identical prompt.
--
-- Neither is the winner. The rep picks, per render, and the job says which.
--
-- ─────────────────────────────────────────────────────────────────────────
-- ORDER OF OPERATIONS — this file runs BEFORE the visualizer/index.html that
-- writes engine:'gemini'.
--
-- This is the normStage rule from CLAUDE.md, in its other form. There the
-- hazard is a whitelist silently rewriting an unknown value to 'Lead'; here
-- the check constraint REFUSES the insert outright, so a client shipped ahead
-- of this migration cannot queue a Gemini job at all. Ship the vocabulary
-- first, then the writer. Reversed, every Gemini render fails at the insert.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE FENCE THAT MATTERS
--
-- claim_design_job() is the ONLY way a row leaves 'queued'. Until it filters
-- on engine, the Spark claims Gemini jobs too — it would segment and recolour
-- a job the browser is simultaneously answering, and the two would race to
-- write the same render_path. Adding the column without the filter is worse
-- than not adding it.
--
-- A Gemini job is answered by the BROWSER (the caller holds the session that
-- /api/design gates on). So there is no worker to hand it back to when it
-- stalls: a tab that closed is not coming back. requeue_stale therefore FAILS
-- a stale Gemini job rather than returning it to a queue nothing drains.
--
-- Idempotent. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.design_jobs
  add column if not exists engine text not null default 'spark';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'design_jobs_engine_ck'
  ) then
    alter table public.design_jobs
      add constraint design_jobs_engine_ck check (engine in ('spark','gemini'));
  end if;
end $$;

comment on column public.design_jobs.engine is
  'Which renderer answers this job: spark (DGX box — segment + LAB recolour, '
  'exact OC hex, cannot leave the mask) or gemini (/api/design — one '
  'image-to-image press, faster and sharper, but will repaint surfaces it was '
  'not asked to touch). Default spark. claim_design_job() only ever claims '
  'spark rows; gemini rows are answered by the browser that queued them.';

-- Existing rows are all Spark work. The default covers them, but say it.
update public.design_jobs set engine = 'spark' where engine is null;

-- ---------------------------------------------------------------------------
-- CLAIM — now engine-aware. Body otherwise byte-identical to visualizer_schema.
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
     and engine = 'spark'      -- gemini rows belong to the browser that queued them
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
-- REQUEUE — a Spark job goes back on the queue; a Gemini job cannot.
-- ---------------------------------------------------------------------------
create or replace function public.requeue_stale_design_jobs(p_older_than interval default '30 minutes')
returns integer
language sql
security definer
set search_path = public
as $$
  with bumped as (
    update public.design_jobs
       set status     = case
                          when engine = 'gemini' then 'failed'
                          when attempts >= 3     then 'failed'
                          else 'queued'
                        end,
           error      = case
                          when engine = 'gemini'
                            then 'The browser that started this render went away before it finished. Render again.'
                          when attempts >= 3
                            then 'Gave up after 3 attempts — the render box did not finish this one.'
                          else error
                        end,
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

-- No RLS change. design_jobs policies cover every column, and `engine` is not
-- sensitive: it names a renderer, not a person, a place or a coordinate. The
-- GPS exclusion is untouched — this row still carries no latitude or longitude
-- and no column here may be added to give it one.
