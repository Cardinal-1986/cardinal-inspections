-- OC Designer Colors, sampled from Owens Corning's own published data sheet.
-- APPLIED and verified. 6 rows, hex_verified = true.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE REFERENCE IS THE CATALOGUE — a decision, not a compromise.
--
-- Theo, 15 Aug: "So with this being just a rendition of a color of a roof on
-- their own house, it should look amazing like the oc catalogues because there
-- is no imperfections. When these shingles get installed they dont look dead
-- on like the catalogues. Which is OK."
--
-- That closed two questions that had been open for weeks:
--
--   1. TARGET = OC's published rendition, not a physical chip. A sample board
--      photographed in a driveway carries its own lighting and white balance
--      with it; the catalogue is consistent, and it is what the customer is
--      being shown anyway. This also retired my own standing recommendation
--      to go photograph the boards — it would have been a worse source.
--
--   2. SAMPLE THE LIT FIELD, not the mean. The mean of a shingle photograph
--      includes the keyway shadow between courses and lands 20-30 of 255 too
--      dark; every roof would have rendered muddy. These are the median of
--      pixels at or above the 60th percentile of luminance — the sunlit
--      granule field, which is what is seen from the kerb.
--
-- ⚠️ AGED COPPER IS WHY THIS MATTERED. The catalog carried #5E6B5C, a GREEN.
-- OC's own swatch is brown (#6D5D4F). Two estimated sources had disagreed
-- green-vs-brown and neither could settle it. The manufacturer's document did,
-- in one look — and no amount of tuning tint, denoise or prompt would ever
-- have found it, because the renderer was faithfully painting the wrong colour.
--
-- NOT updated, on purpose:
--   Storm Cloud   — its strip is split across a page break, so the sample is
--                   partial. Half-sourced is not sourced.
--   Black Sable   — no labelled strip in this sheet.
--   Bourbon       — same.
--
-- Designer Colors Collection only: 6 of 31. The standard TruDefinition
-- Duration sheet carries the volume colours (Onyx Black, Estate Gray,
-- Driftwood, Brownwood, Teak, Evergreen Mist) and is not yet in hand.
--
-- ⚠️ The extracted swatch IMAGES are deliberately NOT committed. They are OC's
-- copyrighted photography and this repository is served publicly at
-- app.cardinalroster.com. Only the sampled values live here. If swatch imagery
-- is ever wanted in the picker (the `swatch_path` column exists and is empty on
-- all 97 rows), it belongs in Supabase storage behind auth, and it goes through
-- the OC_BRAND_RULES gate first — which is Theo's to pass, not mine.
-- ─────────────────────────────────────────────────────────────────────────

comment on column public.oc_colors.hex_verified is
  'TRUE = sampled from the manufacturer''s own published swatch (the catalogue rendition), which is the agreed reference for a concept render. FALSE = estimated. It does NOT mean measured off a physical chip; sample boards vary and the catalogue is what the customer is shown.';

update public.oc_colors o set hex = v.hex, hex_verified = true, updated_at = now()
from (values
  ('Aged Copper','#6D5D4F'),
  ('Merlot','#4A3B3A'),
  ('Pacific Wave','#51575A'),
  ('Sand Dune','#7F7163'),
  ('Sedona Canyon','#61483F'),
  ('Summer Harvest','#574B45')
) as v(name,hex)
where lower(o.name) = lower(v.name);
