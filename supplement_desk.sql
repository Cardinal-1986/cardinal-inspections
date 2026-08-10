-- Build 667 — The Supplement Desk: insurance_supplements becomes THE supplement
-- system (CR-AUD-005), and the claim's single-slot columns become a MIRROR.
--
-- Theo's three-filings model, recorded verbatim in the build log (9 Aug 2026):
--   "we usually file a supplement because of a partial denial and then there's
--    the backend supplement and paid when incurred filing at end of job with
--    certificate of completion with photos sent for release of depreciation"
-- => filing_type: partial_denial | backend | pwi_coc.
--
-- ⚠ filing_type has NO DEFAULT on purpose. A default would stamp rows created
-- by the existing claims-screen CRUD with a type nobody chose — the
-- defaults-become-data class (BUG_CLASSES §, the ord_law checkbox). NULL means
-- "legacy/manual row"; the Desk always sets it explicitly.
--
-- ⚠ letter_html stores [[PHOTOS:<item id>]] TOKENS, never live URLs. Signed
-- URLs are minted at send time only, so nothing at rest expires or leaks.
--
-- THE MIRROR IS A TRIGGER, not client code — writer-agnostic on purpose: the
-- Desk AND the old claims-screen CRUD both keep the single-slot columns (and
-- therefore the AR/owed math in cr-ic-script) honest. It RECOMPUTES from all
-- rows on every change — idempotent, converges regardless of writer order.
-- Invoker rights (no SECURITY DEFINER): anyone who may update a supplement row
-- can already update its claim in practice; if RLS ever hides the claim from
-- the writer, the mirror update silently matches 0 rows rather than escalating.
--
-- Existing RLS on insurance_supplements verified via pg_policies before this
-- file was written and left UNTOUCHED (select via claim visibility; insert
-- own; update full-access-or-own; delete admin-or-own).
--
-- Idempotent. APPLIED to production via MCP on 10 Aug 2026, before the 667 PR.
-- Never served: .vercelignore blanket-excludes *.sql.

alter table public.insurance_supplements
  add column if not exists filing_type   text
    check (filing_type in ('partial_denial','backend','pwi_coc')),
  add column if not exists letter_subject text,
  add column if not exists letter_html   text,
  add column if not exists letter_doc_id uuid,
  add column if not exists sent_at       timestamptz,
  add column if not exists sent_to      text,
  add column if not exists responses    jsonb default '[]'::jsonb,
  add column if not exists scope_ref    jsonb;

comment on column public.insurance_supplements.items is
  'Desk item schema (enforced by supplement.html, not the DB): {id, item, why, '
  'basis:code|manufacturer|scope-consistency, pack_id, citation (ALWAYS copied '
  'server-side from the pack in api/supplement.js — never model text), qty, '
  'unit, qty_src:meas|model|manual, confidence, wants_photo, '
  'photos:[{path,caption}], included (false until a human ticks it), '
  'carrier:{decision,note,decided_at}, rebuttal}. The filing THREAD lives on '
  'this row: carrier decisions update items in place; a NEW row is only a new '
  'filing (backend, pwi_coc).';

comment on column public.insurance_supplements.filing_type is
  'Theo''s three filings: partial_denial (after Scope Approved, before build), '
  'backend (after the first settles), pwi_coc (end of job: certificate of '
  'completion + photos to release depreciation). NULL = legacy/manual row — '
  'NO default, so the old CRUD cannot stamp a type nobody chose.';

comment on column public.insurance_supplements.letter_html is
  'The drafted carrier letter with [[PHOTOS:itemid]] tokens. Signed image URLs '
  'are substituted at SEND time only; nothing stored here can expire or leak.';

-- ── the mirror ──────────────────────────────────────────────────────────────
create or replace function public.supp_mirror_to_claim(cid uuid)
returns void language plpgsql as $$
declare
  v_filed      numeric;
  v_approved   numeric;
  v_status     text;
  v_filed_at   date;
  v_decided_at date;
begin
  if cid is null then return; end if;
  select
    sum(coalesce(amount_requested,0)) filter (where status in ('submitted','approved','partial','denied')),
    sum(coalesce(amount_approved,0))  filter (where status in ('approved','partial')),
    case
      when count(*) filter (where status = 'submitted') > 0 then 'filed'
      else (array_agg(status order by responded_at desc nulls last, filed_at desc nulls last)
              filter (where status in ('approved','partial','denied')))[1]
    end,
    coalesce(min(filed_at) filter (where status = 'submitted'),
             max(filed_at) filter (where status in ('approved','partial','denied'))),
    max(responded_at)
  into v_filed, v_approved, v_status, v_filed_at, v_decided_at
  from public.insurance_supplements
  where claim_id = cid and status not in ('draft','withdrawn');

  -- supplement_notes deliberately untouched: it is a hand field (cr-sp's own).
  -- ⚠ The single-slot contract is NOT NULL with defaults — status 'none',
  -- filed 0, approved 0 (checked live via information_schema before this was
  -- written; the first draft wrote NULLs and the live trigger test failed on
  -- the 23502 before anything shipped). Speak the slot's own vocabulary.
  update public.insurance_claims set
    supplement_filed      = coalesce(v_filed, 0),
    supplement_approved   = coalesce(v_approved, 0),
    supplement_status     = coalesce(v_status, 'none'),
    supplement_filed_at   = v_filed_at::timestamptz,
    supplement_decided_at = v_decided_at::timestamptz,
    updated_at            = now()
  where id = cid;
end $$;

create or replace function public.supp_mirror_trigger()
returns trigger language plpgsql as $$
begin
  perform public.supp_mirror_to_claim(coalesce(new.claim_id, old.claim_id));
  -- a row moved between claims must recompute BOTH sides
  if tg_op = 'UPDATE' and new.claim_id is distinct from old.claim_id then
    perform public.supp_mirror_to_claim(old.claim_id);
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists supp_mirror on public.insurance_supplements;
create trigger supp_mirror
  after insert or update or delete on public.insurance_supplements
  for each row execute function public.supp_mirror_trigger();
