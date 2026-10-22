-- Build 1387 housekeeping (Theo, 22 Oct: "5"). Run in the Supabase SQL editor.
-- appointments_clear_reminder() was left behind by build 1382: its CREATE TRIGGER hung, the claim-key
-- design (appointments.reminded_for) replaced it, and it has no trigger and no caller (checked 22 Oct:
-- pg_trigger 0 rows, no other function references it). Dropping it from this session's tool timed out
-- twice, so it ships as a file. Idempotent. Destructive only of an unused function.
drop function if exists public.appointments_clear_reminder();
