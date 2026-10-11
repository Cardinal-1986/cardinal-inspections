-- 1297 · load-the-truck list (Theo's pick 5B, 10 Oct 2026)
--
-- What to bring for a punch-out, ticked off before the truck leaves. One jsonb
-- array on the row, the shape punch_items ALREADY uses for steps, photos,
-- comments and visits, so it rides the punch card's single save() chokepoint
-- and therefore the offline outbox. No new table, no new RLS.
--
-- Each entry:  { "t": "Step flashing, 10 pcs", "d": false, "by": null, "at": null }
--   t  — what to bring          d  — loaded on the truck
--   by — who ticked it (email)  at — when (ISO)
--
-- Additive only. Idempotent. Safe to re-run. Run BEFORE the 1297 index.html ships.

alter table punch_items
  add column if not exists truck jsonb not null default '[]'::jsonb;

comment on column punch_items.truck is
  '1297: load-the-truck list. Array of {t,d,by,at}. Written by the punch card (save chokepoint) and the route page tick.';
