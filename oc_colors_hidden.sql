-- OC Colors — `hidden`, so a colour can exist without being offered.
-- APPLIED TO PRODUCTION 7 Aug 2026. Run after oc_discontinued_fix.sql.
--
-- ============================================================================
-- hidden IS NOT status. THIS IS THE POINT OF THE COLUMN.
-- ============================================================================
-- Theo, 7 Aug 2026: "But they should still have a spot. I still would like a
-- spot for them except for Shasta white."
--
--   discontinued  -> STILL GETS A SPOT on the wall, badged. Cardinal has been
--                    roofing for years; a homeowner with a twelve-year-old roof
--                    needs to find their colour, and a rep matching a repair
--                    needs to see it. Removing dead colours from the wall would
--                    break both. Ten of the eleven discontinued rows render.
--
--   hidden        -> NO SPOT AT ALL. Never rendered in the showroom, whatever
--                    its status. Currently one row: Shasta White.
--
-- Deleting the row was the obvious alternative and is wrong. If Cardinal ever
-- installed Shasta White, the colour still has to resolve — for history, for a
-- repair match, and for anything that references it later. Hiding removes it
-- from the sales surface without destroying the record.
--
-- ⚠ The wall MUST filter on this. A query that selects by status alone will put
-- Shasta White back on the tablet.

alter table public.oc_colors
  add column if not exists hidden boolean not null default false;

comment on column public.oc_colors.hidden is
  'True = never render this colour in the showroom, at all. This is NOT status. '
  'Discontinued colours DO get a spot on the wall (badged) so an owner can '
  'identify an older roof; hidden removes the spot entirely. Set by Theo, not '
  'derived from anything. The row is kept so history and any existing job '
  'referencing the colour still resolve. The wall must filter on this.';

update public.oc_colors set hidden = true, updated_at = now()
 where name = 'Shasta White';

-- ---------------------------------------------------------------------------
-- Result
-- ---------------------------------------------------------------------------
--   catalogue 31  ·  hidden 1 (Shasta White)  ·  on the wall 30
--
--   on the wall:  coty 1 · current 17 · new 2 · discontinued 10
--
-- Of the 30 on the wall, 23 have a cover image extracted. The 7 without are all
-- discontinued and fall back to their hex swatch — which is eyeballed and
-- hex_verified=false, so that card must carry the unverified label. Lower stakes
-- than a sellable colour, but not zero: someone matching a repair is still
-- looking at it.
--
-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select count(*) filter (where hidden) as hidden,
--          count(*) filter (where not hidden) as on_wall from public.oc_colors;
--   -- expect 1 / 30
--
-- Rollback:
--   update public.oc_colors set hidden = false where name = 'Shasta White';
--   -- or drop entirely:  alter table public.oc_colors drop column hidden;
