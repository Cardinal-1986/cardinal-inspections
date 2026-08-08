-- oc_color_wall — rebuild so it can see the columns added after it was created.
-- APPLIED TO PRODUCTION 7 Aug 2026. Run after oc_color_covers.sql and
-- oc_colors_hidden.sql (it reads slug, cover_image_path, cover_credit,
-- coty_year and hidden, all of which those two add).
--
-- ============================================================================
-- WHY THE VIEW WENT BLIND
-- ============================================================================
-- oc_colors.sql wrote this view as `select c.*`. That is what the repo says and
-- it is not a misremembering — but it is also not what got stored. Postgres
-- expands `*` at CREATE time, so the stored definition has been an explicit
-- thirteen-column list since the moment it was made:
--
--   id, name, hex, hex_verified, family, product_line, status, replaced_by,
--   nearest, description, sort_order, created_at, updated_at, photos, hero_path
--
-- A later session then added five columns to oc_colors — slug,
-- cover_image_path, cover_credit, coty_year, hidden. The view did not follow,
-- because a view's column list is frozen at creation. Measured before this fix:
--
--   oc_colors     31 rows,  1 hidden
--   oc_color_wall 31 rows            <- the hidden row still came through
--   new columns visible in the wall: 0 of 5
--
-- ⚠ CREATE OR REPLACE CANNOT FIX THIS, and re-running the original `c.*` text
-- does not help. The five new columns expand into positions 14-18, ahead of
-- `photos` and `hero_path`. CREATE OR REPLACE VIEW may only APPEND columns —
-- it cannot insert or reorder. Proven the hard way earlier the same night on
-- itel_product_register: "cannot change name of view column first_seen to
-- controls". So this is a DROP and recreate, whatever syntax the source used.
--
-- Written as an EXPLICIT column list rather than `c.*`, deliberately. `c.*`
-- is what quietly created this problem: it reads as "always current" while
-- storing a snapshot. The next person to add a column to oc_colors will now
-- see the list, and will have to decide about it here.
--
-- ============================================================================
-- THE COVER AND THE HERO ARE TWO DIFFERENT THINGS AND MUST STAY THAT WAY
-- ============================================================================
-- Both survive as separate columns and NOTHING coalesces them. That is the
-- whole point, from oc_color_covers.sql:
--
--   cover_image_path  Owens Corning's own image for the colour. The brochure.
--                     One per colour, set by an admin, a catalogue fact.
--   hero_path         the lead photograph from oc_color_photos — "Cardinal
--                     roofs by Owens Corning colour", carrying project_address
--                     because a photo that cannot name its house cannot make
--                     the claim.
--
-- Merging them into one "image" column would make the table's own stated claim
-- false the moment a rep showed it, with nothing left to tell stock from real.
-- The consumer shows the cover and puts our roofs behind it, labelled as ours.
--
-- Theo settled the precedence 7 Aug 2026 — "it would be the cover photo" — so
-- the wall leads with the cover. That is a rendering decision and it stays in
-- the renderer; the view's job is to hand over both, honestly labelled, and let
-- the caller obey the rule.
--
-- ============================================================================
-- hidden IS FILTERED HERE, NOT LEFT TO THE CALLER
-- ============================================================================
-- oc_colors_hidden.sql says it twice and the column comment repeats it: "The
-- wall MUST filter on this... A query that selects by status alone will put
-- Shasta White in front of a customer."
--
-- So the filter lives in the view, which is the one place every caller shares.
-- Exposing `hidden` as a column and trusting each consumer to remember is the
-- weaker version of the same idea, and it fails the first time somebody writes
-- a query by status.
--
-- `hidden` is therefore NOT a column here — in this view it is always false by
-- construction, and carrying it would invite a redundant `where not hidden`
-- downstream. Administration reads public.oc_colors directly; admins already
-- have full access to it.
--
-- Result: 31 catalogue rows -> 30 on the wall. Shasta White keeps its row and
-- its history and simply has no spot. Discontinued colours DO keep a spot and
-- are badged, which is a different decision recorded in oc_colors_hidden.sql.
--
-- REVERT — restores the original thirteen-column shape, unfiltered:
--   drop view if exists public.oc_color_wall;
--   create view public.oc_color_wall with (security_invoker = true) as
--     select c.*,
--            (select count(*) from public.oc_color_photos p where p.color_id = c.id) as photos,
--            (select p.storage_path from public.oc_color_photos p
--              where p.color_id = c.id
--              order by p.is_hero desc, p.sort_order, p.created_at limit 1) as hero_path
--       from public.oc_colors c;

drop view if exists public.oc_color_wall;

-- security_invoker stays true. Without it the view runs with the owner's
-- privileges and reads straight past the RLS on oc_colors and
-- oc_color_photos — and oc_color_photos carries project_address, which is a
-- customer's house.
create view public.oc_color_wall
  with (security_invoker = true) as
  select
    c.id,
    c.name,
    c.slug,                                    -- storage key; JS must never recompute it
    c.hex,
    c.hex_verified,                            -- false everywhere until a real swatch is sampled
    c.family,
    c.product_line,
    c.status,
    c.coty_year,
    c.replaced_by,
    c.nearest,
    c.description,
    c.sort_order,

    c.cover_image_path,                        -- Owens Corning's image
    c.cover_credit,

    -- Cardinal's own roofs. Kept separate from the cover on purpose.
    (select count(*) from public.oc_color_photos p
      where p.color_id = c.id)                                       as photos,
    (select p.storage_path from public.oc_color_photos p
      where p.color_id = c.id
      order by p.is_hero desc, p.sort_order, p.created_at
      limit 1)                                                       as hero_path,

    c.created_at,
    c.updated_at
  from public.oc_colors c
  where not c.hidden;

comment on view public.oc_color_wall is
  'The showroom wall: every colour that gets a spot, hidden rows already '
  'excluded so no caller has to remember. cover_image_path is Owens Corning''s '
  'image and hero_path is one of Cardinal''s own roofs — they are deliberately '
  'separate and must not be merged into a single image field. Explicit column '
  'list, not c.*: a view freezes its columns at creation, so adding a column to '
  'oc_colors means editing this view too.';
