-- is_staff_policies.sql — stop using the email domain as a proxy for "is staff".
-- Written 5 Aug 2026, on Theo's instruction to let Greg Clark's gmail work.
--
-- THE PROBLEM. Six policies gated on `email LIKE '%@cardinalrenovations.net'`.
-- Greg Clark is a working sales rep on clarkie022@gmail.com, so he saw:
--
--     pricing_items 0 · pricing_categories 0 · pricing_history 0
--     objections 0 · team_profiles 0        (nick@ sees 43 · 19 · … · 27 · 9)
--
-- An empty Pricing Catalog, an Objection Coach with no objections, an empty
-- team directory, and nothing on screen explaining why. He signed in 1 Aug.
--
-- WHY NOT JUST ADD GMAIL TO THE PATTERN. Because the domain was never the
-- question being asked. Every one of those policies means "is this person
-- staff", and team_profiles is the table that actually answers that. Gating on
-- membership instead of on a string:
--
--   · admits exactly the people Theo has added, not anyone with a gmail;
--   · is REVOCABLE — delete the row and access goes. The domain check had no
--     off switch at all for an outside address, which is the thing that matters
--     when Greg finishes his last jobs and leaves;
--   · lives in ONE function instead of six copied predicates.
--
-- ⚠ SECURITY DEFINER IS LOAD-BEARING, NOT DECORATION.
-- team_profiles' own SELECT policy is one of the six being changed. A plain
-- (INVOKER) function reading team_profiles would be subject to that policy, so
-- for a gmail user it would read zero rows and return false — the function
-- would deny access to precisely the people it exists to admit, and it would do
-- it silently. Definer rights make it read the real table. This is the same
-- reason is_cardinal_admin() is definer ("to avoid RLS recursion").
--
-- ⚠ AND IT MUST NOT RETURN NULL. BUG_CLASSES §12: is_cardinal_admin() returns
-- NULL for anon, and `if not <null>` does not fire, which left a definer
-- function open earlier today. exists() returns true or false and never NULL,
-- so this one cannot repeat that. Do not rewrite it as a comparison.

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_profiles
     where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ⚠ anon KEEPS execute, and revoking it was a mistake made and undone here.
-- The instinct came from studio_refresh_damage_tags() this morning, where
-- revoking anon was right. The two are opposites:
--
--   studio_refresh_damage_tags()  DOES something — a full-table UPDATE under
--                                 definer rights. anon must not reach it.
--   is_staff()                    ANSWERS something — a read-only boolean, and
--                                 it is called BY THE POLICIES BELOW, which an
--                                 anonymous request still has to evaluate.
--
-- With it revoked, an anon read of pricing_items raised
--     ERROR: permission denied for function is_staff
-- rather than returning zero rows. That is not extra safety; it is the same
-- denial delivered as an error instead of an empty list, and anything querying
-- these tables before sign-in completes breaks instead of reading empty.
-- anon calling it learns nothing — exists() over a non-member email is false.
grant execute on function is_staff() to authenticated;
grant execute on function is_staff() to anon;


-- Greg is staff. Recorded here so the policies above can see him, and so that
-- removing him later is one DELETE rather than a hunt.
insert into team_profiles (email, role)
values ('clarkie022@gmail.com', 'sales')
on conflict (email) do update set role = excluded.role;


-- ── the six policies ────────────────────────────────────────────────────────
-- ALTER, not DROP+CREATE: an ALTER swaps the predicate in one statement with no
-- window in which the policy is absent.

alter policy pricing_items_select      on pricing_items      using (is_staff());
alter policy pricing_categories_select on pricing_categories using (is_staff());
alter policy pricing_history_select    on pricing_history    using (is_staff());
alter policy objections_select         on objections         using (is_staff());
alter policy team_profiles_select      on team_profiles      using (is_staff());

alter policy photos_write on storage.objects
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and is_staff()
    and name not like 'private/%'
  );


/* ═══ VERIFICATION ════════════════════════════════════════════════════════
   Run these, do not assume. Expected:

     nick@cardinalrenovations.net   43 · 19 · 27 · 10   (unchanged)
     clarkie022@gmail.com           43 · 19 · 27 · 10   (was 0 · 0 · 0 · 0)
     someone@example.com             0 ·  0 ·  0 ·  0   (not in team_profiles)
     anon                            0 ·  0 ·  0 ·  0

   The third row is the one that matters: it proves this admits MEMBERS, not
   merely non-Cardinal addresses. A fix that let any outside email in would
   pass the first two rows and be badly wrong.

   ═══ REVERT ══════════════════════════════════════════════════════════════
   alter policy pricing_items_select      on pricing_items
     using (coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy pricing_categories_select on pricing_categories
     using (coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy pricing_history_select    on pricing_history
     using (coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy objections_select         on objections
     using (coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy team_profiles_select      on team_profiles
     using (coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy photos_write on storage.objects with check (
     bucket_id='photos' and auth.role()='authenticated'
     and coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net'
     and name not like 'private/%');
   delete from team_profiles where email = 'clarkie022@gmail.com';
   drop function if exists is_staff();
   ══════════════════════════════════════════════════════════════════════ */
