-- Build 1110 — seed the "Roofing Labor" rate schedule (Santiago's Exhibit A) as a
-- new pricing_items TEMPLATE. A CREW labor-rate schedule (what Cardinal pays a sub
-- for labor), distinct from the 'roofing' estimate catalog (materials + labor to
-- quote the homeowner). Edited in the app's Labor Rate Schedule screen.
--
-- Units are the table's canonical set; the screen maps them to the exhibit labels
-- (sq -> "SQ", lf -> "LF", ea -> "unit", sheet -> "sheet", ls -> a flat price with
-- no unit suffix, note -> a non-priced category note).
--
-- Two CHECK constraints are extended ADDITIVELY (the estimate templates never use
-- the new values, so nothing regresses): template gains 'roofing_labor'; unit
-- gains 'sheet' and 'note'.

alter table public.pricing_items drop constraint if exists pricing_items_template_check;
alter table public.pricing_items add constraint pricing_items_template_check
  check (template = any (array['roofing','siding','windows','roofing_labor']));

alter table public.pricing_items drop constraint if exists pricing_items_unit_check;
alter table public.pricing_items add constraint pricing_items_unit_check
  check (unit = any (array['sq','lf','ea','ls','bundle','roll','day','sf','hour','box','sheet','note']));

-- Idempotent + NON-CLOBBERING: seed only if the roofing_labor template is empty,
-- so a re-run never duplicates rows or overwrites a rate Theo has since edited.
insert into public.pricing_items (template, sku, category, name, description, unit, rate, sort_order, enabled)
select v.template, v.sku, v.category, v.name, v.description, v.unit, v.rate, v.sort_order, true
from (values
  -- Shingle Installation
  ('roofing_labor','RL-110','Shingle Installation','Shingle install, 2/12 to 8/12 pitch','Dump fees reimbursed at actual receipt cost','sq',95,110),
  ('roofing_labor','RL-120','Shingle Installation','Shingle install, alternate','Includes $350 dump up to 40 SQ; additional $300 for 2nd dump','sq',80,120),
  ('roofing_labor','RL-130','Shingle Installation','Additional layer removal','Per layer','sq',10,130),
  ('roofing_labor','RL-140','Shingle Installation','Steep charge, 9/12 to 10/12 pitch',null,'sq',10,140),
  ('roofing_labor','RL-150','Shingle Installation','Steep charge, 11/12 to 12/12 pitch',null,'sq',25,150),
  ('roofing_labor','RL-160','Shingle Installation','Mansard, over 12/12 pitch',null,'sq',50,160),
  ('roofing_labor','RL-170','Shingle Installation','Rolled roofing',null,'sq',95,170),
  ('roofing_labor','RL-180','Shingle Installation','Cedar shake',null,'sq',15,180),
  -- Ventilation and Flashing
  ('roofing_labor','RL-210','Ventilation and Flashing','Box vent cut out',null,'ea',5,210),
  ('roofing_labor','RL-220','Ventilation and Flashing','Ridge vent cut out',null,'lf',2,220),
  ('roofing_labor','RL-230','Ventilation and Flashing','Roof deck air intake',null,'lf',2,230),
  ('roofing_labor','RL-240','Ventilation and Flashing','Pre-bent wall flashing',null,'lf',1.50,240),
  ('roofing_labor','RL-250','Ventilation and Flashing','Custom bent wall flashing',null,'lf',3.00,250),
  -- Skylights
  ('roofing_labor','RL-310','Skylights','Skylight flashing',null,'ea',50,310),
  ('roofing_labor','RL-320','Skylights','Skylight replacement, deck mounted',null,'ea',100,320),
  ('roofing_labor','RL-330','Skylights','Skylight replacement, curb mounted','When building curb','ea',175,330),
  -- Chimney Flashing (priced by perimeter)
  ('roofing_labor','RL-410','Chimney Flashing (priced by perimeter)','Small chimney','Perimeter up to 8 LF (up to 24" x 24", typical single flue)','ls',150,410),
  ('roofing_labor','RL-420','Chimney Flashing (priced by perimeter)','Medium chimney','Perimeter 8 to 12 LF (24" to 36" width, up to approx. 48" length; requires saddle/cricket)','ls',200,420),
  ('roofing_labor','RL-430','Chimney Flashing (priced by perimeter)','Large chimney','Perimeter over 12 LF (over approx. 36" x 48"; full cricket/saddle required)','ls',250,430),
  ('roofing_labor','RL-490','Chimney Flashing (priced by perimeter)','Note','Chimney cost factors considered at assignment: roof pitch, chimney location (valley/ridge), siding type (stucco/stone), counter flashing removal, and cricket requirement.','note',0,490),
  -- Decking and Wood Replacement
  ('roofing_labor','RL-510','Decking and Wood Replacement','OSB, individually replaced',null,'sheet',15,510),
  ('roofing_labor','RL-520','Decking and Wood Replacement','OSB, overlay on 1x boards',null,'sheet',15,520),
  ('roofing_labor','RL-530','Decking and Wood Replacement','OSB, full re-deck including H-clips',null,'sheet',20,530),
  ('roofing_labor','RL-540','Decking and Wood Replacement','Replace 1x boards',null,'lf',2.50,540)
) as v(template, sku, category, name, description, unit, rate, sort_order)
where not exists (select 1 from public.pricing_items where template = 'roofing_labor');
