-- Backfill insurance_claims from the checklist, and fix the one-way link.
--
-- ✅ APPLIED to production 9 Aug 2026, immediately after build 645 deployed, and
-- VERIFIED. Both statements ran; the result on the two claims that exist:
--
--   Adam Gunn        Allstate   | 0802889162 | 000826751113 | Shawn Feistamel | linked
--   Maker Space LLC  State Farm | 3584R158W  | 95G7U6807    | Andrew Perkins  | linked
--
-- and after 1b, both claims carry their property address:
--   Adam Gunn        9222 Arlington Rd, Brookville, OH 45309
--   Maker Space LLC  1630 E 5th St, Dayton, OH 45403-2304
--
-- ⚠ WHAT THIS CANNOT FILL, so nobody hunts for a bug in it. The checklist held
-- empty strings for adjuster phone/email and date_of_loss, has no field at all
-- for adjuster company, cause of loss or filed date, and its coverage_type
-- ("RCV" on Gunn) has NO COLUMN on insurance_claims to go to. Those screens read
-- blank because the source is blank, not because the copy failed. The FINANCIALS
-- block is a different thing again: nothing in the app has ever written
-- first_scope_rcv or approved_rcv, which is the next build.
--
-- Adam Gunn's row was entirely NULL before this; Maker Space already carried its
-- own data and was not touched by statement 1 (it has no checklist blob). Both
-- projects now point at their claim, which neither did before.
--
-- DO NOT re-run this as pending work. It is idempotent, so a re-run is harmless,
-- but it is done.
--
-- WHY IT EXISTS. Insurance details have been written in two places that never
-- met: the SOL reader and the client card wrote
-- projects.checklist -> lead -> insurance, while the claim screen, iTels,
-- payments and supplements all hang off the insurance_claims table. Build 645
-- moved the last on-screen reader of the checklist copy onto the claim screen,
-- which means any project whose data lives ONLY in the checklist currently
-- shows nothing at all. Adam Gunn is exactly that case: Allstate / 0802889162
-- in the checklist, every column NULL on his claim row.
--
-- ⚠ THE TRAP THIS AVOIDS. Gunn ALREADY has a claim row whose project_id points
-- at him, but projects.insurance_claim_id is NULL — the link exists in one
-- direction only. Anything that decides "does this project have a claim?" by
-- reading insurance_claim_id will conclude no, INSERT A SECOND claim, and leave
-- the payments and iTels attached to the empty one. Every statement below keys
-- on project_id for that reason.
--
-- SAFE BY CONSTRUCTION:
--   * only ever fills a column that is currently NULL — coalesce(c.col, ...) —
--     so the claim row stays the source of truth and a re-run changes nothing,
--   * creates no claim rows; a project with no claim is left alone, because
--     deciding when a claim comes into existence is the app's job, not a
--     migration's,
--   * date_of_loss is regex-guarded before casting, so a hand-typed
--     "sometime in June" cannot abort the statement.
--
-- Idempotent. Safe to re-run.

-- ── 1. fill the blank columns on claims that already exist ──────────────────
with src as (
  select
    p.id                                                        as project_id,
    p.name                                                      as project_name,
    (p.checklist::jsonb) -> 'lead' -> 'insurance'               as ins
  from projects p
  where (p.checklist::jsonb) -> 'lead' -> 'insurance' is not null
)
update insurance_claims c
set
  homeowner_name  = coalesce(c.homeowner_name,  nullif(trim(s.project_name), '')),
  carrier         = coalesce(c.carrier,         nullif(trim(s.ins ->> 'carrier'), '')),
  claim_number    = coalesce(c.claim_number,    nullif(trim(s.ins ->> 'claim_number'), '')),
  policy_number   = coalesce(c.policy_number,   nullif(trim(s.ins ->> 'policy_number'), '')),
  adjuster_name   = coalesce(c.adjuster_name,   nullif(trim(s.ins -> 'adjuster' ->> 'name'), '')),
  adjuster_phone  = coalesce(c.adjuster_phone,  nullif(trim(s.ins -> 'adjuster' ->> 'phone'), '')),
  adjuster_email  = coalesce(c.adjuster_email,  nullif(trim(s.ins -> 'adjuster' ->> 'email'), '')),
  notes           = coalesce(c.notes,           nullif(trim(s.ins ->> 'notes'), '')),
  date_of_loss    = coalesce(
                      c.date_of_loss,
                      case when trim(coalesce(s.ins ->> 'date_of_loss','')) ~ '^\d{4}-\d{2}-\d{2}$'
                           then (trim(s.ins ->> 'date_of_loss'))::date end),
  deductible      = coalesce(
                      c.deductible,
                      case when trim(coalesce(s.ins ->> 'deductible','')) ~ '^\d+(\.\d+)?$'
                           then (trim(s.ins ->> 'deductible'))::numeric end),
  updated_at      = now()
from src s
where c.project_id = s.project_id;      -- keyed on project_id, never on insurance_claim_id

-- ── 1b. the property address ────────────────────────────────────────────────
-- MISSED IN THE FIRST PASS, added and applied 9 Aug 2026. insurance_claims has
-- a property_address column and the project has always had the address, but the
-- first version of this file mapped seven fields and not this one — so the claim
-- header read "PROPERTY: TBD" for a job whose address is on the profile two taps
-- away. It comes from the project, not the checklist, which is why it was not in
-- the blob the rest of statement 1 reads.
update insurance_claims c
set property_address = nullif(trim(p.address), ''),
    updated_at       = now()
from projects p
where c.project_id = p.id
  and c.property_address is null
  and nullif(trim(p.address), '') is not null;

-- ── 2. repair the one-way link ──────────────────────────────────────────────
-- projects.insurance_claim_id was never set even where a claim exists and
-- points back. This is what makes a "does a claim exist?" check answer wrongly.
update projects p
set insurance_claim_id = c.id
from insurance_claims c
where c.project_id = p.id
  and p.insurance_claim_id is null;

-- ── 3. what changed ─────────────────────────────────────────────────────────
-- Run this after, and expect every insurance project to show a carrier on BOTH
-- sides, and linked = true.
--
--   select p.name,
--          (p.checklist::jsonb)->'lead'->'insurance'->>'carrier' as checklist_carrier,
--          c.carrier                                             as claim_carrier,
--          c.homeowner_name,
--          (p.insurance_claim_id is not null)                    as linked
--   from projects p
--   join insurance_claims c on c.project_id = p.id;
--
-- Expected after this runs, on the data as it stands 9 Aug 2026:
--   Adam Gunn                        Allstate   | Allstate   | Adam Gunn  | true
--   Maker Space Solutions LLC (Devon)   (null)  | State Farm | Maker...   | true
--
-- Revert, if it ever comes to that — there is no clean automatic one, because
-- after this runs you cannot tell a backfilled value from a typed one. The
-- honest revert is the row-level history in Supabase, or:
--   update projects set insurance_claim_id = null where id = '<project>';
