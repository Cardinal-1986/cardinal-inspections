-- drop_ai_estimates.sql — build 1033 (24 Aug 2026; Theo's pick, item 6: the AI arm "truly deleted")
--
-- WHY: `ai_estimates` backed the separate AI-Estimate builder (the ⚡ doors).
-- Build 1028 hid the doors and moved the AI inside the estimate editor; build
-- 1033 deletes the machinery — the views, the generator route (api/estimate.js),
-- and every reader (claims linked-card, cross-links, health check, consistency
-- check). The table has been empty throughout.
--
-- STATUS: NOT YET APPLIED — run this file by hand in the Supabase SQL editor
-- (the repo convention). The automated apply was declined because it alters
-- constraints on the live contracts and insurance_claims tables; the guard
-- below still refuses a non-empty table whenever it runs. 0 rows verified
-- 2026-08-24. The app stopped reading the table at build 1033 either way. Related columns deliberately KEPT because their
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
