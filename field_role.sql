-- field_role.sql — the DATABASE half of "Scottie stays in Production" (Theo, 11 Oct 2026:
-- "Scottie 2 — I don't want to complicate things for Scottie, he's never at a desk").
-- The app half shipped at build 1317 (isFieldUser / body.cr-field).
--
-- ✅ APPLIED 12 Oct 2026 (Theo: "run it"). The app half that takes Scottie out of the app's own
--   is_full_access() mirror is build 1321.
--   ⚠ HOW IT WAS APPLIED: DROP/CREATE POLICY on public.projects hung past 60s every time (three
--   tries, even with lock_timeout, no blocker visible in pg_locks), while every other table took
--   it at once. ALTER POLICY ... USING (...) went through instantly. The policies below are what
--   is live; on projects/estimates/inspection_reports/document_versions they were set with ALTER
--   POLICY, the same expressions as written here. Verified as Scottie: 86 jobs, 14 punch items,
--   12 crews, 4 work orders, 340 photos; 0 estimates, documents, collections, contracts,
--   commissions, crew rates. Curtis unchanged (27 estimates, 55 documents, 5 collections).
-- ⚠ After running: sign in AS SCOTTIE on a phone and walk Production Board, Crew Dispatch,
--   Punch List, a punch card (photos, receipts, time on job), Route, and Notifications.
--   Revert block at the bottom.
--
-- WHAT IT DOES
--   1. is_field(): Scottie.
--   2. is_full_access() drops Scottie (Theo, Joan, Curtis stay).
--   3. He keeps what Production reads: every job row (name, address, phone, stage, schedule),
--      punch items (already follow the job), job/drop appointments (already follow the job),
--      crews, crew notes and crew work orders (read only).
--   4. The money tables stop reaching him through "you can see the job": estimates,
--      inspection_reports (estimates, contracts, invoices live there), document_versions.
--      collections, contracts, commissions, crew_rates, crew_payments, draws never reached
--      him except through is_full_access(), which he leaves.
--
-- WHAT IT DOES NOT DO (stated so nobody assumes it):
--   * projects.checklist still carries a few money fields (manual_value, the community bid
--     amounts). Row security is per row, not per field; hiding them needs a view, which is
--     a bigger change. The app never shows them to him (1317).
--   * crew_work_orders.amount is readable to him, for the same reason. The app's dispatch
--     board does not select it and the Crews screen is closed to him.
--   * He loses DELETE on punch items (it was only ever via is_full_access) — punch work is
--     assigned and closed by the punch bosses (Theo, Joan, Curtis; is_punch_boss()).

begin;

create or replace function public.is_field()
returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('scottie@cardinalrenovations.net');
$$;

create or replace function public.is_full_access()
returns boolean language sql stable as $$
  select (auth.jwt() ->> 'email') in (
    'theo@cardinalrenovations.net',
    'joan@cardinalrenovations.net',
    'curtis@cardinalrenovations.net'
  );
$$;

-- every job on the board (the punch card writes the job's checklist: time on job, truck list)
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select using (
  is_full_access() or is_field() or created_by = my_email()
  or project_assigned_rep(checklist) = my_email() or sales_rep = my_email());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update using (
  is_full_access() or is_field() or created_by = my_email()
  or project_assigned_rep(checklist) = my_email() or sales_rep = my_email());

-- crews, read only
create policy crews_field_read on public.crews for select using (is_field());
create policy crew_notes_field_read on public.crew_notes for select using (is_field());
create policy crew_work_orders_field_read on public.crew_work_orders for select using (is_field());

-- money: "you can see the job" no longer opens its estimates and documents to a field user
drop policy if exists est_read on public.estimates;
create policy est_read on public.estimates for select to authenticated using (
  is_full_access() or (not is_field() and exists (select 1 from projects pr where pr.id = estimates.project_id)));

drop policy if exists reports_select on public.inspection_reports;
create policy reports_select on public.inspection_reports for select to authenticated using (
  is_full_access() or created_by = my_email()
  or (not is_field() and exists (select 1 from projects p where p.id = inspection_reports.project_id)));
drop policy if exists reports_update on public.inspection_reports;
create policy reports_update on public.inspection_reports for update to authenticated using (
  is_full_access() or created_by = my_email()
  or (not is_field() and exists (select 1 from projects p where p.id = inspection_reports.project_id)));

drop policy if exists docver_select on public.document_versions;
create policy docver_select on public.document_versions for select to authenticated using (
  exists (select 1 from inspection_reports d where d.id = document_versions.document_id and (
    is_full_access() or d.created_by = my_email()
    or (not is_field() and exists (select 1 from projects p where p.id = d.project_id)))));

commit;

-- ── REVERT (run as one block) ────────────────────────────────────────────────────────────
-- begin;
-- create or replace function public.is_full_access() returns boolean language sql stable as $$
--   select (auth.jwt() ->> 'email') in ('theo@cardinalrenovations.net','joan@cardinalrenovations.net',
--     'curtis@cardinalrenovations.net','scottie@cardinalrenovations.net'); $$;
-- drop policy if exists crews_field_read on public.crews;
-- drop policy if exists crew_notes_field_read on public.crew_notes;
-- drop policy if exists crew_work_orders_field_read on public.crew_work_orders;
-- (the projects / estimates / inspection_reports / document_versions policies above are the
--  originals plus "is_field()" terms; with is_field() pointing at nobody they behave as before:)
-- create or replace function public.is_field() returns boolean language sql stable as $$ select false; $$;
-- commit;
