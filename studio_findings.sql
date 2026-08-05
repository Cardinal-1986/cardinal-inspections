-- studio_findings.sql — located damage on Studio photographs.
-- Written 5 Aug 2026. RUN THIS BEFORE the ingest change that fills it.
--
-- WHY A TABLE AND NOT A jsonb COLUMN ON studio_photos.
-- The obvious shape is `studio_photos.findings jsonb`, matching walk_shots.
-- It is wrong here for one reason: a blob has room for exactly one run, so
-- pushing v4 would overwrite v3 and there would be no way to compare them, or
-- to hold a teacher label beside a student prediction on the same photograph.
-- That is the same mistake as not capturing `via` on the first 2038 detect
-- records — cheap to avoid now, impossible to undo later.
--
-- WHERE ROWS COME FROM. Two producers, and they must stay distinguishable:
--   'detect' — /api/detect, the Gemini teacher ladder. Boxes are the model's.
--   'yolo'   — a trained best.pt on the Spark (the student, distilled from
--              'detect' output). hail_v3, hail_v4, whatever comes next.
-- Nothing here is ground truth. Everything is a proposal, exactly as
-- api/detect.js says at its head: a person accepts or rejects before any of it
-- is shown to a homeowner. This table is for FINDING photographs, not for
-- making claims about them.

create table if not exists studio_findings (
  id           bigint generated always as identity primary key,
  photo_id     text not null references studio_photos(id) on delete cascade,

  -- PROVENANCE IS MANDATORY, and this is the whole lesson of 5 Aug 2026.
  -- The first 2038 detect records were collected without recording which model
  -- produced them; the ladder silently falls through to gemini-3.5-flash or
  -- gpt-4o-mini on 503/429, so three labelling standards ended up mixed in one
  -- training set with no way to separate them. Not recoverable. Never again.
  source       text not null check (source in ('detect', 'yolo')),
  model        text not null,          -- 'gemini-3.6-flash', 'hail_v4', ...
  run_at       timestamptz not null default now(),

  -- DEFECT IS DELIBERATELY NOT CHECK-CONSTRAINED, which breaks this project's
  -- usual habit (walks_trade_ck, crews_trade_ck) ON PURPOSE.
  --
  -- Those constrain values Cardinal chooses. This one holds MODEL OUTPUT, and
  -- 5 Aug proved what happens when model output meets a vocabulary that cannot
  -- hold it: 294 of 959 boxes (30.7%) were flattened to 'other' and the model's
  -- own word was thrown away. A CHECK here does worse than flatten — it rejects
  -- the row, so a collection run loses boxes outright, and a v5 class would fail
  -- every insert until someone remembered to migrate.
  --
  -- Store what the model said. Filter on read. `raw_defect` carries the string
  -- when it is outside the 33 the app knows, mirroring api/detect.js.
  defect       text not null,
  raw_defect   text,

  -- severity IS constrained: three values, ours not the model's, and identical
  -- to SEVERITIES in api/detect.js and severityOf() in the app. A fourth scale
  -- under a colliding name is the failure this project keeps paying for.
  severity     text check (severity is null or severity in ('crit', 'warn', 'ok')),

  -- The model's own 0-1 estimate. NULLABLE because YOLO and Gemini both
  -- sometimes decline to give one, and a fabricated 1.0 would be a lie that
  -- later reads as certainty.
  confidence   real check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- NORMALISED 0-1, top-left origin — the same contract as api/detect.js and
  -- what cr-ped-script already draws with. Never pixels: the archive original,
  -- the 1400px browsing copy and a phone screenshot are three different sizes
  -- of the same photograph, and only fractions survive that.
  box_x        real check (box_x is null or (box_x >= 0 and box_x <= 1)),
  box_y        real check (box_y is null or (box_y >= 0 and box_y <= 1)),
  box_w        real check (box_w is null or (box_w > 0 and box_w <= 1)),
  box_h        real check (box_h is null or (box_h > 0 and box_h <= 1)),

  label        text,                   -- the model's short name
  note         text                    -- its one-sentence reason
);

-- Per-photo lookup (the detail view) and per-class sweeps ("every hail_impact
-- the student found that the teacher did not") are the two real query shapes.
create index if not exists idx_studio_findings_photo   on studio_findings (photo_id);
create index if not exists idx_studio_findings_defect  on studio_findings (defect);
create index if not exists idx_studio_findings_run     on studio_findings (source, model);

alter table studio_findings enable row level security;

-- Same one-ALL-policy shape as studio_photos_rw / crew_payments_rw. Theo's
-- backend curation tool; there is no second tier to carve out.
--
-- Guarded because CREATE POLICY has no IF NOT EXISTS: every other statement in
-- this file is re-runnable, and one that is not would abort a second run
-- part-way through and leave the migration half-applied. Same do-block shape as
-- walks_schema.sql's constraint guard.
do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'public'
                    and tablename  = 'studio_findings'
                    and policyname = 'studio_findings_rw') then
    create policy studio_findings_rw on studio_findings
      for all
      using (is_cardinal_admin())
      with check (is_cardinal_admin());
  end if;
end $$;


