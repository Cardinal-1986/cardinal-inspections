-- ═══════════════════════════════════════════════════════════════════════════
-- Add "finance" as a collection source, plus which financing company
-- (build 651)
--
-- Theo, 9 Aug 2026: "Add finance, we use service finance right now but will
-- explore other financing." A check that comes in through a financing
-- company (Service Finance today, others later) is neither straight
-- insurance proceeds nor the homeowner's own cash — it needed its own source.
--
-- `finance_company` is deliberately free text, not an enum: there is exactly
-- one financing company today and Theo has already said he'll add others.
-- A `financing_companies` table for one row would be the premature
-- abstraction this project's own doctrine warns against. The UI pre-fills
-- "Service Finance" as an editable default on a NEW collection so today's
-- normal case is zero extra typing, and adding a second company later needs
-- no migration.
--
-- Extends commission_system.sql (applied). Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.collections
  drop constraint if exists collections_source_check;
alter table public.collections
  add constraint collections_source_check
  check (source in ('insurance','homeowner','finance','other'));

alter table public.collections
  add column if not exists finance_company text;

comment on column public.collections.finance_company is
  'Only meaningful when source = ''finance''. Free text on purpose — Service '
  'Finance today, more companies later, no schema change either way.';
