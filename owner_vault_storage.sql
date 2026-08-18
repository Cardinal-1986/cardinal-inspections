-- owner_vault_storage.sql — Build 900
-- Storage policies for The Vault. Files go to the `photos` bucket under `owner-vault/%`.
-- This prefix must be admin-only to READ, so it is carved out of the general photos
-- read exactly as `studio/` and `private/` already are — the general read is recreated
-- with one more exclusion, then admin-only read/write/update/delete are added for the
-- prefix. Nothing else about photos_read changes.
--
-- Idempotent. Apply with owner_vault_schema.sql, BEFORE the index.html change.

-- 1) exclude owner-vault/ from the general authenticated read (adds one clause only)
drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and name not like 'studio/%'
    and name not like 'private/%'
    and name not like 'owner-vault/%'
  );

-- 2) admin-only access to the vault prefix
drop policy if exists owner_vault_read on storage.objects;
create policy owner_vault_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like 'owner-vault/%' and public.is_cardinal_admin());

drop policy if exists owner_vault_write on storage.objects;
create policy owner_vault_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and name like 'owner-vault/%' and public.is_cardinal_admin());

drop policy if exists owner_vault_update on storage.objects;
create policy owner_vault_update on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and name like 'owner-vault/%' and public.is_cardinal_admin())
  with check (bucket_id = 'photos' and name like 'owner-vault/%' and public.is_cardinal_admin());

drop policy if exists owner_vault_delete on storage.objects;
create policy owner_vault_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and name like 'owner-vault/%' and public.is_cardinal_admin());
