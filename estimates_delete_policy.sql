-- ═══════════════════════════════════════════════════════════════════════════
--  Build 524 · allow an estimate to be deleted
--  RUN THIS BEFORE index.html SHIPS. Without it the new Delete button is a lie.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  public.estimates has RLS enabled and exactly three policies today:
--
--      est_read    SELECT   is_full_access() OR the project is readable
--      est_write   INSERT   created_by = my_email() OR created_by IS NULL
--      est_update  UPDATE   true
--
--  There is no DELETE policy. Under RLS that is not an error — it is a silent
--  refusal: PostgREST answers the delete with 204 and no error body, the row
--  survives, and the client cannot tell that apart from success. The app guards
--  for it (deleteEstimate() asks for the deleted ids back with .select('id')
--  and reports a refusal), but the guard is a safety net, not the fix. This is.
--
--  WHO CAN DELETE
--    is_full_access()          theo, joan, curtis, scottie  → any estimate
--    created_by = my_email()   a rep                        → their own
--
--  That mirrors est_write's ownership rule rather than inventing a new one.
--  Rows with created_by IS NULL end up admin-only, which is the safe default.
--
--  WHAT A DELETE TAKES WITH IT
--    estimates.line_items is jsonb ON THE ROW, so the line items go with it.
--    Nothing in the schema has a foreign key to estimates, so there are no
--    orphans to clean up. (public.estimate_line_items is the shared price book
--    and is unrelated to this.)
--    A document already generated from an estimate (doc_id / contract_doc_id)
--    is NOT removed — a published or signed PDF should outlive the draft it
--    came from.
--
--  Idempotent: safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists est_delete on public.estimates;

create policy est_delete on public.estimates
  for delete
  to authenticated
  using ( is_full_access() or created_by = my_email() );

-- ── verify ─────────────────────────────────────────────────────────────────
-- Expect one row: est_delete / DELETE / {authenticated}
select policyname, cmd, roles::text, qual as using_expr
from pg_policies
where schemaname = 'public' and tablename = 'estimates' and cmd = 'DELETE';
