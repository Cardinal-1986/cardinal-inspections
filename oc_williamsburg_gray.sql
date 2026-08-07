-- OC Colors — add Williamsburg Gray, the 2024 Shingle Color of the Year.
-- APPLIED TO PRODUCTION 7 Aug 2026. Run after oc_coty_year.sql.
--
-- ============================================================================
-- WHY THIS ROW WAS MISSING, AND WHY IT MATTERS
-- ============================================================================
-- oc_colors shipped with 29 rows and no Williamsburg Gray. It is Owens Corning's
-- 2024 Shingle Color of the Year — it appears on OC's own COTY graphic, it has a
-- full-page roof photograph in the TruDefinition Duration Beauty Book (p14), and
-- it has its own six-page SCOTY brochure. A Color of the Year absent from the
-- catalogue is a conspicuous hole in a showroom, and it was the single gap in an
-- otherwise unbroken 2017-2026 COTY run.
--
-- ============================================================================
-- WHERE EACH FIELD CAME FROM — none of it invented
-- ============================================================================
--   name          "WILLIAMSBURG GRAY", 2024 SCOTY Bilingual Data Brochure p1/p3.
--   product_line  'duration'. The brochure says it outright: "This TruDefinition
--                 Duration shingle carries the advanced performance of patented
--                 SureNail Technology." It is NOT a Designer colour.
--   coty_year     2024. "2024 SHINGLE COLOR OF THE YEAR" on the brochure cover,
--                 and 2024 on OC's own COTY line-up graphic.
--   family        'grey'. Matches how the other greys are filed.
--   status        'current'. Confirmed by Theo, 7 Aug 2026.
--
--                 ⚠ DO NOT cite big-box retailer stock listings as evidence a
--                 colour is current — Theo, verbatim: "they mix batches."
--                 Shingle colour varies between production batches, so a
--                 big-box listing says nothing reliable about the colour a
--                 customer would actually receive, and pointing at one in a
--                 showroom context invites a mismatched roof. Supply questions
--                 go to Theo or a distributor, not to a retail listing.
--   sort_order    25, appending to the grey block (Estate 20 … Shasta White 24).
--   description   Paraphrased from OC's brochure copy, not lifted verbatim.
--                 OPEN_ITEMS: their colour copy is fine to use as an authorised
--                 dealer, but attribute it and paraphrase.
--
--   hex           #696A6D, sampled by averaging 258,125 pixels of OC's OWN
--                 printed swatch on p3 of the SCOTY brochure — not eyeballed and
--                 not taken off a web page. A Google search for the hex returned
--                 only the Images tab, with no value in it.
--
--                 hex_verified is FALSE, exactly like the other 29. A brochure
--                 swatch is a photograph of a print of a shingle; it is not a
--                 colour measurement. Do not flip this without sampling a real
--                 physical swatch.
--
-- slug is generated always and needs no value here; it resolves to
-- 'williamsburg-gray', which matches the extracted cover image filename.

insert into public.oc_colors
  (name, hex, hex_verified, family, product_line, status, sort_order, coty_year, description)
values
  ('Williamsburg Gray', '#696A6D', false, 'grey', 'duration', 'current', 25, 2024,
   'Vintage palette of slate grays and volcanic blacks lifted by the rugged browns of earth itself. A modern take on traditional beauty. 2024 Shingle Color of the Year.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STILL MISSING FROM THE CATALOGUE: Peppercorn
-- ---------------------------------------------------------------------------
-- It has a full-page roof photograph in the Duration Beauty Book (p11) and is
-- absent from oc_colors. Deliberately NOT inserted — unlike Williamsburg Gray,
-- no supplied document states its product line or gives a swatch to sample, so
-- every field would be a guess. Ask Theo first.
--
-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select count(*) from public.oc_colors;                      -- expect 30
--   select coty_year, name from public.oc_colors
--    where coty_year is not null order by coty_year;             -- 2017..2026, no gaps
--
-- Rollback:
--   delete from public.oc_colors where name = 'Williamsburg Gray';
