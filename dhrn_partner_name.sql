-- dhrn_partner_name.sql — the roster row gets the organisation's real name.
--
-- Theo, 21 Aug 2026, verbatim: "DHRN is fine, but Dayton Home Repair Network is
-- correct as the name. Just thought it was too long."
--
-- WHY THIS IS A ONE-ROW FIX THAT REPAIRS FOUR JOBS.
-- The audit recorded a "DHRN name drift" and assumed the JOBS had drifted. They
-- had not. Measured 21 Aug 2026 on production:
--
--   community_partners.name = 'DHRN'                        0 jobs match it
--   projects  …lead.partner_name = 'Dayton Home Repair Network'   4 jobs, matching NO roster row
--
-- So the four jobs already carry the correct full name and the ROSTER ROW is the
-- one that is wrong. Renaming the roster row makes all four resolve against it —
-- partnerOf(), the hub's Bill-to facet, the partner cards and the bid email all
-- key on that exact string.
--
-- Nothing else needs to change: no job row is touched, no partner_id moves, and
-- the four jobs are not edited. Build 973 already writes name+id together going
-- forward, so this is the last time the two can disagree.
--
-- ⚠ Guarded and idempotent. It refuses to run twice, and it refuses to collide
-- with an existing row of the target name.
--
-- ✅ APPLIED to production 21 Aug 2026.

update public.community_partners
   set name       = 'Dayton Home Repair Network',
       updated_at = now()
 where name = 'DHRN'
   and not exists (
     select 1 from public.community_partners x
      where x.name = 'Dayton Home Repair Network'
   );

-- Verify: expect 4 jobs, matches_roster = true
--   select count(*) from public.projects j
--    where (j.checklist::jsonb->'lead'->>'partner_name') = 'Dayton Home Repair Network';
--   select count(*) from public.community_partners
--    where name = 'Dayton Home Repair Network';
--
-- REVERT (only if the long name proves unusable on a phone — but note that
-- reverting re-orphans those four jobs):
--   update public.community_partners set name = 'DHRN'
--    where name = 'Dayton Home Repair Network';
