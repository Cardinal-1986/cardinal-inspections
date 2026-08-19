-- project_po_sequence_934.sql  ·  build 934  ·  2026-08-19
-- ═══════════════════════════════════════════════════════════════════════════
-- THE PO NUMBER MOVES TO THE DATABASE.
--
-- Four projects shared a PO number with another project:
--   1002  Zulema Hall (07 Aug)      / Kimberly Lawson (09 Aug)
--   1007  Betty Mann (23 Jul)       / Reginald ?      (07 Aug)
--   1008  Joeseph Estimate (24 Jul) / Shari Spearman  (07 Aug)
--   1051  Karen Duffy (17 Aug)      / Land bank -     (19 Aug 15:46)
--
-- THE CAUSE, and it is not a race. nextPo() in index.html is
--     var mx = 1001; cacheProjects.forEach(...); return mx + 1;
-- — the highest PO in the BROWSER'S CACHE, plus one. A browser that loaded its
-- cache before the newest leads existed computes a number that is already
-- taken. The 19 Aug collision is that exact shape: Joey's session had a cache
-- predating six days of new jobs, so it handed out 1051 again.
--
-- WHY THIS IS FIXED IN SQL RATHER THAN IN THE APP. nextPo() is SYNCHRONOUS and
-- called inline inside object literals (`po: nextPo()`) at six sites, two of
-- them in delegating copies. Making it ask the server would make it async, and
-- "adding await to a synchronous function is never a local change" — it would
-- touch every creation path in the file. A sequence owned by Postgres fixes it
-- for every writer at once, including any future one, and needs NO app change:
-- the client may keep computing whatever it likes, and the trigger overwrites
-- it with the authoritative number on the way in.
--
-- ⚠ THE TRIGGER OVERWRITES `po` ON INSERT, ALWAYS. That is the point — the
-- server owns the number. It means a future import cannot choose its own PO;
-- if one ever needs to, it must set the sequence rather than the row.
-- It fires ONLY on INSERT, so editing a job never renumbers it.
--
-- ⚠ IT MUST NOT BREAK AN INSERT IT DOES NOT UNDERSTAND. checklist is TEXT, not
-- jsonb, and nothing constrains it to valid JSON. A bare ::jsonb cast would
-- turn a malformed checklist from a saved row into a failed save, which is far
-- worse than a duplicate number. Anything that will not parse is left alone.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. give the four newer rows fresh numbers ──────────────────────────────
-- The OLDER job keeps the number it has been quoted under; the newer one moves.
update projects set checklist = jsonb_set(checklist::jsonb, '{po}', to_jsonb(1068))::text
 where id = '6132048a-1959-4b91-a986-6fca144e18e4';   -- Kimberly Lawson, was 1002
update projects set checklist = jsonb_set(checklist::jsonb, '{po}', to_jsonb(1069))::text
 where id = '585f31bb-7971-4a39-8cb4-25e285edc7fd';   -- Reginald ?,      was 1007
update projects set checklist = jsonb_set(checklist::jsonb, '{po}', to_jsonb(1070))::text
 where id = '4ec04ca5-7499-44d5-927e-31f1667e7b47';   -- Shari Spearman,  was 1008
update projects set checklist = jsonb_set(checklist::jsonb, '{po}', to_jsonb(1071))::text
 where id = 'd01d3720-bb63-4820-9a11-dd4338f3dbc4';   -- Land bank -,     was 1051

-- ── 2. the sequence, starting above everything that exists ─────────────────
create sequence if not exists project_po_seq;
select setval('project_po_seq',
              greatest(1071, coalesce(max((checklist::jsonb->>'po')::int), 1001)),
              true)
  from projects
 where checklist is not null and checklist <> '' and (checklist::jsonb->>'po') ~ '^[0-9]+$';

-- ── 3. the trigger ─────────────────────────────────────────────────────────
create or replace function set_project_po() returns trigger
language plpgsql
as $fn$
declare ck jsonb;
begin
  if new.checklist is null or new.checklist = '' then
    new.checklist := jsonb_build_object('po', nextval('project_po_seq')::int)::text;
    return new;
  end if;
  begin
    ck := new.checklist::jsonb;
  exception when others then
    return new;            -- not JSON we understand: leave the row exactly as sent
  end;
  if jsonb_typeof(ck) <> 'object' then
    return new;
  end if;
  new.checklist := jsonb_set(ck, '{po}', to_jsonb(nextval('project_po_seq')::int), true)::text;
  return new;
end
$fn$;

drop trigger if exists projects_po_bi on projects;
create trigger projects_po_bi
  before insert on projects
  for each row execute function set_project_po();

commit;

-- Verify: expect 0 duplicates, and two inserts in a row to differ by one.
--   select count(*) - count(distinct (checklist::jsonb->>'po')) from projects;
