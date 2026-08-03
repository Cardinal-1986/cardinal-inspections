-- studio_objects_rls.sql — close the storage-layer gap for the Studio's photos.
-- APPLIED to production 2026-08-03, ahead of studio.html shipping. Idempotent
-- (ALTER POLICY / CREATE POLICY IF NOT EXISTS-equivalent by re-stating intent).
--
-- studio_photos (the table) is is_cardinal_admin()-only for every operation.
-- But storage.objects' existing photos_read policy grants SELECT on the WHOLE
-- `photos` bucket to any authenticated user, with no prefix check — so without
-- this, a signed-in rep who somehow knew a studio/<id>.jpg path could fetch it
-- directly via the Storage API, even though they can never see that path
-- through the table. Narrow the general grant to exclude studio/, and add a
-- dedicated admin-only read policy for it — same shape walk_objects_read /
-- workmanship_objects_read already use for their own prefixes, just admin-only
-- instead of authenticated-only, matching studio_photos' own stricter rule.
--
-- Scoped to READ only. photos_upload/photos_write (INSERT) are bucket-wide for
-- any authenticated user too, which is a pre-existing condition across every
-- prefix in this bucket, not something Studio introduces — narrowing that is a
-- separate, bigger change and out of scope here. push_studio_tags.py always
-- authenticates as theo@/joan@ directly, so it never depended on that broad
-- grant to begin with.

alter policy photos_read on storage.objects
  using (bucket_id = 'photos' and name not like 'studio/%');

create policy studio_objects_read on storage.objects
  for select
  using (bucket_id = 'photos' and name like 'studio/%' and is_cardinal_admin());
