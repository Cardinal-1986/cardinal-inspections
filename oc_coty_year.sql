-- OC Colors — Shingle Color of the Year, as a year, not as a status.
-- Run after oc_color_covers.sql. Additive; no data is overwritten.
--
-- ============================================================================
-- WHY A NEW COLUMN AND NOT status='coty'
-- ============================================================================
-- status holds ONE value and already means something: current / new /
-- discontinued / coty. Writing 'coty' onto the seven historical winners would
-- erase the fact that Sedona Canyon is current and Bourbon is discontinued —
-- which is exactly what the wall filters on. COTY is a different fact about a
-- different year, so it gets its own column.
--
-- status='coty' keeps its meaning: the CURRENT Color of the Year. That is
-- Evergreen Mist, and this migration does not touch it.
--
-- ============================================================================
-- SOURCE — an Owens Corning graphic, not a reconstruction
-- ============================================================================
-- "2025 SHINGLE COLOR OF THE YEAR — COMING SOON", supplied by Theo 7 Aug 2026.
-- It names 2017-2024 outright. Every year below is read off that graphic.
--
-- NOT loaded, deliberately:
--   * Merlot 2025. An earlier hand-written list claimed it. The OC graphic
--     shows 2025 as "Stay Tuned" — it was printed before the announcement, so
--     it neither confirms nor denies. Left NULL rather than guessed.
--   * Evergreen Mist. Carries status='coty' (the current one, 2026 by
--     implication) but no year appears on the graphic. Left NULL.
--   * Williamsburg Gray 2024. IT IS NOT IN oc_colors AT ALL — see the note at
--     the bottom. A row cannot be given a year it does not have.

alter table public.oc_colors
  add column if not exists coty_year integer;

comment on column public.oc_colors.coty_year is
  'Year this colour was Owens Corning Shingle Color of the Year. From OC''s own '
  '2017-2024 graphic. NULL means not a past winner OR not yet confirmed — it '
  'does not mean "no". status=''coty'' separately marks the CURRENT winner; the '
  'two are different facts and neither implies the other.';

-- 2017-2023. Williamsburg Gray (2024) is absent from the catalogue.
update public.oc_colors set coty_year = 2017 where name = 'Sedona Canyon';
update public.oc_colors set coty_year = 2018 where name = 'Sand Dune';
update public.oc_colors set coty_year = 2019 where name = 'Black Sable';
update public.oc_colors set coty_year = 2020 where name = 'Pacific Wave';
update public.oc_colors set coty_year = 2021 where name = 'Aged Copper';
update public.oc_colors set coty_year = 2022 where name = 'Bourbon';
update public.oc_colors set coty_year = 2023 where name = 'Midnight Plum';

-- One winner per year. A second row claiming 2019 is a data error, not a tie.
create unique index if not exists oc_colors_coty_year_uidx
  on public.oc_colors (coty_year) where coty_year is not null;

-- ---------------------------------------------------------------------------
-- ⚠ WILLIAMSBURG GRAY IS MISSING FROM THE CATALOGUE
-- ---------------------------------------------------------------------------
-- It is the 2024 Color of the Year on OC's own graphic, and it has a full-page
-- roof photograph on page 14 of the TruDefinition Duration Beauty Book — so it
-- is a real, current, photographed OC colour that oc_colors does not list.
-- Peppercorn (Beauty Book p11) is missing too.
--
-- Deliberately NOT inserted here. A catalogue row needs family, product_line,
-- status and a hex, and inventing those is how the existing 29 ended up with
-- hex_verified=false on every row. Ask Theo, then insert with real values.
--
-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select name, status, coty_year from public.oc_colors
--    where coty_year is not null or status = 'coty' order by coty_year nulls last;
--   -- expect 7 rows with years 2017-2023, plus Evergreen Mist (coty, year NULL).
--
-- Rollback:
--   drop index if exists public.oc_colors_coty_year_uidx;
--   alter table public.oc_colors drop column if exists coty_year;
