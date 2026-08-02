-- workmanship_pairs.sql — the Hall of Fame: a bad install beside ours.
-- Run this BEFORE deploying the index.html change, per the project's SQL rule.
-- Idempotent: safe to run twice.
--
-- WHY. A homeowner cannot tell a good roof from a bad one by looking at the
-- finished surface — both are shingles, and the cheaper bid looks identical
-- from the driveway. The difference is underneath, and it shows up in four
-- years, not four weeks. Two photographs side by side explain in five seconds
-- what a paragraph cannot.
--
-- WHERE THE PHOTOGRAPHS COME FROM, and why this is not the Library.
-- The Resource Library is fenced to reference material and must not be pointed
-- at client work; that fence stands. These pairs sidestep it entirely: the bad
-- side is competitor work photographed on a tear-off, the good side is
-- Cardinal's own crew. Admins upload both from a phone, exactly like the
-- Showcase. Nothing here reads a client record, an inspection or CompanyCam.
--
-- Storage paths into the existing private `photos` bucket under workmanship/,
-- never URLs — same reasoning as showcase_pairs: a teaching pair has to
-- outlive whatever vendor the photograph came from.

create table if not exists workmanship_pairs (
  id           uuid primary key default gen_random_uuid(),

  title        text not null,              -- 'High-nailing'
  trade        text,                       -- mirrors EST_TYPES, see the check
  lesson       text,                       -- one line: why it matters, in plain words

  bad_path     text not null,
  bad_caption  text,                       -- what went wrong, and what it costs
  good_path    text not null,
  good_caption text,                       -- what we do instead, and why it holds

  sort_order   int  not null default 0,
  published    boolean not null default false,

  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Same vocabulary as showcase_pairs, api/sortphotos.js and EST_TYPES.
-- One grows, all grow.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workmanship_pairs_trade_ck') then
    alter table workmanship_pairs add constraint workmanship_pairs_trade_ck
      check (trade is null or trade in
        ('roof','siding','windows','andersen','gutters','general'));
  end if;
end $$;

comment on table workmanship_pairs is
  'Hall of Fame: a bad install beside the Cardinal standard. Photo bytes live in the private photos bucket under workmanship/; admins write, the team reads.';

create index if not exists workmanship_pairs_order
  on workmanship_pairs (published, sort_order, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Identical shape to showcase_pairs: admins write, the signed-in team reads
-- what is published. Sales and production both present this, which is the point.
alter table workmanship_pairs enable row level security;

drop policy if exists workmanship_pairs_read on workmanship_pairs;
create policy workmanship_pairs_read on workmanship_pairs
  for select to authenticated
  using (published or is_cardinal_admin());

drop policy if exists workmanship_pairs_admin_insert on workmanship_pairs;
create policy workmanship_pairs_admin_insert on workmanship_pairs
  for insert to authenticated
  with check (is_cardinal_admin());

drop policy if exists workmanship_pairs_admin_update on workmanship_pairs;
create policy workmanship_pairs_admin_update on workmanship_pairs
  for update to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());

-- A delete under RLS with no policy is a silent 204 — the row survives and the
-- caller sees success. The app also selects the id back on delete.
drop policy if exists workmanship_pairs_admin_delete on workmanship_pairs;
create policy workmanship_pairs_admin_delete on workmanship_pairs
  for delete to authenticated
  using (is_cardinal_admin());

-- ── Storage ───────────────────────────────────────────────────────────────
-- workmanship/ inside the EXISTING private `photos` bucket, so the app's
-- signing path works unchanged. Admins write, the signed-in team reads.
drop policy if exists workmanship_objects_read on storage.objects;
create policy workmanship_objects_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like 'workmanship/%');

drop policy if exists workmanship_objects_admin_write on storage.objects;
create policy workmanship_objects_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and name like 'workmanship/%' and is_cardinal_admin());

drop policy if exists workmanship_objects_admin_delete on storage.objects;
create policy workmanship_objects_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and name like 'workmanship/%' and is_cardinal_admin());
