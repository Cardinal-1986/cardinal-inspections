-- storage_staff_only.sql — 24 Oct 2026. The storage half of staff_only_rls.sql.
--
-- WHY: staff_only_rls.sql gated every PUBLIC table, but files live in storage.objects, which it did
-- not touch. With public signup on, any self-registered account could still read every customer
-- photo (photos_read: authenticated, all of photos/ except studio/private/owner-vault — 61,953
-- objects), the showcase / walks / workmanship / designer folders and the library bucket, and
-- upload into photos/ (photos_upload carries no staff check; photos_write does, but permissive
-- policies OR together) and library/.
--
-- WHAT: one RESTRICTIVE policy on storage.objects for the authenticated role: (select is_staff()).
-- It ANDs with every existing storage policy, so no staff permission changes. Clients never touch
-- storage as `authenticated` — share pages, portals and the visualizer worker use signed URLs or
-- the service key, which bypasses RLS. Measured before writing: every uploader in the last 60 days
-- is staff; the visual-workspace owner is staff.
--
-- Also: job_files_read compared storage.foldername(p.name) — the PROJECT's name — so it could never
-- match an object (0 files today, so nothing was ever refused that should have been read). It now
-- reads the object's own folder, which is what its twin job_files_write already does.
--
-- REVERT: drop policy "staff_only_storage" on storage.objects;

set lock_timeout = '3s';

drop policy if exists staff_only_storage on storage.objects;
create policy staff_only_storage on storage.objects as restrictive for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists job_files_read on storage.objects;
create policy job_files_read on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and exists (select 1 from public.projects p where (p.id)::text = (storage.foldername(objects.name))[1]));