-- ── the denormalised search column ──────────────────────────────────────────
-- studio.html ALREADY filters on studio_photos.tags (a GIN-indexed text[]) and
-- already renders a chip per distinct tag. Adding damage_tags in the same shape
-- means the existing page picks damage up with NO front-end change at all —
-- which is the point. Do not build a second search mechanism beside this one.
alter table studio_photos add column if not exists damage_tags text[] not null default '{}';

create index if not exists idx_studio_photos_damage on studio_photos using gin (damage_tags);


-- ONE function owns the rule, so the threshold lives in exactly one place.
-- Called by the ingest after writing a photo's findings; also safe to run over
-- the whole table to repair drift.
--
-- THE THRESHOLD IS A DECISION, NOT A DEFAULT. Theo, 5 Aug: low-confidence tags
-- must never surface as fact — this app runs insurance claims and a confident
-- wrong tag on a claim photo is worse than no tag. So a chip requires >= 0.50.
-- Everything below it is still STORED and still queryable in studio_findings;
-- it just does not become a chip. Storing and surfacing are different rules.
--
-- NULL confidence counts as surfaceable: a model that declined to score is not
-- the same as a model that scored low, and dropping those would silently hide
-- every YOLO row if a future exporter stops emitting confidence.
-- SECURITY DEFINER, so it must gate itself. Definer rights bypass RLS — that is
-- why it can update studio_photos at all — which means the admin check has to
-- live INSIDE the function. Without it, any signed-in rep could call this over
-- PostgREST RPC and rewrite damage_tags on every photograph in the table.
--
-- ⚠ THE GATE MUST BE `not coalesce(is_cardinal_admin(), false)`, NEVER A BARE
-- `not is_cardinal_admin()`. This file shipped the bare form on 5 Aug 2026 and
-- it did not hold. Measured against production, as role anon with no JWT:
--
--     is_cardinal_admin() -> NULL          (not false)
--
-- because its body ends `... or auth.email() in ('theo@…','joan@…')`, and with
-- no JWT auth.email() is NULL, so `NULL in (…)` is NULL and `false OR NULL` is
-- NULL. In plpgsql `IF NOT <null> THEN` is `IF NULL THEN`, which does not fire:
-- the raise was skipped and the whole function ran for an anonymous caller.
-- Verified by calling it as anon with an id matching no row — it returned.
--
-- RLS policies calling the same function are NOT affected: a policy predicate
-- evaluating to NULL filters the row out, which is the safe direction. It is
-- specifically the negation inside an IF that inverts a NULL into "allow".
create or replace function studio_refresh_damage_tags(p_photo_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(is_cardinal_admin(), false) then
    raise exception 'studio_refresh_damage_tags is admin-only';
  end if;

  update studio_photos p
     set damage_tags = coalesce((
           select array_agg(distinct f.defect order by f.defect)
             from studio_findings f
            where f.photo_id = p.id
              and f.defect <> 'other'          -- a catch-all is not a search term
              and (f.confidence is null or f.confidence >= 0.50)
         ), '{}')
   where p_photo_id is null or p.id = p_photo_id;
end;
$$;

-- Revoke from public, then grant back to `authenticated` ONLY. Dropping the
-- grant entirely would look safer and would break the ingest: PostgREST calls
-- RPC as `authenticated`, and `public` includes it, so a bare revoke locks out
-- the one caller this function exists for. The admin gate above is what makes
-- that grant safe.
--
-- ⚠ `revoke … from public` IS NOT ENOUGH ON SUPABASE, and this file also
-- shipped that mistake on 5 Aug. Supabase's default privileges grant EXECUTE on
-- new functions to anon, authenticated and service_role DIRECTLY — not through
-- `public` — so revoking public left anon holding EXECUTE, and the anon key is
-- in the shipped index.html. Measured after the first apply:
--
--     postgres=EXECUTE, anon=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE
--
-- anon must be named explicitly. Belt and braces with the coalesce above:
-- either one closes the hole, and both means re-granting one does not reopen it.
revoke all on function studio_refresh_damage_tags(text) from public;
revoke all on function studio_refresh_damage_tags(text) from anon;
grant execute on function studio_refresh_damage_tags(text) to authenticated;

-- Verified against production after the fix, all three callers:
--   anon (no JWT)            -> permission denied for function
--   authenticated, nick@     -> raises 'studio_refresh_damage_tags is admin-only'
--   authenticated, theo@     -> allowed (the ingest path still works)


-- ── how the ingest uses this ────────────────────────────────────────────────
-- Idempotency is delete-then-insert scoped to (photo_id, source, model), NOT a
-- unique constraint: float boxes make a natural key fragile, and re-running a
-- push must not double a photograph's boxes. Scoping to the model is what lets
-- hail_v3 and hail_v4 sit side by side on the same photograph.
--
--   delete from studio_findings
--    where photo_id = $1 and source = $2 and model = $3;
--   insert into studio_findings (...) values ...;
--   select studio_refresh_damage_tags($1);
--
-- REVERT
--   drop function if exists studio_refresh_damage_tags(text);
--   drop table if exists studio_findings;
--   alter table studio_photos drop column if exists damage_tags;
