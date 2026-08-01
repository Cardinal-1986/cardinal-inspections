-- ═══════════════════════════════════════════════════════════════════════════
-- Crews — subcontractor directory, compliance vault, labor rates, work orders,
--         payments, notes.  Plus rep commissions on the client profile.
--
-- RUN THIS BEFORE DEPLOYING THE index.html THAT USES IT.
--
-- These are 1099 SUBCONTRACTOR crews. They are NOT `team_profiles`, which is
-- Cardinal's own W-2 staff and drives the employee Crew Board (build 373).
-- Two different kinds of people; deliberately two different tables.
--
-- The crew work order here is CARDINAL'S OWN document, issued to a crew.
-- It has nothing to do with the community work-order module
-- (projects.checklist.work_orders[]), which stays exactly as it is —
-- Theo: "I don't want to get into community work orders. This is a separate
-- crew work order that Cardinal gives to them."
-- ═══════════════════════════════════════════════════════════════════════════

-- ── who can see what, and why ──────────────────────────────────────────────
-- is_full_access()    theo, joan, curtis, scottie   (admins + production)
-- is_cardinal_admin() role='admin', plus theo/joan hardcoded  (security definer)
--
-- Production SCHEDULES crews, so they must see who is insured — otherwise the
-- compliance vault cannot do its job. Production must NOT see what Cardinal
-- pays a crew, or what a rep earns: that is margin. So rates, payments and
-- commissions are admin-only while the directory and the vault are not.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.crews (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                    -- what Theo calls them
  legal_name    text,                             -- what the W-9 says
  trade         text not null default 'Roofing',  -- drives the left-nav section
  contact_name  text,
  contact_phone text,
  contact_email text,                             -- NEVER guess this one
  address       text,
  notes         text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    text,
  updated_at    timestamptz not null default now()
);

-- The five nav sections Theo named, in his order. General Repairs last.
-- A whitelist, checked in the database: a typo'd trade would otherwise create a
-- silent sixth section that renders nowhere. Same discipline as normStage().
alter table public.crews drop constraint if exists crews_trade_ck;
alter table public.crews add constraint crews_trade_ck check (trade in
  ('Roofing','Siding','Windows','Gutters','General Repairs'));

comment on column public.crews.trade is
  'Left-nav section. Whitelisted — add a value here BEFORE any row is given it, '
  'or that crew renders in no section at all.';
comment on column public.crews.contact_email is
  'Never write an unverified address here. A work order sent to a guessed '
  'address is a work order nobody received.';

-- ── compliance vault ───────────────────────────────────────────────────────
create table if not exists public.crew_docs (
  id              uuid primary key default gen_random_uuid(),
  crew_id         uuid not null references public.crews(id) on delete cascade,
  kind            text not null check (kind in ('w9','gl','wc')),
  storage_path    text not null,                  -- bucket: crew-docs (private)
  file_name       text,
  issued_on       date,
  expires_on      date,                           -- null for a W-9: it does not expire
  policy_number   text,
  carrier         text,
  coverage_limits text,
  uploaded_at     timestamptz not null default now(),
  uploaded_by     text
);
create index if not exists crew_docs_crew_idx on public.crew_docs(crew_id, kind);
create index if not exists crew_docs_expiry_idx on public.crew_docs(expires_on)
  where expires_on is not null;

comment on table public.crew_docs is
  'W-9, general liability (gl) and workers comp (wc). NO EIN COLUMN ON PURPOSE — '
  'the number is on the W-9 PDF, which lives in a private bucket. A plain EIN '
  'column would be loose PII in a table several roles can read.';

-- ── labor rates: catalog items PLUS custom rows ────────────────────────────
create table if not exists public.crew_rates (
  id              uuid primary key default gen_random_uuid(),
  crew_id         uuid not null references public.crews(id) on delete cascade,
  pricing_item_id uuid references public.pricing_items(id) on delete cascade,
  custom_name     text,
  custom_unit     text,
  rate            numeric not null,
  updated_at      timestamptz not null default now(),
  updated_by      text,
  -- exactly one of the two: a catalog item, or a name of its own. Never both,
  -- never neither — otherwise a row renders blank and compares against nothing.
  constraint crew_rates_shape_ck check (
    (pricing_item_id is not null and custom_name is null) or
    (pricing_item_id is null     and custom_name is not null)
  )
);
create unique index if not exists crew_rates_item_uq
  on public.crew_rates(crew_id, pricing_item_id) where pricing_item_id is not null;
create index if not exists crew_rates_crew_idx on public.crew_rates(crew_id);

comment on table public.crew_rates is
  'What Cardinal PAYS this crew. pricing_items.rate is what Cardinal CHARGES, '
  'so the two together are the margin — which is why this table is admin-only '
  'while crews and crew_docs are not. A NULL pricing_item_id means a custom row '
  'that only this crew has.';

