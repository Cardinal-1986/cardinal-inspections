-- projects_address_parts.sql — build 1155
--
-- Give a parsed address somewhere to go.
--
-- WHY: every address in this app has lived in ONE text column. Contracts,
-- which need four separate fields, have had nothing to read, so they print a
-- single line and the client's city / state / zip are simply not available to
-- them. Build 1154 fixed the two front-end faults (two autocompletes fighting
-- over the lead form's Street box, and both Places paths discarding the split
-- Google already hands over) -- but there was still nowhere to PUT the parts.
-- This is that place.
--
-- WHAT IT DOES NOT DO: it does not touch `address`. That column stays exactly
-- as it is and stays the display string every existing reader uses. This is
-- additive. Nothing that reads `address` today changes behaviour.
--
-- Idempotent. Safe to re-run: the backfill only writes rows whose parts are
-- still NULL, so a second run cannot overwrite a correction made by hand.

begin;

alter table public.projects
  add column if not exists street text,
  add column if not exists city   text,
  add column if not exists state  text,
  add column if not exists zip    text;

comment on column public.projects.address is
  'The full display address. Composed, human-entered, or from Google. Kept as the
   single source for every existing reader. street/city/state/zip are parsed
   alongside it, not instead of it.';
comment on column public.projects.street is 'Street line only -- number + route, no city.';
comment on column public.projects.city   is 'City / township as entered or as Google returned it.';
comment on column public.projects.state  is 'Two-letter state code, upper case.';
comment on column public.projects.zip    is 'ZIP, "45402" or "45402-5205".';

-- A cheap guard rather than a CHECK constraint: a CHECK would reject a row
-- some future import needs to write, and this data has already proven it can
-- arrive in shapes nobody predicted. Index instead of constrain.
create index if not exists projects_zip_idx   on public.projects (zip)   where zip   is not null;
create index if not exists projects_city_idx  on public.projects (city)  where city  is not null;

-- ---------------------------------------------------------------------------
-- Backfill.
--
-- Conservative on purpose: parse what is unambiguous, leave NULL otherwise.
-- It never invents a city, never guesses a zip and never rewrites `address`.
-- Measured against all 59 non-blank rows on 30 Aug 2026: 56 yield a full
-- street + city + state, 3 yield street only because the stored value has no
-- city in it at all ("921 Testing Way", "2420 Brookline", "1049 Cicillion Ave").
--
-- Six rows carry the doubled shape build 1154 fixed --
--   "804 Burleigh Ave, Dayton, OH 45402, USA, Dayton, OH 45414"
-- -- where a Google address and a hand-typed one were concatenated. The parse
-- takes the GOOGLE half (everything before ", USA") because that half was
-- validated by Google; the hand-typed tail is dropped. TWO of those six
-- disagree with themselves about the zip and one about the city, so the tail
-- is preserved in address_parse_note rather than thrown away silently.
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists address_parse_note text;
comment on column public.projects.address_parse_note is
  'Set by the 1155 backfill where the stored address was self-contradictory --
   the dropped half of a doubled address. Informational; safe to clear by hand.';

with base as (
  select id, regexp_replace(btrim(address), '\s+', ' ', 'g') as a
  from public.projects
  where address is not null and btrim(address) <> ''
), cut as (
  select base.*,
    case when a ~* ',\s*USA\s*,' then regexp_replace(a, '(?i),\s*USA\s*,.*$', '')
         else regexp_replace(a, '(?i),?\s*USA\s*$', '') end as c,
    case when a ~* ',\s*USA\s*,'
         then btrim(regexp_replace(a, '(?i)^.*?,\s*USA\s*,\s*', '')) end as tail
  from base
), ung as (   -- "ohio46416" -> "ohio 46416"
  select cut.*, regexp_replace(c, '(?i)\m(ohio|indiana|kentucky|michigan)(\d{5})\M', '\1 \2') as u
  from cut
), z as (
  select ung.*,
    (regexp_match(u, '\m(\d{5}(?:-\d{4})?)\s*$'))[1] as p_zip,
    btrim(regexp_replace(u, '\m\d{5}(?:-\d{4})?\s*$', ''), ' ,') as az
  from ung
), st as (
  select z.*, case
      when upper((regexp_match(az, '[,\s]([A-Za-z]{2})\s*$'))[1]) in
        ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
         'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
         'RI','SC','SD','TN','TX','UT','VT','VA','WA','DC','WV','WI','WY')
      then upper((regexp_match(az, '[,\s]([A-Za-z]{2})\s*$'))[1])
      when lower((regexp_match(az, '[,\s]([A-Za-z]+)\s*$'))[1]) = 'ohio'    then 'OH'
      when lower((regexp_match(az, '[,\s]([A-Za-z]+)\s*$'))[1]) = 'indiana' then 'IN'
    end as p_state
  from z
), st2 as (
  select st.*, case when p_state is null then az
                    else btrim(regexp_replace(az, '[,\s]+[A-Za-z]+\s*$', ''), ' ,') end as rest
  from st
), ct as (
  select st2.*,
    case when rest like '%,%'
         then btrim(split_part(rest, ',', array_length(string_to_array(rest, ','), 1)))
         -- no comma: only accept a city we actually recognise. Anything else
         -- stays NULL rather than chopping a street name in half.
         else (regexp_match(rest,
                '(?i)[,\s](Dayton|Huber Heights|Washington Township|New Carlisle|Tipp City|Kettering|'
             || 'Centerville|Englewood|Brookville|Fairborn|Germantown|Lewisburg|Miamisburg|Vandalia|'
             || 'Trotwood|Riverside|Beavercreek|Springboro|Xenia|West Carrollton|Moraine|Oakwood|'
             || 'Clayton|Union|Lawrenceburg)\s*$'))[1] end as p_city
  from st2
), s0 as (
  select ct.*, nullif(btrim(case
      when p_city is null then rest
      when rest like '%,%' then btrim(left(rest, length(rest) - length(p_city) - 1), ' ,')
      else btrim(left(rest, length(rest) - length(p_city)), ' ,')
    end, ' ,'), '') as s
  from ct
), fin as (
  select id, p_city, p_state, p_zip, tail,
    -- "804 E Center St, Germantown, Germantown" -- city repeated in the source
    case when p_city is not null and lower(btrim(s)) like '%, ' || lower(p_city)
         then btrim(left(s, length(s) - length(p_city) - 1), ' ,')
         else s end as p_street
  from s0
)
update public.projects p
   set street = coalesce(p.street, fin.p_street),
       city   = coalesce(p.city,   initcap(fin.p_city)),
       state  = coalesce(p.state,  fin.p_state),
       zip    = coalesce(p.zip,    fin.p_zip),
       address_parse_note = coalesce(
         p.address_parse_note,
         case when fin.tail is not null
              then 'doubled address; dropped hand-typed tail: ' || fin.tail end)
  from fin
 where p.id = fin.id
   and (p.street is null and p.city is null and p.state is null and p.zip is null);

commit;
