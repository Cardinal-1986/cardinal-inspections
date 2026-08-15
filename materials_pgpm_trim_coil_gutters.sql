-- Ply Gem Performance Metals trim coil, as gutter colours. APPLIED. Idempotent.
-- Source: 2025 PGPM Metal Color Matrix (manufacturer), pages 1–5.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE HEX IS INHERITED, NOT ESTIMATED — and that makes these the
-- best-sourced colours in the app.
--
-- Ply Gem uses the SAME colour code on the coil and on the vinyl: Rugged
-- Canyon is 100 on both, Deep Granite is 090 on both. Matching them is the
-- entire purpose of the published matrix. So a gutter in code 100 takes the
-- hex already carried by Mastic Carvedwood 100 — a manufacturer-matched pair
-- rather than anybody's guess about what the colour looks like.
--
-- Verified after applying: all 23 gutter rows have a hex identical to their
-- siding twin, joined on mfr_code.
--
-- ⚠️ ONLY 23 OF THE 217 COIL COLOURS ARE LOADED, and the cap is deliberate.
-- The other 194 have no hex anywhere. Loading them would fill the gutter
-- picker with entries the Spark cannot render — "no swatch hex on this
-- selection, nothing to recolour with" — which reads to a rep as a broken
-- screen rather than as missing data. The FULL 218-row mapping is committed
-- at .claude/skills/cardinal-build/docs/pgpm_trim_coil_2025.json so nothing
-- is lost, and rows can be promoted as hexes arrive.
--
-- ⚠️ TWO TYPOS IN PLY GEM'S OWN DOCUMENT, corrected here and named so nobody
-- "fixes" them back toward the source: it prints "Neport Bay" (Newport Bay,
-- 146) and "Pebbleston Clay" (Pebblestone Clay, 52).
--
-- Pages 6–8 of that matrix are a different thing again — they map OTHER
-- manufacturers' colour names onto these codes (CertainTeed "Granite Gray"
-- is code 35, James Hardie "Boothbay Blue" is 390). That is the real
-- gutter-matching tool for a house Cardinal did not side, and it is NOT
-- built. See OPEN_ITEMS.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.materials add column if not exists special_order boolean not null default false;
comment on column public.materials.special_order is
  'Manufacturer flags this colour special order (asterisk in the published matrix). A rep must know before promising it.';

insert into public.materials
  (category, manufacturer, product_line, color_name, mfr_code, hex, hex_verified,
   finish, status, sort_order, prompt, negative)
select 'gutters','Ply Gem Performance Metals','Trim Coil', v.name, v.code,
       s.hex, false, 'smooth', 'current',
       (row_number() over (order by v.name))::int + 100,
       'seamless aluminium gutters and downspouts in ' || v.name ||
       ', smooth painted coil finish, straight true gutter line',
       'glossy chrome, rusted metal, warped or wavy gutter line'
from (values
  ('02','Silver Gray'),('04','White'),('090','Deep Granite'),('100','Rugged Canyon'),
  ('144','Misty Shadow'),('146','Newport Bay'),('147','Brandy Wood'),
  ('156','Natural Slate'),('170','Quiet Willow'),('18','Sage'),('22','Desert Sand'),
  ('290','Russet Red'),('31','Cameo'),('35','Harbor Grey'),('36','Victorian Grey'),
  ('39','Sandtone'),('390','English Wedgewood'),('44','Linen'),('511','Tuscan Olive'),
  ('52','Pebblestone Clay'),('53','Almond'),('IC','Lakeshore Fern'),('IF','Montana Suede')
) as v(code,name)
join lateral (
  select m.hex from public.materials m
   where m.manufacturer='Mastic' and m.mfr_code = v.code and m.hex is not null
   limit 1
) s on true
where not exists (
  select 1 from public.materials m
   where m.manufacturer='Ply Gem Performance Metals'
     and m.product_line='Trim Coil' and m.mfr_code = v.code
);
