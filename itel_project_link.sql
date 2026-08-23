-- Build 1002 — attach an iTel lab report to a job.
-- The 28 rows in itel_lab_reports have never been linked to anything: claim_id
-- is NULL on every one, and the three that could be attached belong to jobs
-- with no claim at all, so a claim link is unfillable. The report is about the
-- shingle on a house, not about one claim — link it to the JOB, and any claim
-- on that job can read it. Theo's call, 23 Aug.
--
-- Run this BEFORE deploying the matching index.html (build 1002).
-- Nullable + ON DELETE SET NULL: adding it changes no existing row, and a
-- deleted project simply unlinks its reports rather than deleting them.
-- No RLS change needed: itel_lab_reports_write is already ALL / is_cardinal_admin(),
-- so an admin can set this column; SELECT stays authenticated-read as before.
alter table public.itel_lab_reports
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists itel_lab_reports_project_id_idx
  on public.itel_lab_reports(project_id);
