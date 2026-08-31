-- push_subs_rls.sql — build 1184. Containment: replace the wide-open push_subs
-- policy with staff-read / own-device-write.
--
-- WHAT WAS WRONG. push_subs had exactly one policy:
--
--     "team push"  cmd=ALL  roles={public}  USING true  WITH CHECK true
--
-- and `anon` holds real SELECT/INSERT/UPDATE/DELETE grants on the table. RLS was
-- enabled, so it LOOKED contained; the policy simply allowed everyone. It was the
-- only table of the 80 in `public` with that shape. Anyone with the publishable
-- key (which ships in index.html by design) could read every staff member's email
-- and device endpoint, insert rows for other people, and — the one that actually
-- costs something — DELETE staff subscriptions, silently ending their alerts.
--
-- Audited before the change: all 10 rows are staff (9 theo@, 1 joan@) with real
-- web.push.apple.com / fcm.googleapis.com endpoints. Nothing was poisoned. This
-- migration therefore PRESERVES every row and only replaces policies and grants.
--
-- WHY THE FAN-OUT DOES NOT BREAK. api/notify.js read push_subs with the
-- PUBLISHABLE key, so the open policy was load-bearing for notifications —
-- tightening it alone would have made the query return [] and killed every push
-- while reporting success. Build 1184 moves that read, and the stale-endpoint
-- cleanup, onto SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS and is already
-- relied on by the crons and pay-webhook). Ship this file and api/notify.js
-- together; SQL first, per the deploy order.

begin;

-- 1. The open door.
drop policy if exists "team push" on public.push_subs;

-- 2. anon has no business here at all. The browser always acts as `authenticated`
--    (both upsert paths run through `sb`, a signed-in client), and the server acts
--    as service_role, which is exempt from grants and RLS alike.
revoke all on public.push_subs from anon;

-- 3. Belt and braces: the table is already RLS-enabled, but a policy set is
--    worthless if RLS is ever switched off.
alter table public.push_subs enable row level security;

grant select, insert, update, delete on public.push_subs to authenticated;

-- 4. READ: any staff member may read the whole table.
--    Not "own rows only" — the app's enrollment path needs to see whether THIS
--    device is registered, and a staff-session fallback read in notify.js relies
--    on it if SUPABASE_SERVICE_ROLE_KEY is ever unset. The contents are staff
--    emails and opaque push endpoints, already visible to every signed-in
--    employee through the Team Directory.
create policy push_subs_select_staff on public.push_subs
  for select to authenticated
  using ( public.is_staff() );

-- 5. WRITE: you may only ever create or change a row that carries YOUR OWN email.
--    lower() on both sides because my_email() returns the raw JWT claim while the
--    app writes currentUser.email; is_staff() already compares case-insensitively.
create policy push_subs_insert_own on public.push_subs
  for insert to authenticated
  with check ( public.is_staff() and lower(email) = lower(public.my_email()) );

-- 6. UPDATE is deliberately STRICT on both sides — USING as well as WITH CHECK.
--    The app upserts with onConflict:'endpoint', so an UPDATE only fires when the
--    endpoint already exists. Strict USING means you cannot take over a row that
--    is currently another employee's, even to reassign it to yourself.
--    KNOWN EDGE CASE, accepted deliberately: if one physical device enrolls under
--    employee A and later under employee B while the browser hands back the SAME
--    endpoint, B's upsert is refused. That failure is VISIBLE, not silent —
--    index.html does `if(r.error) throw r.error;` and shows "Could not enable
--    notifications". The fix is to delete the stale row (service role), not to
--    widen this policy into letting colleagues capture each other's devices.
create policy push_subs_update_own on public.push_subs
  for update to authenticated
  using      ( public.is_staff() and lower(email) = lower(public.my_email()) )
  with check ( public.is_staff() and lower(email) = lower(public.my_email()) );

-- 7. DELETE: your own device only. No browser path deletes today; this exists so a
--    future "turn notifications off on this device" needs no policy change. The
--    server's dead-endpoint cleanup (404/410 from the push service) runs as
--    service_role and is unaffected.
create policy push_subs_delete_own on public.push_subs
  for delete to authenticated
  using ( public.is_staff() and lower(email) = lower(public.my_email()) );

commit;

-- REVERT (do not run unless the fan-out is proven broken and 1184's notify.js is
-- being rolled back with it):
--   begin;
--   drop policy if exists push_subs_select_staff on public.push_subs;
--   drop policy if exists push_subs_insert_own   on public.push_subs;
--   drop policy if exists push_subs_update_own   on public.push_subs;
--   drop policy if exists push_subs_delete_own   on public.push_subs;
--   create policy "team push" on public.push_subs for all using (true) with check (true);
--   grant select, insert, update, delete on public.push_subs to anon;
--   commit;
--
-- ⚠ is_staff() means "present in team_profiles". 9 of the 10 auth accounts are;
--   theodorion1986@gmail.com (Theo's owner login) is NOT, though api/_staff.js
--   allowlists it. It holds no push_subs rows, so nothing regresses — but that
--   login cannot enroll a device for push until it is added to team_profiles.
--   Recorded rather than papered over with a second allowlist in SQL.
