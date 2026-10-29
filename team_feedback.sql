-- Build 1411: the team feedback box (Menu -> Account -> Team Feedback).
-- Anyone on staff can send a report: something broke, something isn't working
-- right, or an idea. They see their own reports and Theo's reply. Admins see
-- every report and set its status. Idempotent; run BEFORE the index.html change.

create table if not exists public.team_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  text not null default public.my_email(),
  kind        text not null default 'broken',
  body        text not null,
  screen      text,
  project_id  uuid,
  build       text,
  status      text not null default 'new',
  reply       text,
  updated_at  timestamptz not null default now(),
  constraint team_feedback_kind_ck   check (kind in ('broken','not_right','idea')),
  constraint team_feedback_status_ck check (status in ('new','looking','done','wont')),
  constraint team_feedback_body_ck   check (length(btrim(body)) between 1 and 4000)
);

create index if not exists team_feedback_created_idx on public.team_feedback (created_at desc);

alter table public.team_feedback enable row level security;

-- the 1407 rule, for the new table: nobody outside Cardinal staff touches it
drop policy if exists staff_only_1407 on public.team_feedback;
create policy staff_only_1407 on public.team_feedback as restrictive for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists team_feedback_select on public.team_feedback;
create policy team_feedback_select on public.team_feedback for select to authenticated
  using (created_by = (select public.my_email()) or (select public.is_cardinal_admin()));

-- a report is always filed under the sender's own address, and always starts new
drop policy if exists team_feedback_insert on public.team_feedback;
create policy team_feedback_insert on public.team_feedback for insert to authenticated
  with check (created_by = (select public.my_email()) and status = 'new' and reply is null);

drop policy if exists team_feedback_update on public.team_feedback;
create policy team_feedback_update on public.team_feedback for update to authenticated
  using ((select public.is_cardinal_admin())) with check ((select public.is_cardinal_admin()));

drop policy if exists team_feedback_delete on public.team_feedback;
create policy team_feedback_delete on public.team_feedback for delete to authenticated
  using ((select public.is_cardinal_admin()));

revoke all on public.team_feedback from anon;
grant select, insert, update, delete on public.team_feedback to authenticated;
