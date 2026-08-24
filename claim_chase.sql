-- claim_chase.sql — build 1056, the chase clock
--
-- ✅ APPLIED to production 2026-08-24 (Theo: "Can you not run the sql?").
--    Verified after: both columns present and nullable, the index exists, and
--    the app's exact claims select — all fifteen columns named by
--    cr-cth-script — returns all 5 rows. Idempotent; re-running is a no-op.
--
-- Two columns of STATE on the claim: when a carrier was last chased, and by
-- whom. Run this BEFORE deploying the index.html change; the app's claims
-- select names last_chased_at explicitly and PostgREST 400s on an unknown
-- column, so the hub would not load against an unmigrated database.
--
-- WHY A COLUMN AND NOT claim_notes. Build 1056 writes BOTH: a claim_notes row
-- is the human record of what was said, and these two columns are the state
-- the clock reads. Deriving "when did we last chase" by pattern-matching note
-- prose is the fragile version of this, and prose is not a schema.
--
-- WHY NOT insurance_supplements.responses (which is unused and jsonb, and was
-- the first candidate): a supplement row only exists for the "supplement
-- filed" half of the chase list. The "awaiting release" half is an Invoiced
-- job with no supplement row at all, and both halves need the same clock.
--
-- Idempotent. No RLS change is needed: insurance_claims_update already allows
-- is_full_access(), the creator, or the project's assigned rep, which is
-- exactly who may record a chase.

alter table public.insurance_claims
  add column if not exists last_chased_at timestamptz,
  add column if not exists last_chased_by text;

comment on column public.insurance_claims.last_chased_at is
  'Build 1056: when a human last chased the carrier on this claim. Drives the chase clock on the insurance hub. NULL means never chased.';
comment on column public.insurance_claims.last_chased_by is
  'Build 1056: the email of whoever recorded that chase.';

-- the hub reads the chase list ordered by how overdue a claim is; this keeps
-- that cheap once there are more than a handful of claims.
create index if not exists insurance_claims_last_chased_idx
  on public.insurance_claims (last_chased_at);

-- revert:
--   drop index if exists public.insurance_claims_last_chased_idx;
--   alter table public.insurance_claims
--     drop column if exists last_chased_at,
--     drop column if exists last_chased_by;
