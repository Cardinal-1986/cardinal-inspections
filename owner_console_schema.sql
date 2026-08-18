-- owner_console_schema.sql — Build 895
-- The Owner Console (admin-only): a daily owner's brief that lives outside any one customer.
-- Two tables, both fenced by is_cardinal_admin() — the same admin-only gate Studio and the
-- Supplement Desk use (role='admin', or theo@/joan@). Production and Sales never see these.
--
--   owner_tasks  — "Today's Top 10": a personal to-do list the owner keeps and checks off.
--   owner_items  — obligations & renewals the owner adds by hand (kind = 'obligation' | 'renewal').
--                  The recurring tax calendar (1040-ES, 1099-NEC, BWC true-up) is computed in
--                  the browser from a static config and needs no row here; this table is only
--                  for the custom deadlines the owner types in (insurance renewals, plates, etc.).
--
-- Idempotent. Apply BEFORE shipping the index.html change.

create table if not exists public.owner_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  note        text,
  done        boolean not null default false,
  done_at     timestamptz,
  position    integer not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table public.owner_tasks enable row level security;
drop policy if exists owner_tasks_admin on public.owner_tasks;
create policy owner_tasks_admin on public.owner_tasks
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());

create table if not exists public.owner_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'obligation' check (kind in ('obligation','renewal')),
  title        text not null,
  note         text,
  due_date     date,
  recur        text not null default 'once' check (recur in ('once','annual','quarterly')),
  remind       boolean not null default true,
  remind_days  integer not null default 14,
  done_at      timestamptz,
  created_by   text,
  created_at   timestamptz not null default now()
);

alter table public.owner_items enable row level security;
drop policy if exists owner_items_admin on public.owner_items;
create policy owner_items_admin on public.owner_items
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());
