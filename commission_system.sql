-- ═══════════════════════════════════════════════════════════════════════════
-- Commission system — cash collections, auto-commissions, draws  (build 650)
-- Replaces memory-based commission tracking with a collection-driven system:
-- one row per check received, 10% auto-commission to the project's sales rep,
-- draws as loans against future commission, net payout = owed − outstanding.
--
-- EXTENDS the commissions table shipped in crews_schema.sql (build 556) —
-- it had 0 rows in production when this ran, so the added columns and the
-- auto-generation trigger change nothing retroactively. Status vocabulary
-- stays ('pending','approved','paid','void'); the UI shows 'pending' as
-- "Owed". Do NOT create a second commissions table.
--
-- Idempotent. Applied to production via Supabase MCP on 2026-08-09.
-- Deploy order: this file BEFORE the index.html build that uses it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · the sales rep on the job ────────────────────────────────────────────
-- One rep per project, set at creation, locked once money has been logged.
-- This is the COMMISSION rep. It coexists with checklist.lead.assigned
-- (the visibility assignment project_assigned_rep() reads): the UI prefills
-- one from the other, and the backfill below seeds it from the assignment —
-- but only for people who are actually sales (or Theo, whose projects earn
-- no commission), never for production staff who happen to be assigned.
alter table public.projects add column if not exists sales_rep text;

update public.projects
   set sales_rep = project_assigned_rep(checklist)
 where sales_rep is null
   and project_assigned_rep(checklist) in (
         select email from public.team_profiles where role = 'sales'
         union select 'theo@cardinalrenovations.net');

-- The commission rep must be able to see their own job even if the checklist
-- assignment later changes. Additive only — nobody loses visibility.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (is_full_access() or created_by = my_email()
         or project_assigned_rep(checklist) = my_email()
         or sales_rep = my_email());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (is_full_access() or created_by = my_email()
         or project_assigned_rep(checklist) = my_email()
         or sales_rep = my_email());

