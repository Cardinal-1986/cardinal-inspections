-- Build 646 — backfill insurance_claims from the checklist, and fix the one-way link.
--
-- RUN THIS BEFORE DEPLOYING index.html.
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
