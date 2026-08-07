-- itel_register.sql — a register of ITEL lab determinations, keyed by report.
--
-- NOT APPLIED. Review before running. Revert statements at the bottom.
--
-- WHY A NEW TABLE RATHER THAN EXTENDING public.itel_reports
-- ---------------------------------------------------------
-- itel_reports is modelled as a child of a live claim:
--
--     claim_id uuid NOT NULL  ->  insurance_claims (3 rows)
--
-- Every row needs a claim first. That is the right shape for "I sent a sample
-- on this claim, here is what came back", and it is kept for exactly that. It
-- cannot hold history: 22 reports spanning Dec 2020 - Aug 2024 have no claim
-- rows and never will, and the point of a register is that a determination
-- outlives the claim that paid for it.
--
-- It also cannot hold what the reports actually say. Measured across all 22:
--
--   discontinued boolean  -- 12 of 22 are "discontinued" at all, and those 12
--                         -- split FOUR ways with completely different claim
--                         -- outcomes. The boolean is true for the strongest
--                         -- report in the set and the weakest one alike.
--   close_match  boolean  -- flattens a 4- or 5-axis Same/Similar/Different
--                         -- comparison into one bit.
--   (nothing)             -- no column can hold SBS7898800, which came back
--                         -- ASBESTOS POSITIVE, chrysotile 20%, Transite. That
--                         -- is worth more to a claim than any matching
--                         -- argument and the schema cannot record it.
--
-- THE VERDICT WHITELIST IS LOAD-BEARING
-- -------------------------------------
-- Same rule as STAGES / IC_SKIP / PIPE_SKIP in index.html: the check constraint
-- must contain a verdict BEFORE any row is given it. Ship a widened constraint
-- in its own migration, ahead of the writer. Reversed, the insert fails.
--
-- The seven values are ITEL's, not ours — each is a distinct sentence ITEL
-- prints under ORIGINAL PRODUCT IDENTIFICATION, and the sentence is the verdict.
-- Ordered strongest to weakest for an Ohio Admin. Code 3901-1-54(I) argument:
--
--   no_match          "No matches were found in our national search."
--   unreservable      "...discontinued; a sufficient quantity of the color
--                      could not be reserved at this time"
--   salvage_only      "...discontinued. Shingles for the repair may be
--                      available through Discontinued Materials, Inc."
--   similar_only      "...discontinued; however, similar matches were found"
--   match_available   "...discontinued; matching products are available"
--   unidentifiable    "Similar matches are available" + "The exact original
--                      manufacturer of the sample provided could not be
--                      determined" — NOT a matching argument, a different problem
--   in_production     "The original product is available; see Match 1"
--
-- Only the first three are strong. 6 of 22 reports land there. Do not let the
-- register imply otherwise — a claim argued on match_available loses, and
-- loses standing with that adjuster for the next one.

