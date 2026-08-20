-- 940 · check in / check out on a punch-out
--
-- Theo: "check in when he gets to the repair and check out if it doesn't get
-- completed that day and moves on to the next day."
--
-- One jsonb array on the row, matching the shape punch_items ALREADY uses for
-- comments, photos and steps. Deliberately not a punch_visits table: the punch
-- card saves the whole row through one chokepoint that routes to the offline
-- outbox, so a visit recorded at a house with no signal syncs later for free.
-- A second table would need its own read, its own RLS and its own offline
-- path — three new things to keep in step with the row they describe.
--
-- Each entry:
--   { "in":  "2026-08-20T13:40:00.000Z",   -- arrival, ISO
--     "out": "2026-08-20T18:05:00.000Z",   -- departure, or null while on site
--     "by":  "scottie@cardinalrenovations.net",
--     "name":"Scottie",
--     "day": "2026-08-20" }                -- LOCAL day, so "day 2" counts the
--                                          -- way a person counts days
--
-- No new RLS: visits ride the punch_items row policies unchanged.
-- Idempotent. Safe to re-run.

alter table punch_items
  add column if not exists visits jsonb not null default '[]'::jsonb;

comment on column punch_items.visits is
  'Check in / check out log. Array of {in,out,by,name,day}. out=null means still on site. Written only by the punch card via its single save() chokepoint.';
