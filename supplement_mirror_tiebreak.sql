-- supplement_mirror_tiebreak.sql — build 671
--
-- ONE LINE, and it is a correctness fix, not a tidy-up.
--
-- supp_mirror_to_claim (shipped 667) resolves the claim's supplement_status by
-- taking the FIRST element of
--
--   array_agg(status order by responded_at desc nulls last,
--                             filed_at    desc nulls last)
--
-- Both ordering columns are `date`, not `timestamptz` — verified against the
-- live catalog. So two decisions recorded on the SAME DAY produce an identical
-- sort key, PostgreSQL is free to emit them in either order, and the claim's
-- supplement_status becomes whichever row the plan happened to read first.
--
--   select ('2026-08-20T14:05:00Z'::timestamptz)::date
--        = ('2026-08-20T14:40:00Z'::timestamptz)::date;   -- true
--
-- A claim flipping between 'approved' and 'denied' depending on scan order is
-- the confident-wrong-number class this project keeps removing. Two decisions
-- in one day is not exotic: an adjuster answers a partial denial in the morning
-- and revises it after a phone call.
--
-- The fix is a deterministic FINAL tiebreak, not a column type change:
--   ... , updated_at desc, id desc
-- updated_at is timestamptz and is maintained on the row; id breaks the
-- remaining tie so the ordering is total. The most recently WRITTEN decision
-- wins, which is the intent the date columns were reaching for.
--
-- Deliberately NOT changing filed_at / responded_at to timestamptz: the
-- claims-screen CRUD writes them as dates from date inputs, they are displayed
-- as dates, and a type change would touch every writer for no behavioural gain
-- once the ordering is total.
--
-- Everything else in the function is byte-identical to what shipped at 667.
-- The recompute stays idempotent and writer-agnostic.

create or replace function public.supp_mirror_to_claim(cid uuid)
returns void
language plpgsql
as $function$
declare
  v_filed      numeric;
  v_approved   numeric;
  v_status     text;
  v_filed_at   date;
  v_decided_at date;
begin
  if cid is null then return; end if;
  select
    sum(coalesce(amount_requested,0)) filter (where status in ('submitted','approved','partial','denied')),
    sum(coalesce(amount_approved,0))  filter (where status in ('approved','partial')),
    case
      when count(*) filter (where status = 'submitted') > 0 then 'filed'
      else (array_agg(status order by responded_at desc nulls last,
                                      filed_at    desc nulls last,
                                      updated_at  desc,
                                      id          desc)
              filter (where status in ('approved','partial','denied')))[1]
    end,
    coalesce(min(filed_at) filter (where status = 'submitted'),
             max(filed_at) filter (where status in ('approved','partial','denied'))),
    max(responded_at)
  into v_filed, v_approved, v_status, v_filed_at, v_decided_at
  from public.insurance_supplements
  where claim_id = cid and status not in ('draft','withdrawn');

  update public.insurance_claims set
    supplement_filed      = coalesce(v_filed, 0),
    supplement_approved   = coalesce(v_approved, 0),
    supplement_status     = coalesce(v_status, 'none'),
    supplement_filed_at   = v_filed_at::timestamptz,
    supplement_decided_at = v_decided_at::timestamptz,
    updated_at            = now()
  where id = cid;
end $function$;

-- ── A NOTE ON WHAT THIS DELIBERATELY DOES *NOT* CHANGE ───────────────────
--
-- An audit proposed making this function SECURITY DEFINER, on the grounds
-- that is_cardinal_admin() (the Desk's gate) is not a subset of
-- is_full_access() (the claim's write gate), so a Desk admin could file a
-- supplement whose mirror UPDATE is silently filtered away by RLS.
--
-- The premise is true — audit@cardinalrenovations.net is a team_profiles
-- admin and is NOT in is_full_access(). The conclusion is not, and it was
-- tested rather than reasoned about:
--
--   1. insurance_claims_select and insurance_claims_update have BYTE-IDENTICAL
--      USING expressions (compared in the catalog, not by eye). Anyone who can
--      READ a claim can WRITE it, so the mirror cannot be refused for a claim
--      the Desk was able to load.
--   2. Run as audit@: is_cardinal_admin() true, is_full_access() false,
--      claims visible = 0 of 5. That user cannot reach a filing at all.
--
-- So the mirror is not broken; the DESK is, in a smaller and more honest way —
-- it opens, and shows an empty list with no explanation. That is fixed in the
-- page, not here. SECURITY DEFINER would have been a real privilege widening
-- applied to a defect that does not exist.
--
-- ONE genuine looseness is recorded rather than silently patched:
-- insurance_supplements_insert checks only (created_by = my_email() OR
-- created_by IS NULL) — it does NOT check that the claim is visible. A caller
-- outside the Desk could therefore insert a row against an invisible claim and
-- the mirror would no-op. Not reachable from any shipped UI. Tightening it is
-- its own change with its own test, and needs Theo — it would sit on the same
-- policy the claims-screen CRUD uses.

-- ── REVERT ───────────────────────────────────────────────────────────────
-- Re-create the function with the ORDER BY as it shipped at 667:
--   array_agg(status order by responded_at desc nulls last, filed_at desc nulls last)
