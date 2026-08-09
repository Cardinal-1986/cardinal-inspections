-- Build 658 — ordinance & law stops lying.
--
-- Theo: "It says no on ordinance and law. These can be called different things
-- like code upgrades, code coverage, building codes etc. this can't simply say
-- no. It's deceiving."
--
-- Nobody ever said "no ordinance and law" on that claim. Three writers in
-- index.html manufactured a confident `false` out of an absence:
--   * the lead form's checkbox  — untouched  -> false
--   * openInsuranceEditor's !!  — blank/cancel -> false
--   * the scope-review apply    — anything not the string 'true' -> false
-- and every display rendered that false as a flat "No".
--
-- Two new columns record what the document actually called the coverage and
-- what limit it carried, because ordinance & law appears under many names:
-- ordinance or law, law and ordinance, code upgrade, code coverage, building
-- code / code compliance, Coverage D on some forms.
--
-- THE RESET IS THE POINT, and it is justified rather than cosmetic: no
-- interface in the app before build 658 could express a deliberate "No", so
-- every stored `false` is a default, not a decision. Null means "not stated"
-- and that is the honest value for all of them. One live row is affected
-- (Adam Gunn's Allstate claim d9049634).
--
-- Idempotent. APPLIED to production via MCP on 9 Aug 2026, before the 658 PR.

alter table public.insurance_claims add column if not exists ord_law_basis text;
alter table public.insurance_claims add column if not exists ord_law_limit numeric;

comment on column public.insurance_claims.ord_law is
  'Tri-state: true = coverage affirmatively shown, false = document explicitly '
  'states none, NULL = not stated. Never write false to mean "unknown".';
comment on column public.insurance_claims.ord_law_basis is
  'The wording the source document used (e.g. "Code Upgrade Coverage").';

update public.insurance_claims
   set ord_law = null
 where ord_law = false;

-- the checklist mirror carries the same defaulted false on linked projects
update public.projects p
   set checklist = jsonb_set(
         p.checklist::jsonb, '{lead,insurance,ord_law}', 'null'::jsonb, false
       )::text
 where p.checklist::jsonb #> '{lead,insurance,ord_law}' = 'false'::jsonb;
