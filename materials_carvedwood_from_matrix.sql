-- Carvedwood, corrected against the 2025 Mastic Vinyl Color Matrix.
-- APPLIED. Idempotent.
--
-- ─────────────────────────────────────────────────────────────────────────
-- WHY THIS EXISTS: I loaded a wrong colour, from the wrong kind of source.
--
-- Two hours earlier this catalog took 24 Carvedwood colours from an ESTIMATED
-- palette. Theo then sent the manufacturer's own matrix. Parsed positionally
-- from the PDF — 26 product columns, 541 dots, 0 unmapped — it says:
--
--   * Carvedwood carries FORTY colours, not 24.
--   * PORTSMOUTH BLUE IS NOT ONE OF THEM. It has no dot in any of the five
--     Carvedwood columns (CW240 / CW250 / CW2D45 / CW230S / CW80S). It was
--     loaded in error and is deleted here. Checked first: 0 design_jobs and
--     0 design_renders referenced it.
--
-- That is the difference between a plausible source and an authoritative one,
-- and it is not a colour-accuracy problem — it is an ORDERING problem. A rep
-- could have shown a homeowner a Carvedwood colour that cannot be bought.
--
-- The lesson generalises, so it is written here rather than in a commit: an
-- estimated palette can be wrong about WHICH COLOURS EXIST, not merely about
-- what they look like. `hex_verified` only ever described the second kind of
-- error. Availability needs the manufacturer's matrix, full stop.
--
-- The 17 added here have hex NULL on purpose — no swatch source exists for
-- them, and inventing one is the exact failure this catalog is trying to end.
-- The worker already says "no swatch hex on this selection — nothing to
-- recolour with, skipping", so the gap surfaces instead of rendering a lie.
--
-- ⚠️ The PDF drops the "Th" ligature: it extracts as "Scottish istle".
-- The colour is Scottish Thistle (510). Do not "correct" it back.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.materials add column if not exists mfr_code text;
comment on column public.materials.mfr_code is
  'Manufacturer''s own colour code (Mastic: White (04), Rugged Canyon (100)). From the published matrix, not inferred.';

delete from public.materials
 where manufacturer='Mastic' and product_line='Carvedwood' and color_name='Portsmouth Blue';

update public.materials m set mfr_code = c.code
from (values
 ('White','04'),('Almond','53'),('Cameo','31'),('Desert Sand','22'),('Linen','44'),
 ('Sage','18'),('Sandtone','39'),('Silver Grey','02'),('Victorian Grey','36'),
 ('Tuscan Olive','511'),('Harbor Grey','35'),('Pebblestone Clay','52'),
 ('Deep Granite','090'),('English Wedgewood','390'),('Lakeshore Fern','IC'),
 ('Misty Shadow','144'),('Montana Suede','IF'),('Quiet Willow','170'),
 ('Rugged Canyon','100'),('Russet Red','290'),('Brandy Wood','147'),
 ('Natural Slate','156'),('Newport Bay','146')
) as c(name,code)
where m.manufacturer='Mastic' and m.product_line='Carvedwood' and m.color_name=c.name;

insert into public.materials
  (category, manufacturer, product_line, color_name, mfr_code, hex, hex_verified,
   finish, status, sort_order, prompt, negative)
select 'siding','Mastic','Carvedwood', v.name, v.code, null, false,
       'low gloss','current', v.ord,
       'Mastic Carvedwood cedar-grain vinyl lap siding in ' || v.name ||
       ', 4.5 inch exposure, low gloss finish',
       'glossy plastic sheen, warped panels'
from (values
 ('Classic Cream','30',44),('Colonial Yellow','10',45),('Wicker','A7',46),
 ('Corn Silk','210',47),('Everest','17',48),('Scottish Thistle','510',49),
 ('Autumn Harvest','251',50),('Bayou','145',51),('Brunswick','812',52),
 ('Modern Iron','814',53),('Vintage Dublin','813',54),('Alpine Forest','350',55),
 ('Deep Cavern','352',56),('Red Brick','149',57),('Rock Harbor','353',58),
 ('Whispering Timber','354',59),('Woodland Retreat','355',60)
) as v(name,code,ord)
where not exists (
  select 1 from public.materials m
   where m.manufacturer='Mastic' and m.product_line='Carvedwood' and m.color_name=v.name
);
