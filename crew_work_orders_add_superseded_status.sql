-- Build 844: re-crewing marks the prior work order 'superseded' so the Crew Dispatch
-- grid (and the client profile) stop drawing it, without deleting history.
-- APPLIED to production (project yipslubcptjoarblzbpl) 2026-08-16 via Supabase before the
-- index.html change, per the SQL-first rule. Idempotent.
ALTER TABLE crew_work_orders DROP CONSTRAINT IF EXISTS crew_work_orders_status_check;
ALTER TABLE crew_work_orders ADD CONSTRAINT crew_work_orders_status_check
  CHECK (status = ANY (ARRAY['draft','sent','in_progress','completed','void','superseded']::text[]));
