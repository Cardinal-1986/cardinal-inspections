-- oc_colors_swatch_path.sql — one column, so real swatch photography can land
-- later without touching the Visualizer's layout.
--
-- `materials` has carried swatch_path and hex_verified since it was created;
-- oc_colors had only hex_verified. This closes the gap so BOTH catalogs answer
-- the same question the same way: "is there a real picture of this colour, and
-- is the hex something a person confirmed?"
--
-- NULL means "no photograph yet — draw the procedural texture from hex". That
-- is the floor, and it is deliberately the default: a colour chip that admits
-- it is a chip beats a photograph that is wrong.
--
-- Path convention, matching the rest of the bucket: swatches/oc/<slug>.jpg in
-- the `photos` bucket. Nothing is written here — Theo drops the files in and
-- sets the paths, or the Spark does it from a dealer-portal download.

alter table public.oc_colors
  add column if not exists swatch_path text;

comment on column public.oc_colors.swatch_path is
  'Storage path in the photos bucket to a real product swatch photograph. NULL = fall back to the procedural texture drawn from hex. Set by hand or by the Spark; never invented.';

comment on column public.oc_colors.hex_verified is
  'True only when a person checked this hex against a real shingle or an official swatch. False means it is an estimate and the Visualizer says so.';
