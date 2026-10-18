-- Build 1366 — the payment guard's job total counts invoice extra lines (invoicing audit M11 follow-up).
-- Build 1357 made an invoice's EXTRA lines (inspection_reports.extra_total) part of the job value in all four
-- places the app computes it: jobFinance() in index.html, owedOn() in api/pay.js and api/share.js, and
-- api/remind.js. job_total_for() — the figure collections_rep_guard (collections_guards.sql) holds a rep's
-- payments to — was written before 1357 and never learned it. So once an invoice carried extras, a rep recording
-- the payment that covers them would be refused "That is more than this job is owed". Measured 18 Oct: 0 invoices
-- carry extras yet, so nobody has hit it.
-- Same change also mirrors jobFinance() for a job priced ONLY by signed change orders (no contract, estimate or
-- manual value): its total is the change orders, not 0.
-- Apply BEFORE the build's code. Idempotent: create or replace of one function, same signature.

create or replace function public.job_total_for(pid uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  with docs as (
    select
      coalesce(sum(total) filter (where title ~* '^\s*contract' and signed_at is not null and total > 0), 0) as contract_total,
      coalesce(sum(total) filter (where title ~* '^\s*change order' and signed_at is not null and total > 0), 0) as co_total,
      -- 1366: an invoice's extra lines add to the job, like a signed change order (1357)
      coalesce(sum(extra_total) filter (where title ~* '^\s*invoice' and extra_total > 0), 0) as inv_extra
    from inspection_reports where project_id = pid
  ), tbl as (
    select coalesce(sum(total) filter (where homeowner_signed_at is not null and voided_at is null), 0) as table_total
    from contracts where project_id = pid
  ), est as (
    -- 1344: several ACCEPTED estimates add up (windows + siding)
    select coalesce(sum(total) filter (where status in ('accepted','signed') and not coalesce(archived, false) and total > 0), 0) as acc
    from estimates where project_id = pid
  ), man as (
    select coalesce(case when checklist ~ '^\s*\{' then nullif(checklist::jsonb ->> 'manual_value', '')::numeric end, 0) as manual
    from projects where id = pid
  )
  select (case
            when greatest(d.contract_total, t.table_total) > 0
              then greatest(d.contract_total, t.table_total) + coalesce(m.manual, 0)
            else greatest(coalesce(m.manual, 0), e.acc)
          end) + d.co_total + d.inv_extra
  from docs d cross join tbl t cross join est e left join man m on true;
$$;

-- Revert: re-run the job_total_for definition in collections_guards.sql.
