-- Amber, Storm Cloud and Bourbon, from the Style Board Reference Guide. APPLIED.
-- Flat swatch artwork, LIT granule field, paired by geometry off the board
-- heading. Crops viewed before sampling.
--
-- STORM CLOUD finally has a source. It was skipped on the Designer data sheet
-- because its strip straddled a page break there, and a partial sample is not a
-- sample. The style board carries it whole.
--
-- ⚠️ THE GUIDE AND THE DATA SHEETS DISAGREE BY 10–20 ON ALREADY-VERIFIED
-- COLOURS, AND THOSE ARE DELIBERATELY NOT CHURNED. Driftwood is #615C54 on the
-- data sheet and #69645C here; Onyx Black #3A3E41 vs #272C2A. Both are OC's own
-- artwork, so this is print variation between a product data sheet and a
-- merchandising piece — not one of them being wrong. The data sheet is the more
-- canonical document for a shingle line, and re-running the whole catalog every
-- time a new brochure lands is churn dressed as accuracy. Only rows with NO
-- source at all were filled from the guide.
--
-- ⚠️ BOURBON is a wide blend — light grey-brown tabs beside dark red ones — so
-- the lit median (#4C3E3E) reads less red than the swatch looks as a whole.
-- Accepted for consistency of method on a discontinued colour rather than
-- hand-tuned. Flagged so nobody "fixes" it without reading this.
--
-- ⚠️ MY OWN ENUMERATOR HAD A BUG WORTH REMEMBERING. Headings were collected
-- with `token.isupper()`, and '&'.isupper() is FALSE — so the ampersand was
-- dropped from every heading, and the very next line filtered on "'&' in head".
-- Result: 0 boards found, from a guide containing 57. A filter that silently
-- removes the thing you then require is indistinguishable from an empty
-- document. Print what your extractor captured.
--
-- Full 26-colour extraction: docs/oc_style_board_samples.json.
--
-- ✅ 28 of 34 verified. The remaining SIX are all discontinued AND appear in no
-- current OC document — Slate Grey, Aged Cedar, Desert Tan, Quarry Gray,
-- Harbor Blue, Shasta White. Their absence from the guide is itself the
-- confirmation that they are gone. Zero unverified sellable colours.

update public.oc_colors o set hex = v.hex, hex_verified = true, updated_at = now()
from (values
  ('Amber','#AA9A89'),
  ('Storm Cloud','#676A62'),
  ('Bourbon','#4C3E3E')
) as v(name,hex)
where lower(o.name) = lower(v.name);
