-- Build 1250 — Flag for follow-up (Theo, 7 Oct 2026).
--
-- "If a client called and started yelling and saying I want to cancel the
-- job, the salesman can write a note, urgent. Then an exclamation can appear
-- in the punch list screen and get moved to the top for follow up."
--
-- Anyone signed in may raise the flag on a punch item (the existing
-- punch_update policy already allows every authenticated user to write a row;
-- nothing here widens or narrows it). The flag stays up — the item sits in
-- "Needs follow-up" at the top of the Punch List with a red ! — until someone
-- marks it Handled and says what they did. A flag is ACTIVE when ping_at is
-- set and ping_done_at is null. Raising a new flag clears the old answer.
--
-- Fields, not a status, for the same reason as punch_hold.sql: 64 places
-- compare status to 'open' / 'done'. The note and the answer are also written
-- into the card's message thread, so the history survives the next flag.
--
-- Additive and idempotent. Revert:
--   alter table public.punch_items drop column if exists ping_note, drop column if exists ping_by,
--     drop column if exists ping_at, drop column if exists ping_done_note,
--     drop column if exists ping_done_by, drop column if exists ping_done_at;

alter table public.punch_items add column if not exists ping_note      text;
alter table public.punch_items add column if not exists ping_by        text;
alter table public.punch_items add column if not exists ping_at        timestamptz;
alter table public.punch_items add column if not exists ping_done_note text;
alter table public.punch_items add column if not exists ping_done_by   text;
alter table public.punch_items add column if not exists ping_done_at   timestamptz;
