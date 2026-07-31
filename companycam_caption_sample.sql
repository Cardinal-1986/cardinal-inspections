-- companycam_caption_sample.sql — a caption sample that is actually a sample.
-- Run BEFORE deploying the index.html / api change. Idempotent, additive, no data touched.
--
-- WHY. Build 478 shipped a 50-photo AI caption trial so Theo could judge the
-- captions before spending on 60,406. Its sampler said, in its own comment:
--
--     "A spread, not the newest 50: order by id so the sample crosses years,
--      crews and job types rather than sampling one week of one roof."
--
-- It did the opposite. Measured after the first real run:
--
--     photos captioned      53
--     distinct jobs          1     <-- one
--     distinct crews         1
--     date range      2023-12-19 .. 2023-12-20   (two days)
--     index spans     2007-03-29 .. 2026-07-30
--
-- `order by id asc` is not a shuffle. CompanyCam ids sort close to creation
-- order, so it took the OLDEST photos, which are all one job. It sampled exactly
-- the "one week of one roof" the comment promised to avoid. My error, and the
-- reason the trial could not answer the question it was built to answer: half
-- the 53 read "water staining indicating an active roof leak", which is true of
-- that house and tells you nothing about the other 60,432 photographs.
--
-- WHAT THIS DOES. One photo from each of N DIFFERENT jobs.
--
--   * `distinct on (project_id)` -> at most one row per job.
--   * `not exists (... ai_description is not null)` -> a job that already has a
--     caption drops out entirely. Without this the batching defeats itself: each
--     call would re-pick the same handful of jobs and just choose a different
--     photo from them, and 50 photos would come from 6 roofs instead of 50.
--   * `order by md5(id)` -> a stable pseudo-random spread across the whole
--     account rather than a slice of one year. Stable matters: re-running picks
--     the SAME jobs instead of spending on a fresh set, which was 478's intent
--     and is the one thing it got right.
--   * the newest photo of each job (`captured_at desc`), because a job's later
--     photographs show finished and damaged conditions rather than arrival shots.

create or replace function companycam_caption_sample(n integer default 6)
returns table (id text, preview_url text, thumb_url text, project_name text)
language sql
stable
security definer
set search_path = public
as $$
  with one_per_job as (
    select distinct on (p.project_id)
           p.id, p.preview_url, p.thumb_url, p.project_name
      from companycam_photos p
     where p.ai_description is null
       and p.preview_url  is not null
       and p.project_id   is not null
       and not exists (
             select 1
               from companycam_photos q
              where q.project_id = p.project_id
                and q.ai_description is not null)
     order by p.project_id, p.captured_at desc nulls last, p.id
  )
  select id, preview_url, thumb_url, project_name
    from one_per_job
   order by md5(id)
   limit greatest(coalesce(n, 6), 1);
$$;

comment on function companycam_caption_sample(integer) is
  'One photo from each of N different CompanyCam jobs, jobs with a caption excluded. Stable across re-runs.';

-- Progress is measured in JOBS, not photographs. 53 photos of one roof is one
-- data point, not fifty, and reporting it as "53 of 50 done" is how the first
-- trial looked finished while having answered nothing.
create or replace function companycam_caption_jobs_done()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct project_id)::int
    from companycam_photos
   where ai_description is not null;
$$;

comment on function companycam_caption_jobs_done() is
  'How many distinct CompanyCam jobs have at least one AI caption.';

-- Same lock as companycam_backfill_project_names, which is already
-- postgres=X | service_role=X. These are SECURITY DEFINER, so they bypass RLS;
-- a signed-in non-admin browser must not be able to call them directly and read
-- preview urls and job names straight out of the mirror.
revoke all on function companycam_caption_sample(integer)  from public, anon, authenticated;
revoke all on function companycam_caption_jobs_done()      from public, anon, authenticated;
grant execute on function companycam_caption_sample(integer) to service_role;
grant execute on function companycam_caption_jobs_done()     to service_role;
