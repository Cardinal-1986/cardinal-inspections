-- team_profiles_self_edit.sql — audit finding 10 (23 Aug 2026, build 1023 arc)
--
-- PROBLEM. The Team Directory shows a teammate a pencil to edit THEIR OWN row
-- (index.html ~27031, shown when `mine`), but the only UPDATE policy on
-- public.team_profiles is `team admin update` (USING/WITH CHECK is_cardinal_admin()).
-- So a non-admin's save is refused by RLS after the UI said it saved —
-- confirm-then-silent-failure. Verified live: the four policies on the table are
-- admin insert / admin update / admin delete / select(is_staff), with no self row.
--
-- FIX. Add a self-row UPDATE policy so a teammate can maintain their own
-- name / title / phone / photo, WITHOUT being able to (a) change their role or
-- (b) move the row onto someone else's email. RLS WITH CHECK cannot see the OLD
-- row, so "role unchanged" is enforced by a BEFORE UPDATE trigger that pins role
-- (and email) for non-admins; admins keep full control through their own policy.
--
-- SAFE TO RE-RUN. Idempotent (drop-if-exists + create-or-replace). Applies ONLY
-- to public.team_profiles. No data is modified. Admin behaviour is unchanged.
--
-- REVERT:
--   drop trigger if exists team_profiles_guard_self on public.team_profiles;
--   drop function if exists public.team_profiles_guard_self();
--   drop policy  if exists "team self update" on public.team_profiles;

begin;

-- 1) A teammate may UPDATE only their own row, and cannot reassign it to another
--    email (the WITH CHECK keeps the row theirs after the edit too).
drop policy if exists "team self update" on public.team_profiles;
create policy "team self update" on public.team_profiles
  for update to authenticated
  using      (lower(email) = lower(my_email()))
  with check (lower(email) = lower(my_email()));

-- 2) Pin role + email for non-admins so the self policy can never escalate.
--    SECURITY INVOKER (default): is_cardinal_admin() already reads the request's
--    JWT claims, so it evaluates in the caller's context here.
create or replace function public.team_profiles_guard_self()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not is_cardinal_admin() then
    new.role  := old.role;   -- a teammate never changes their own role
    new.email := old.email;  -- ...and never moves the row
  end if;
  return new;
end;
$$;

drop trigger if exists team_profiles_guard_self on public.team_profiles;
create trigger team_profiles_guard_self
  before update on public.team_profiles
  for each row execute function public.team_profiles_guard_self();

commit;
