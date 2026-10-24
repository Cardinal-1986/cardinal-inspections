-- staff_only_rls.sql — build 1407. A signed-in account must be Cardinal STAFF to touch any public table.
--
-- WHY: public signup is on in Supabase Auth, so "authenticated" does not mean "staff". Measured 23 Oct 2026:
--   - 8 policies grant INSERT / ALL on nothing more than auth.role() = 'authenticated' (or true):
--     carrier_adjusters, client_guide_sends, inspection_reports, library_items, library_sections, meas_docs,
--     project_photos (ALL — read, change, delete), punch_items;
--   - projects_insert lets any account insert a job (created_by = itself or NULL), which then opens
--     api/companycam-job.js (CompanyCam photos by address) and api/sms-link.js (texts from the company number);
--   - reports_insert lets any account insert a document with a share_token — served by api/share.js on the
--     app's own origin.
--   All 10 accounts today are staff (9 in team_profiles; the 10th is the owner's gmail, never signed in), so
--   nothing has used this — the gate is closed before anyone walks through it.
--
-- WHAT: one RESTRICTIVE policy per public table, for the authenticated role only: (select is_staff()). Restrictive
-- policies AND with every existing permissive one, so no current rule widens or changes; non-staff simply get
-- nothing. anon is untouched (client share / pay / sign go through the service key, which bypasses RLS).
-- is_staff() (is_staff_policies.sql) = the caller's email is in team_profiles; invite.js upserts team_profiles
-- before the invitee first signs in, so a new hire is staff from their first login. `(select …)` makes Postgres
-- evaluate it once per statement, not once per row.
--
-- REVERT: drop policy "staff_only_1407" on public.<table>  (the DO block at the end prints the loop for it).
--
-- ⚠ The other half is Theo's: turn OFF public signup in Supabase → Authentication → Sign In / Providers.

set lock_timeout = '3s';   -- never queue behind a long transaction and stall the live app

do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists %I on public.%I', 'staff_only_1407', t.relname);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',
                   'staff_only_1407', t.relname);
  end loop;
end $$;

-- verify (run by hand): every RLS table carries the policy
-- select count(*) from pg_policies where schemaname='public' and policyname='staff_only_1407';
