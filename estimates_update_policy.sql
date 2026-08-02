-- ═══════════════════════════════════════════════════════════════════════════
--  Close the open UPDATE policy on public.estimates
--  SQL ONLY. No index.html change goes with this, so it can run any time.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  WHAT IS WRONG TODAY. Measured against the live database, not assumed:
--
--      est_read    SELECT   is_full_access() OR the project is readable
--      est_write   INSERT   (created_by = my_email() OR created_by IS NULL)
--                             AND the project is readable
--      est_delete  DELETE   is_full_access() OR created_by = my_email()
--      est_update  UPDATE   USING (true)  WITH CHECK (true)      ← wide open
--
--  So **any signed-in user can edit any estimate** — change its line items, its
--  total, its status, or archive it — including estimates they cannot delete and
--  did not create. Nick, Joey and Jacob included. That is not a hole this build
--  opened; it has been there since the table shipped, and it survived because
--  nothing in the UI offered to do it until the Estimates list started showing
--  other people's estimates.
--
--  This is the only one of the four policies that does not carry an ownership
--  test. est_delete already has exactly the right one.
--
--  WHO CAN UPDATE AFTER THIS
--    is_full_access()          theo, joan, curtis, scottie  → any estimate
--    created_by = my_email()   a rep                        → their own
--
--  Deliberately IDENTICAL to est_delete rather than a new rule. A user who may
--  delete their own estimate should be able to edit it, and nobody should be able
--  to edit what they cannot delete. One ownership rule for this table, not two.
--
--  Rows with created_by IS NULL become full-access-only. est_write permits a NULL
--  (the app sets `payload.created_by = myEmail() || null`), so this fails closed
--  rather than leaving an unowned row editable by anyone. All 12 rows in the table
--  today have a created_by; none are affected.
--
--  THE WITH CHECK, and why it is not just a copy of the USING clause:
--  USING decides which rows you may touch. WITH CHECK decides what the row is
--  allowed to look like afterwards. Without it, a rep could edit their own
--  estimate and, in the same statement, set created_by to somebody else — handing
--  the row away and locking themselves out — or move it onto a project they
--  cannot see. The EXISTS mirrors est_write's, so an estimate cannot be relocated
--  anywhere its creator could not have made one.
--
--  ⚠ KNOWN COST — three writes that will start failing SILENTLY
--  Publishing an estimate writes back to the row, and all three of these sites
--  swallow their error:
--
--      index.html ~40027   .update({ doc_id: docId })            try{}catch(_){}
--      index.html ~40285   .update({ contract_doc_id: docId })   try{}catch(_){}
--      index.html ~40518   .update({ status:'sent' })            try{}catch(e){}
--
--  If a rep publishes an estimate somebody ELSE created, the document is still
--  generated and still saved — but the link back to the estimate is not written,
--  and nothing says so. A rep publishing their OWN estimate is unaffected, and
--  production (Curtis, Scottie) is unaffected because they are full-access. The
--  exposure is narrow, and today it is zero: all 12 estimates were created by
--  theo@, who is full-access.
--
--  saveEstimate() is NOT silent — it uses .select().single(), so a refused update
--  returns PGRST116 and the editor throws instead of pretending it saved.
--
--  Idempotent: safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists est_update on public.estimates;

create policy est_update on public.estimates
  for update
  to authenticated
  using ( is_full_access() or created_by = my_email() )
  with check (
    is_full_access()
    or ( created_by = my_email()
         and exists (select 1 from projects p where p.id = estimates.project_id) )
  );

-- ── verify ─────────────────────────────────────────────────────────────────
-- Expect one row, and neither expression may be the bare literal `true`.
select policyname,
       cmd,
       roles::text,
       qual       as using_expr,
       with_check as with_check_expr
from pg_policies
where schemaname = 'public' and tablename = 'estimates' and cmd = 'UPDATE';

-- All four policies side by side. Every one should now carry an ownership or
-- visibility test; none should read `true`.
select cmd, policyname, coalesce(qual::text, '—') as using_expr
from pg_policies
where schemaname = 'public' and tablename = 'estimates'
order by cmd;
