-- second_rep_commission.sql — build 1408. The second rep earns the 10% on a job an owner holds.
--
-- WHY: Theo, 26 Oct 2026: "I'm paying Jacob 10% of total cost during the training." and
--   "I will never pay myself a commission." This is an exception to the settled 9 Aug rule
--   "No split commissions between 2 reps" — it is NOT a split: exactly one person earns on any collection.
--
-- THE PIPELINE (unchanged in shape, read 26 Oct 2026): collections AFTER INSERT -> make_commission() books ONE
--   `commissions` row per collection: round(collection.amount * 0.10, 2), rate_pct 10, status pending, for
--   projects.sales_rep. sync_commission() (amount edits) and unmake_commission() (deletes) key on collection_id
--   and never look at the rep, so they need no change. The BASE is each collection's amount — money actually
--   collected — not the contract price; collections_rep_guard caps a non-admin's collections at
--   job_total_for(), so a fully-paid job earns 10% of its total.
--
-- WHAT CHANGES: only the "who" in make_commission(). Today it returns (no commission) when sales_rep is null or
--   Theo. Now, in that case only, it pays the job's SECOND rep (checklist.lead.assigned[1]) when ALL hold:
--     - this is not a refund (a refund still charges whoever was last paid on the job, as 1368 does);
--     - the primary (assigned[0]) is not a commissioned rep (null, Theo, or anyone whose team_profiles role is not
--       'sales') — a rep-primary job is left exactly as today: primary only;
--     - the second rep differs from the primary, is in team_profiles with role 'sales', and is NOT Theo.
--   Theo is excluded BY EMAIL in every slot, as before ("I will never pay myself a commission").
--   A commissioned primary keeps the 10% whoever the second rep is (Theo as second changes nothing).
--
-- DEPLOY ORDER: run this (and second_rep_rls.sql) BEFORE the build 1408 index.html.
-- REVERT: re-run the make_commission() body from before this file (the 1368 version, commission_clawback.sql).

set lock_timeout = '3s';

create or replace function public.make_commission()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rep  text;
  v_name text;
  v_ck   text;
  v_a0   text;
  v_a1   text;
begin
  select sales_rep, name, checklist into v_rep, v_name, v_ck from projects where id = new.project_id;

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

  -- 1408: an owner-held job pays its SECOND rep (Theo, 26 Oct 2026: "I'm paying Jacob 10% of total cost during
  -- the training."). Never Theo, never a refund, never when the primary is itself a commissioned rep.
  if (v_rep is null or v_rep = 'theo@cardinalrenovations.net') and new.amount >= 0
     and v_ck is not null and v_ck <> '' then
    begin   -- a malformed checklist must never block the collection insert: no second rep, as before
      v_a0 := v_ck::jsonb #>> '{lead,assigned,0}';
      v_a1 := v_ck::jsonb #>> '{lead,assigned,1}';
    exception when others then
      v_a0 := null; v_a1 := null;
    end;
    if v_a1 is not null and v_a1 <> ''
       and v_a1 <> 'theo@cardinalrenovations.net'
       and v_a1 is distinct from v_a0
       and exists (select 1 from team_profiles where email = v_a1 and role = 'sales')
       and not exists (select 1 from team_profiles where email = v_a0 and role = 'sales'
                         and v_a0 <> 'theo@cardinalrenovations.net') then
      v_rep := v_a1;
    end if;
  end if;

  -- "I will never pay myself a commission." (Theo, 26 Oct 2026) — by email, in every slot.
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
$function$;

-- verify (run by hand, inside a transaction you roll back):
--   begin;
--   -- a Theo-held job with assigned = ["theo@…","jacob@…"]: insert a $1,000 collection -> one commission, jacob@, $100
--   -- a rep-held job (sales_rep = a sales rep) with jacob@ second -> the commission goes to the primary rep only
--   -- a Theo-held job with no second rep -> no commission (as before)
--   rollback;
