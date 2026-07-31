-- companycam_search.sql
-- Build 496 — make CompanyCam photo search actually find things by address or job name.
--
-- THE BUG, measured against the live index rather than reasoned about:
--
--   api/companycam.js searched each column SEPARATELY:
--       or=(description.wfts.Q, project_name.wfts.Q, project_address.wfts.Q, creator_name.wfts.Q)
--
--   websearch_to_tsquery ANDs every word. The picker pre-fills the box with the
--   report TITLE, which carries the client name AND the address — but
--   project_name holds only the name and project_address only the address, so
--   NO SINGLE COLUMN ever contains all the terms and the search returned zero:
--
--       '843 Farnam'                                    -> 738 photos
--       'CR226 Amber Mcdonald - 843 Farnam St, ...'     ->   0 photos
--
--   Worse, websearch_to_tsquery reads a lone hyphen as NEGATION, so
--   "Client - 843 Farnam" parses to  'client' & !'843' & 'farnam'  and actively
--   EXCLUDES the address being searched for.
--
-- THE INDEX FOR THIS ALREADY EXISTED AND WAS NEVER USED. companycam_photos_fts
-- is a GIN index over the four fields CONCATENATED into one document. Querying
-- that expression is both correct (all terms match across the combined text) and
-- fast — measured 32 ms vs 1,706 ms for a per-word ilike scan, because the
-- separate-column form cannot use it at all.
--
-- Punctuation is stripped before parsing, which removes the hyphen-as-NOT trap
-- and makes a pasted address behave like the words it contains.
--
-- SECURITY: SECURITY DEFINER and revoked from anon/authenticated, granted only to
-- service_role — matching companycam_backfill_project_names and
-- companycam_caption_sample. It bypasses RLS, so a signed-in non-admin must not
-- be able to read preview urls straight out of the mirror. The route that calls
-- it is admin-gated.
--
-- Idempotent and additive. To undo: drop function companycam_search(text,int);

create or replace function companycam_search(q text, n int default 60)
returns table (
  id              text,
  description     text,
  captured_at     timestamptz,
  project_id      text,
  project_name    text,
  project_address text,
  creator_name    text,
  annotated       boolean,
  thumb_url       text,
  preview_url     text
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    -- Strip everything that is not a letter, digit or space. This is what kills
    -- the hyphen-as-NOT trap, and it also means a pasted address with commas
    -- behaves exactly like the words inside it.
    select nullif(btrim(regexp_replace(coalesce(q, ''), '[^[:alnum:][:space:]]+', ' ', 'g')), '') as t
  )
  select
    p.id, p.description, p.captured_at, p.project_id, p.project_name,
    p.project_address, p.creator_name, p.annotated, p.thumb_url, p.preview_url
  from companycam_photos p, cleaned c
  where c.t is not null
    and to_tsvector('english',
          coalesce(p.description, '')     || ' ' ||
          coalesce(p.project_name, '')    || ' ' ||
          coalesce(p.project_address, '') || ' ' ||
          coalesce(p.creator_name, '')
        ) @@ websearch_to_tsquery('english', c.t)
  order by p.captured_at desc nulls last
  limit least(greatest(coalesce(n, 60), 1), 100);
$$;

revoke all on function companycam_search(text, int) from public;
revoke all on function companycam_search(text, int) from anon;
revoke all on function companycam_search(text, int) from authenticated;
grant execute on function companycam_search(text, int) to service_role;
