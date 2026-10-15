-- crews_trades_masonry_plumbing.sql — Build 1340
-- Two new crew sections, Theo 15 Oct 2026: "Make masonry section, B and E make plumbing
-- section." crews_trade_ck is mirrored by THREE lists in index.html — TRADES (cr-crew-script),
-- WO_TRADES (work orders) and TRADE_ORDER (dispatch) — and all four grow together in this build.
-- Apply BEFORE the index.html change, or a Masonry crew renders in no section.
alter table public.crews drop constraint if exists crews_trade_ck;
alter table public.crews add constraint crews_trade_ck
  check (trade = any (array['Roofing','Siding','Windows','Gutters','General Repairs','Masonry','Plumbing']));
