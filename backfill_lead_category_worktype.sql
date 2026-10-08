-- Build 1261 — Job Category and Work Type on the leads entered before 1253
-- (Theo, 8 Oct 2026: "Yes fill in job categories").
--
-- Until build 1253 the New Lead form saved Category and Work Type only NESTED,
-- at checklist.lead.category / checklist.lead.worktype. Job Details, the Leads
-- list, the Edit form and the reports read the FLAT keys checklist.job_category
-- / checklist.work_type (what the Edit form writes), so what Joan picked never
-- showed. 1253 made the intake write both; this fills in the leads it missed.
--
-- The rule, and the only thing this does:
--   copy the nested value into the flat key WHEN the nested value is set AND the
--   flat key is missing, null or ''. A flat value somebody already set is never
--   touched — 3 leads have a flat Work Type that differs from the nested one,
--   which means someone changed it on purpose after intake; they keep it.
--
-- checklist is TEXT holding JSON (not jsonb), so the row is read as jsonb, the
-- keys are merged with ||, and it is written back as text. Key order and
-- whitespace normalise on the way through; every reader parses it, so the
-- content is identical. No trigger fires: projects has two BEFORE INSERT
-- triggers and one BEFORE UPDATE OF sales_rep, and this sets checklist only.
--
-- Measured on production before running (80 projects, all JSON):
--   18 need job_category (all 'Residential')
--   24 need work_type    (New 18 · Repair 2 · Retail 2 · Insurance 1 · Warranty 1)
--   26 projects in all. Their ids are in cardinal_build_log.md under build 1261.
--
-- REPLAYABLE: a second run matches nothing (the flat keys are no longer empty).
-- REVERT: there is no blind revert — the flat keys can be edited since. To undo,
-- set job_category / work_type back to null on the 26 ids in the build log, and
-- only where the value still equals the nested one.

update public.projects p
set checklist = (
      p.checklist::jsonb
      || case when coalesce(p.checklist::jsonb -> 'lead' ->> 'category', '') <> ''
               and coalesce(p.checklist::jsonb ->> 'job_category', '') = ''
              then jsonb_build_object('job_category', p.checklist::jsonb -> 'lead' ->> 'category')
              else '{}'::jsonb end
      || case when coalesce(p.checklist::jsonb -> 'lead' ->> 'worktype', '') <> ''
               and coalesce(p.checklist::jsonb ->> 'work_type', '') = ''
              then jsonb_build_object('work_type', p.checklist::jsonb -> 'lead' ->> 'worktype')
              else '{}'::jsonb end
    )::text
where p.checklist ~ '^\s*\{'
  and (   (coalesce(p.checklist::jsonb -> 'lead' ->> 'category', '') <> ''
           and coalesce(p.checklist::jsonb ->> 'job_category', '') = '')
       or (coalesce(p.checklist::jsonb -> 'lead' ->> 'worktype', '') <> ''
           and coalesce(p.checklist::jsonb ->> 'work_type', '') = ''));
