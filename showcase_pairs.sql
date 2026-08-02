-- showcase_pairs.sql — curated before/after transformations for the Showcase.
-- Run this BEFORE deploying the index.html change, per the project's SQL rule.
-- Idempotent: safe to run twice.
--
-- WHY. The Showcase is the kitchen-table surface: a rep opens it beside a
-- homeowner and swipes through finished work on their street. That needs a
-- small, hand-picked set — not the 60,485-photo CompanyCam index, which is a
-- search tool for the office. Theo picks the winners; this table holds them.
--
-- WHAT IS HERE. Storage PATHS into the existing private `photos` bucket, under
-- a showcase/ prefix — never URLs. The app signs them for display the same way
-- it signs job photos (signedPhotoMap), so nothing here expires and nothing
-- here is publicly readable by accident.
--
-- WHY PATHS AND NOT COMPANYCAM LINKS. A CompanyCam thumb_url points at
-- CompanyCam's CDN. If Cardinal ever leaves CompanyCam those links die and the
-- pitch dies with them. Photographs that reach this table are COPIED into
-- Cardinal's own bucket, so a curated pair outlives the vendor.
--
-- PERMISSIONS, settled by Theo: admins only may add, edit or remove; sales and
-- production may view. Enforced here in RLS, not only in the UI — a hidden
-- button is not a permission.

create table if not exists showcase_pairs (
  id           uuid primary key default gen_random_uuid(),

  title        text,                       -- 'Full replacement, hail claim'
  address      text,                       -- display address; masked in privacy mode
  city         text,                       -- shown even when the address is masked
  project_id   uuid,                       -- optional link to projects; null for older work

  trade        text,                       -- mirrors EST_TYPES keys, see the check below
  material     text,                       -- 'Owens Corning Duration — Onyx Black'
  completed_on date,

  -- Storage paths inside the private `photos` bucket, e.g.
  -- 'showcase/<pair-id>/before.jpg'. before + after are the pitch; build is the
  -- optional middle frame the phase dock shows.
  before_path  text not null,
  build_path   text,
  after_path   text not null,

  score        int,                        -- 0-100, hand-assigned for now
  sort_order   int  not null default 0,
  published    boolean not null default false,

  -- Client release for social / website use. Nothing is exported without this,
  -- and the date is kept so the permission can be proven a year later.
  -- Never write an address here that was not actually given — same rule as
  -- community_partners and commissions.rep_email.
  release_on   date,
  release_by   text,

  notes        text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The trade vocabulary is the EST_TYPES key set (index.html), the same list
-- api/sortphotos.js emits and cr-sortvocab-script mirrors. One grows, all grow —
-- and the whitelist ships before any writer, per the normStage lesson.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'showcase_pairs_trade_ck') then
    alter table showcase_pairs add constraint showcase_pairs_trade_ck
      check (trade is null or trade in
        ('roof','siding','windows','andersen','gutters','general'));
  end if;
end $$;

comment on table showcase_pairs is
  'Hand-picked before/after transformations for the Showcase. Photo bytes live in the private photos bucket under showcase/; admins write, the team reads.';

create index if not exists showcase_pairs_order
  on showcase_pairs (published, sort_order, created_at desc);

create index if not exists showcase_pairs_trade
  on showcase_pairs (trade);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Admins (is_cardinal_admin(), security-definer, already in the database)
-- get everything. Everyone signed in reads published pairs — that is sales and
-- production both, which is what Theo asked for.
alter table showcase_pairs enable row level security;

drop policy if exists showcase_pairs_read on showcase_pairs;
create policy showcase_pairs_read on showcase_pairs
  for select to authenticated
  using (published or is_cardinal_admin());

drop policy if exists showcase_pairs_admin_insert on showcase_pairs;
create policy showcase_pairs_admin_insert on showcase_pairs
  for insert to authenticated
  with check (is_cardinal_admin());

drop policy if exists showcase_pairs_admin_update on showcase_pairs;
create policy showcase_pairs_admin_update on showcase_pairs
  for update to authenticated
  using (is_cardinal_admin()) with check (is_cardinal_admin());

-- A delete under RLS with no policy is a silent 204 — the row survives and the
-- caller sees success. This project has been bitten by that, which is why the
-- app also selects the id back on delete.
drop policy if exists showcase_pairs_admin_delete on showcase_pairs;
create policy showcase_pairs_admin_delete on showcase_pairs
  for delete to authenticated
  using (is_cardinal_admin());

-- ── Storage ───────────────────────────────────────────────────────────────
-- Showcase images live in the EXISTING private `photos` bucket under the
-- showcase/ prefix, so the app's existing signing path works unchanged and no
-- new bucket policy surface is created. Only admins may write there; any
-- signed-in team member may read, matching the table policies above.
drop policy if exists showcase_objects_read on storage.objects;
create policy showcase_objects_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like 'showcase/%');

drop policy if exists showcase_objects_admin_write on storage.objects;
create policy showcase_objects_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and name like 'showcase/%' and is_cardinal_admin());

drop policy if exists showcase_objects_admin_delete on storage.objects;
create policy showcase_objects_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and name like 'showcase/%' and is_cardinal_admin());
