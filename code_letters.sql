-- code_letters.sql — build 670
-- The Code Authority register: building-official letters, kept as they come.
--
-- WHY THIS IS A REGISTER AND NOT A CLAIM ATTACHMENT
-- ────────────────────────────────────────────────
-- A letter from the Brookville building official saying he will not permit a
-- roof covering applied over deteriorated cedar shake answers the Brookville
-- job it was obtained for — and every Brookville job after it, forever. Filed
-- against one claim it is a document; filed against the JURISDICTION it is an
-- asset that compounds. Same posture as itel_lab_reports: evidence of record,
-- reusable, outliving the claim that paid for it.
--
-- WHY rco_sections, AND WHY local_amendment IS NORMALLY NULL
-- ─────────────────────────────────────────────────────────
-- Ohio's Residential Code (RCO) is adopted statewide by the Board of Building
-- Standards. A city or county does NOT have its own competing roofing code —
-- the local building department is the body that ENFORCES the RCO, and for
-- one-to-three-family dwellings Ohio holds that standard largely uniform
-- across jurisdictions. So a building official's letter is not a different
-- citation to quote at a carrier. It is proof of how the state section will be
-- enforced at this address — which is the thing an adjuster cannot argue with,
-- because the carrier cannot fund an installation the county will red-tag.
--
-- That is why the letter is indexed to the STATE sections it stands behind
-- (rco_sections) rather than pretending to be a code of its own.
-- local_amendment exists for the genuine exception — a jurisdiction that has
-- adopted something additional, or an administrative requirement of its own
-- (permit, mid-course inspection, tear-off verification). Expect it NULL.
--
-- MATCHING IS A SORT HINT, NOT A GATE
-- ───────────────────────────────────
-- Property addresses here are free text and misspell their own city — one row
-- reads "Brookville, OH 45309, USA, Brookeville, OH 45309". No fuzzy match is
-- trusted to decide what evidence goes to a carrier. applies_to only SORTS the
-- list; the person filing ticks what rides along. (The 666 philosophy: nothing
-- pre-approved over judgment.) A neighbouring county's official is persuasive
-- even where he is not binding, so every letter stays visible, always.

create table if not exists public.code_letters (
  id              uuid primary key default gen_random_uuid(),

  -- The body that issued it, as it signs itself: 'Brookville',
  -- 'Montgomery County', 'Ohio Board of Building Standards'.
  jurisdiction    text not null,
  level           text not null default 'city'
                    check (level in ('city','county','state')),

  -- Lower-case place names this letter answers for. A SORT HINT only — never
  -- a filter, never an auto-attach. Seeded from jurisdiction; add the spelling
  -- variants the addresses actually carry.
  applies_to      text[] not null default '{}',

  -- Who signed it. An unsigned letter is not evidence; a named building
  -- official with a title is.
  official_name   text,
  official_title  text,
  department      text,
  contact         text,
  letter_date     date,

  -- What it is about, in the words a person would search for.
  topic           text not null,

  -- THE LOAD-BEARING SENTENCE, verbatim from the letter. Kept whole and
  -- unparaphrased for the same reason itel_lab_reports keeps status_sentence:
  -- it is the thing an adjuster reads, and a paraphrase is worth nothing.
  holding         text not null,

  -- The state sections this letter enforces. See the header — the letter is
  -- evidence of enforcement, the citation is still the RCO's.
  rco_sections    text[] not null default '{}',

  -- The rare genuine local addition. Normally NULL; do not fill it to make a
  -- letter look stronger.
  local_amendment text,

  -- The scan, in the photos bucket under code-letters/. source_url is for a
  -- letter that lives on the jurisdiction's own site.
  storage_path    text,
  source_url      text,

  -- Who confirmed this is a real letter from a real official.
  verified_by     text,
  verified_at     timestamptz,

  notes           text,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index if not exists code_letters_level_idx on public.code_letters (level);
create index if not exists code_letters_applies_idx on public.code_letters using gin (applies_to);

comment on table public.code_letters is
  'Building-official letters, keyed by jurisdiction rather than claim so one letter serves every future job in that jurisdiction. Ohio''s RCO is adopted statewide and administered locally, so a letter is evidence of ENFORCEMENT of a state section (rco_sections), not a competing code; local_amendment is for the rare genuine local addition. applies_to sorts the list and never filters it.';

comment on column public.code_letters.holding is
  'The load-bearing sentence, verbatim. Never paraphrased — it is what the adjuster reads.';

comment on column public.code_letters.applies_to is
  'Sort hint only. Never a filter and never an auto-attach: addresses here misspell their own city, and a neighbouring official is persuasive where he is not binding.';

-- ── RLS: the same shape as itel_lab_reports ──────────────────────────────
-- Everyone signed in READS. Production argues supplements in the field and
-- needs the jurisdiction's position in hand; they just do not get to author
-- one. Writing is admin — a letter nobody verified is worse than no letter.
alter table public.code_letters enable row level security;

drop policy if exists code_letters_select on public.code_letters;
create policy code_letters_select on public.code_letters
  for select using (auth.role() = 'authenticated');

drop policy if exists code_letters_write on public.code_letters;
create policy code_letters_write on public.code_letters
  for all using (public.is_cardinal_admin()) with check (public.is_cardinal_admin());

-- ── which letters rode along with a filing ───────────────────────────────
-- Filing-level, not item-level: a building official's position on re-cover
-- backs every item that turns on the tear-off, not one of them. Chosen by the
-- person filing — never auto-attached, for the reason in the header.
alter table public.insurance_supplements
  add column if not exists code_letter_ids uuid[] not null default '{}';

comment on column public.insurance_supplements.code_letter_ids is
  'code_letters rows that rode along with this filing as exhibits. Chosen by the person filing, never auto-attached.';

-- ── REVERT ───────────────────────────────────────────────────────────────
--   alter table public.insurance_supplements drop column if exists code_letter_ids;
--   drop table if exists public.code_letters;
