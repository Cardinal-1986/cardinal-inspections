-- Mastic Carvedwood — the full palette, as its own line.
--
-- ─────────────────────────────────────────────────────────────────────────
-- WHY, AND WHY THE HEXES ARE NOT VERIFIED
--
-- Theo, 15 Aug: "Mastic actually has alot of colors for carved wood, alot
-- more than 10. I dont have actual siding board samples. With siding I
-- believe using gemeni's is good enough. I agree with you on the shingles
-- tho."
--
-- That split is the right one and it is worth writing down, because the two
-- halves fail differently:
--
--   SIDING is extruded vinyl — one flat pigment. A named colour is a single
--   colour, and a model's estimate of it lands close.
--
--   SHINGLES are a granule BLEND — twenty stone colours averaged by the eye
--   at twenty feet. Which is exactly why the two available shingle sources
--   disagree by up to 47 of 255 (Driftwood #8A8578 vs #5E564D) and why
--   Aged Copper is GREEN in one and BROWN in the other. Those stay out
--   until a real swatch board is photographed.
--
-- So every hex here is `hex_verified = false`. That column already existed
-- on this table and was false on all 66 rows; it has simply never meant
-- anything yet. It means something now: FALSE is "estimated, good enough to
-- browse and to render a concept", TRUE will be "sampled off the physical
-- chip". Do not set it true for anything that was not.
--
-- ⚠️ ADDITIVE ONLY — existing Mastic rows are NOT touched, on purpose.
-- Three colour names exist in both this palette and the lines already in the
-- catalog, and they disagree materially:
--
--   Rugged Canyon     Cedar Discovery #8A5C46   vs  #5D4B3E   (~45 apart)
--   Pebblestone Clay  Ovation         #C2B49C   vs  #A09689   (~34)
--   Montana Suede     Ovation         #A08E76   vs  #7F7363   (~33)
--
-- Overwriting those would silently change a colour that may already sit
-- behind a saved render, and nothing in design_renders records which hex it
-- was built from. A duplicated name across two product lines is the lesser
-- problem, and it is also true of the real product: Mastic publishes a
-- per-line palette, and the same name is not always the same chip.
--
-- ⚠️ AVAILABILITY IS NOT ASSERTED. This loads a palette, not an order sheet.
-- Which colours a given Carvedwood profile can actually be ordered in is a
-- supplier question, and nothing here should be read as confirming one.
--
-- All 24 colours from the source tables are here, INCLUDING the six the
-- accompanying JSON export silently dropped (Rugged Canyon, Russet Red,
-- Sage, Montana Suede, Silver Grey, Desert Sand). Importing that JSON
-- instead would have lost a quarter of the palette without saying so.
--
-- Idempotent — guarded on (manufacturer, product_line, color_name), so a
-- second run inserts nothing and changes nothing.
-- ─────────────────────────────────────────────────────────────────────────

insert into public.materials
  (category, manufacturer, product_line, color_name, hex, hex_verified,
   finish, status, sort_order, prompt, negative)
select v.category, v.manufacturer, v.product_line, v.color_name, v.hex, false,
       v.finish, 'current', v.sort_order, v.prompt, v.negative
from (values
  ('siding','Mastic','Carvedwood','Natural Slate','#3A4146','low gloss',20,
   'deep charcoal slate cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish, crisp shadow lines',
   'blue tint, glossy plastic sheen, warped panels'),
  ('siding','Mastic','Carvedwood','Deep Granite','#474B4E','low gloss',21,
   'cool dark granite grey cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'brown tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Newport Bay','#2C3B4D','low gloss',22,
   'deep coastal navy cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'purple tint, bright blue, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Portsmouth Blue','#43586C','low gloss',23,
   'slate blue cedar-grain vinyl lap siding with cool grey undertones, 4.5 inch exposure',
   'purple tint, teal, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','English Wedgewood','#4E6578','low gloss',24,
   'muted colonial blue cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'purple tint, bright blue, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Brandy Wood','#543D2F','low gloss',25,
   'dark walnut brown cedar-grain vinyl lap siding with warm red undertones, 4.5 inch exposure',
   'orange tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Rugged Canyon','#5D4B3E','low gloss',26,
   'deep earthy espresso brown cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'orange tint, red tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Russet Red','#6A3731','low gloss',27,
   'warm barn red cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'bright red, pink tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Quiet Willow','#768478','low gloss',28,
   'muted sage green cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'bright green, mint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Lakeshore Fern','#5A6B5C','low gloss',29,
   'deep moss green cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'bright green, teal, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Tuscan Olive','#6F715F','low gloss',30,
   'warm olive grey cedar-grain vinyl lap siding with khaki undertones, 4.5 inch exposure',
   'yellow tint, bright green, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Sage','#90998B','low gloss',31,
   'soft herbal sage green cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'bright green, mint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Montana Suede','#7F7363','low gloss',32,
   'medium warm taupe cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'pink tint, yellow tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Victorian Grey','#9EA3A5','low gloss',33,
   'mid tone neutral cool grey cedar-grain vinyl lap siding, 4.5 inch exposure',
   'blue tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Harbor Grey','#848B8E','low gloss',34,
   'cool battleship grey cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'blue tint, green tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Misty Shadow','#6C6F72','low gloss',35,
   'dark slate grey cedar-grain vinyl lap siding with a subtle blue nuance, 4.5 inch exposure',
   'navy, brown tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Silver Grey','#BFC4C5','low gloss',36,
   'light silver grey cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'blue tint, white, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Pebblestone Clay','#A09689','low gloss',37,
   'warm greige clay cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'pink tint, yellow tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Sandtone','#B5AB9B','low gloss',38,
   'warm beach sand cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'yellow tint, pink tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Desert Sand','#C1B49F','low gloss',39,
   'golden tan desert beige cedar-grain vinyl lap siding, 4.5 inch exposure',
   'orange tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Almond','#D1C7B7','low gloss',40,
   'light creamy beige cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'orange tint, yellow tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Cameo','#D7D0C5','low gloss',41,
   'pale neutral bone cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'pink tint, yellow tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','Linen','#DDD7CB','low gloss',42,
   'soft ivory flax cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish',
   'yellow tint, glossy plastic sheen'),
  ('siding','Mastic','Carvedwood','White','#EDECE8','low gloss',43,
   'crisp architectural white cedar-grain vinyl lap siding, 4.5 inch exposure, low gloss finish, crisp shadow lines',
   'blue tint, glossy plastic sheen, warped panels')
) as v(category, manufacturer, product_line, color_name, hex, finish,
       sort_order, prompt, negative)
where not exists (
  select 1 from public.materials m
   where m.manufacturer = v.manufacturer
     and m.product_line = v.product_line
     and m.color_name   = v.color_name
);
