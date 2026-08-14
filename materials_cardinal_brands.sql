-- materials_cardinal_brands.sql — the brands Cardinal actually hangs.
--
-- Theo, verbatim: "I don't need all those manufacturers. Just the ones I use.
-- For roofs I would only use Owens, corning. Siding, Mastic, Certainteed,
-- Exterior portfolio, Norandex, Hardee, Board and batten, etc. Windows,
-- Anderson, Provia, WinCore."
--
-- Already present before this file: James Hardie (siding/trim), ProVia
-- (siding/trim/windows), Simonton (windows), Cardinal gutters. This adds the
-- four missing siding brands and the two missing window brands. Simonton is
-- left alone — Theo did not name it, but removing a brand somebody may have
-- quoted is not a decision this file gets to make.
--
-- ⚠ READ THIS BEFORE SHOWING A CUSTOMER.
-- Every row lands hex_verified = false and swatch_path = null, and that is not
-- laziness — it is the honest state. The colour NAMES and PRODUCT LINES here
-- are real. The HEX VALUES are estimates chosen to look right in a render, not
-- measured off a physical sample. A screen colour is not a colour sample even
-- when it IS verified, which is why the Visualizer carries that disclaimer
-- already; unverified means the estimate has not even had a person look at it.
--
-- Two things clear a row:
--   1. set hex_verified = true after checking against a real board or an
--      official swatch, or
--   2. set swatch_path to a real photograph, which outranks the hex entirely.
--
-- Board & Batten is a PROFILE, not a brand — Theo lists it beside the
-- manufacturers because that is how it is sold, but it appears here as a
-- product line under each maker, and the Visualizer surfaces it as a filter
-- chip across all of them.
--
-- Idempotent: re-running changes nothing. Safe to apply twice.

insert into public.materials
  (category, manufacturer, product_line, color_name, hex, finish, prompt, negative, sort_order)
