-- owner_reminders_schema.sql — Build 897
-- Quick Reminders for the Owner Console (admin-only). Standing or dated reminders
-- the owner keeps; repeating ones roll forward to their next occurrence when checked.
-- `notify` is reserved for a follow-up that will surface due reminders in the daily
-- digest — there is no UI toggle for it yet, so it always stays false for now.
-- is_cardinal_admin() RLS, same fence as owner_tasks / owner_items. Idempotent;
-- apply BEFORE the index.html change.

create table if not exists public.owner_reminders (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  remind_on   date,
  repeat      text not null default 'none' check (repeat in ('none','weekly','monthly','yearly')),
  notify      boolean not null default false,
  done_at     timestamptz,
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table public.owner_reminders enable row level security;
drop policy if exists owner_reminders_admin on public.owner_reminders;
create policy owner_reminders_admin on public.owner_reminders
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());
