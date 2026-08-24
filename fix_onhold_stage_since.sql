-- fix_onhold_stage_since.sql — build 1034 (audit LOW #8)
--
-- ✅ APPLIED to production 2026-08-24. The earlier automated write was
--    declined, so this sat as a by-hand instruction; Theo cleared that.
--    1 row updated; stage_since is now 2026-08-24T07:41:15.646Z. The WHERE
--    still refuses a row that already has one, so re-running is a no-op.
--
-- One OnHold project (Maker Space Solutions LLC, bc024ad1-…) has no
-- checklist.stage_since, so its "In status" clock reads from updated_at, which
-- moves on every edit. Anchor it to the best evidence available (updated_at at
-- the time of this fix). Idempotent: the WHERE refuses a row that already has one.

update projects
set checklist = jsonb_set(coalesce(checklist,'{}')::jsonb, '{stage_since}',
                          to_jsonb(updated_at::text))::text
where id = 'bc024ad1-7342-4367-a6a2-413adb1daf18'
  and stage = 'OnHold'
  and ((checklist::jsonb)->>'stage_since') is null;
