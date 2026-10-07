-- Build 1252 — who may assign and close punch work (Theo, 7 Oct 2026).
--
-- Theo: "Only me, Joan and Curtis can edit the assigned to, completion."
--
-- Before this, closing/reopening was open to is_production() OR is_admin()
-- (Curtis, Scottie, Theo, Joan) and the assignee was open to EVERY signed-in
-- user (punch_update is auth.role() = 'authenticated'). Now both are limited to
-- Theo, Joan and Curtis — "the punch bosses":
--   * UPDATE: changing assigned_to, or moving status to/from 'done', is refused
--     for anyone else (errcode 42501, a plain sentence the app shows).
--   * INSERT: a new punch item filed by anyone else may not carry an assignee or
--     arrive already done — it lands unassigned in the queue for Curtis.
-- Everything else stays open: anyone may still file a punch item, message on
-- it, add photos, flag it for follow-up (1250) or put it on hold (1249).
--
-- ⚠ Scottie can no longer close his own work. The app gives him a
-- "Tell Curtis it's finished" button in its place.
--
-- Idempotent: CREATE OR REPLACE for the function; the insert trigger is created
-- only if missing (no DROP — destructive statements stall the migration tool).
-- Revert: restore the previous body (is_production() or is_admin(), status only)
-- and drop trigger punch_boss_guard_ins on public.punch_items.

create or replace function public.is_punch_boss()
returns boolean
language sql
stable
as $$
  select (auth.jwt() ->> 'email') in (
    'theo@cardinalrenovations.net',
    'joan@cardinalrenovations.net',
    'curtis@cardinalrenovations.net'
  );
$$;

create or replace function public.punch_close_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if public.is_punch_boss() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.assigned_to is not null then
      raise exception 'Only Theo, Joan and Curtis can assign punch work. File it unassigned and Curtis will pick it up.'
        using errcode = '42501';
    end if;
    if new.status = 'done' then
      raise exception 'Only Theo, Joan and Curtis can close a punch item.'
        using errcode = '42501';
    end if;
    return new;
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    raise exception 'Only Theo, Joan and Curtis can change who a punch item is assigned to.'
      using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     and (new.status = 'done' or old.status = 'done') then
    raise exception 'Only Theo, Joan and Curtis can close or reopen a punch item.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'punch_boss_guard_ins'
                   and tgrelid = 'public.punch_items'::regclass) then
    create trigger punch_boss_guard_ins
      before insert on public.punch_items
      for each row execute function public.punch_close_guard();
  end if;
end $$;
