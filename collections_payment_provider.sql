-- ═══════════════════════════════════════════════════════════════════════════
-- Record how a collection was paid, and carry the processor's own id
-- (payments feature — phase 1 groundwork)
--
-- Theo picked online deposits: a homeowner pays through the same secure share
-- link the app already sends, and the payment lands in `collections` — the
-- one money-in ledger (996). Two columns are needed for that, and they are
-- deliberately PROCESSOR-AGNOSTIC so the same schema serves Stripe now and
-- Chase Payment Solutions later without a second migration:
--
--   method        'card' | 'ach'  — null on every existing/hand-entered row,
--                 so nothing about today's manual entry changes. Free text on
--                 purpose, the same call commission_finance_source.sql made
--                 for finance_company: the set may grow, and a one-value
--                 lookup table would be the premature abstraction this
--                 project's doctrine warns against.
--
--   external_ref  the processor's payment id (Stripe PaymentIntent today,
--                 a Chase transaction id if the rail is swapped). Two jobs:
--                 reconciliation against the bank/processor statement, and —
--                 the load-bearing one — idempotency.
--
-- ⚠ WHY THE UNIQUE INDEX IS A MONEY GUARD, NOT A TIDINESS ONE.
-- Three commission triggers fire off this table — make_commission() AFTER
-- INSERT, sync_commission() AFTER UPDATE, unmake_commission() BEFORE DELETE.
-- A payment webhook is delivered MORE THAN ONCE by design (processors retry
-- until they see a 2xx), so without a uniqueness guard a single $2,000 deposit
-- could insert twice: two collection rows, two Balance-Due credits, and two
-- 10% commissions on money that came in once. The partial unique index makes
-- the second insert fail at the database, so the webhook can treat "already
-- recorded" as success. The guard lives here, at the ledger, not only in the
-- function that writes it — a second writer (Chase) must inherit it for free.
--
-- Idempotent. Applied BEFORE any index.html change, per the standing rule.
-- No RLS change: the browser never writes these columns; only the server-side
-- webhook (service role) does, and only the app reads them back.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.collections
  add column if not exists method text;

alter table public.collections
  add column if not exists external_ref text;

comment on column public.collections.method is
  'How the money arrived: ''card'' or ''ach'' for an online payment, null for a '
  'hand-entered collection. Free text on purpose — no migration to add a method.';

comment on column public.collections.external_ref is
  'The payment processor''s own transaction id (Stripe PaymentIntent, or a Chase '
  'transaction id if the rail is swapped). Reconciliation + webhook idempotency.';

-- The idempotency guard. Partial, so the many existing rows with a null
-- external_ref are unaffected and a second null is always allowed.
create unique index if not exists collections_external_ref_uidx
  on public.collections (external_ref)
  where external_ref is not null;
