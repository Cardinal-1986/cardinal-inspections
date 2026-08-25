-- drop_ai_estimates.sql — build 1033 (24 Aug 2026; Theo's pick, item 6: the AI arm "truly deleted")
--
-- WHY: `ai_estimates` backed the separate AI-Estimate builder (the ⚡ doors).
-- Build 1028 hid the doors and moved the AI inside the estimate editor; build
-- 1033 deletes the machinery — the views, the generator route (api/estimate.js),
-- and every reader (claims linked-card, cross-links, health check, consistency
-- check). The table has been empty throughout.
--
-- STATUS: ✅ APPLIED 25 Aug 2026, on Theo's explicit yes. Do not run again —
-- it is NOT idempotent (the two ALTER TABLE ... DROP CONSTRAINT lines have no
-- IF EXISTS and will error on a second run; that is deliberate, so a repeat
-- fails loudly rather than pretending). The guard refused a non-empty table
-- every time it ran; 0 rows verified 2026-08-24 and again immediately before
-- applying.
--
-- VERIFIED AFTER APPLYING, not assumed from a success flag: table gone, both
-- FKs gone, both trigger functions gone — AND the live tables unharmed, which
-- was the whole reason the automated apply was declined the first time.
-- contracts.source_ai_estimate_id and insurance_claims.ai_estimate_id both
-- still exist as columns; insurance_claims still holds its 5 rows and
-- estimates its 18. The security advisor's two orphan-trigger warnings
-- cleared (function_search_path_mutable went 21 -> 19); still zero
-- ERROR-level findings. The app stopped reading the table at build 1033 either way. Related columns deliberately KEPT because their
-- tables are live: insurance_claims.ai_estimate_id (0 non-null) and
-- contracts.source_ai_estimate_id (historical provenance).
--
-- REVERT (shape recorded from information_schema on 2026-08-24; the RLS
-- policies are not recorded — recreate to taste if it ever comes back):
--   create table public.ai_estimates (
--     id           uuid primary key default gen_random_uuid(),
--     created_at   timestamptz not null default now(),
--     updated_at   timestamptz not null default now(),
--     created_by   text not null,
--     project_id   uuid,
--     template     text not null,
--     description  text not null,
--     photo_urls   text[] not null,
--     estimate     jsonb not null,
--     status       text not null default 'draft',
--     model_used   text,
--     sent_at      timestamptz,
--     approved_at  timestamptz,
--     converted_at timestamptz,
--     contract_id  uuid
--   );

do $$
declare n bigint;
begin
  select count(*) into n from public.ai_estimates;
  if n > 0 then
    raise exception 'ai_estimates holds % row(s) — NOT dropping. Investigate first.', n;
  end if;
end $$;

-- the two FKs that reference the table are dropped BY NAME (never CASCADE):
-- the columns stay, they just stop pointing at a dropped table. Both are
-- all-NULL, verified above the drop date.
alter table public.contracts        drop constraint contracts_source_ai_estimate_id_fkey;
alter table public.insurance_claims drop constraint insurance_claims_ai_estimate_id_fkey;

drop table public.ai_estimates;

-- housekeeping while you are here (surfaced by the security advisor): the
-- trigger FUNCTIONS of the two retired tables outlive their tables — drop them.
drop function if exists public.tg_ai_estimates_touch();
drop function if exists public.touch_manual_est_updated_at();
