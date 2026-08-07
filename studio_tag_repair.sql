-- studio_tag_repair.sql — remove a tag that was never about photos, and add
-- one filter that costs nothing.
--
-- Theo, 7 Aug 2026: "Aerial is literally the job Aerial and not Aerial photos."
--
-- He is right, and it is total. Measured before touching anything:
--
--   photos tagged 'aerial'                 51
--   ...whose address contains "Aerial"     51      <- all of them
--   ...anywhere else                        0
--   photos at Aerial-named streets         51      <- exactly the same set
--
-- The only two addresses involved are '2805 Aerial Ave, Dayton, OH, 45419' and
-- '2805 Aerial Dr, Kettering, OH, 45419'. The tag is derived from the STREET
-- NAME. There is not one aerial photograph behind it, so it is deleted rather
-- than renamed — there is nothing to rename it to.
--
-- close-up (20,836 photos / 715 addresses) and wide (8,362 / 377) were checked
-- the same way and ARE real: 366 sites carry both, which is the signature of
-- photo classification rather than an address artifact. They are left alone.
--
-- REVERT (exact, because the affected set is identifiable by address):
--   update public.studio_photos
--      set tags = array_append(tags, 'aerial')
--    where project_address ilike '%aerial%' and not ('aerial' = any(tags));
--   update public.studio_photos set confidence = confidence || '{"aerial":1}'::jsonb
--    where project_address ilike '%aerial%';
--   alter table public.studio_photos drop column if exists orientation;

-- ── 1 · drop the false tag ───────────────────────────────────────────
update public.studio_photos
   set tags = array_remove(tags, 'aerial')
 where 'aerial' = any(tags);

update public.studio_photos
   set confidence = confidence - 'aerial'
 where confidence ? 'aerial';

-- ── 2 · orientation, free and already 100% populated ─────────────────
-- width and height are set on every one of the 60,503 rows, so this needs no
-- backfill and no AI. A STORED generated column rather than a view, because
-- PostgREST cannot filter on an expression comparing two columns — without a
-- real column there is no way to say .eq('orientation','landscape') and the
-- filter would have to happen client-side, which breaks pagination.
alter table public.studio_photos
  add column if not exists orientation text
  generated always as (
    case when width is null or height is null then null
         when width > height then 'landscape'
         when height > width then 'portrait'
         else 'square' end
  ) stored;

create index if not exists studio_photos_orientation_idx
  on public.studio_photos (orientation);

comment on column public.studio_photos.orientation is
  'Derived from width/height. landscape 39,650 · portrait 20,842 · square 11 '
  'at the time of writing. Free filter — no tagging pass required.';
