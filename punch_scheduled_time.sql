-- Build 882: give punch-outs a time-of-day alongside their scheduled date.
-- scheduled_at is a DATE column (day only); this adds an optional time so a
-- repair can be scheduled for e.g. "Aug 17 at 2:30 PM". Nullable, so every
-- existing punch item (date only, or unscheduled) is untouched. Existing RLS
-- on punch_items already covers the new column. Idempotent.
alter table public.punch_items add column if not exists scheduled_time time;
