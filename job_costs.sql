-- Build 1350 — what a job cost, and who is owed money back for it.
-- Theo, 16 Oct, after reviewing a rep's own CRM: a per-job cost sheet (material, labor, other;
-- contract − costs = gross profit) and expense reimbursement (who paid; Reimburse; Needs paid / Reimbursed).
-- Picked option B from the preview: costs join the Payments card as a Costs tab.
-- Apply BEFORE the build's code. Idempotent.
--
-- Who sees what:
--   office (is_full_access(): Theo, Joan, Curtis) — every cost on every job; edits, marks reimbursed, deletes.
--   anyone else — only the costs THEY entered, and they may enter one only:
--     on a job they can see, paid by themselves, not already reimbursed.
--   So a rep never sees a job's costs or margin, but sees their own receipts and whether they were paid back.
-- Nobody but the office can change a row after it is entered (no update policy for anyone else), so a rep
-- cannot mark their own receipt reimbursed. The creator may delete their own entry within 48 hours while
-- it is unpaid; the admin always.
--
-- Labor paid through Crews (crew_payments) is NOT copied here; the app reads it beside these rows.

create table if not exists public.job_costs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  kind           text not null default 'other' check (kind in ('material','labor','other')),
  description    text not null check (length(btrim(description)) > 0),
  amount         numeric(12,2) not null check (amount > 0),
  spent_on       date not null default current_date,
  paid_by        text not null default 'company',          -- 'company' or a teammate's email
  reimburse      boolean not null default false,
  reimbursed_at  timestamptz,
  reimbursed_by  text,
  notes          text,
  created_by     text not null default my_email(),
  created_at     timestamptz not null default now(),
  constraint job_costs_reimb_ck check (reimbursed_at is null or reimburse)
);
create index if not exists job_costs_project_idx on public.job_costs (project_id, spent_on desc);
create index if not exists job_costs_owed_idx on public.job_costs (paid_by) where reimburse and reimbursed_at is null;
alter table public.job_costs enable row level security;

drop policy if exists job_costs_select on public.job_costs;
create policy job_costs_select on public.job_costs for select
  using (is_full_access() or created_by = my_email());

drop policy if exists job_costs_insert on public.job_costs;
create policy job_costs_insert on public.job_costs for insert
  with check (
    created_by = my_email() and reimbursed_at is null and reimbursed_by is null
    and (is_full_access()
         or (paid_by = my_email()
             and exists (select 1 from public.projects p where p.id = job_costs.project_id))));

drop policy if exists job_costs_update on public.job_costs;
create policy job_costs_update on public.job_costs for update
  using (is_full_access()) with check (is_full_access());

drop policy if exists job_costs_rm on public.job_costs;
create policy job_costs_rm on public.job_costs for delete
  using (is_cardinal_admin()
         or (created_by = my_email() and reimbursed_at is null and created_at > now() - interval '48 hours'));

grant select, insert, update, delete on public.job_costs to authenticated;

-- Revert:
--   drop table if exists public.job_costs;   -- ⚠ destroys every cost entered
