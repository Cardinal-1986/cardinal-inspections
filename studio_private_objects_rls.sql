-- studio_private_objects_rls.sql — the storage half of the private room.
-- Written 5 Aug 2026. RUN THIS BEFORE a single personal photograph is uploaded.
-- Depends on studio_media.sql (applied 5 Aug — studio_private, studio_private_events).
--
-- studio_media.sql §6 deliberately did NOT write this, on the grounds that a
-- storage policy cannot be checked by reading it. That was right, and the
-- reason turned out to be sharper than "not yet written":
--
--   THE `photos` BUCKET ALREADY GRANTS READ ON THIS PATH.
--
--     photos_read  SELECT  {authenticated}  PERMISSIVE
--       USING (bucket_id = 'photos' AND name NOT LIKE 'studio/%')
--
--   `private/…` does not match `studio/%`, so every signed-in Cardinal account
--   — Curtis, Scottie, Nick, Joey, Jacob, Joan — could read it.
--
--   AND A NEW TIGHT POLICY WOULD NOT HAVE HELPED. Every policy on
--   storage.objects is PERMISSIVE, and Postgres ORs permissive policies for the
--   same command. Adding `USING (owner is me)` beside `photos_read` grants MORE
--   access, never less. The broad policy has to be AMENDED — there is no way to
--   out-specify it. Same lesson as build 481's CSS: you cannot win by adding a
--   more specific rule; you have to change the one that is already winning.
--
-- WHY THIS IS SAFE TO APPLY NOW. Excluding `private/%` cannot affect any
-- existing object, because there are none. Measured immediately before:
--   photos/  ai-estimates=9 · projects=183 · showcase=4 · studio=11981 · private=0
-- Every amendment below is therefore a no-op against today's contents and only
-- governs what has not been uploaded yet.

/* ═══ 1 · THE PATH CONVENTION ═════════════════════════════════════════════
   private/<owner_email>/<id>.jpg

   The email sits in the path on purpose. studio_private rows are owned by
   `owner_email = my_email()`, and putting the same value in the object path
   means ONE ownership concept governs both the row and the bytes. A policy
   that reads `name LIKE 'private/' || my_email() || '/%'` is auditable at a
   glance — which matters more here than a tidier opaque uid, because this is
   the one bucket path whose failure mode is a man's family photographs.     */


/* ═══ 2 · AMEND THE BROAD POLICIES ════════════════════════════════════════
   ALTER, not DROP+CREATE: an ALTER swaps the predicate in one statement with
   no window in which the policy is absent. A drop-then-create on a live bucket
   leaves a gap where the table is readable only by whatever else matches.   */

-- READ. `studio/%` was carved out on 3 Aug; `private/%` joins it.
alter policy photos_read on storage.objects
  using (
    bucket_id = 'photos'
    and name not like 'studio/%'
    and name not like 'private/%'
  );

-- INSERT ×2. Both are amended because photos_upload is BROADER than
-- photos_write (no email test at all), so fixing only the stricter-looking one
-- would leave the actual hole open. Grep the whole set before trusting the one
-- that looks like the gate.
alter policy photos_upload on storage.objects
  with check (
    bucket_id = 'photos'
    and name not like 'private/%'
  );

alter policy photos_write on storage.objects
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and coalesce(auth.jwt() ->> 'email', '') like '%@cardinalrenovations.net'
    and name not like 'private/%'
  );

-- UPDATE / DELETE. These already require `owner = auth.uid() OR is_admin()`,
-- and is_admin() is true for Joan — so without this an admin could overwrite or
-- delete Theo's private objects. Ownership here is the man, not the role.
alter policy photos_update on storage.objects
  using (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and name not like 'private/%'
    and (owner = auth.uid() or is_admin())
  );

alter policy photos_delete on storage.objects
  using (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and name not like 'private/%'
    and (owner = auth.uid() or is_admin())
  );


/* ═══ 3 · THE OWNER-ONLY POLICIES ═════════════════════════════════════════
   Now that `private/%` is excluded everywhere else, these are the ONLY route
   to those objects. Ownership, never admin — the same rule
   estimates_update_policy.sql settled on and studio_private already uses.

   `coalesce(public.my_email(), '')` and a length guard: if my_email() ever
   returns NULL (anon, or a JWT without an email claim), a bare comparison
   yields NULL, and NULL in a policy USING clause filters the row OUT — which
   is the safe direction. The coalesce is belt-and-braces so the predicate is
   false rather than unknown, and so nobody later reads NULL-handling here as
   the accident it was in studio_refresh_damage_tags (BUG_CLASSES §12).      */

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage'
                   and tablename='objects' and policyname='studio_private_read') then
    create policy studio_private_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'photos'
        and length(coalesce(public.my_email(), '')) > 0
        and name like 'private/' || public.my_email() || '/%'
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage'
                   and tablename='objects' and policyname='studio_private_write') then
    create policy studio_private_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'photos'
        and length(coalesce(public.my_email(), '')) > 0
        and name like 'private/' || public.my_email() || '/%'
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage'
                   and tablename='objects' and policyname='studio_private_update') then
    create policy studio_private_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'photos'
        and length(coalesce(public.my_email(), '')) > 0
        and name like 'private/' || public.my_email() || '/%'
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage'
                   and tablename='objects' and policyname='studio_private_delete') then
    create policy studio_private_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'photos'
        and length(coalesce(public.my_email(), '')) > 0
        and name like 'private/' || public.my_email() || '/%'
      );
  end if;
end $$;


/* ═══ 4 · WHAT THIS STILL DOES NOT PROVE ══════════════════════════════════
   The predicates below can be verified from SQL, and are. What CANNOT be
   verified from here is the full HTTP path: a signed URL minted for a private
   object, the storage API's own checks, and whether a service-role key is in
   play anywhere in the app. Before real family photographs are uploaded, do one
   live test: sign in as a NON-admin account, request a private object by its
   exact path, and confirm a 4xx. A policy that reads correctly and a request
   that is actually refused are two different facts.                         */


/* ═══ REVERT ══════════════════════════════════════════════════════════════
   drop policy if exists studio_private_read   on storage.objects;
   drop policy if exists studio_private_write  on storage.objects;
   drop policy if exists studio_private_update on storage.objects;
   drop policy if exists studio_private_delete on storage.objects;
   alter policy photos_read   on storage.objects
     using (bucket_id='photos' and name not like 'studio/%');
   alter policy photos_upload on storage.objects with check (bucket_id='photos');
   alter policy photos_write  on storage.objects with check (bucket_id='photos'
     and auth.role()='authenticated'
     and coalesce(auth.jwt()->>'email','') like '%@cardinalrenovations.net');
   alter policy photos_update on storage.objects using (bucket_id='photos'
     and auth.role()='authenticated' and (owner=auth.uid() or is_admin()));
   alter policy photos_delete on storage.objects using (bucket_id='photos'
     and auth.role()='authenticated' and (owner=auth.uid() or is_admin()));
   ══════════════════════════════════════════════════════════════════════ */