values
  -- ── Mastic ──────────────────────────────────────────────────────────────
  ('siding','Mastic','Quest','White','#F2F2EE','low gloss','white vinyl lap siding, 4 inch exposure, low gloss finish, crisp shadow lines','glossy plastic sheen, warped panels',10),
  ('siding','Mastic','Quest','Almond','#E4D8BE','low gloss','soft almond vinyl lap siding, 4 inch exposure, low gloss finish','orange tint, glossy plastic sheen',11),
  ('siding','Mastic','Quest','Sandstone','#D6C5A4','low gloss','warm sandstone vinyl lap siding, 4 inch exposure','pink tint, glossy plastic sheen',12),
  ('siding','Mastic','Quest','Harbor Blue','#5C7186','low gloss','muted harbor blue vinyl lap siding, 4 inch exposure','purple tint, navy, glossy plastic sheen',13),
  ('siding','Mastic','Ovation','Montana Suede','#A08E76','low gloss','warm greige vinyl lap siding, 4.5 inch dutch lap profile','pink tint, glossy plastic sheen',14),
  ('siding','Mastic','Ovation','Pebblestone Clay','#C2B49C','low gloss','pale clay vinyl lap siding, 4.5 inch dutch lap profile','yellow tint, glossy plastic sheen',15),
  ('siding','Mastic','Ovation','Granite Gray','#8E9295','low gloss','medium granite grey vinyl lap siding, 4.5 inch dutch lap profile','blue tint, glossy plastic sheen',16),
  ('siding','Mastic','Structure','Deep Moss','#5A6353','low gloss','deep muted green insulated vinyl lap siding, 6 inch exposure','bright green, glossy plastic sheen',17),
  ('siding','Mastic','Cedar Discovery Board & Batten','Rugged Canyon','#8A5C46','matte','warm brown vertical board and batten siding, wide boards with narrow battens, matte finish','horizontal siding, glossy sheen',18),
  ('siding','Mastic','Cedar Discovery Board & Batten','Sterling Gray','#9BA0A2','matte','light grey vertical board and batten siding, wide boards with narrow battens','horizontal siding, glossy sheen',19),

  -- ── CertainTeed ─────────────────────────────────────────────────────────
  ('siding','CertainTeed','MainStreet','Colonial White','#EFEEE4','low gloss','colonial white vinyl lap siding, 4 inch exposure','glossy plastic sheen, warped panels',20),
  ('siding','CertainTeed','MainStreet','Sterling Gray','#B4B8B8','low gloss','light sterling grey vinyl lap siding, 4 inch exposure','blue tint, glossy plastic sheen',21),
  ('siding','CertainTeed','Monogram','Charcoal Gray','#4E5154','low gloss','dark charcoal vinyl lap siding, 4.5 inch exposure, deep shadow lines','black, glossy plastic sheen',22),
  ('siding','CertainTeed','Monogram','Pacific Blue','#4E6E8E','low gloss','muted pacific blue vinyl lap siding, 4.5 inch exposure','purple tint, glossy plastic sheen',23),
  ('siding','CertainTeed','Monogram','Cypress','#98A288','low gloss','soft sage green vinyl lap siding, 4.5 inch exposure','bright green, glossy plastic sheen',24),
  ('siding','CertainTeed','Monogram','Autumn Red','#7E3B32','low gloss','deep barn red vinyl lap siding, 4.5 inch exposure','bright red, pink, glossy plastic sheen',25),
  ('siding','CertainTeed','Cedar Impressions','Natural Cedar','#B08D64','matte','cedar shake siding, staggered shingle courses, natural cedar tone, matte finish','lap siding, glossy sheen',26),
  ('siding','CertainTeed','Board & Batten','Granite Gray','#8B8F91','matte','grey vertical board and batten siding, wide boards with narrow battens','horizontal siding, glossy sheen',27),

  -- ── Exterior Portfolio ──────────────────────────────────────────────────
  ('siding','Exterior Portfolio','CraneBoard','Snow','#F0EFE8','low gloss','bright white insulated vinyl lap siding, 6 inch exposure','glossy plastic sheen',30),
  ('siding','Exterior Portfolio','CraneBoard','Harbor Grey','#8B959A','low gloss','medium harbor grey insulated vinyl lap siding, 6 inch exposure','blue tint, glossy plastic sheen',31),
  ('siding','Exterior Portfolio','CraneBoard','Coastal Sage','#9EA689','low gloss','muted sage green insulated vinyl lap siding, 6 inch exposure','bright green, glossy plastic sheen',32),
  ('siding','Exterior Portfolio','CraneBoard','Slate','#5E6870','low gloss','dark slate grey insulated vinyl lap siding, 6 inch exposure','blue tint, glossy plastic sheen',33),
  ('siding','Exterior Portfolio','Board & Batten','Driftwood','#B9AE96','matte','weathered driftwood vertical board and batten siding','horizontal siding, glossy sheen',34),

  -- ── Norandex ────────────────────────────────────────────────────────────
  ('siding','Norandex','Polar Wall Plus','Antique Ivory','#EAE2CC','low gloss','warm ivory insulated vinyl lap siding, 4 inch exposure','yellow tint, glossy plastic sheen',40),
  ('siding','Norandex','Polar Wall Plus','Pewter','#9DA2A5','low gloss','medium pewter grey insulated vinyl lap siding, 4 inch exposure','blue tint, glossy plastic sheen',41),
  ('siding','Norandex','Woodsman','Sable','#5A4A3C','low gloss','deep brown vinyl lap siding, 4.5 inch dutch lap profile','red tint, glossy plastic sheen',42),
  ('siding','Norandex','Woodsman','Slate Blue','#5C7186','low gloss','muted slate blue vinyl lap siding, 4.5 inch dutch lap profile','purple tint, glossy plastic sheen',43),
  ('siding','Norandex','Cedar Knolls Board & Batten','Clay','#C9BBA4','matte','pale clay vertical board and batten siding, wide boards with narrow battens','horizontal siding, glossy sheen',44),

  -- ── Andersen ────────────────────────────────────────────────────────────
  ('windows','Andersen','400 Series','White','#F7F7F2','painted','white window frames and sashes, clean painted finish, same glass and grille pattern','changed window shape, changed grille pattern, missing glass',50),
  ('windows','Andersen','400 Series','Sandtone','#C7B299','painted','warm sandtone window frames and sashes','changed window shape, changed grille pattern',51),
  ('windows','Andersen','400 Series','Terratone','#6B5744','painted','earthy brown terratone window frames and sashes','changed window shape, changed grille pattern',52),
  ('windows','Andersen','400 Series','Canvas','#E6DFCF','painted','soft off-white canvas window frames and sashes','changed window shape, changed grille pattern',53),
  ('windows','Andersen','100 Series','Black','#1B1B1B','painted','black window frames and sashes, crisp modern lines','changed window shape, changed grille pattern',54),
  ('windows','Andersen','100 Series','Dark Bronze','#3A322A','painted','dark bronze window frames and sashes','changed window shape, changed grille pattern',55),
  ('windows','Andersen','A-Series','Forest Green','#2F4A3A','painted','deep forest green window frames and sashes','bright green, changed window shape',56),

  -- ── WinCore ─────────────────────────────────────────────────────────────
  ('windows','WinCore','5400 Series','White','#FBFBF6','painted','white vinyl window frames and sashes, same glass and grille pattern','changed window shape, changed grille pattern',60),
  ('windows','WinCore','5400 Series','Almond','#E2D6B8','painted','almond vinyl window frames and sashes','changed window shape, changed grille pattern',61),
  ('windows','WinCore','7300 Series','Clay','#BFB49C','painted','clay vinyl window frames and sashes','changed window shape, changed grille pattern',62),
  ('windows','WinCore','7300 Series','Bronze','#47392E','painted','bronze vinyl window frames and sashes','changed window shape, changed grille pattern',63)
on conflict do nothing;
