-- finance_plan_fees — Cardinal's Service Financial dealer fees, keyed by plan id.
-- Admin-only (is_cardinal_admin) at the RLS layer: the dealer fee is Cardinal's
-- cost and must never reach a rep screen or the public app file. Only the TABLE
-- and its policy live here; the fee VALUES are loaded directly into the database
-- (not committed to the repo), so the numbers exist only in Supabase.
create table if not exists public.finance_plan_fees (
  plan_id    text primary key,
  dealer_fee numeric(6,2) not null,
  updated_at timestamptz not null default now()
);

alter table public.finance_plan_fees enable row level security;

drop policy if exists finance_fees_admin_all on public.finance_plan_fees;
create policy finance_fees_admin_all on public.finance_plan_fees
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());