-- ── 2 · collections — one row = one check received ──────────────────────────
create table if not exists public.collections (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  collected_at date not null default current_date,
  amount       numeric(12,2) not null,
  type         text not null check (type in ('deposit','final','supplemental','pwi','other')),
  source       text check (source in ('insurance','homeowner','other')),
  notes        text,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists collections_project_idx on public.collections(project_id, collected_at desc);

comment on table public.collections is
  'Money in, one row per check: deposit, final, supplemental, PWI, other. '
  'Inserting one auto-creates the 10%% commission row for the project''s '
  'sales rep (trigger below). Theo''s own jobs create no commission.';

alter table public.collections enable row level security;

-- Admin + production log and edit money in; only admins delete; the job's
-- sales rep can READ the money on their own job (it is their commission basis).
drop policy if exists collections_select on public.collections;
create policy collections_select on public.collections for select
  using (is_full_access()
         or exists (select 1 from public.projects p
                     where p.id = project_id and p.sales_rep = my_email()));

drop policy if exists collections_insert on public.collections;
create policy collections_insert on public.collections for insert
  with check (is_full_access());

drop policy if exists collections_update on public.collections;
create policy collections_update on public.collections for update
  using (is_cardinal_admin() or (is_full_access() and created_by = my_email()))
  with check (is_cardinal_admin() or (is_full_access() and created_by = my_email()));

drop policy if exists collections_delete on public.collections;
create policy collections_delete on public.collections for delete
  using (is_cardinal_admin());

-- ── 3 · extend commissions (556) for auto-generation ────────────────────────
-- collection_id links the commission to the check that earned it.
-- project_name is denormalised on purpose: a rep''s My Earnings view must
-- name the job, and projects RLS hides jobs the rep is no longer assigned
-- to — a join would silently drop rows. Names are copied at creation time.
alter table public.commissions add column if not exists collection_id uuid references public.collections(id);
alter table public.commissions add column if not exists rate_pct     numeric;
alter table public.commissions add column if not exists paid_by      text;
alter table public.commissions add column if not exists project_name text;

-- One commission per collection, ever — the trigger cannot double-fire into
-- a duplicate and a re-run cannot double-pay.
create unique index if not exists commissions_collection_uq
  on public.commissions(collection_id) where collection_id is not null;

-- ── 4 · draws — cash advances against future commission ─────────────────────
-- project_id is NULLABLE: a draw is usually taken against a specific job but
-- may be a general advance (settled decision candidate — spec question 1).
create table if not exists public.draws (
  id           uuid primary key default gen_random_uuid(),
  rep_email    text not null,
  project_id   uuid references public.projects(id) on delete set null,
  project_name text,
  amount       numeric(12,2) not null,
  status       text not null default 'outstanding' check (status in ('outstanding','repaid')),
  paid_at      date not null default current_date,
  paid_by      text,
  repaid_at    date,
  notes        text,
  created_at   timestamptz not null default now(),
  created_by   text
);
create index if not exists draws_rep_idx on public.draws(rep_email, status);

comment on table public.draws is
  'Loans against future commission. Logged by Theo only. Net payout = owed '
  'commissions minus outstanding draws; marking a draw repaid records the '
  'deduction — commission amounts are never mutated.';

alter table public.draws enable row level security;

drop policy if exists draws_admin on public.draws;
create policy draws_admin on public.draws
  for all using (is_cardinal_admin()) with check (is_cardinal_admin());

drop policy if exists draws_own on public.draws;
create policy draws_own on public.draws
  for select using (rep_email = auth.email());

-- ── 4b · default the rep at creation, for EVERY creation path ───────────────
-- The client creates projects from six different screens (New Lead, estimates
-- quick-create, community bid, scope importer, AccuLynx, quick inspection).
-- Defaulting here covers all of them without touching any: the checklist
-- assignment wins when it is a sales person (or Theo — his jobs are marked,
-- not paid), else a sales-role creator gets their own lead.
create or replace function public.default_sales_rep()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v text;
begin
  if new.sales_rep is not null then return new; end if;
  v := project_assigned_rep(new.checklist);
  if v is not null and (v = 'theo@cardinalrenovations.net' or exists
       (select 1 from team_profiles where email = v and role = 'sales')) then
    new.sales_rep := v;
  elsif new.created_by is not null and exists
       (select 1 from team_profiles where email = new.created_by and role = 'sales') then
    new.sales_rep := new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists sales_rep_default on public.projects;
create trigger sales_rep_default
  before insert on public.projects
  for each row execute function public.default_sales_rep();

-- ── 5 · the trigger — collection in, commission out ─────────────────────────
-- SECURITY DEFINER is load-bearing: production users (curtis@, scottie@) may
-- log collections but have no write policy on commissions — an invoker-rights
-- trigger would be blocked by RLS and the whole insert would fail.
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

  -- No rep assigned, or an owner job: no commission row. ('No commission —
  -- owner project' is rendered by the UI, not stored.)
  if v_rep is null or v_rep = 'theo@cardinalrenovations.net' then
    return new;
  end if;

  insert into commissions (collection_id, project_id, project_name, rep_email,
                           amount, rate_pct, basis, status, created_by)
  values (new.id, new.project_id, v_name, v_rep,
          round(new.amount * 0.10, 2), 10,
          '10% of ' || new.type || ' collection', 'pending', new.created_by)
  on conflict (collection_id) where collection_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists commission_on_collection on public.collections;
create trigger commission_on_collection
  after insert on public.collections
  for each row execute function public.make_commission();

-- Editing a collection amount re-syncs its commission — but only while the
-- commission is still pending. A paid commission is locked; Theo reconciles
-- by hand (spec edge case 2). Rep changes on the project do not retro-move
-- already-created commissions (spec edge case 9).
create or replace function public.sync_commission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.amount is distinct from old.amount or new.type is distinct from old.type then
    update commissions
       set amount = round(new.amount * 0.10, 2),
           basis  = '10% of ' || new.type || ' collection'
     where collection_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists commission_sync_on_collection on public.collections;
create trigger commission_sync_on_collection
  after update on public.collections
  for each row execute function public.sync_commission();

-- Deleting a collection takes its PENDING commission with it, but refuses
-- while a PAID commission points at it — paid history is never destroyed.
create or replace function public.unmake_commission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from commissions
              where collection_id = old.id and status = 'paid') then
    raise exception 'This collection has a PAID commission. Reverse the payment first.';
  end if;
  delete from commissions where collection_id = old.id;
  return old;
end;
$$;

drop trigger if exists commission_unmake_on_collection on public.collections;
create trigger commission_unmake_on_collection
  before delete on public.collections
  for each row execute function public.unmake_commission();

-- ── 6 · the sales-rep lock ──────────────────────────────────────────────────
-- Once money has been logged, only an admin can move the rep. Cheap on the
-- hot path: the collections lookup only runs when sales_rep actually changes.
create or replace function public.guard_sales_rep()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.sales_rep is distinct from old.sales_rep
     and not is_cardinal_admin()
     and exists (select 1 from collections where project_id = new.id) then
    raise exception 'Sales rep is locked after the first collection. Ask Theo.';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_rep_lock on public.projects;
create trigger sales_rep_lock
  before update of sales_rep on public.projects
  for each row execute function public.guard_sales_rep();
