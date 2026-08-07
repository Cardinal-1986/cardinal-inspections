-- OC Colors — cover image per colour, and a stable slug for storage paths.
-- Run this BEFORE the index.html build that adds the colour wall. The wall
-- reads cover_image_path and slug; without them it renders colours with no
-- imagery and uploads have nowhere stable to land.
--
-- ============================================================================
-- WHY A COVER LIVES ON oc_colors AND NOT IN oc_color_photos
-- ============================================================================
-- oc_color_photos says what it is in its own table comment: "Cardinal roofs by
-- Owens Corning colour", and the pitch it exists to support is "these are our
-- roofs, not a manufacturer's brochure". That is why it carries
-- project_address — a photo that cannot name its house cannot make the claim.
--
-- The generic Owens Corning image for a colour is the brochure. Putting it in
-- oc_color_photos would make the table's own stated claim false the moment a
-- rep showed it, with nothing left to tell stock from real.
--
-- So: the manufacturer's image is the colour's COVER, one per colour, on the
-- colour row. oc_color_photos stays exactly what it says it is. The wall shows
-- the cover; a colour's Cardinal roofs sit behind it and are labelled as ours.
-- Theo settled this 7 Aug 2026 — "it would be the cover photo".
--
-- ============================================================================
-- WHO CAN SET ONE — deliberately narrower than who can add a roof photo
-- ============================================================================
-- No policy changes here, and none are needed. The existing gates already say
-- the right thing, and they say two different things on purpose:
--
--   oc_colors        ALL    is_cardinal_admin()   -> only Theo and Joan set a
--                                                    cover. It is a catalogue
--                                                    fact about the product.
--   oc_color_photos  INSERT is_staff()            -> anyone on the roof can add
--                                                    one of our roofs.
--   oc_colors        SELECT authenticated         -> all signed-in staff see
--                                                    colours (settled 7 Aug:
--                                                    "Yes they can see colors").
--
-- The bytes are governed by the photos bucket's existing photos_read /
-- photos_write / photos_delete, which already cover the oc-colors/ prefix
-- (photos_read excludes only studio/% and private/%). OPEN_ITEMS is explicit:
-- DO NOT add a fourth policy for this prefix. A second mechanism beside a
-- working one is a bug with a delay on it.

-- ---------------------------------------------------------------------------
-- 1. slug — stable, derived, and not trusted to the client
-- ---------------------------------------------------------------------------
-- Storage paths look like 'oc-colors/onyx-black/1712….jpg'. That slug was
-- being implied by example and computed nowhere. Deriving it in JS at upload
-- time means two call sites can disagree ("Sierra Gray" -> sierra-gray vs
-- sierra_gray) and the drift only shows up as photos filed under a colour that
-- no longer matches. Generated-always means it cannot drift and cannot be
-- written wrong.
--
-- lower(), regexp_replace() and btrim() are all IMMUTABLE, which is what a
-- STORED generated column requires.
alter table public.oc_colors
  add column if not exists slug text
  generated always as (
    btrim(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '-')
  ) stored;

comment on column public.oc_colors.slug is
  'Derived from name; the folder under oc-colors/ in the photos bucket. '
  'Generated always — never write this, and never compute it client-side.';

create unique index if not exists oc_colors_slug_uidx on public.oc_colors (slug);

-- ---------------------------------------------------------------------------
-- 2. cover_image_path — the manufacturer's image for this colour
-- ---------------------------------------------------------------------------
-- Path inside the `photos` bucket, e.g. 'oc-colors/onyx-black/cover.jpg'.
-- Nullable: a colour with no cover renders its (unverified) hex swatch, which
-- is the honest fallback rather than a blank card.
alter table public.oc_colors
  add column if not exists cover_image_path text;

comment on column public.oc_colors.cover_image_path is
  'Owens Corning''s own image for this colour, in the photos bucket under '
  'oc-colors/<slug>/. This is the manufacturer''s brochure image and is NOT '
  'one of our roofs — Cardinal roofs live in oc_color_photos, which carries '
  'project_address precisely so it can make that claim. Do not merge the two.';

-- ---------------------------------------------------------------------------
-- 3. cover_credit — attribution, because we are a dealer and not the owner
-- ---------------------------------------------------------------------------
-- OPEN_ITEMS, on OC's colour copy: "normal to use as an authorised dealer, but
-- attribute it." The same is true of their photography. Carrying the credit as
-- a column rather than hardcoding one string keeps it correct if an image comes
-- from somewhere else later.
alter table public.oc_colors
  add column if not exists cover_credit text
  default 'Image: Owens Corning';

comment on column public.oc_colors.cover_credit is
  'Attribution shown wherever cover_image_path is displayed. Defaults to '
  'Owens Corning because that is where these come from. Must be rendered '
  'with the image, not dropped for layout.';

-- ---------------------------------------------------------------------------
-- 4. hex_verified is NOT touched, and importing covers must not touch it
-- ---------------------------------------------------------------------------
-- All 29 rows are false and must stay false until someone samples a real
-- swatch. A manufacturer's photograph is a photograph of a roof in some light;
-- it is not a colour measurement. Loading covers verifies nothing.
comment on column public.oc_colors.hex_verified is
  'False on all 29 rows. Uploading a cover image does NOT verify a hex — a '
  'photograph is not a measurement. Do not show a customer an unverified '
  'swatch and call it the colour.';

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--   select name, slug, cover_image_path, cover_credit, hex_verified
--     from public.oc_colors order by sort_order;
--   -- expect 29 rows, every slug populated, every cover null on first run,
--   -- every hex_verified still false.
--
-- Rollback:
--   drop index if exists public.oc_colors_slug_uidx;
--   alter table public.oc_colors drop column if exists cover_credit;
--   alter table public.oc_colors drop column if exists cover_image_path;
--   alter table public.oc_colors drop column if exists slug;
