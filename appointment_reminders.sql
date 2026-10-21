-- Build 1382: appointment reminder texts (Theo: "I need all the help remembering I can get").
-- APPLIED 21 Oct 2026 — do not treat as pending. Idempotent; safe to re-run.
--
-- api/appt-remind.js texts the people on an appointment about an hour before it starts.
-- reminded_for is the claim: the route writes the appointment's own 'YYYY-MM-DD HH:MM' into
-- it (only WHERE it still differs) BEFORE it texts, so two overlapping cron runs can never
-- text the same appointment twice — and moving an appointment to a new date or time makes
-- it differ again, so the new time gets its own reminder. No trigger needed: a trigger was
-- the first design, and CREATE TRIGGER hung on the live database (lock wait) three times.
-- reminded_at is when the claim was taken, for the record.

alter table public.appointments add column if not exists reminded_at timestamptz;
alter table public.appointments add column if not exists reminded_for text;

-- Left behind by the abandoned trigger design and unused: public.appointments_clear_reminder().
-- DROP FUNCTION hung the same way; drop it when the database is quiet:
--   drop function if exists public.appointments_clear_reminder();
--
-- Revert:
--   alter table public.appointments drop column if exists reminded_for;
--   alter table public.appointments drop column if exists reminded_at;
