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
-- Also: job_files_read AND job_files_write compared storage.foldername(p.name) — the PROJECT's (client's)
-- name — instead of the object's own name, so neither could ever match. Every Job Files upload since build
-- 1359 was refused with "new row violates row-level security policy" (reported 26 Oct; the bucket holds 0
-- files). Both now read the object's own folder (<project id>/...), which is the key crJobFileUp() writes.
--
-- And: photos_write (staff, everything except private/) overlapped photos_upload (everything except
-- private/, showcase/, walks/, workmanship/, owner-vault/, materials/, visualizer/). Permissive policies
-- OR together, so photos_write let ANY staff account add files to the owner vault and to the admin-only,
-- client-facing showcase / walks / workmanship folders (measured 27 Oct as a sales and a production
-- account; neither could read or overwrite there). photos_write is dropped: photos_upload ANDed with
-- staff_only_storage is exactly "staff, outside the fenced folders", and each fenced folder keeps its own
-- admin (or, for visualizer/, staff) write policy.
--
-- REVERT: drop policy "staff_only_storage" on storage.objects;
--         create policy photos_write on storage.objects for insert to public with check ((bucket_id = 'photos') and (auth.role() = 'authenticated') and is_staff() and (name !~~ 'private/%'));

set lock_timeout = '3s';

drop policy if exists staff_only_storage on storage.objects;
create policy staff_only_storage on storage.objects as restrictive for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists job_files_read on storage.objects;
create policy job_files_read on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and exists (select 1 from public.projects p where (p.id)::text = (storage.foldername(objects.name))[1]));

drop policy if exists job_files_write on storage.objects;
create policy job_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and public.is_staff() and exists (select 1 from public.projects p where (p.id)::text = (storage.foldername(objects.name))[1]));

drop policy if exists photos_write on storage.objects;
