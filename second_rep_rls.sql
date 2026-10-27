-- second_rep_rls.sql — build 1408. A job's SECOND rep can see and work the job exactly like its primary.
--
-- WHY: Theo, 26 Oct 2026: "Make it in the CRM so you can have 2 people assigned to 1 lead." — and, asked
--   whether the second rep should also see the job's contracts, claims, payments, supplements, objection logs
--   and scope reads: YES.
--   checklist.lead.assigned is already a JSON array. Index 0 is the primary everywhere (assignedRepOf(),
--   ljAssignedEmail(), project_assigned_rep() = {lead,assigned,0}) and stays the primary. Build 1408 lets an admin
--   put a second rep at index 1. Measured 26 Oct before writing: 294 jobs carry an `assigned` array (none longer
--   than 1), 10 carry none.
--
-- WHAT — ONE clause swapped everywhere it gates access, and nothing else:
--     project_assigned_rep(<checklist>) = my_email()   ->   project_has_rep(<checklist>, my_email())
--   Every policy below was read from pg_policies on 26 Oct 2026 (read-only) and is recreated with the SAME name,
--   command, roles (public), permissive mode, USING and WITH CHECK text — only that clause differs. No WITH CHECK
--   is widened beyond what the primary already had: where the primary could insert/update (collections), the
--   second rep now can on the same terms; where a policy had no WITH CHECK, it still has none.
--
--   The sites (every one found by grepping pg_policies and pg_proc for project_assigned_rep, 26 Oct):
--     projects            projects_select, projects_update
--     collections         collections_select, collections_insert, collections_update (WITH CHECK only)
--     contracts           contracts_select
--     insurance_claims    insurance_claims_select, insurance_claims_update
--     insurance_payments  insurance_payments_select
--     insurance_supplements insurance_supplements_select
--     objection_logs      objection_logs_select
--     scope_reads         scope_reads_select
--     can_see_claim(uuid) — the function behind claim_notes, claim_upgrades and itel_reports (select / insert /
--                           update). Replaced with the same signature, language, volatility, SECURITY DEFINER
--                           and search_path, so those nine policies follow without being touched.
--   NOT changed, on purpose: default_sales_rep() also calls project_assigned_rep() — it picks the COMMISSION rep
--   (sales_rep), which stays the primary (second_rep_commission.sql handles the owner-job exception).
--   No storage.objects policy references it.
--
--   project_has_rep(ck text, em text): true when em equals ANY element of checklist->lead->assigned. Null-safe and
--   empty-safe like project_assigned_rep(): a null/empty checklist, a missing or non-array `assigned`, or a
--   null/empty email is false (never null). Exact text match, same as the clause it replaces. IMMUTABLE, not
--   SECURITY DEFINER, reads no table. It includes index 0, so nobody who could see a row before loses it.
--   The restrictive staff_only_1407 policies are untouched, so a non-staff account still sees nothing.
--
-- DEPLOY ORDER: run this (and second_rep_commission.sql) BEFORE the build 1408 index.html.
-- REVERT: the block at the end of this file, commented out — it recreates every policy and can_see_claim()
--   exactly as read on 26 Oct, then drops project_has_rep().

set lock_timeout = '3s';   -- never queue behind a long transaction and stall the live app

create or replace function public.project_has_rep(ck text, em text)
returns boolean
language sql
immutable
as $$
  select case
    when ck is null or ck = '' or em is null or em = '' then false
    when jsonb_typeof(ck::jsonb #> '{lead,assigned}') = 'array'
      then exists (select 1 from jsonb_array_elements_text(ck::jsonb #> '{lead,assigned}') a(v) where a.v = em)
    else false
  end;
$$;

begin;

-- ---- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  as permissive for select to public
  using (is_full_access() OR is_field() OR (created_by = my_email()) OR project_has_rep(checklist, my_email()) OR (sales_rep = my_email()));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  as permissive for update to public
  using (is_full_access() OR is_field() OR (created_by = my_email()) OR project_has_rep(checklist, my_email()) OR (sales_rep = my_email()));

-- ---- collections
drop policy if exists collections_select on public.collections;
create policy collections_select on public.collections
  as permissive for select to public
  using (is_full_access() OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR project_has_rep(p.checklist, my_email()))))));

drop policy if exists collections_insert on public.collections;
create policy collections_insert on public.collections
  as permissive for insert to public
  with check (is_full_access() OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR project_has_rep(p.checklist, my_email()))))));

