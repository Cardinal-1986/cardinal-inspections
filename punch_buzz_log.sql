-- punch_buzz_log.sql — build 1255. Run BEFORE api/punch-buzz.js ships.
--
-- The scheduled punch buzzes (api/punch-buzz.js) claim a key here BEFORE they
-- send, so a retried or doubled cron run sends nothing twice:
--   am:<day>                     Theo's 7 am report
--   plan:<day>                   Curtis's 3 pm "Plan <day>"
--   crew:<day>:<email>           one person's 6 pm list
--   esc2:<day> / esc5:<day>      that morning's escalation buzz
--   esc2:<item id>:<due date>    a job escalated to Curtis (once per due date)
--   esc5:<item id>:<due date>    a job escalated to Theo   (once per due date)
--
-- Server-only: RLS on with NO policies, so only service_role (the cron) can
-- read or write it. Idempotent — safe to run twice.

create table if not exists public.punch_buzz_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.punch_buzz_log enable row level security;
