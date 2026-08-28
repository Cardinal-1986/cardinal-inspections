-- Build 1123 — the Labor Rate Schedule became per-crew, so Santiago's rates
-- have to move to Santiago.
--
-- WHY THIS EXISTS. Build 1110 built the schedule as ONE document read straight
-- from pricing_items (template='roofing_labor'), and its `rate` column has
-- always been Santiago Gutierrez's numbers — the document was titled SANTIAGO.
-- 1123 reads per-crew rates from crew_rates instead (where build 548 already
-- put them). Without this seed, opening Santiago would show his 23 line items
-- with every rate blank: his sheet, silently emptied.
--
-- The catalog's own `rate` column is LEFT ALONE. It stays the reference price
-- for the line item; crew_rates is what a given crew is paid. Nothing else in
-- the app reads one for the other.
--
-- Idempotent and non-clobbering: the NOT EXISTS means a re-run inserts nothing,
-- and a rate Theo has already edited on Santiago's sheet is never overwritten.
-- Matched by name rather than a pasted uuid so it is readable and reviewable.
insert into crew_rates (crew_id, pricing_item_id, rate, updated_by)
select c.id, p.id, p.rate, 'build-1123-seed'
  from crews c
  cross join pricing_items p
 where c.name = 'Santiago Gutierrez'
   and p.template = 'roofing_labor'
   and p.unit <> 'note'            -- a category note is prose, not a rate
   and p.rate is not null
   and not exists (select 1 from crew_rates r
                    where r.crew_id = c.id and r.pricing_item_id = p.id);

-- One crew can only have one rate for one catalog line. There was no constraint
-- saying so, and 1123 is the build that starts writing these rows from a screen
-- two admins can have open at once — a race would leave two overrides on one
-- line and the sheet would quietly show whichever came back last.
-- Partial, because a crew's OWN lines (pricing_item_id null) may legitimately
-- repeat a name. Verified zero duplicates before creating it.
create unique index if not exists crew_rates_one_per_item
  on crew_rates (crew_id, pricing_item_id)
  where pricing_item_id is not null;
