-- revoke_anon_objection_rpcs.sql — 24 Aug 2026
--
-- ✅ APPLIED to production 2026-08-24 and VERIFIED with has_function_privilege.
--
-- WHAT WAS WRONG. objection_leaderboard(int) and objection_difficulty(int) are
-- SECURITY DEFINER and return rep_email, attempts, avg_score, best_score and
-- last_practiced. Both were callable by an UNAUTHENTICATED caller at
--   /rest/v1/rpc/objection_leaderboard
-- so Cardinal's rep emails and practice scores were readable by anyone who
-- guessed the URL. No client data and no money, but it should not be public.
--
-- Found by Supabase's own security advisor. ⚠ The same advisor flagged seven
-- OTHER functions the same way — make_commission, unmake_commission,
-- sync_commission, default_sales_rep, guard_sales_rep,
-- tg_pricing_items_history and rls_auto_enable — and every one of those is a
-- FALSE POSITIVE: they all RETURN trigger (or event_trigger), which PostgREST
-- cannot expose as an endpoint. The linter reads the EXECUTE grant without
-- knowing the return type. Do not "fix" those.
--
-- ⚠ AND THE FIRST ATTEMPT AT THIS FILE DID NOTHING, SUCCESSFULLY.
-- It said `revoke execute ... from anon`, which returned success and changed
-- nothing, because anon never held a direct grant: Postgres grants EXECUTE on
-- a new function to PUBLIC by default and anon merely inherits it. Revoking
-- from a role holding no direct grant is a silent no-op. The privilege has to
-- come off PUBLIC and be handed back to authenticated explicitly.
--
-- This is why the fix was verified with has_function_privilege() instead of
-- being trusted: the migration reported success while anon_can_call stayed
-- true. Verified after: anon false, authenticated true, service_role true.
--
-- SAFE because the app's only callers are in cr-coach-script's leaderboard
-- (openBoard), which is inside the signed-in app.

revoke execute on function public.objection_leaderboard(integer) from public;
revoke execute on function public.objection_difficulty(integer)  from public;

grant execute on function public.objection_leaderboard(integer) to authenticated;
grant execute on function public.objection_difficulty(integer)  to authenticated;

-- verify (should read false / true / true):
--   select p.proname,
--          has_function_privilege('anon',          p.oid, 'EXECUTE'),
--          has_function_privilege('authenticated', p.oid, 'EXECUTE'),
--          has_function_privilege('service_role',  p.oid, 'EXECUTE')
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname='public'
--     and p.proname in ('objection_leaderboard','objection_difficulty');

-- revert:
--   grant execute on function public.objection_leaderboard(integer) to public;
--   grant execute on function public.objection_difficulty(integer)  to public;
