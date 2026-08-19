-- sales_floor_objections_928.sql  ·  build 928  ·  2026-08-19
-- ═══════════════════════════════════════════════════════════════════════════
-- ONE DECK, NOT TWO.
--
-- The Objection Coach reads `objections` from this database (27 cards, six
-- categories). The Sales Floor screen carried its OWN hardcoded 13 cards in
-- `cr-sf-script` — a second store of the same concept, which is this project's
-- most expensive recurring bug class. Build 928 removes the hardcoded wall from
-- the Sales Floor and makes that page a hub of portals; this migration is what
-- makes that deletion safe.
--
-- Ten of the thirteen were already covered by the database deck. SIX rows are
-- added here — the ones that would otherwise be LOST:
--
--   · a new "At the Door" category (3 cards). The database deck had NO
--     door-knock objections at all, which is precisely the gap Theo named:
--     "portal for door knocking with tips and objection handling". Sorted 1-3
--     so it leads the deck — it is the first conversation of the sale.
--   · three top-ups whose database neighbours are close but not the same
--     objection: "more than I expected" is not "higher than the other guy";
--     wear-and-tear is a different denial from partial-scope; "sleep on it"
--     is not "I need to think about it".
--
-- Wording is Theo's, carried across verbatim from the shipped Sales Floor.
--
-- IDEMPOTENT — every insert is guarded on the objection text, so re-running
-- this file changes nothing. Run it BEFORE the index.html change: the Door
-- Knocking screen reads the "At the Door" category from here.
-- (Deliberately additive. Nothing is updated or deleted; the 27 existing
--  cards are untouched, and `enabled` is left to the column default.)
-- ═══════════════════════════════════════════════════════════════════════════

insert into objections (category, objection, response, pro_tip, sort_order)
select v.category, v.objection, v.response, v.pro_tip, v.sort_order
from (values
  ('At the Door',
   'I already had someone look at it.',
   'Good — then you''ve got a second opinion coming for free. What did they tell you they found?',
   'Doesn''t fight the other contractor. Gets them talking, and most can''t answer specifically.',
   1),

  ('At the Door',
   'I''m not interested.',
   'Fair enough. I''m only knocking because the wind came through here on the 14th and I''ve pulled shingles off three roofs on this street. Two minutes and I''ll tell you if yours is fine.',
   'Gives a reason you''re there that isn''t about selling, and a defined end point.',
   2),

  ('At the Door',
   'My roof is fine, it doesn''t leak.',
   'Most of the ones I condemn don''t leak yet. By the time it''s inside, the deck is already gone. Storm damage shows on the surface a year or two before it shows on the ceiling.',
   'Reframes leaking as the last symptom, not the first.',
   3),

  ('Price & Value',
   'That''s more than I expected.',
   'Compared to what? If it''s another bid, let''s put them side by side — I''ll show you line for line where the difference is. Usually it''s the underlayment and the ventilation.',
   'Turns a number objection into a scope conversation, which you win.',
   14),

  ('Insurance & Storm',
   'The adjuster said it''s just wear and tear.',
   'That happens. Adjusters cover a lot of ground fast. I document each hit with a photo and the code section it violates, and we file a supplement. They approve them more often than people think.',
   'A denial is an opening position, not a verdict. Say so calmly.',
   25),

  ('Timing & Stalls',
   'Let me sleep on it.',
   'That''s fine. Can I ask — if you woke up tomorrow feeling good about it, what would have made the difference overnight?',
   'Surfaces the actual hesitation, which is almost never sleep.',
   35)
) as v(category, objection, response, pro_tip, sort_order)
where not exists (
  select 1 from objections o where o.objection = v.objection
);

-- Verify: expect 33 enabled cards across 7 categories, "At the Door" leading.
--   select category, count(*), min(sort_order)
--     from objections where enabled group by category order by min(sort_order);
