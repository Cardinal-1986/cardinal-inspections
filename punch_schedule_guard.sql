-- Build 1261 — who may schedule punch work (Theo, 8 Oct 2026).
--
-- Theo: "Only Theo Joan and Curtis can schedule punch work."
--
-- Build 1252 (punch_boss_guard.sql) made assigning and closing a punch item
-- the punch bosses' alone — public.is_punch_boss(): theo@, joan@, curtis@.
-- The DATE stayed open: RLS punch_update is auth.role() = 'authenticated', so
-- any signed-in user could move scheduled_at / scheduled_time. This adds the
-- schedule to the same trigger function, so one function still holds the
-- whole rule and both existing triggers (punch_boss_guard_ins on INSERT,
-- punch_close_guard on UPDATE) pick it up. No new trigger, no DROP.
--
-- For anyone who is not a punch boss:
--   * INSERT: a new punch item may not arrive with a date or a time. It files
--     undated and lands in the queue for Curtis (the "+ New" form stops
--     offering the fields at 1261).
--   * UPDATE: changing scheduled_at or scheduled_time is refused (42501, a
--     plain sentence the app shows), with TWO exceptions, both deliberate:
--       1. PUTTING IT ON HOLD. The hold (1249, Theo's pick 3C) moves the job to
--          its look-again day so it comes back in Today on that morning, and
--          1252 left holding open to everyone. A change whose result is "on
--          hold, scheduled for exactly the look-again day, no time" is that
--          and nothing else, so it passes.
--       2. AN OLDER APP CHECKING OUT. Before 1261 the card asked the crew "Back
--          on this tomorrow?" on check-out and sent the new date WITH the
--          closed visit, in one update. Refusing that would lose the visit
--          too. When a non-boss update moves the date AND changes visits, the
--          visit is kept and the date is quietly put back. 1261's card no
--          longer sends a date from a crew check-out at all; this only
--          protects phones that have not reloaded yet.
--
-- Bosses are untouched. Server code writes no punch_items rows (punch-buzz
-- only reads), so the service role never meets this rule.
--
-- REPLAYABLE (create or replace). Revert: re-run punch_boss_guard.sql's
-- function body, which is this one without the three 1261 blocks.

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
    /* 1261 */
    if new.scheduled_at is not null or new.scheduled_time is not null then
      raise exception 'Only Theo, Joan and Curtis schedule punch work. File it without a date and Curtis will schedule it.'
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
  /* 1261: the schedule */
  if new.scheduled_at is distinct from old.scheduled_at
     or new.scheduled_time is distinct from old.scheduled_time then
    if new.hold_reason is not null and new.hold_until is not null
       and new.scheduled_at = new.hold_until and new.scheduled_time is null then
      return new;                                   -- putting it on hold (1249)
    end if;
    if new.visits is distinct from old.visits then
      new.scheduled_at   := old.scheduled_at;       -- an older app's check-out:
      new.scheduled_time := old.scheduled_time;     -- keep the visit, not the date
      return new;
    end if;
    raise exception 'Only Theo, Joan and Curtis can change when punch work is scheduled.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;
