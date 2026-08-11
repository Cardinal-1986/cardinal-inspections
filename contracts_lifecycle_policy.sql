-- contracts_lifecycle_policy.sql
-- Build 722 — the new-contracts lifecycle (Theo's "hybrid": status on the table,
-- signing on the proven canvas).
--
-- WHY: contracts_update had a USING clause and NO explicit WITH CHECK, so Postgres
-- applied USING as the WITH CHECK too. USING is `status IN ('draft','sent') ...`,
-- which means a non-admin (a sales rep — the person who gets the client to sign in
-- the field) could NOT write status='signed' or 'voided': the NEW row's status
-- failed the implicit check. Only is_admin() could. This blocked the whole
-- draft -> sent -> signed lifecycle for reps.
--
-- WHAT: split USING and WITH CHECK.
--   USING     (which rows you may act on): still only draft/sent rows (or admin).
--             So a signed or voided contract is LOCKED to non-admins — you cannot
--             edit an executed contract. Unchanged behaviour.
--   WITH CHECK (what the row may become): the owner / full-access may move it to
--             draft, sent, signed or voided. Admin, anything.
--
-- This grants NO new access to any contract a rep couldn't already edit — it only
-- permits the forward status transitions on contracts they already own. It mirrors
-- how inspection_reports signing already trusts the signed-in rep to record an
-- in-person signature (index.html sigApply -> db.update signed_at).
--
-- Idempotent: drops and recreates the one policy. Reversible — the revert at the
-- bottom restores the original single-expression policy.
-- Applied via the Supabase MCP; deploy SQL BEFORE the index.html that uses it.

alter table public.contracts enable row level security;

drop policy if exists contracts_update on public.contracts;

create policy contracts_update on public.contracts
  for update
  using (
    ((status = any (array['draft'::text, 'sent'::text]))
       and (is_full_access() or created_by = my_email()))
    or is_admin()
  )
  with check (
    ((status = any (array['draft'::text, 'sent'::text, 'signed'::text, 'voided'::text]))
       and (is_full_access() or created_by = my_email()))
    or is_admin()
  );

-- ── revert (do not run unless rolling back) ──────────────────────────────────
-- drop policy if exists contracts_update on public.contracts;
-- create policy contracts_update on public.contracts
--   for update
--   using (
--     ((status = any (array['draft'::text, 'sent'::text]))
--        and (is_full_access() or created_by = my_email()))
--     or is_admin()
--   );
