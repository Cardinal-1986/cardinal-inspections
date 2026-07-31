-- companycam_projects.sql — project names for the photo index.
-- Run BEFORE deploying the index.html change. Idempotent, additive.
--
-- WHY. The first sync indexed 60,485 photos and proved the thing the caption
-- search was built on does not exist here: only 79 photos carry a caption,
-- 0.13%, consistent across every year. Nobody captions in CompanyCam.
--
-- But three fields ARE fully populated on all 60,485 — project_id, creator_name
-- and captured_at, across 775 distinct jobs. The index stores the project ID and
-- not its NAME, so searching "Habitat" finds nothing even though every photo
-- knows which job it belongs to. This closes that, with no AI involved.

create table if not exists companycam_projects (
  id            text primary key,          -- CompanyCam project ids are STRINGS
  name          text,
  address       text,                      -- flattened one-liner, for search
  status        text,
  cc_created_at timestamptz,
  synced_at     timestamptz not null default now()
);

comment on table companycam_projects is
  'CompanyCam project names for the photo index. Filled by api/companycam-sync.js action=projects.';

-- Denormalised onto the photo so search stays a single-table query. Kept in step
-- by the sync, which runs one UPDATE ... FROM after the project pass; a rename
-- in CompanyCam is picked up on the next project sync rather than needing a
-- rewrite of all 60k photo rows on every edit.
alter table companycam_photos add column if not exists project_name text;
alter table companycam_photos add column if not exists project_address text;

-- One index over caption AND project name AND address, so a single query reaches
-- all three. Replaces the caption-only index, which could only ever match 79
-- photos out of 60,485.
drop index if exists companycam_photos_fts;
create index if not exists companycam_photos_fts on companycam_photos
  using gin (to_tsvector('english',
    coalesce(description,'') || ' ' ||
    coalesce(project_name,'') || ' ' ||
    coalesce(project_address,'') || ' ' ||
    coalesce(creator_name,'')));

create index if not exists companycam_photos_project on companycam_photos (project_id);

alter table companycam_projects enable row level security;

drop policy if exists companycam_projects_admin_read on companycam_projects;
create policy companycam_projects_admin_read
  on companycam_projects for select
  using (is_cardinal_admin());

-- No write policies, deliberately: the service role writes, absent policies deny,
-- so no browser session can forge a row. Same rule as companycam_photos.
