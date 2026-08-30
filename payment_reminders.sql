-- payment_reminders.sql — Build 1156 (30 Aug 2026)
-- Automatic invoice payment reminders: AR arc "Build 3", the reminders half
-- (the ACH half shipped at 1151). Run BEFORE deploying the index.html/api
-- change, per the standing SQL-first rule.
--
-- One row per reminder SEND ATTEMPT by api/remind.js (the daily cron). The
-- cron writes with the service role — there is deliberately NO client
-- insert/update/delete policy: the browser only reads, and only as an admin
-- (the AR dashboard's "Reminded ×N · last <date>" line).
--
-- The mute switch is a real column on projects (not checklist jsonb) because
-- the cron must filter on it SERVER-SIDE with one query; the existing staff
-- update policies on projects already govern who can flip it (the toggle
-- ships on the admin-only AR view). It is also set automatically when a
-- number replies STOP (Twilio 21610), so an opted-out client is never retried.
--
-- Idempotent; safe to re-run.

create table if not exists public.payment_reminders (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  report_id  uuid,
  sent_at    timestamptz not null default now(),
  channel    text not null default 'sms' check (channel in ('sms','email')),
  sent_to    text,
  ok         boolean not null default true,
  detail     text
);

create index if not exists payment_reminders_project_idx
  on public.payment_reminders (project_id, sent_at desc);

alter table public.payment_reminders enable row level security;

drop policy if exists payment_reminders_admin_read on public.payment_reminders;
create policy payment_reminders_admin_read on public.payment_reminders
  for select using (public.is_cardinal_admin());

alter table public.projects add column if not exists reminders_muted boolean;
