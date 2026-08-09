-- Build 660 — Ordinance & Law is "BC — Building Codes" on an Xactimate scope.
--
-- Theo, reading Adam Gunn's estimate: "Adam Gunns claim estimate includes
-- Ordinance and Law coverage. In insurance estimates, Ordinance and Law is
-- typically categorized under Building Codes (Coverage BC). Page 5 lists
-- BC-Building Codes with an Item Total of $1,887.33 and an ACV Total of
-- $1,933.72. Page 7 provides a dedicated Summary for BC-Building Codes."
--
-- 658 taught the reader the prose names (ordinance or law, code upgrade,
-- code coverage...). It did NOT know the one that actually appears on these
-- documents: the Xactimate COVERAGE CATEGORY CODE "BC". The coverage is not
-- an endorsement line on the scope at all — it is a category with its own
-- subtotal and its own summary page.
--
-- TWO figures, and they are not interchangeable (Theo): the Item/RCV total is
-- the carrier's full valuation of the required code upgrades; the ACV/Net
-- total is what is being paid now. ⚠ On ALLSTATE estimates the ACV total
-- EXCEEDS the item total, because sales tax lands on code items — so a single
-- "amount" column would have silently thrown away whichever one it did not
-- keep, and an ACV above an RCV would have looked like corrupt data.
--
-- ord_law_limit stays, and means something DIFFERENT: the endorsement CAP
-- (commonly 10% of Coverage A). A cap is not a scope amount. Nothing has ever
-- been written to it, so this is a definition made precise, not a migration
-- of stored values.
--
-- Idempotent. APPLIED to production via MCP on 9 Aug 2026, before the 660 PR.

alter table public.insurance_claims add column if not exists ord_law_rcv numeric;
alter table public.insurance_claims add column if not exists ord_law_acv numeric;

comment on column public.insurance_claims.ord_law_rcv is
  'Ordinance & Law / code category (Xactimate "BC - Building Codes") Item/RCV '
  'total — the carrier''s full valuation of required code upgrades.';
comment on column public.insurance_claims.ord_law_acv is
  'The same category''s ACV/Net total. On Allstate scopes this EXCEEDS the RCV '
  'item total because sales tax applies to code items — that is not an error.';
comment on column public.insurance_claims.ord_law_limit is
  'The ENDORSEMENT CAP if the policy states one (commonly 10%% of Coverage A). '
  'Not a scope amount — see ord_law_rcv / ord_law_acv for what the adjuster wrote.';
