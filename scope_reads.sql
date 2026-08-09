-- Build 665 — scope history (CR Audit GAP-2). One row per APPLIED scope read.
--
-- Why now, in Theo's own ordering: the reader works as of 660-663, and today a
-- re-read silently overwrites the previous approved figures — first_scope_* is
-- write-once and approved_* is last-write-wins, so scope #2-of-4 is
-- unrecoverable. This table is also the structural floor for the supplement
-- unification (CR-AUD-005, the three-filings model): filings need the scope
-- revisions they answer to.
--
-- What a row is: what the model extracted (the 24 SUMMARY fields — deliberately
-- NOT line items; the 660 decision that the PDF stays the single source of
-- granularity stands) plus what the human actually ticked, with the money
-- first-class for cheap display. ONE code path writes it: logScopeRead() in
-- index.html — two callers (the profile apply chain and the Claim Importer),
-- one insert site, asserted by harness_665.
--
-- RLS mirrors insurance_claims EXACTLY (read live from pg_policies before
-- writing this): full-access sees all, a creator sees their own, a project's
-- assigned rep sees their project's. Delete is admin-only.
--
-- Idempotent. APPLIED to production via MCP on 9 Aug 2026, before the 665 PR.

create table if not exists public.scope_reads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  text,
  claim_id    uuid references public.insurance_claims(id) on delete cascade,
  project_id  uuid,
  doc_name    text,
  extracted   jsonb,
  applied     jsonb,
  rcv         numeric,
  acv         numeric,
  depreciation numeric
);

comment on table public.scope_reads is
  'One row per applied Scope of Loss read (build 665). extracted = the model''s '
  'summary-field output; applied = the subset the human ticked. Header fields '
  'only, never line items — the PDF remains the source of granularity.';

create index if not exists scope_reads_claim_idx   on public.scope_reads (claim_id, created_at desc);
create index if not exists scope_reads_project_idx on public.scope_reads (project_id);

alter table public.scope_reads enable row level security;

drop policy if exists scope_reads_select on public.scope_reads;
create policy scope_reads_select on public.scope_reads for select
  using (
    is_full_access()
    or created_by = my_email()
    or exists (
      select 1 from projects p
      where p.id = scope_reads.project_id
        and project_assigned_rep(p.checklist) = my_email()
    )
  );

drop policy if exists scope_reads_insert on public.scope_reads;
create policy scope_reads_insert on public.scope_reads for insert
  with check (created_by = my_email() or created_by is null);

-- History is append-only by design: no UPDATE policy at all, so no row can be
-- rewritten after the fact — that is the entire value of an audit trail.
drop policy if exists scope_reads_delete on public.scope_reads;
create policy scope_reads_delete on public.scope_reads for delete
  using (is_admin());

-- Backfill: every claim that already carries a first scope gets one seed row,
-- so the history never starts empty on a claim that plainly had a read.
-- (Adam Gunn's is the one live case tonight.) Idempotent: only where no
-- history row exists for that claim yet.
insert into public.scope_reads
  (created_by, claim_id, project_id, doc_name, rcv, acv, depreciation, created_at)
select c.created_by, c.id, c.project_id,
       'backfill — first scope on record',
       c.first_scope_rcv, c.first_scope_acv, c.first_scope_depreciation,
       coalesce(c.first_scope_at::timestamptz, c.created_at, now())
from public.insurance_claims c
where c.first_scope_rcv is not null
  and not exists (select 1 from public.scope_reads r where r.claim_id = c.id);
