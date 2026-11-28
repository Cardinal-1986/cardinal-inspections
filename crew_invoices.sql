-- Build 1492 (27 Nov 2026) · Crew invoices + checks linked to them.
-- Theo: "There should be an invoiced section with stats but also a thumbnail pic that opens of the invoice"
--       "... somewhere we can also put checks".
-- Run BEFORE uploading index 1492. Schema only; the data move is a separate one-off file, kept outside the repo.
--
-- crew_invoices          what a crew BILLED (one row per invoice; original photo/PDF in private crew-docs)
-- crew_payment_invoices  which check paid which invoice(s), and how much of each
-- crew_payments.file_*   a photo of the check itself
-- Fence: same as crew_payments (is_cardinal_admin) — crew dollars are admin-only everywhere else.

create table if not exists public.crew_invoices (
  id             uuid primary key default gen_random_uuid(),
  crew_id        uuid not null references public.crews(id) on delete restrict,
  project_id     uuid references public.projects(id) on delete set null,
  invoice_number text,
  invoice_date   date,
  total          numeric(12,2) not null check (total >= 0),
  lines          jsonb not null default '[]'::jsonb,
  job_address    text,
  notes          text,
  file_bucket    text check (file_bucket is null or file_bucket = 'crew-docs'),
  file_path      text,
  file_name      text,
  source         text not null default 'manual' check (source in ('manual','reader','text_import','migrated')),
  -- auto = Open/Part/Paid from linked checks; paid_outside = paid with no check on file; unknown = not linked yet
  pay_status     text not null default 'auto' check (pay_status in ('auto','paid_outside','unknown')),
  created_by     text,
  created_at     timestamptz not null default now()
);
create index if not exists crew_invoices_crew_idx on public.crew_invoices(crew_id, invoice_date desc);
create index if not exists crew_invoices_proj_idx on public.crew_invoices(project_id);

create table if not exists public.crew_payment_invoices (
  payment_id uuid not null references public.crew_payments(id) on delete cascade,
  invoice_id uuid not null references public.crew_invoices(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  created_by text,
  created_at timestamptz not null default now(),
  primary key (payment_id, invoice_id)
);
create index if not exists crew_payment_invoices_inv_idx on public.crew_payment_invoices(invoice_id);

alter table public.crew_payments
  add column if not exists file_bucket text,
  add column if not exists file_path   text,
  add column if not exists file_name   text;
alter table public.crew_payments drop constraint if exists crew_payments_file_bucket_ck;
alter table public.crew_payments add constraint crew_payments_file_bucket_ck
  check (file_bucket is null or file_bucket = 'crew-docs');

alter table public.crew_invoices enable row level security;
alter table public.crew_payment_invoices enable row level security;

drop policy if exists crew_invoices_rw on public.crew_invoices;
create policy crew_invoices_rw on public.crew_invoices for all using (is_cardinal_admin()) with check (is_cardinal_admin());
drop policy if exists staff_only_1407 on public.crew_invoices;
create policy staff_only_1407 on public.crew_invoices as restrictive for all using ((select is_staff())) with check ((select is_staff()));

drop policy if exists crew_payment_invoices_rw on public.crew_payment_invoices;
create policy crew_payment_invoices_rw on public.crew_payment_invoices for all using (is_cardinal_admin()) with check (is_cardinal_admin());
drop policy if exists staff_only_1407 on public.crew_payment_invoices;
create policy staff_only_1407 on public.crew_payment_invoices as restrictive for all using ((select is_staff())) with check ((select is_staff()));
