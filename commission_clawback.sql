-- Build 1368 — a refund takes the commission back from the rep who earned it (invoicing audit M7; Theo, 18 Oct: "1A").
-- A refund is a NEGATIVE collections row (the office logs it with "This is a refund"). make_commission() already
-- writes 10% of the row, so a -$1,000 refund books a -$100 pending commission that nets against the rep's next
-- payout (api/commissions-digest.js sums pending + approved). Measured 18 Oct in a rolled-back transaction.
-- The one gap: it charged the job's CURRENT sales_rep. A job since unassigned (73 were, 18 Oct) has none, so the
-- refund clawed back from nobody; a reassigned job would charge the new rep for the old rep's sale.
-- Now a refund goes to the rep on the job's most recent positive commission, and only then to sales_rep.
-- Payments (positive rows) are unchanged. Stripe refunds are NOT wired (Theo: "2b" — the dashboard events stay off),
-- so the office records them by hand.
-- Theo, same day: "a checkbox where the refund may not take out of commission". collections.keep_commission marks a
-- refund the office chose NOT to charge back; the trigger books nothing for it.
-- Apply BEFORE the build's code. Idempotent: create or replace of one function, same signature; the triggers stay.

alter table public.collections add column if not exists keep_commission boolean not null default false;

create or replace function public.make_commission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rep  text;
  v_name text;
begin
  select sales_rep, name into v_rep, v_name from projects where id = new.project_id;

  -- 1368: the office ticked "Don't take it out of the rep's commission"
  if new.amount < 0 and coalesce(new.keep_commission, false) then
    return new;
  end if;

  -- 1368: a refund is charged to whoever was paid on this job, not whoever holds it now
  if new.amount < 0 then
    v_rep := coalesce((select c.rep_email from commissions c
                        where c.project_id = new.project_id and c.amount > 0
                        order by c.created_at desc limit 1), v_rep);
  end if;

  if v_rep is null or v_rep = 'theo@cardinalrenovations.net' then
    return new;
  end if;

  insert into commissions (collection_id, project_id, project_name, rep_email,
                           amount, rate_pct, basis, status, created_by)
  values (new.id, new.project_id, v_name, v_rep,
          round(new.amount * 0.10, 2), 10,
          case when new.amount < 0 then 'Taken back: 10% of a refund'
               else '10% of ' || new.type || ' collection' end,
          'pending', new.created_by)
  on conflict (collection_id) where collection_id is not null do nothing;

  return new;
end;
$$;

-- Revert: re-run the make_commission definition in commission_system.sql
--   (and, only if nothing uses it: alter table public.collections drop column keep_commission;).
