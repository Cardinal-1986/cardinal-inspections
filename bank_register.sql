-- bank_register.sql — Build 1340
-- The Check Register (Owner Console, OWNER ONLY): every check, ACH and Zelle that
-- moved through Cardinal's Chase business checking, one row each, with the payer or
-- payee as written, a category, and — where it could be matched honestly — the CRM
-- job (project_id) and the crew (crew_id) it belongs to.
--
-- WHY A TABLE OF ITS OWN, and not rows in collections / crew_payments / commissions:
--   * collections has an AFTER INSERT trigger (commission_on_collection ->
--     make_commission()). Loading a year of bank history into it would mint a
--     commission for every historical check.
--   * collections and crew_payments drive live balances (AR, invoices, reminders,
--     the pay link). A bank import beside what the team already recorded by hand
--     would double-count every payment that was logged both ways.
--   This table is a mirror of the BANK, read beside those ledgers, never summed into
--   them.
--
-- WHO SEES IT: the owner only (theo@). It carries owner draws and the terms of a
-- member buyout, which the separation agreement keeps confidential (§3.1), so it is
-- deliberately narrower than is_cardinal_admin(). Widen the policy if Theo asks.
--
-- Data is loaded separately (import_key is unique, so a re-load is idempotent) and is
-- never committed to this repo: it names clients and amounts. Account numbers are
-- stored as LAST 4 only. Idempotent; apply BEFORE the index.html change.

create table if not exists public.bank_register (
  id            uuid primary key default gen_random_uuid(),
  txn_date      date not null,
  direction     text not null check (direction in ('in','out')),
  method        text not null check (method in ('check','ach','zelle','wire','card_batch','deposit')),
  check_no      text,
  amount        numeric(12,2) not null check (amount > 0),
  party         text not null,
  party_detail  text,
  memo          text,
  grp           text not null check (grp in ('received','people','sales','jerry','subs','other')),
  category      text not null,
  project_id    uuid references public.projects(id) on delete set null,
  crew_id       uuid references public.crews(id) on delete set null,
  account_last4 text check (account_last4 is null or account_last4 ~ '^[0-9]{4}$'),
  bank_ref      text,
  note          text,
  source        text not null default 'manual',
  import_key    text unique,
  created_by    text default auth.email(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists bank_register_date_idx    on public.bank_register(txn_date desc);
create index if not exists bank_register_project_idx on public.bank_register(project_id);
create index if not exists bank_register_crew_idx    on public.bank_register(crew_id);

alter table public.bank_register enable row level security;
drop policy if exists bank_register_owner on public.bank_register;
create policy bank_register_owner on public.bank_register
  for all
  using (auth.email() = 'theo@cardinalrenovations.net')
  with check (auth.email() = 'theo@cardinalrenovations.net');
