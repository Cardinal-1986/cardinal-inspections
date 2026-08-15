-- TruDefinition Duration standard palette, from OC's own data sheet. APPLIED.
-- 12 colours corrected, 3 that were MISSING added. 21 of 34 oc_colors rows are
-- now hex_verified; this morning it was 0 of 31.
--
-- Method identical to the Designer collection: sample the LIT granule field —
-- the median of pixels at or above the 60th percentile of luminance. The naive
-- mean includes the keyway shadow between courses and lands 20-30 of 255 dark,
-- which would render every roof muddy. Reference is the catalogue rendition,
-- per Theo: a concept render should look like the catalogue, and installed
-- shingles never match it exactly, "which is OK".
--
-- Page 3 is a clean 3x5 grid of 170x55pt swatches with the name typeset
-- directly beneath each, so all 15 paired by GEOMETRY. Nothing here was named
-- by eye — that is the mistake that put Portsmouth Blue in Carvedwood.
--
-- ⚠️ DRIFTWOOD WAS THE EXPENSIVE ONE: catalog #8A8578, OC's swatch #615C54.
-- 41 of 255 apart and far too light, on a volume colour. That error was
-- reaching customers, and the renderer was painting it faithfully at drift 3.
--
-- ⚠️ THREE COLOURS DID NOT EXIST IN THE CATALOG: Sand Castle, Slatestone Gray,
-- Colonial Slate. Not mis-coloured — absent. A rep could not offer them.
-- Same class as Portsmouth Blue, opposite direction.
--
-- SCHEMA NOTES, each of which cost a failed migration attempt:
--   slug          GENERATED — never insert into it.
--   family        NOT NULL, from brown / grey / green / red / black.
--   product_line  CHECK (duration | designer | other). It is the line KEY,
--                 not the marketing name — 'TruDefinition Duration' is refused.

update public.oc_colors o set hex = v.hex, hex_verified = true, updated_at = now()
from (values
 ('Brownwood','#5B3D37'),('Chateau Green','#475E54'),
 ('Desert Rose','#695044'),('Driftwood','#615C54'),('Estate Gray','#5E6467'),
 ('Midnight Plum','#4B4649'),('Onyx Black','#3A3E41'),('Peppercorn','#4A4A47'),
 ('Sierra Gray','#959897'),('Teak','#55463F'),('Terra Cotta','#9C5846'),
 ('Williamsburg Gray','#4C4D51')
) as v(name,hex)
where lower(o.name) = lower(v.name);

insert into public.oc_colors (name, hex, hex_verified, family, product_line, status, sort_order)
select v.name, v.hex, true, v.fam, 'duration', 'current', v.ord
from (values
 ('Sand Castle','#8D7962','brown',90),
 ('Slatestone Gray','#6A6D6E','grey',91),
 ('Colonial Slate','#6D6763','grey',92)
) as v(name,hex,fam,ord)
where not exists (select 1 from public.oc_colors o where lower(o.name)=lower(v.name));