-- ── work orders Cardinal issues TO a crew ──────────────────────────────────
create table if not exists public.crew_work_orders (
  id           uuid primary key default gen_random_uuid(),
  wo_number    text unique,                       -- WO-1042, human-facing
  crew_id      uuid not null references public.crews(id) on delete restrict,
  project_id   uuid references public.projects(id) on delete set null,
  report_id    uuid references public.inspection_reports(id) on delete set null,
  status       text not null default 'draft'
                 check (status in ('draft','sent','in_progress','completed','void')),
  sent_via     text check (sent_via in ('email','print')),
  sent_at      timestamptz,
  sent_to      text,
  scope        text,
  amount       numeric,                           -- sum of its labor lines
  scheduled_on date,
  completed_on date,
  created_at   timestamptz not null default now(),
  created_by   text
);
create index if not exists crew_wo_crew_idx on public.crew_work_orders(crew_id, created_at desc);
create index if not exists crew_wo_project_idx on public.crew_work_orders(project_id);

comment on column public.crew_work_orders.report_id is
  'The generated document, stored in inspection_reports like every estimate and '
  'contract — so it reuses the existing editor, print path and api/senddoc. '
  'This table is the RECORD; that row is the RENDERING.';
comment on table public.crew_work_orders is
  'Cardinal''s own work order to a crew. NOT the community work-order module, '
  'which stays in projects.checklist.work_orders[] and is untouched.';

-- ── money OUT to a crew ────────────────────────────────────────────────────
create table if not exists public.crew_payments (
  id            uuid primary key default gen_random_uuid(),
  crew_id       uuid not null references public.crews(id) on delete restrict,
  work_order_id uuid references public.crew_work_orders(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  amount        numeric not null,
  method        text check (method in ('check','ach','cash','card','other')),
  reference     text,                             -- check number, ACH trace
  paid_on       date,
  memo          text,
  created_at    timestamptz not null default now(),
  created_by    text
);
create index if not exists crew_pay_crew_idx on public.crew_payments(crew_id, paid_on desc);

-- ── rep commissions, shown on the client profile ───────────────────────────
create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  rep_email   text not null,                      -- matches team_profiles.email
  amount      numeric not null,
  basis       text,                               -- 'x% of contract', flat, etc.
  status      text not null default 'pending'
                check (status in ('pending','approved','paid','void')),
  paid_on     date,
  method      text check (method in ('check','ach','payroll','other')),
  reference   text,
  memo        text,
  created_at  timestamptz not null default now(),
  created_by  text
);
create index if not exists commissions_project_idx on public.commissions(project_id);
create index if not exists commissions_rep_idx on public.commissions(rep_email, paid_on desc);

comment on table public.commissions is
  'Per-job commission, read two ways off one table: by project (the client '
  'profile section) and by rep (what Nick earned this quarter). A rep may read '
  'their OWN rows only — never another rep''s, and never crew_rates.';

-- ── notes ──────────────────────────────────────────────────────────────────
create table if not exists public.crew_notes (
  id      uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  body    text not null,
  at      timestamptz not null default now(),
  by      text
);
create index if not exists crew_notes_crew_idx on public.crew_notes(crew_id, at desc);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.crews            enable row level security;
alter table public.crew_docs        enable row level security;
alter table public.crew_rates       enable row level security;
alter table public.crew_work_orders enable row level security;
alter table public.crew_payments    enable row level security;
alter table public.commissions      enable row level security;
alter table public.crew_notes       enable row level security;

-- directory, vault, work orders, notes → admins + production
do $$
declare t text;
begin
  foreach t in array array['crews','crew_docs','crew_work_orders','crew_notes'] loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format(
      'create policy %I_rw on public.%I for all using (is_full_access()) with check (is_full_access())',
      t, t);
  end loop;
end $$;

-- rates and payments → admins only. This is margin and money.
do $$
declare t text;
begin
  foreach t in array array['crew_rates','crew_payments'] loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format(
      'create policy %I_rw on public.%I for all using (is_cardinal_admin()) with check (is_cardinal_admin())',
      t, t);
  end loop;
end $$;

-- commissions → admins write; a rep reads their own and nothing else
drop policy if exists commissions_admin on public.commissions;
create policy commissions_admin on public.commissions
  for all using (is_cardinal_admin()) with check (is_cardinal_admin());

drop policy if exists commissions_own on public.commissions;
create policy commissions_own on public.commissions
  for select using (rep_email = auth.email());

-- ═══ storage ═══════════════════════════════════════════════════════════════
-- Private, like the two buckets that already exist (photos, library).
insert into storage.buckets (id, name, public)
values ('crew-docs', 'crew-docs', false)
on conflict (id) do nothing;

drop policy if exists crew_docs_read on storage.objects;
create policy crew_docs_read on storage.objects for select
  using (bucket_id = 'crew-docs' and is_full_access());

drop policy if exists crew_docs_write on storage.objects;
create policy crew_docs_write on storage.objects for insert
  with check (bucket_id = 'crew-docs' and is_full_access());

drop policy if exists crew_docs_delete on storage.objects;
create policy crew_docs_delete on storage.objects for delete
  using (bucket_id = 'crew-docs' and is_cardinal_admin());

-- ═══ verification — run these after applying ═══════════════════════════════
-- select tablename, rowsecurity from pg_tables
--   where schemaname='public' and tablename like 'crew%' or tablename='commissions';
-- select tablename, policyname, cmd from pg_policies
--   where schemaname='public' and (tablename like 'crew%' or tablename='commissions')
--   order by tablename;
-- Then, signed in as a SALES rep, confirm:
--   select * from crew_rates;     -- must return 0 rows
--   select * from crew_payments;  -- must return 0 rows
--   select * from crews;          -- must return 0 rows (production/admin only)
