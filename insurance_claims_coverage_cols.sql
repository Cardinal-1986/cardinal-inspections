-- Build 655 (CR-AUD-009) — insurance_claims gains the two columns the app
-- has read since the claims screen shipped and written blind ever since.
--
-- `cr-iu-script`'s shape() reads row.coverage_type and row.ord_law, and its
-- save() includes both in every payload — but neither column existed, so
-- the read was always NULL (masking real checklist values on any project
-- with a claim row: Adam Gunn rendered Coverage Type / Ord. & Law blank
-- live) and save() was armed to fail its entire write on PGRST204.
--
-- ord_law is BOOLEAN: the checklist stores it from a checkbox
-- (`ord_law: !!ordLaw`) and the renderer distinguishes false ("No") from
-- null ("") — `I.ord_law ? 'Yes' : (I.ord_law === false ? 'No' : '')`.
--
-- Backfill from the linked project's checklist mirror, never overwriting
-- a value already present. Idempotent; safe to re-run.
-- APPLIED to production via MCP on 9 Aug 2026, before the build-655 PR.

alter table public.insurance_claims add column if not exists coverage_type text;
alter table public.insurance_claims add column if not exists ord_law boolean;

update public.insurance_claims c
set coverage_type = coalesce(c.coverage_type,
                             p.checklist::jsonb #>> '{lead,insurance,coverage_type}'),
    ord_law       = coalesce(c.ord_law,
                             (p.checklist::jsonb #>> '{lead,insurance,ord_law}')::boolean)
from public.projects p
where p.id = c.project_id
  and (p.checklist::jsonb #>> '{lead,insurance,coverage_type}' is not null
       or p.checklist::jsonb #>> '{lead,insurance,ord_law}' is not null);