drop policy if exists collections_update on public.collections;
create policy collections_update on public.collections
  as permissive for update to public
  using (is_cardinal_admin() OR (is_full_access() AND (created_by = my_email())) OR ((created_by = my_email()) AND (created_at > (now() - '48:00:00'::interval)) AND (NOT (EXISTS ( SELECT 1
   FROM commissions c
  WHERE ((c.collection_id = collections.id) AND (c.status <> 'pending'::text)))))))
  with check (is_cardinal_admin() OR (is_full_access() AND (created_by = my_email())) OR ((created_by = my_email()) AND (created_at > (now() - '48:00:00'::interval)) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR project_has_rep(p.checklist, my_email())))))));

-- ---- contracts
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  as permissive for select to public
  using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = contracts.project_id) AND project_has_rep(p.checklist, my_email())))));

-- ---- insurance_claims
drop policy if exists insurance_claims_select on public.insurance_claims;
create policy insurance_claims_select on public.insurance_claims
  as permissive for select to public
  using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = insurance_claims.project_id) AND project_has_rep(p.checklist, my_email())))));

drop policy if exists insurance_claims_update on public.insurance_claims;
create policy insurance_claims_update on public.insurance_claims
  as permissive for update to public
  using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = insurance_claims.project_id) AND project_has_rep(p.checklist, my_email())))));

-- ---- insurance_payments
drop policy if exists insurance_payments_select on public.insurance_payments;
create policy insurance_payments_select on public.insurance_payments
  as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM insurance_claims c
  WHERE ((c.id = insurance_payments.claim_id) AND (is_full_access() OR (c.created_by = my_email()) OR project_has_rep(( SELECT projects.checklist
           FROM projects
          WHERE (projects.id = c.project_id)), my_email()))))));

-- ---- insurance_supplements
drop policy if exists insurance_supplements_select on public.insurance_supplements;
create policy insurance_supplements_select on public.insurance_supplements
  as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM insurance_claims c
  WHERE ((c.id = insurance_supplements.claim_id) AND (is_full_access() OR (c.created_by = my_email()) OR project_has_rep(( SELECT projects.checklist
           FROM projects
          WHERE (projects.id = c.project_id)), my_email()))))));

-- ---- objection_logs
drop policy if exists objection_logs_select on public.objection_logs;
create policy objection_logs_select on public.objection_logs
  as permissive for select to public
  using (is_full_access() OR (logged_by = my_email()) OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = objection_logs.project_id) AND project_has_rep(p.checklist, my_email())))));

-- ---- scope_reads
drop policy if exists scope_reads_select on public.scope_reads;
create policy scope_reads_select on public.scope_reads
  as permissive for select to public
  using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = scope_reads.project_id) AND project_has_rep(p.checklist, my_email())))));

-- ---- can_see_claim(): claim_notes, claim_upgrades, itel_reports follow it
create or replace function public.can_see_claim(cid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.insurance_claims c
     where c.id = cid
       and ( public.is_full_access()
          or c.created_by = public.my_email()
          or public.project_has_rep(
               (select p.checklist from public.projects p where p.id = c.project_id),
               public.my_email()
             ) )
  );
$function$;

commit;

-- verify (run by hand):
--   select tablename, policyname from pg_policies
--    where coalesce(qual,'') ilike '%project_assigned_rep%' or coalesce(with_check,'') ilike '%project_assigned_rep%';
--     -- expect ZERO rows
--   select tablename, policyname from pg_policies
--    where coalesce(qual,'') ilike '%project_has_rep%' or coalesce(with_check,'') ilike '%project_has_rep%';
--     -- expect 12 rows (the policies above; can_see_claim() is a function, not a policy)
--   select public.project_has_rep('{"lead":{"assigned":["a@x","b@x"]}}', 'b@x');   -- true
--   select public.project_has_rep('{"lead":{"assigned":["a@x"]}}', 'b@x');         -- false
--   select public.project_has_rep('{"lead":{}}', 'a@x'), public.project_has_rep(null, 'a@x'),
--          public.project_has_rep('', 'a@x'), public.project_has_rep('{"lead":{"assigned":["a@x"]}}', null);  -- all false

