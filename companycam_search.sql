-- companycam_search.sql  [rewritten at build 506 - APPLIED]
--
-- 496 fixed "no single column holds all the terms" by searching the four fields
-- CONCATENATED. It left a second problem, which Theo found:
--
--   "if edenhill is searched with the address number it will not populate
--    photos. It only populates if its just the street name"
--
-- Measured against the live index. The number was never the issue - the WORD was:
--
--   'Edenhill'            -> 54 photos
--   '2444 Edenhill'       -> 38 photos
--   '2444 Edenhill Ave'   ->  0        <-- stored as "Edenhill AVENUE"
--   full stored address   ->  0        <-- 45420-3551 splits, city may differ
--
-- websearch_to_tsquery ANDs every word, so ONE abbreviation kills the search.
-- Ave/Avenue, St/Street, Dr/Drive, a ZIP+4, a city spelled differently - any of
-- them returns nothing at all, which reads as "we have no photos of this job".
--
-- SO: RANK, DO NOT FILTER. Strict AND first, because someone who types exactly
-- should get exactly. Only if that finds NOTHING, match ANY term and order by
-- how well each row matches. Prefix-matched, so "Eden" finds Edenhill.
--
-- Measured after: every failing case above now returns the correct job FIRST.
-- The loose pass is deliberately noisy - it is a last resort, and the ordering
-- is what makes it useful rather than the filtering.
--
-- SECURITY unchanged: SECURITY DEFINER, revoked from anon/authenticated, granted
-- only to service_role, matching companycam_backfill_project_names.
-- To undo: drop function companycam_search(text,int);

create or replace function companycam_search(q text, n int default 60)
returns table (
  id text, description text, captured_at timestamptz, project_id text,
  project_name text, project_address text, creator_name text,
  annotated boolean, thumb_url text, preview_url text
)
language plpgsql stable security definer set search_path = public
as $$
declare
  cleaned text; words text[]; strict_q tsquery; loose_q tsquery;
  lim int := least(greatest(coalesce(n,60),1),100); found int;
begin
  cleaned := btrim(regexp_replace(coalesce(q,''), '[^[:alnum:][:space:]]+', ' ', 'g'));
  if cleaned = '' then return; end if;
  words := array(select w from unnest(regexp_split_to_array(cleaned, '\s+')) w where length(w) > 0);
  if array_length(words,1) is null then return; end if;

  -- 1) STRICT: every word must appear.
  strict_q := websearch_to_tsquery('english', cleaned);
  return query
  select p.id,p.description,p.captured_at,p.project_id,p.project_name,
         p.project_address,p.creator_name,p.annotated,p.thumb_url,p.preview_url
  from companycam_photos p
  where to_tsvector('english',
          coalesce(p.description,'')||' '||coalesce(p.project_name,'')||' '||
          coalesce(p.project_address,'')||' '||coalesce(p.creator_name,'')) @@ strict_q
  order by p.captured_at desc nulls last
  limit lim;
  get diagnostics found = row_count;
  if found > 0 then return; end if;

  -- 2) LOOSE: any word, best match first.
  loose_q := to_tsquery('english', array_to_string(array(select w || ':*' from unnest(words) w), ' | '));
  return query
  select p.id,p.description,p.captured_at,p.project_id,p.project_name,
         p.project_address,p.creator_name,p.annotated,p.thumb_url,p.preview_url
  from companycam_photos p
  where to_tsvector('english',
          coalesce(p.description,'')||' '||coalesce(p.project_name,'')||' '||
          coalesce(p.project_address,'')||' '||coalesce(p.creator_name,'')) @@ loose_q
  order by ts_rank(to_tsvector('english',
          coalesce(p.description,'')||' '||coalesce(p.project_name,'')||' '||
          coalesce(p.project_address,'')||' '||coalesce(p.creator_name,'')), loose_q) desc,
        p.captured_at desc nulls last
  limit lim;
end;
$$;

revoke all on function companycam_search(text,int) from public;
revoke all on function companycam_search(text,int) from anon;
revoke all on function companycam_search(text,int) from authenticated;
grant execute on function companycam_search(text,int) to service_role;
