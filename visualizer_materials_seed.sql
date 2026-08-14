-- ===========================================================================
-- Exterior Visualizer — starter catalog for siding, trim, windows, gutters.
--
-- ⚠⚠ EVERY ROW HERE IS hex_verified = false, AND THAT IS NOT A PLACEHOLDER.
-- The product lines and colour NAMES are real manufacturer names. The HEX
-- VALUES are approximations chosen to look right on screen; not one has been
-- checked against a manufacturer's published value or a physical sample.
--
-- This matters because the presentation UI sits in front of a paying customer
-- choosing what their house will look like. A swatch captioned "factory colour
-- match" that is actually my approximation is a false claim on a proposal.
-- Until someone holds the sample board next to the screen, the UI must say
-- "approximate". Flip hex_verified to true ONE ROW AT A TIME, as each is
-- checked — never in bulk.
--
-- ⚠ ROOFING IS ABSENT ON PURPOSE. oc_colors owns it (31 colours, 63 photos,
-- nine applied migrations). The category CHECK constraint enforces this.
--
-- `prompt` is the diffusion trigger, not customer-facing text. It is authored
-- per row rather than assembled from the columns because what sells a colour
-- ("Iron Gray") is not what steers an inpainting model ("matte iron grey fibre
-- cement lap siding, 7 inch exposure, crisp horizontal shadow lines"). The
-- physical description does most of the work; the colour word does least.
--
-- Idempotent: ON CONFLICT updates the prompt/hex but never silently flips
-- hex_verified back to false on a row a human has since confirmed.
-- ===========================================================================

insert into public.materials
  (category, manufacturer, product_line, color_name, hex, finish, reveal_in, prompt, negative, sort_order)
values

-- ── SIDING · James Hardie, HardiePlank Lap (the volume product) ────────────
('siding','James Hardie','HardiePlank Lap','Arctic White','#F2F2EC','smooth',7.00,
 'matte arctic white fibre cement lap siding, 7 inch exposure, crisp horizontal shadow lines, low sheen painted finish',
 'vinyl, glossy plastic sheen, wood grain knots, warped boards', 10),
('siding','James Hardie','HardiePlank Lap','Iron Gray','#4A5157','cedarmill',7.00,
 'matte iron grey fibre cement lap siding, 7 inch exposure, subtle cedarmill wood texture, crisp horizontal shadow lines',
 'vinyl, glossy plastic sheen, blue tint, warped boards', 20),
('siding','James Hardie','HardiePlank Lap','Pearl Gray','#C9C9C2','cedarmill',7.00,
 'soft pearl grey fibre cement lap siding, 7 inch exposure, subtle cedarmill texture, matte painted finish',
 'vinyl, glossy sheen, beige tint', 30),
('siding','James Hardie','HardiePlank Lap','Aged Pewter','#6A6E6B','cedarmill',7.00,
 'weathered pewter grey fibre cement lap siding, 7 inch exposure, matte finish, fine cedarmill grain',
 'vinyl, glossy sheen, green tint', 40),
('siding','James Hardie','HardiePlank Lap','Boothbay Blue','#66808C','cedarmill',7.00,
 'muted slate blue fibre cement lap siding, 7 inch exposure, matte painted finish, cedarmill texture',
 'vinyl, glossy sheen, navy, teal, oversaturated blue', 50),
('siding','James Hardie','HardiePlank Lap','Deep Ocean','#2E4553','cedarmill',7.00,
 'deep navy blue fibre cement lap siding, 7 inch exposure, matte painted finish, crisp shadow lines',
 'vinyl, glossy sheen, purple tint, black', 60),
('siding','James Hardie','HardiePlank Lap','Mountain Sage','#5D6B5A','cedarmill',7.00,
 'muted sage green fibre cement lap siding, 7 inch exposure, matte painted finish, cedarmill texture',
 'vinyl, glossy sheen, lime, emerald, oversaturated green', 70),
('siding','James Hardie','HardiePlank Lap','Khaki Brown','#8A7A62','cedarmill',7.00,
 'warm khaki brown fibre cement lap siding, 7 inch exposure, matte painted finish',
 'vinyl, glossy sheen, orange tint', 80),
('siding','James Hardie','HardiePlank Lap','Timber Bark','#6B5B4B','cedarmill',7.00,
 'dark warm brown fibre cement lap siding, 7 inch exposure, matte painted finish, cedarmill grain',
 'vinyl, glossy sheen, red tint', 90),
('siding','James Hardie','HardiePlank Lap','Countrylane Red','#7E3B36','cedarmill',7.00,
 'deep barn red fibre cement lap siding, 7 inch exposure, matte painted finish',
 'vinyl, glossy sheen, bright fire engine red, pink', 100),

-- ── SIDING · James Hardie, other profiles ──────────────────────────────────
-- Profile changes the SHADOW GEOMETRY, which is what the eye actually reads
-- at kerbside — so these are separate product lines, not a finish attribute.
('siding','James Hardie','HardieShingle Straight Edge','Cobble Stone','#B5A893','woodgrain',null,
 'straight edge fibre cement shingle siding, staggered coursing, warm greige, matte woodgrain texture, deep individual shingle shadow lines',
 'lap siding, horizontal boards, vinyl, glossy sheen', 110),
('siding','James Hardie','HardiePanel Vertical (Board & Batten)','Arctic White','#F2F2EC','smooth',null,
 'white board and batten fibre cement siding, vertical panels with evenly spaced raised battens, matte finish, strong vertical shadow lines',
 'horizontal lap siding, vinyl, glossy sheen', 120),
('siding','James Hardie','HardiePanel Vertical (Board & Batten)','Iron Gray','#4A5157','smooth',null,
 'iron grey board and batten fibre cement siding, vertical panels with raised battens, matte finish, strong vertical shadow lines',
 'horizontal lap siding, vinyl, glossy sheen', 130),

-- ── SIDING · ProVia (the insulated vinyl alternative) ──────────────────────
('siding','ProVia','CedarMAX Insulated','Sterling Gray','#9BA0A2','woodgrain',6.75,
 'insulated vinyl cedar profile siding, deep woodgrain texture, sterling grey, 6.75 inch exposure, low sheen',
 'glossy plastic shine, fibre cement, flat smooth surface', 200),
('siding','ProVia','CedarMAX Insulated','Wicker','#C4B49A','woodgrain',6.75,
 'insulated vinyl cedar profile siding, deep woodgrain texture, warm wicker beige, 6.75 inch exposure, low sheen',
 'glossy plastic shine, yellow tint', 210),
('siding','ProVia','Heartland Board & Batten','Midnight Blue','#333F4E','woodgrain',null,
 'vinyl board and batten siding, vertical panels with raised battens, deep midnight blue, low sheen woodgrain texture',
 'glossy plastic shine, horizontal lap siding', 220),

-- ── TRIM ───────────────────────────────────────────────────────────────────
-- Trim is what makes a render read as a real house: fascia, corner boards,
-- window and door surrounds. Getting it wrong makes everything look pasted on.
('trim','James Hardie','HardieTrim 4/4 Smooth','Arctic White','#F4F5F0','smooth',null,
 'crisp white fibre cement trim boards on corners, fascia, window and door surrounds, smooth matte painted finish, clean square edges',
 'wood grain, glossy sheen, yellowed white, warped boards', 10),
('trim','James Hardie','HardieTrim 4/4 Smooth','Iron Gray','#4A5157','smooth',null,
 'iron grey fibre cement trim boards on corners, fascia and window surrounds, smooth matte finish, clean square edges',
 'wood grain, glossy sheen', 20),
('trim','James Hardie','HardieTrim 4/4 Smooth','Timber Bark','#6B5B4B','smooth',null,
 'dark brown fibre cement trim boards on corners, fascia and window surrounds, smooth matte finish',
 'wood grain, glossy sheen, red tint', 30),
('trim','ProVia','Aluminum Wrapped Trim','Almond','#E4DBC6','smooth',null,
 'smooth almond painted aluminium wrapped trim on fascia and window surrounds, low sheen, tight clean folds',
 'wood grain, peeling paint, glossy sheen', 40),

-- ── WINDOWS ────────────────────────────────────────────────────────────────
-- The frame COLOUR is the visible change; the grille pattern changes the
-- character more than anything else, so it is named in the prompt.
('windows','ProVia','Endure Vinyl','White','#F5F5F1','smooth',null,
 'white vinyl double hung window frames and sashes, clean narrow profile, low sheen, every window opening kept exactly where it is',
 'new windows added, openings moved or resized, glossy chrome, dark tint', 10),
('windows','ProVia','Endure Vinyl','Bronze','#4A3B2E','smooth',null,
 'dark bronze vinyl double hung window frames and sashes, narrow profile, low sheen, every window opening kept exactly where it is',
 'new windows added, openings moved or resized, black plastic, glossy sheen', 20),
('windows','ProVia','Aspect Vinyl','Black','#23252A','smooth',null,
 'matte black window frames and sashes, modern narrow profile, every window opening kept exactly where it is',
 'new windows added, openings moved or resized, glossy sheen, grey wash', 30),
('windows','Simonton','Reflections 5500','White','#F5F5F1','smooth',null,
 'white vinyl double hung window frames with colonial grilles, clean profile, every window opening kept exactly where it is',
 'new windows added, openings moved or resized, no grilles, glossy chrome', 40),
('windows','Simonton','ProFinish Brickmould 600','White','#F5F5F1','smooth',null,
 'white vinyl windows with integral brickmould surround, traditional profile, every window opening kept exactly where it is',
 'new windows added, openings moved or resized, flat flange, glossy sheen', 50),

-- ── GUTTERS ────────────────────────────────────────────────────────────────
-- Small area, disproportionate effect: a mismatched gutter line is the first
-- thing that makes a render look fake along the eave.
('gutters','Cardinal','Seamless Aluminum 6" K-Style','White','#F4F4F0','smooth',null,
 'white seamless aluminium K-style gutters and matching downspouts along the eave, low sheen, straight unbroken run',
 'sagging gutters, half round, copper, glossy chrome, visible seams', 10),
('gutters','Cardinal','Seamless Aluminum 6" K-Style','Musket Brown','#4E3D30','smooth',null,
 'dark brown seamless aluminium K-style gutters and matching downspouts along the eave, low sheen, straight unbroken run',
 'sagging gutters, half round, copper, glossy sheen, visible seams', 20),
('gutters','Cardinal','Seamless Aluminum 6" K-Style','Royal Brown','#6B5442','smooth',null,
 'medium brown seamless aluminium K-style gutters and matching downspouts along the eave, low sheen',
 'sagging gutters, half round, glossy sheen, visible seams', 30),
('gutters','Cardinal','Seamless Aluminum 6" K-Style','Charcoal','#3A3D40','smooth',null,
 'charcoal grey seamless aluminium K-style gutters and matching downspouts along the eave, low sheen',
 'sagging gutters, half round, glossy sheen, visible seams', 40),
('gutters','Cardinal','Seamless Aluminum 6" K-Style','Almond','#E6DCC8','smooth',null,
 'almond seamless aluminium K-style gutters and matching downspouts along the eave, low sheen',
 'sagging gutters, half round, glossy sheen, visible seams', 50)

on conflict (category, manufacturer, product_line, color_name) do update
  set hex        = excluded.hex,
      finish     = excluded.finish,
      reveal_in  = excluded.reveal_in,
      prompt     = excluded.prompt,
      negative   = excluded.negative,
      sort_order = excluded.sort_order,
      updated_at = now();
      -- ⚠ hex_verified deliberately NOT in this SET list. Re-running the seed
      -- must never undo a human's verification.
