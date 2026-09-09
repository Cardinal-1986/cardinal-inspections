# The 9 September 2026 external CRM assessment — reconciled

*An outside review of the CRM at build 1198 (`0aec50e`), brought by Theo, checked against this
clone, argued through two rebuttal rounds, and acted on at build 1199. This file is the record of
what survived, what was withdrawn, and what is still Theo's to decide. The reviewer's own files
(`CardinalCRMAssessment.md`, the rebuttal review, the prevalence query) live on Theo's machine.*

## What the reviewer got right, and what 1199 did about it

| # | Finding | Verified here | Status |
|---|---|---|---|
| 1 | A failed collections read is treated as "$0 collected", so a 503 turns an $8,000 balance into a $10,000 checkout (`api/pay.js`) | **Confirmed**, and the byte-identical twin in `api/share.js` (the file's own "KEEP IN SYNC" note) had the same fault, which the review missed | **Fixed in 1199** — any failed lookup throws; the pay route answers 503 + `Retry-After` with no session; the share page shows *Balance check unavailable*; the resolver is asserted identical in both files |
| 2 | The CRM and the checkout can disagree on the balance (manual extras; legacy worksheet payments with no collections rows) | **Confirmed by construction** — `jobFinance()` adds `manual_value` and honours legacy paid; the server resolver does neither | **Held — measure first** (aggregate counts, Theo's authorization). The correction is two additive server-side reads, not a shared-definition refactor. OPEN_ITEMS #1 |
| 3 | The old conversion route returns an existing contract before checking project access | **Confirmed**, plus: the assignment check read a property off a serialized JSON string, so assigned reps were always refused. **And the route is dead in production** — its `select` names `client_name` and `estimate`, columns `projects` has never had (no migration; the client column is `name`), so every call 404s first. No caller in the app | **Fixed in 1199 as insurance** (authorize first; parse the checklist). **Retirement is held** — a deletion. OPEN_ITEMS #3 |
| 4 | Cleared ACH payments are recorded as card payments (`api/pay-webhook.js`) | **Confirmed** — `method: 'card'` and the card note were hardcoded for both recording events | **Fixed in 1199** — method by event type: `async_payment_succeeded` → `ach` |
| 5 | Google Maps loads before sign-in | **Confirmed on the second round.** My first read ("`loadMaps()` is lazy") was wrong at the wrong level: the body-observer scanner attached autocomplete to every address-shaped input on sight, hidden ones included — six sit behind the sign-in screen | **Fixed in 1199** — fields are armed and attach on first focus; an already-focused field attaches at once |
| 6 | The sign-in placeholder says `cardinalroofing.com`; the API's roster domain is `cardinalrenovations.net` | Confirmed | **Fixed in 1199** |
| 7 | `index.html` is 5.51 MB, 1.64 MB transferred; the sign-in logo is 1.14 MB; Chart.js and PapaParse load up front | Confirmed to the byte. **The 1.64 MB is Vercel's real `br` response** (1,637,693 bytes; gzip 1,661,443) — my rebuttal that it "must be gzip" was wrong, because the doc set's 1.1 MB figure (build 729) was a *local* Brotli measurement that never touched Vercel | Logo and script deferral **held** (visual / regression-risk builds). OPEN_ITEMS #2, #4, #6 |

## What was withdrawn or corrected on the reviewer's side

- **The numeric ratings** (reliability 5, ease of use 6, performance 6) — withdrawn: no signed-in
  walkthrough was done, and one performance score hid the fresh-vs-cached difference (their cached
  re-run: 0.99 s load, 0.53 s LCP, against 16.17 s fresh on the same slow profile).
- **The CI framing** ("green CI intentionally permits recorded failures") — conceded: the baseline is
  by name, ratcheted so it may fall and never grow, self-tested, and the gates job has zero baseline.
- **Defect 3's "high" priority** — conceded, and further reduced by the dead-route finding.
- **The usability items that argued with settled decisions** (separate Studio / Visualizer /
  Showroom, "Cardinal Truth", the login clock and quotation) — reframed as optional clarity notes,
  not defects. The placeholder was the one concrete item, and it is fixed.

## What was corrected on this side

- **Compression.** Production ships ~1.64 MB whether `br` or gzip. Encoding is not a lever; source
  size is. The build-log 729 figure describes a local ideal.
- **Maps at boot.** Real, for the reason above.
- **"Downloads no document at all" on a cached launch** was too absolute: the worker serves `/` from
  cache and revalidates in the background. The practical benefit stands.

## The order agreed, and where it stands

1. Fail-closed pay routes + ACH label — **shipped, 1199**
2. Measure billing-parity exposure — **Theo's go on the read**
3. Logo + Maps initialization — **Maps shipped, 1199; logo held for a preview**
4. Obsolete route — **auth fixed; retirement held**
5. Real staff journeys per portal — **not started; the reviewer's own recommendation**

## Two rig facts for the next session

- The npm registry is unreachable from the cloud container (403 direct and via proxy); the global
  Playwright works. `gate_1199` drives the shipped API modules by stripping their SDK imports and
  passing stubs — copy that shape when the SDK is not installable.
- The Supabase connector's schema read was refused by the permission classifier; a data read for
  OPEN_ITEMS #1 needs Theo's explicit authorization, aggregate counts only.
