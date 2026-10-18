-- Build 1339 — money guards on `collections` (invoicing audit M11 + R9 + M7). Theo's pick, 14 Oct:
-- "cap payments to estimate total".
-- Apply BEFORE the build's code. Idempotent: every object is create-or-replace / drop-if-exists.
--
-- M11  A sales rep could record a payment of any size on their own job, which books their own
--      10% commission, and could not correct it afterwards (update = full access, delete = admin).
--      Now, for anyone who is NOT full access (Theo, Joan, Curtis are unchanged):
--        · the amount must be positive, and the job's payments may not exceed the job total;
--        · the job total is the server's own figure (api/pay.js owedOn, build 1336): a signed
--          contract (docs or the contracts table, whichever is more) + manual extras + signed change
--          orders; with no signed contract, the larger of the manual value and the ACCEPTED estimate,
--          + signed change orders;
--        · a job with no total yet refuses a rep payment — the office records it;
--        · the rep can fix or delete a payment THEY recorded for 48 hours, while its commission is
--          still pending. The existing commission triggers re-sync or remove the commission.
-- R9   `collections` RLS keyed on projects.sales_rep only, so a rep who is the job's assigned rep
--      (checklist lead.assigned) saw the job but a different balance from the office. Read and
--      insert now also accept the assigned rep — the same rule projects_select already uses.
-- M7   Refunds and disputes are written by api/pay-webhook.js with the service role as NEGATIVE
--      rows (type 'other', external_ref 'refund:<id>' / 'dispute:<id>'). Nothing here blocks
--      them: the guard only applies to signed-in non-full-access callers.

-- ⚠ 1366: SUPERSEDED by job_total_extras.sql (adds invoice extra lines, 1357). Re-running this file
--   alone would drop them again; run job_total_extras.sql after it.
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
      coalesce(sum(total) filter (where title ~* '^\s*change order' and signed_at is not null and total > 0), 0) as co_total
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
  select case
           when greatest(d.contract_total, t.table_total) > 0
             then greatest(d.contract_total, t.table_total) + coalesce(m.manual, 0) + d.co_total
           when greatest(coalesce(m.manual, 0), e.acc) > 0
             then greatest(coalesce(m.manual, 0), e.acc) + d.co_total
           else 0
         end
  from docs d cross join tbl t cross join est e left join man m on true;
$$;

create or replace function public.collections_rep_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total numeric;
  v_paid  numeric;
begin
  -- service role (webhook) and the office are not limited here
  if auth.role() = 'service_role' or is_full_access() then
    return new;
  end if;
  if new.amount is null or new.amount <= 0 then
    raise exception 'A payment must be more than $0.' using errcode = 'check_violation';
  end if;
  v_total := job_total_for(new.project_id);
  if coalesce(v_total, 0) <= 0 then
    raise exception 'This job has no signed contract or accepted estimate yet, so the office records this payment. Ask Theo or Joan.'
      using errcode = 'check_violation';
  end if;
  select coalesce(sum(amount), 0) into v_paid from collections
   where project_id = new.project_id and (tg_op = 'INSERT' or id <> new.id);
  if v_paid + new.amount > v_total + 0.01 then
    raise exception 'That is more than this job is owed ($% of $% is already paid). Ask Theo or Joan.',
      to_char(v_paid, 'FM999,999,990.00'), to_char(v_total, 'FM999,999,990.00')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists collections_rep_guard on public.collections;
create trigger collections_rep_guard
  before insert or update on public.collections
  for each row execute function public.collections_rep_guard();

-- R9 — the job's assigned rep reads its money too
drop policy if exists collections_select on public.collections;
create policy collections_select on public.collections for select
  using (is_full_access()
         or exists (select 1 from public.projects p
                     where p.id = collections.project_id
                       and (p.sales_rep = my_email() or project_assigned_rep(p.checklist) = my_email())));

drop policy if exists collections_insert on public.collections;
create policy collections_insert on public.collections for insert
  with check (is_full_access()
         or exists (select 1 from public.projects p
                     where p.id = collections.project_id
                       and (p.sales_rep = my_email() or project_assigned_rep(p.checklist) = my_email())));

-- M11 — a rep can correct their own payment for 48 hours while its commission is still pending
drop policy if exists collections_update on public.collections;
create policy collections_update on public.collections for update
  using (is_cardinal_admin() or (is_full_access() and created_by = my_email())
         or (created_by = my_email() and created_at > now() - interval '48 hours'
             and not exists (select 1 from public.commissions c
                              where c.collection_id = collections.id and c.status <> 'pending')))
  with check (is_cardinal_admin() or (is_full_access() and created_by = my_email())
         or (created_by = my_email() and created_at > now() - interval '48 hours'
             and exists (select 1 from public.projects p
                          where p.id = collections.project_id
                            and (p.sales_rep = my_email() or project_assigned_rep(p.checklist) = my_email()))));

drop policy if exists collections_delete on public.collections;
create policy collections_delete on public.collections for delete
  using (is_cardinal_admin()
         or (created_by = my_email() and created_at > now() - interval '48 hours'
             and not exists (select 1 from public.commissions c
                              where c.collection_id = collections.id and c.status <> 'pending')));

-- Revert — the policies as they stood before this file (read from production 14 Oct 2026):
--   drop trigger if exists collections_rep_guard on public.collections;
--   drop policy if exists collections_select on public.collections;
--   create policy collections_select on public.collections for select using (is_full_access()
--     or exists (select 1 from public.projects p where p.id = collections.project_id and p.sales_rep = my_email()));
--   drop policy if exists collections_insert on public.collections;
--   create policy collections_insert on public.collections for insert with check (is_full_access()
--     or exists (select 1 from public.projects p where p.id = collections.project_id and p.sales_rep = my_email()));
--   drop policy if exists collections_update on public.collections;
--   create policy collections_update on public.collections for update
--     using (is_cardinal_admin() or (is_full_access() and created_by = my_email()))
--     with check (is_cardinal_admin() or (is_full_access() and created_by = my_email()));
--   drop policy if exists collections_delete on public.collections;
--   create policy collections_delete on public.collections for delete using (is_cardinal_admin());
-- (older note:)
--   drop trigger if exists collections_rep_guard on public.collections;
--   then re-run collections_rep_insert.sql and the collections policies in commission_system.sql.