-- ======================================================================================================
-- REVERT (as read from pg_policies / pg_proc on 26 Oct 2026). Uncomment and run as one block.
-- ======================================================================================================
-- REVERT-BEGIN
-- begin;
-- drop policy if exists projects_select on public.projects;
-- create policy projects_select on public.projects as permissive for select to public
--   using (is_full_access() OR is_field() OR (created_by = my_email()) OR (project_assigned_rep(checklist) = my_email()) OR (sales_rep = my_email()));
-- drop policy if exists projects_update on public.projects;
-- create policy projects_update on public.projects as permissive for update to public
--   using (is_full_access() OR is_field() OR (created_by = my_email()) OR (project_assigned_rep(checklist) = my_email()) OR (sales_rep = my_email()));
-- drop policy if exists collections_select on public.collections;
-- create policy collections_select on public.collections as permissive for select to public
--   using (is_full_access() OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR (project_assigned_rep(p.checklist) = my_email()))))));
-- drop policy if exists collections_insert on public.collections;
-- create policy collections_insert on public.collections as permissive for insert to public
--   with check (is_full_access() OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR (project_assigned_rep(p.checklist) = my_email()))))));
-- drop policy if exists collections_update on public.collections;
-- create policy collections_update on public.collections as permissive for update to public
--   using (is_cardinal_admin() OR (is_full_access() AND (created_by = my_email())) OR ((created_by = my_email()) AND (created_at > (now() - '48:00:00'::interval)) AND (NOT (EXISTS ( SELECT 1 FROM commissions c WHERE ((c.collection_id = collections.id) AND (c.status <> 'pending'::text)))))))
--   with check (is_cardinal_admin() OR (is_full_access() AND (created_by = my_email())) OR ((created_by = my_email()) AND (created_at > (now() - '48:00:00'::interval)) AND (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = collections.project_id) AND ((p.sales_rep = my_email()) OR (project_assigned_rep(p.checklist) = my_email())))))));
-- drop policy if exists contracts_select on public.contracts;
-- create policy contracts_select on public.contracts as permissive for select to public
--   using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = contracts.project_id) AND (project_assigned_rep(p.checklist) = my_email())))));
-- drop policy if exists insurance_claims_select on public.insurance_claims;
-- create policy insurance_claims_select on public.insurance_claims as permissive for select to public
--   using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = insurance_claims.project_id) AND (project_assigned_rep(p.checklist) = my_email())))));
-- drop policy if exists insurance_claims_update on public.insurance_claims;
-- create policy insurance_claims_update on public.insurance_claims as permissive for update to public
--   using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = insurance_claims.project_id) AND (project_assigned_rep(p.checklist) = my_email())))));
-- drop policy if exists insurance_payments_select on public.insurance_payments;
-- create policy insurance_payments_select on public.insurance_payments as permissive for select to public
--   using ((EXISTS ( SELECT 1 FROM insurance_claims c WHERE ((c.id = insurance_payments.claim_id) AND (is_full_access() OR (c.created_by = my_email()) OR (project_assigned_rep(( SELECT projects.checklist FROM projects WHERE (projects.id = c.project_id))) = my_email()))))));
-- drop policy if exists insurance_supplements_select on public.insurance_supplements;
-- create policy insurance_supplements_select on public.insurance_supplements as permissive for select to public
--   using ((EXISTS ( SELECT 1 FROM insurance_claims c WHERE ((c.id = insurance_supplements.claim_id) AND (is_full_access() OR (c.created_by = my_email()) OR (project_assigned_rep(( SELECT projects.checklist FROM projects WHERE (projects.id = c.project_id))) = my_email()))))));
-- drop policy if exists objection_logs_select on public.objection_logs;
-- create policy objection_logs_select on public.objection_logs as permissive for select to public
--   using (is_full_access() OR (logged_by = my_email()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = objection_logs.project_id) AND (project_assigned_rep(p.checklist) = my_email())))));
-- drop policy if exists scope_reads_select on public.scope_reads;
-- create policy scope_reads_select on public.scope_reads as permissive for select to public
--   using (is_full_access() OR (created_by = my_email()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = scope_reads.project_id) AND (project_assigned_rep(p.checklist) = my_email())))));
-- create or replace function public.can_see_claim(cid uuid) returns boolean language sql stable security definer
--   set search_path to 'public' as $function$
--   select exists ( select 1 from public.insurance_claims c where c.id = cid
--     and ( public.is_full_access() or c.created_by = public.my_email()
--        or public.project_assigned_rep((select p.checklist from public.projects p where p.id = c.project_id)) = public.my_email() ) );
-- $function$;
-- commit;
-- drop function if exists public.project_has_rep(text, text);
-- REVERT-END
