-- Build 1108 — Invoices & AR, phase 2: let a SALES REP record an OFFLINE payment
-- (check / cash / bank transfer) on a job assigned to them.
--
-- Why: the collections INSERT policy was is_full_access() only (admins +
-- production), so a rep who took a deposit check at the kitchen table had no way
-- to enter it. This widens INSERT to also allow a rep on their OWN assigned job —
-- the exact scope the SELECT policy already grants
-- (projects.sales_rep = my_email()). Admins + production are unchanged.
--
-- ⚠ collections drives the three commission triggers, so a rep recording a
-- payment books the commission on that collection, as designed — admin still
-- writes the checks and reconciles. This does not widen who can EDIT or DELETE a
-- collection (both remain admin / full-access + own row); a rep can only ADD one
-- to a job that is already theirs.
--
-- Idempotent: drops and recreates the one INSERT policy. Apply BEFORE the
-- index.html build that lets reps open the Record-Offline-Payment modal.

drop policy if exists collections_insert on public.collections;

create policy collections_insert on public.collections
  for insert to public
  with check (
    is_full_access()
    or exists (
      select 1 from public.projects p
      where p.id = collections.project_id
        and p.sales_rep = my_email()
    )
  );
