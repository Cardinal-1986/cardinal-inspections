-- The last three, from OC's Shingle Style Board Reference Guide. APPLIED.
-- Gray Tweed, Mountain Pine, Black Sable.
--
-- Same class of source and same statistic as the data-sheet swatches: flat
-- product photography, sampled on the LIT granule field (median at or above the
-- 60th percentile of luminance). Not the roof-photo method used for Evergreen
-- Mist — these are swatch artwork, so they take the swatch treatment.
--
-- Paired by GEOMETRY as always: each style board carries an all-caps heading at
-- x<260 ("IRON ORE & GRAY TWEED") sharing a baseline with its board image at
-- x>240. Nothing named by eye.
--
-- ⚠️ THE CROP WAS TIGHTENED AFTER LOOKING AT IT. The first attempt included the
-- board's dark door panel down the left edge and the paint chip along the
-- bottom — both ends of the distribution polluted, and the numbers would have
-- looked perfectly plausible. Print what your extractor captured.
--
-- Black Sable appears on three boards (Snowbound, Deep Maroon, Oceanside) with
-- identical shingle artwork; one was used.
--
--   Gray Tweed     #585A58 -> #4E4D4C  (13)
--   Mountain Pine  #4F5B4A -> #63635D  (20)
--   Black Sable    #2E3033 -> #3B3931  (13)
--
-- ✅ THIS FINISHES THE COLOUR CATALOG. oc_colors is 25 of 34 verified, and the
-- nine that remain are ALL discontinued and cannot be sold — zero unverified
-- sellable colours. Started the day at 0 of 31.

update public.oc_colors o set hex = v.hex, hex_verified = true, updated_at = now()
from (values
  ('Gray Tweed','#4E4D4C'),
  ('Mountain Pine','#63635D'),
  ('Black Sable','#3B3931')
) as v(name,hex)
where lower(o.name) = lower(v.name);
