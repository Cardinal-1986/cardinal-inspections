-- studio_site_facets.sql — one row per job site, for the Studio Sites lens
--
-- Runs AFTER studio_archive.sql (needs studio_photos.archived_at).
--
-- Why this exists: PostgREST has no GROUP BY, so the alternative was fetching
-- all 60,503 rows to the browser and grouping there — roughly 5 MB of JSON on
-- a phone, every time the rail is drawn. This returns 756 rows instead.
--
-- security invoker, so the caller's RLS still applies: studio_photos_rw is
-- cmd=ALL / is_cardinal_admin(), which means Production and Sales get an empty
-- set rather than a leaked list of every address Cardinal has ever worked.
--
-- live_photos and binned_photos are counted separately rather than returning a
-- single "archived" boolean, because a site can be partly archived — a restore
-- that half-failed must be visible as a split, not rounded to one state.
--
-- REVERT:
--   drop function if exists public.studio_site_facets();

create or replace function public.studio_site_facets()
returns table (
  address       text,
  job           text,
  live_photos   bigint,
  binned_photos bigint,
  last_shot     timestamptz,
  first_shot    timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    project_address,
    min(project_name),
    count(*) filter (where archived_at is null),
    count(*) filter (where archived_at is not null),
    max(captured_at),
    min(captured_at)
  from public.studio_photos
  where project_address is not null
  group by project_address
  order by max(captured_at) desc nulls last
$$;

revoke all on function public.studio_site_facets() from public, anon;
grant execute on function public.studio_site_facets() to authenticated;
