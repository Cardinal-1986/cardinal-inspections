-- appointments_shared_calendar.sql
-- Build 1003 — the shared calendar.
--
-- Two changes to public.appointments, both additive and idempotent. Run this
-- in Supabase BEFORE deploying the build 1003 index.html.
--
-- WHY
-- Until now an appointment was visible only to the person who created it (plus
-- the two admins). That is correct for a personal diary entry, but a build day
-- or a material drop belongs to the whole crew on that job — the assigned rep
-- could not see the build day booked for their own client. Build 1003 opens
-- job/drop appointments to everyone who can already see the job, and leaves the
-- personal 'appt' and 'team' kinds exactly as private as they are today.
--
-- WHAT STAYS PRIVATE
-- The new visibility is gated on kind IN ('job','drop'). Personal 'appt' and
-- 'team' entries never match it, so Theo's diary ("Hair cut", "Higgins Tax
-- Guy") stays private to him — even the five 'appt' rows that happen to carry a
-- project_id, because the gate is the KIND, never the presence of a project.

-- 1) VISIBILITY
--    See a job/drop appointment if you can see its job. The EXISTS runs under
--    the projects table's own RLS (projects_select), so this mirrors precisely
--    who can see the job — is_full_access() OR created_by OR the assigned rep
--    OR the sales rep — without re-stating that rule here and risking drift.
--    Permissive, so it only ADDS visibility; the existing own/admin/joan SELECT
--    policies are untouched.
drop policy if exists "appt shared job select" on public.appointments;
create policy "appt shared job select" on public.appointments
  for select to authenticated
  using (
    kind in ('job','drop')
    and project_id is not null
    and exists (select 1 from public.projects p where p.id = appointments.project_id)
  );

-- 2) WRITE (repairs build 998)
--    Build 998 added "Attach to a job", which UPDATEs the appointment row. The
--    only UPDATE policy on this table was joan's, so Theo and the row's own
--    creator were silently refused. Grant UPDATE to the creator and to admins
--    (theo/joan/role='admin'), matching the table's existing own-or-admin
--    DELETE rule. A rep still cannot edit an appointment they did not create,
--    even one now visible to them — visibility is not write access.
drop policy if exists "appt own or admin update" on public.appointments;
create policy "appt own or admin update" on public.appointments
  for update to authenticated
  using (created_by = (auth.jwt() ->> 'email') or is_cardinal_admin())
  with check (created_by = (auth.jwt() ->> 'email') or is_cardinal_admin());