create table if not exists public.itel_lab_reports (
  id                uuid primary key default gen_random_uuid(),

  -- ITEL's own identifier. The prefix encodes sample type (R** roofing,
  -- S** siding), but it is not parsed — sample_type is stored explicitly.
  control_number    text not null unique,
  sample_type       text not null check (sample_type in ('roof','siding','other')),

  -- Nullable on purpose. Historical reports predate any claim row, and a
  -- determination stays useful long after its claim closes.
  claim_id          uuid references public.insurance_claims(id) on delete set null,

  -- ITEL's verdict, twice: once machine-readable, once in the lab's own words.
  -- The sentence is kept verbatim because it is the thing an adjuster reads.
  verdict           text not null check (verdict in (
                      'no_match','unreservable','salvage_only','similar_only',
                      'match_available','unidentifiable','in_production')),
  status_sentence   text not null,

  -- The product as ITEL identified it. product is null when the lab could not
  -- determine the manufacturer (3 of 22) or found nothing at all (2 of 22).
  manufacturer      text,
  product           text,
  product_type      text,          -- Architectural | 3-Tab Standard | siding profile
  color             text,
  warranty          text,          -- '30', 'Lifetime', or null on siding
  width_in          numeric(6,3),
  height_in         numeric(6,3),

  -- The nearest current product ITEL found, null when there is none.
  match_product     text,
  match_warranty    text,
  match_color       text,

  -- The break. Free text because it is quoted, not computed — e.g. "The
  -- submitted sample is an English dimension shingle. The current product
  -- available in the region of the claim is a Metric dimension shingle."
  mismatch_notes    text,

  -- ...and the same breaks as flags, because THE COMMENTS CAN OUTRANK THE
  -- STATUS SENTENCE and ranking on `verdict` alone gets it wrong.
  --
  -- RRS18995984 (Dunwiddie, Jun 2026) is the proof. Its status sentence is
  -- "matching products are available" — the weakest discontinued class — yet
  -- its comments carry BOTH breaks at once:
  --
  --   "A suitable substitute product is not available in a product with the
  --    same warranty..."
  --   "The submitted sample is an English dimension shingle. The current
  --    product available in the region of the claim is a Metric dimension
  --    shingle."
  --
  -- CertainTeed Landmark English 36x12 against Landmark AR Metric is a real
  -- size break wearing a weak verdict. Sort on these, not on verdict alone.
  --
  -- ITEL also argues the other way and it must be recordable: SRS17995353
  -- says "the sample submitted has an extruded nail hem. The current product
  -- has a post-formed nail hem. This change does not affect the panel
  -- visually." A difference the lab itself calls invisible is not a break.
  warranty_break    boolean not null default false,
  dimension_break   boolean not null default false,
  profile_break     boolean not null default false,

  -- Hazmat. Siding samples get an asbestos panel test and it can come back
  -- positive; SBS7898800 did, at 20% chrysotile. Nothing else in the schema
  -- has anywhere to put that, and it changes scope, cost and legal duty.
  asbestos_tested   boolean not null default false,
  asbestos_positive boolean,
  asbestos_detail   text,

  -- Provenance, and it is not cosmetic — it changed in 2026.
  --
  -- Through 2024 Cardinal (and before it Renegade, and before that Andrews)
  -- ordered and pre-paid every test. In 2026 the CARRIER orders it: Erie,
  -- USAA, Grange, Allstate and Nationwide each appear as the ITEL customer
  -- with their own customer ID and their own adjuster named, with Cardinal
  -- listed only as the vendor contact.
  --
  -- That is the strongest evidentiary position in the set regardless of
  -- verdict — a carrier is poorly placed to dispute a laboratory report it
  -- commissioned and paid for. Worth being able to filter on.
  --
  -- One report (RRS17850254) is not Cardinal's job at all: Nationwide
  -- ordered it through Hancock Claims, their own field vendor, and sent it
  -- on. Read the verdict on those before building an argument — that one
  -- came back in production.
  ordered_by        text not null default 'cardinal'
                      check (ordered_by in ('cardinal','carrier','third_party')),
  ordered_by_name   text,          -- 'Erie', 'USAA', 'Hancock Claims', 'Cardinal Roofing…'

  -- Four ITEL accounts seen so far: ANDS0001 (Andrews), CUST0004 (Cardinal,
  -- through 2024), CUST0003 (Cardinal, current), plus one per carrier.
  -- A history pull needs all of the Cardinal-side IDs, not just one.
  itel_customer_id   text,

  insured_name      text,
  loss_location     text,
  loss_date         date,
  report_date       date,

  -- ITEL reissues reports (RRS7573716 is stamped "REVISED REPORT: Updated
  -- insured name"). Supersession is recorded rather than overwritten.
  revised           boolean not null default false,
  supersedes        uuid references public.itel_lab_reports(id) on delete set null,

  analysis_fee      numeric(10,2),
  total_fee         numeric(10,2),
  report_url        text,           -- storage path to the PDF

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        text not null default coalesce(auth.jwt()->>'email','system')
);

create index if not exists itel_lab_reports_product_idx
  on public.itel_lab_reports (lower(product));
create index if not exists itel_lab_reports_verdict_idx
  on public.itel_lab_reports (verdict);
create index if not exists itel_lab_reports_claim_idx
  on public.itel_lab_reports (claim_id) where claim_id is not null;

comment on table public.itel_lab_reports is
  'ITEL laboratory determinations, one row per control number. Claim-independent '
  'on purpose: a determination outlives its claim. public.itel_reports remains '
  'the per-claim sample tracker.';

-- ── the register view: what a product has been determined to be ──────
-- The reason this is worth having. Tamko Heritage English appears FOUR times
-- across three colours and two verdicts; Owens Corning Oakridge Pro 30 twice,
-- ten months apart, with the same match both times. The fifth time one comes
-- up, the outcome is already known and three prior control numbers can be
-- cited by number.
-- security_invoker is NOT optional here. A view defaults to the owner's
-- privileges, which would read straight past the row-level security defined
-- below and hand every determination — insured names, loss addresses — to
-- anyone who can select from the view. The RLS on the base table is the only
-- gate, so the view has to run as the caller for it to mean anything.
create or replace view public.itel_product_register
  with (security_invoker = true) as
  select
    lower(coalesce(product, 'unidentified')) as product_key,
    max(product)                              as product,
    max(manufacturer)                         as manufacturer,
    count(*)                                  as reports,
    array_agg(distinct verdict)               as verdicts,
    array_agg(distinct color)   filter (where color is not null)         as colors,
    array_agg(distinct match_product) filter (where match_product is not null) as matches,
    min(report_date)                          as first_seen,
    max(report_date)                          as last_seen,
    bool_or(verdict in ('no_match','unreservable','salvage_only')) as ever_strong
  from public.itel_lab_reports
  group by 1;

-- ── RLS ──────────────────────────────────────────────────────────────
-- Claim evidence, and it carries insured names and loss addresses. Same shape
-- as the rest of the claims tables: full access reads and writes, everyone
-- else is out. Not is_cardinal_admin() alone — production needs to read a
-- determination to argue a supplement; they just don't get to change it.
alter table public.itel_lab_reports enable row level security;

drop policy if exists itel_lab_reports_select on public.itel_lab_reports;
create policy itel_lab_reports_select on public.itel_lab_reports
  for select using (auth.role() = 'authenticated');

drop policy if exists itel_lab_reports_write on public.itel_lab_reports;
create policy itel_lab_reports_write on public.itel_lab_reports
  for all using (public.is_cardinal_admin()) with check (public.is_cardinal_admin());

-- ── REVERT ───────────────────────────────────────────────────────────
--   drop view if exists public.itel_product_register;
--   drop table if exists public.itel_lab_reports;
-- public.itel_reports is untouched by this migration.
