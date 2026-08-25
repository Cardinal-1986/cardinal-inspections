-- delete_empty_test_claims.sql — 25 Aug 2026, from the full audit. Theo's yes.
--
-- STATUS: ✅ APPLIED 25 Aug 2026. Do not run again — the guards make a repeat
-- abort loudly rather than doing nothing quietly, which is the intent.
--
-- WHY: three insurance_claims rows made while testing the claim form in July.
-- All three had no project, no carrier, no claim number, no policy number, no
-- RCV, no estimate, no scope PDF and no notes. One was keyboard-mash
-- ("grdgdfg" / "dfgfdg"); the other two carried nothing at all but
-- status='filed'. Created by theo@ on 23, 24 and 29 July.
--
-- They were not harmless. They made every insurance figure wrong: the audit's
-- "5 claims, none ever chased" was really TWO claims — Maker Space Solutions
-- (State Farm, $28,727.17) and Adam Gunn (Allstate, $22,397.63) — both of them
-- genuinely overdue. Three empty rows were hiding a real number behind a
-- worse-looking one.
--
-- ⚠ THE GUARDS ARE THE POINT, not ceremony. SIX of the eight foreign keys into
-- insurance_claims are ON DELETE CASCADE (claim_notes, insurance_supplements,
-- insurance_payments, claim_upgrades, scope_reads, itel_reports; projects and
-- itel_lab_reports are SET NULL). A claim row with children takes them with it
-- and says nothing. So this refuses rather than cascading, and it re-checks at
-- the moment it runs rather than trusting the audit that picked the ids.
--
-- VERIFIED AFTER APPLYING, not assumed from a success flag:
--   insurance_claims          5 -> 2
--   claims with no project    3 -> 0
--   both real claims present, $51,124.80 of approved RCV still on the books
--   children untouched: 2 supplements, 2 scope_reads, 28 itel_lab_reports
--   projects still 57
--
-- REVERT: there is none worth writing. The rows held no information — that is
-- the whole reason they went. If one is ever wanted back, create a new claim.

do $$
declare
  ids uuid[] := array[
    'e1c953e3-5f1c-415f-98eb-6a3c65b8a0b2',
    '17a212b1-af15-46c5-b77b-e1dd11e27fb7',
    '48b6eb0b-4e50-4eec-91b8-6c8d296e8ec5'
  ]::uuid[];
  n bigint;
  gone int;
begin
  -- 1. still empty of everything that would make a claim real?
  select count(*) into n from public.insurance_claims
   where id = any(ids)
     and (project_id is not null
       or coalesce(carrier,'')        <> ''
       or coalesce(claim_number,'')   <> ''
       or coalesce(policy_number,'')  <> ''
       or coalesce(scope_pdf_url,'')  <> ''
       or coalesce(notes,'')          <> ''
       or approved_rcv is not null
       or our_estimate_total is not null);
  if n > 0 then
    raise exception 'ABORT: % of the 3 now carry real claim data. Nothing deleted.', n;
  end if;

  -- 2. no children in ANY of the eight referencing tables
  select (select count(*) from public.claim_notes           where claim_id = any(ids))
       + (select count(*) from public.insurance_supplements where claim_id = any(ids))
       + (select count(*) from public.insurance_payments    where claim_id = any(ids))
       + (select count(*) from public.claim_upgrades        where claim_id = any(ids))
       + (select count(*) from public.scope_reads           where claim_id = any(ids))
       + (select count(*) from public.itel_reports          where claim_id = any(ids))
       + (select count(*) from public.itel_lab_reports      where claim_id = any(ids))
       + (select count(*) from public.projects              where insurance_claim_id = any(ids))
    into n;
  if n > 0 then
    raise exception 'ABORT: % child row(s) hang off these claims. CASCADE would take them. Nothing deleted.', n;
  end if;

  -- 3. and never more than the three named
  delete from public.insurance_claims where id = any(ids);
  get diagnostics gone = row_count;
  if gone <> 3 then
    raise exception 'ABORT: deleted % rows, expected exactly 3. Rolled back.', gone;
  end if;

  raise notice 'deleted 3 empty test claims';
end $$;
