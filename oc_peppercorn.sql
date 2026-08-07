-- OC Colors — add Peppercorn.
-- APPLIED TO PRODUCTION 7 Aug 2026. Run after oc_williamsburg_gray.sql.
--
-- The second colour missing from the catalogue. Like Williamsburg Gray it has a
-- full-page roof photograph in the TruDefinition Duration Beauty Book (p11) and
-- no oc_colors row, so it could never appear on the wall.
--
-- ============================================================================
-- WHERE EACH FIELD CAME FROM
-- ============================================================================
--   product_line  'duration'. Settled by the source itself: Peppercorn has a
--                 full page in the *TruDefinition Duration* Beauty Book, which
--                 is a Duration-only book. No retailer listing needed or used.
--
--   hex           #3D3C3A, sampled by averaging 822,528 pixels of OC's OWN
--                 printed swatch strip in the label block on p11 — the same
--                 source class as Williamsburg Gray's, and deliberately NOT the
--                 roof photograph above it. A lit, angled, weathered roof is not
--                 the product colour; the printed swatch is as close as print
--                 gets. hex_verified stays FALSE like every other row.
--
--   status        'current'. Confirmed by Theo, 7 Aug 2026.
--
--   sort_order    26, appending to the grey block (… Shasta White 24,
--                 Williamsburg Gray 25).
--
--   description   Written from the swatch and the roof photo, not lifted from
--                 OC copy — the Beauty Book gives Peppercorn a name and a
--                 picture but no prose.
--
--   ⚠ family      'grey' is MY READ, not an OC classification, and it is the one
--                 field here that is a judgement call. The mean is #3D3C3A —
--                 darker than Storm Cloud (#4A4E52) and lighter than Black Sable
--                 (#2E3033), so it sits on the grey/black boundary, and the
--                 swatch carries warm tan granules that pull it off neutral.
--                 It only drives wall filtering, so it is cheap to change:
--                   update public.oc_colors set family='black' where name='Peppercorn';
--
-- ⚠ Big-box retailer stock listings are NOT evidence of anything here. Theo,
-- verbatim: "they mix batches." See oc_williamsburg_gray.sql for the full rule.

insert into public.oc_colors
  (name, hex, hex_verified, family, product_line, status, sort_order, description)
values
  ('Peppercorn', '#3D3C3A', false, 'grey', 'duration', 'current', 26,
   'Dark charcoal blend with warm brown and tan granules for depth. Reads near-black from the curb, softer up close.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select count(*) from public.oc_colors;   -- expect 31
--   select name, slug, product_line, status from public.oc_colors
--    where name in ('Peppercorn','Williamsburg Gray');
--   -- slug resolves to 'peppercorn', matching the extracted cover image.
--
-- Rollback:
--   delete from public.oc_colors where name = 'Peppercorn';
