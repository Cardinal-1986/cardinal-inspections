-- owner_ledger_schema.sql — Build 899
-- The Ledger (Owner Console, admin-only): money in motion that lives outside the
-- jobs — loans the owner has taken, sales draws advanced to reps, money the owner
-- has lent. Each account keeps a running balance derived from a dated transaction
-- log (running balance + payment history, Theo's choice).
--
--   owner_ledger        — the accounts. kind: 'borrowed' (you owe) | 'draw' (a rep
--                         owes you back) | 'lent' (someone owes you). party_type is
--                         just a tag. No principal column — the opening amount is
--                         the first 'advance' transaction, so the log is the single
--                         source of truth.
--   owner_ledger_txns   — the dated moves. direction 'advance' increases the balance
--                         (a new/bigger loan, another draw), 'payment' decreases it
--                         (a repayment / recouped draw). Balance = Σadvance − Σpayment.
--
-- Both is_cardinal_admin() RLS, same fence as the rest of the console. This is the
-- owner's private book — nothing here touches the customer-facing side. Idempotent;
-- apply BEFORE the index.html change.

create table if not exists public.owner_ledger (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'borrowed' check (kind in ('borrowed','draw','lent')),
  party       text not null,
  party_type  text not null default 'other' check (party_type in ('coworker','industry','bank','other')),
  note        text,
  opened_on   date,
  settled_at  timestamptz,
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table public.owner_ledger enable row level security;
drop policy if exists owner_ledger_admin on public.owner_ledger;
create policy owner_ledger_admin on public.owner_ledger
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());

create table if not exists public.owner_ledger_txns (
  id          uuid primary key default gen_random_uuid(),
  ledger_id   uuid not null references public.owner_ledger(id) on delete cascade,
  direction   text not null default 'payment' check (direction in ('advance','payment')),
  amount      numeric(12,2) not null default 0 check (amount >= 0),
  txn_date    date,
  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists owner_ledger_txns_ledger_idx on public.owner_ledger_txns(ledger_id);

alter table public.owner_ledger_txns enable row level security;
drop policy if exists owner_ledger_txns_admin on public.owner_ledger_txns;
create policy owner_ledger_txns_admin on public.owner_ledger_txns
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());
