# Invoicing & A/R audit — 11 Oct 2026 (build 1312)

Asked by Theo: *"Can you audit the invoicing. Everything about it. Design, workflow, ease of use,
how it reflects the A/R all of it. Please be thorough."*

Four passes, all read-only: workflow code, A/R math (shipped functions extracted and executed in
node), live data (Supabase SELECTs only), and rendered design (Chromium, 390 + 1440, dark + light).
Items marked ✅ were re-checked by hand after the passes reported. Nothing was changed.

## Headline

1. **No invoice has ever been created.** `inspection_reports` holds 0 invoice-titled rows of 61 docs.
   `payment_reminders` is empty. The whole invoice → pay → remind chain has never run in production.
2. **The first invoice anyone sends will ask the client to SIGN it, not pay it.** ✅
   `INVOICE_TEMPLATE = buildEstimate(...)` (index.html ~10881) keeps the estimate's
   "Client Acceptance | Date" footer — `buildEstimate` strips `SIGN_FOOTER` only for
   AGREEMENT/CONTRACT (`isDeal`, when the body has `data-sig`) and WORK ORDER. `api/share.js:331`
   sees `SIGN_RX` match, shows **Accept & Sign**, and never reaches the pay bar. Rendered:
   `scratchpad/invaudit/share_phone.png`.
3. **A/R today = $14,006.73, all of it "30+ overdue", none of it invoiced.** Two jobs (Dan, Vandalyn)
   were moved to Invoiced by hand with no invoice and no signed contract; their value comes from
   estimates. Aging runs from the stage change (`t_Invoiced`), so un-billed work reads as overdue.
4. **$26,760 sits at Closed with $0 recorded paid** (Carl $12,000 — Completed→Invoiced→Closed in
   6 seconds on 10 Aug; Annette $14,760). A/R filters by stage, so it is invisible.
5. **Payments live in three ledgers and the app and server count them differently.**

## Money-wrong (fix first)

| # | Finding | Where | Proof |
|---|---|---|---|
| M1 | Invoice share link offers Accept & Sign, never Pay | `buildEstimate` ~10403–10419, `api/share.js:331` | ✅ code + render |
| M2 | Pay link / reminder texts use a different balance from the app: server = signed contract docs − `collections`; app (`jobFinance` ~17200) also adds `manual_value`, the `contracts` table, and legacy `checklist.payments` / `ws[].paid`. $20k contract + $5k legacy deposit → app says $15k, Stripe charges **$20k**. Contract + $2k manual extras → app $17k, Stripe $15k, then job shows $2k owed forever | `api/pay.js:55–77`, `share.js`, `remind.js:177–184` | ✅ code; executed |
| M3 | First `collections` row silently drops all legacy payments — `jobFinance` uses collections **or** legacy, never both. Live: Dan's $8,008.94 exists only in `checklist.payments` (not in collections, no commission, not in "Paid this month") | `jobFinance` ~17262 | executed + live data |
| M4 | Legacy money-in doors still live: Worksheet "Amount Collected" (~17447), Payments-page Add row defaulting to "Received" (~4955), `openContractPaid` (~15698) | | traced |
| M5 | Pending ACH does not stop a second full payment — `pay.js` never asks Stripe about processing payments; each Checkout fixes its amount at creation | `api/pay.js` | traced |
| M6 | Saving an invoice overwrites its `total` with BALANCE DUE (`#estTotal`); servers fall back to `rep.total` and subtract collections again | `saveCurrent` ~27372 | overwrite traced |
| M7 | Refunds/disputes never recorded — webhook ignores `charge.refunded`, `charge.dispute.*`; UI has no void/refund | `api/pay-webhook.js:71–79` | traced |
| M8 | Overpayment invisible — `paid` clamped to `value`; no cap in the pay modal; commission booked on the full amount | `jobFinance` ~17263, `savePayModal` ~90070 | executed |
| M9 | Community bid-only jobs: clamp makes paid = 0 when value = 0. Habitat $12k awarded, $6k collected → tile $12k, cc2 page $12k, profile $0, Invoices & AR omits it. True answer $6k | `jobFinance` clamp; `cr-ch2` ~63364; `cc2Page` ~65274 | executed |
| M10 | A failed collections read becomes an empty ledger in the app (`.catch(()=>[])`) — every Balance Due shows full contract. Server already fixed this at 1199 | ~11652 | traced |
| M11 | Reps can record unbounded payments that create their own 10% commission and can't correct them (update = full access, delete = admin) | `collections_rep_insert.sql`, `commission_system.sql:175–206` | traced |

## A/R reporting wrong

