-- Build 1348: the 2nd TO. Only Theo or Joan (is_cardinal_admin) can move a job to Lost.
-- The app already turns a rep's "Mark Lost" into a request; this makes the database refuse
-- the write too, so no other screen or old app version can skip the review.
-- Safe to run more than once. Server-side jobs with no signed-in user (auth.uid() is null) pass.

create or replace function public.projects_lost_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage = 'Lost'
     and coalesce(old.stage, '') <> 'Lost'
     and auth.uid() is not null
     and not public.is_cardinal_admin() then
    raise exception 'Only Theo or Joan can mark a job Lost. Send it for a 2nd TO instead.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_lost_guard on public.projects;
create trigger projects_lost_guard
  before update of stage on public.projects
  for each row execute function public.projects_lost_guard();
