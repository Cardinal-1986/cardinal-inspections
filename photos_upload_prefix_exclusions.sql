-- photos_upload_prefix_exclusions.sql — audit finding 15 (23 Aug 2026, build 1023 arc)
--
-- PROBLEM. RLS INSERT policies are PERMISSIVE (OR'd). The blanket policy
-- `photos_upload` on storage.objects is:
--     bucket_id = 'photos' AND name NOT LIKE 'private/%'
-- with no staff/admin check, granted to `authenticated`. Because it is OR'd with
-- the dedicated prefix policies, it grants a SUPERSET of them — so every
-- dedicated policy below is decorative, and ANY authenticated user (including a
-- self-signed-up outsider — see findings 6/7) can upload into prefixes that are
-- supposed to be locked down:
--     showcase/     -> meant admin only  (showcase_objects_admin_write)
--     walks/        -> meant admin only  (walk_objects_admin_write)
--     workmanship/  -> meant admin only  (workmanship_objects_admin_write)
--     owner-vault/  -> meant admin only  (owner_vault_write)
--     materials/    -> meant admin only  (materials_objects_write)
--     visualizer/   -> meant staff only  (visualizer_objects_write, is_staff())
-- Verified live on 23 Aug 2026 against pg_policies (storage.objects INSERT set).
--
-- FIX. Carve those six prefixes out of `photos_upload` so it covers only general
-- photo paths (job photos, oc-colors/, studio/ via service key, etc.). Each
-- carved-out prefix is then governed solely by its own stricter policy, which is
-- what those policies were written to do. No legitimate app upload uses
-- `photos_upload` for these prefixes: showcase/owner-vault/materials uploads are
-- admin, and visualizer uploads are staff — all of which keep their own policy.
--
-- ⚠ SIGN-OFF NOTE for Theo: this ENFORCES the intent already written into the six
-- dedicated policies (admin-only / staff-only). If any NON-admin teammate today
-- legitimately uploads into one of these prefixes by relying on the blanket
-- policy, tell me before applying and we will widen that prefix's own policy
-- instead. Nothing here changes ordinary job-photo uploads.
--
-- SAFE TO RE-RUN. ALTER POLICY sets the expression outright; re-running is a
-- no-op. No data is modified.
--
-- REVERT (restores the blanket behaviour):
--   alter policy photos_upload on storage.objects
--     with check (bucket_id = 'photos' AND name NOT LIKE 'private/%');

alter policy photos_upload on storage.objects
  with check (
    bucket_id = 'photos'
    and name not like 'private/%'
    and name not like 'showcase/%'
    and name not like 'walks/%'
    and name not like 'workmanship/%'
    and name not like 'owner-vault/%'
    and name not like 'materials/%'
    and name not like 'visualizer/%'
  );