| # | Finding | Where |
|---|---|---|
| R1 | "Paid this month" is always $0 — `paidThisMonth()` reads `collected_at`, the cache selects only `project_id,amount` | ✅ ~89690 vs ~11316 |
| R2 | Home "Money Collected (30d)" sums `ws[].log`, whose only writer (`#acxPayBtn`) is no longer rendered | ~12005 / ~12876 |
| R3 | Three "who owes me" totals: Invoices & AR (any CRM, Invoiced **or** has invoice, Closed included), Home chart (Invoiced only, current board's CRM), Partner A/R (Community, bid fallback). Partner money is missing from Invoices & AR | ~89677, ~12071, ~63364 |
| R4 | Three aging clocks: `sent_at` → `t_Invoiced` → `pr.stage_since` (column does not exist; lives in checklist) → `updated_at` (resets on any edit) / home `t_Invoiced` / digest `stage_since` | ~89665, ~12071, `api/digest.js:115` |
| R5 | Three bucket sets: 0–14 / 15–30 / "30+" (actually 31+) · ≤30 / 31–60 / 61–90 / >90 · over-30 | |
| R6 | Closed with a balance: on Invoices & AR only if an invoice doc exists; with none, on no A/R surface at all | executed |
| R7 | A finished job (Completed, signed contract, no invoice) is not on Invoices & AR, so its "Create invoice" button never appears for the commonest case | `arList` |
| R8 | Insurance: AR marks depreciation-pending jobs OVERDUE at 31 days; Claims hub "owed depreciation" ignores collections; deductibles summed on Closed/paid claims | `cr-cth` ~61178 |
| R9 | Rep sees a different balance from admin when they can see a job but aren't its `sales_rep` (23/86 projects have no `sales_rep`; 2 differ from the assigned rep) — `collections` RLS keys on `sales_rep` only | `commission_system.sql:71` |

## Workflow gaps

- **W1** Only editor "Email to client" and "Mark sent" set `status:'sent'` + Invoiced. Company SMS, My phone, Copy, AR Text/Email leave it **Draft** → no aging date, `remind.js` (`status=eq.sent`) never reminds it, Home/Partner A/R never count it.
- **W2** Stage and money never reconcile: paid jobs stay Invoiced until closed by hand; re-sending moves a Closed job back to Invoiced (`setStage` has no forward guard, ~27640 / ~28343); reminders keep texting Closed jobs with a balance.
- **W3** The client sees the as-issued Balance Due next to the live pay amount; the live card (`wireInvoiceLive`) exists only in the editor and is stripped on save. No receipt is sent on payment.
- **W4** Double tap on Generate makes two invoices, both `#PO-1`; deleted numbers are reused; a $0-due invoice can be made on a paid job.
- **W5** Second offline payment in one session: the Save button stays "Saving…" disabled (~90087 / ~90051).
- **W6** Token mint failure is swallowed (`catch(_it){}` ~17437) → invoice with no token, `total` null.
- **W7** Community and insurance jobs get the retail invoice; Company SMS would text the occupant, not the partner; insurance invoice can bill the homeowner for carrier money.
- **W8** `api/sms-link.js` texts any `https?://` URL from the company number — not limited to the app's own share links.
- **W9** Production (Curtis, Scottie) see Billed/Collected/Balance on the client profile and can generate invoices and record payments. Whether "no money on Production" covers the profile is **Theo's call**.

## Design & ease of use

Passing, measured: nothing under 11px, every ink ≥ 4.5:1 both themes, no gradients, AR dashboard buttons 44px.

- **D1** The invoice is an estimate wearing an invoice title: "Estimate #", "Estimate Date", "Valid Through", Client Contact twice, empty PROPERTY PHOTO box, concealed-conditions change-order clause, "This estimate is valid…" acceptance paragraph, page title "— Estimate". (`invoice_doc_afterpay_desk.png`)
- **D2** Two balances on one invoice after a payment: live $9,800 card above a stored SUMMARY reading $14,800.
- **D3** Too many words for three things — Billed / Job Value / Contract Price; Collected / Paid / Payments Received; Balance / Balance Due / Current Balance Due / Amount due / Total outstanding; Invoices & AR / Accounts receivable / Partner A/R; Generate / Create invoice; Record payment / Record offline payment; Text link / Resend text / Company SMS / My phone; Sent / UNSENT / Mark sent. Proposed: **Total · Paid · Balance due · Create invoice · Send · Record payment · Invoices**.
- **D4** Oldest debt is at the bottom — Current renders first; on a phone the 45-day job is ~2,000px down.
- **D5** On a phone the Invoices & Payments card is ~1,300px below the money strip, under the 17-tile Job Menu; three separate money doors; "Balance Due" in the strip is not tappable.
- **D6** "Invoice created" shows as a red error-style toast, points to a Worksheet not on screen; the editor toolbar offers "Text to sign" on an invoice.
- **D7** Payment form: amount starts blank; Type always defaults to Deposit, even on a final payment.
- **D8** Buttons A broken: job card "Company SMS" red, editor "Save" red not Send, AR rows have no consistent main action ("Resend text" red even when never texted).
- **D9** 35px buttons on the job card and pay modal (floor is 44).
- **D10** "Paid in Full" shows Balance "--", not $0.
- **D11** Partner A/R tile lands on a list titled "All estimates".
- **D12** Five buttons per AR row wrap to 2–3 lines on a phone.

Tap counts today (phone, admin): send an invoice for a finished job **5 + scroll** (and impossible from Invoices & AR); record a check **4–5**; who owes me **0–1** (but three totals); chase the oldest **3 + ~4 screens of scrolling**. Target ~2 each.

## Live data snapshot (11 Oct)

86 projects: Lead 41 · Prospect 25 · Approved 11 · Completed 2 · Invoiced 2 · Closed 2 · Lost 2 · OnHold 1.
Invoices 0 · collections 1 row ($1,567.31 check deposit, Sarah) · contracts table 0 rows · signed contract docs 2 ·
payment_reminders 0 · Stripe payments 0. Stage timestamps out of order on 2 jobs (Betty at Completed with an older
`t_Invoiced`; Bob at Approved carrying `t_Completed`).

## Sound — checked and not bugs

Webhook signature verified on the raw body · idempotent on `external_ref` · ACH recorded only when paid ·
card fee kept out of the ledger · charge amount computed server-side · server reads fail closed (1199) ·
cents rounded · estimate-sourced value refused by `createInvoiceFor` and `canInvoice` · AR dashboard admin-gated ·
reminders fail OFF, STOP auto-mutes · one modal double-submit is blocked.

Screenshots: `/tmp/claude-0/…/scratchpad/invaudit/` (session scratchpad — not kept after the session).
