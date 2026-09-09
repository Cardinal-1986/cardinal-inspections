// api/pay.js — start a Stripe Checkout for what a shared document actually owes.
// GET /api/pay?t=<share_token>  → 303 redirect to hosted Stripe Checkout.
//
// The share token is the credential, exactly as in api/share.js / clientsign.js —
// this route is intentionally unauthenticated so a homeowner with the link can pay.
//
// ONE flow that follows the money the way the app does:
//   • an estimate / contract  → the DEPOSIT (estimates.deposit_amount)
//   • an invoice              → the live BALANCE DUE (signed-contract total − paid)
//
// ⚠ THE AMOUNT IS DERIVED SERVER-SIDE and never accepted from the client — a
// client can only choose WHETHER to pay what is owed, never how much. The
// resolver (owedOn) mirrors jobFinance()'s money model in index.html; KEEP IT
// IN SYNC with the identical copy in api/share.js (which renders the amount).
//
// Nothing is recorded here. A completed payment is written to `collections` by
// api/pay-webhook.js — the single money-writer, carrying the external_ref
// idempotency guard so a redelivered event can never double-charge the ledger.
//
// Needs STRIPE_SECRET_KEY + SUPABASE_SERVICE_ROLE_KEY (both server-only).
import Stripe from 'stripe';

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const TOKEN_RX = /^[a-f0-9-]{20,60}$/i;
const MIN_CENTS = 50;                    // Stripe's own floor ($0.50)
const MAX_CENTS = 100000 * 100;          // $100k ceiling — a data-error guard

// KEEP IN SYNC with api/share.js. Returns what is owed on THIS document, in
// cents, plus a human label — or { cents: 0 } when nothing is due.
/* 1199: FAIL CLOSED. Every lookup below used to be optional — `collected`
   started at 0 and only grew when the collections request happened to succeed,
   so one 503 on that request turned an $8,000 balance into a $10,000 checkout:
   a failed read of the payment history was indistinguishable from an empty
   payment history. Now any failed lookup throws LookupFailed, the caller says
   the balance could not be verified, and nobody is offered a number the ledger
   did not confirm. A failed read is never an empty ledger.
   KEEP IN SYNC: this class, readRows and owedOn are byte-identical in
   api/pay.js and api/share.js, and gate_1199 asserts it. */
class LookupFailed extends Error {
  constructor(what) { super('lookup failed: ' + what); this.code = 'LOOKUP_FAILED'; }
}
async function readRows(sbHeaders, what, url) {
  let r;
  try { r = await fetch(url, { headers: sbHeaders }); }
  catch (e) { throw new LookupFailed(what + ' unreachable'); }
  if (!r.ok) throw new LookupFailed(what + ' ' + r.status);
  return r.json();
}
async function owedOn(sbHeaders, rep) {
  const isInvoice = /^invoice/i.test(String(rep.title || '').trim());

  // money already collected on this job — a failed read throws, never reads as $0
  let collected = 0;
  for (const r of await readRows(sbHeaders, 'collections',
      `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount`)) {
    collected += Number(r.amount) || 0;
  }

  if (isInvoice) {
    // balance due = signed-contract total for the job − collected (jobFinance's
    // contracted-job case). Falls back to the invoice's own stored total.
    let contractTotal = 0;
    for (const r of await readRows(sbHeaders, 'inspection_reports',
        `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,total,signed_at`)) {
      if (/^contract/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) {
        contractTotal += Number(r.total);
      }
    }
    const jobTotal = contractTotal > 0 ? contractTotal : (Number(rep.total) || 0);
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };
  }

  // estimate / contract → the deposit (reachable via either the estimate doc or
  // the contract doc — estimates carries both doc_id and contract_doc_id)
  const est = (await readRows(sbHeaders, 'estimates',
      `${SUPABASE_URL}/rest/v1/estimates?or=(doc_id.eq.${rep.id},contract_doc_id.eq.${rep.id})&select=deposit_amount&limit=1`))[0];
  const deposit = Number(est && est.deposit_amount) || 0;
  return { cents: Math.round((deposit - collected) * 100), label: 'Deposit' };
}

export default async function handler(req, res) {
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sk  = process.env.STRIPE_SECRET_KEY;
  if (!srk || !sk) { res.status(500).send('Payments are not configured'); return; }

  const t = (req.query && req.query.t) || '';
  if (!TOKEN_RX.test(t)) { res.status(400).send('Invalid link'); return; }
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=id,project_id,project,title,total,signed_at&limit=1`,
      { headers: sbHeaders });
    if (!r.ok) throw new Error('lookup failed');
    const rep = (await r.json())[0];
    if (!rep) { res.status(404).send('This link is no longer available.'); return; }

    let owed;
    try { owed = await owedOn(sbHeaders, rep); }
    catch (e) {
      if (e && e.code === 'LOOKUP_FAILED') {
        /* 1199: the balance could not be verified. Say so and stop — never
           start a checkout for a number the ledger did not confirm. */
        res.setHeader('Retry-After', '120');
        res.status(503).send('We could not verify the balance on this document just now. '
          + 'Please open the link again in a few minutes.');
        return;
      }
      throw e;
    }
    const { cents, label } = owed;
    if (!(cents >= MIN_CENTS && cents <= MAX_CENTS)) {
      res.status(400).send('Nothing is currently due on this document.'); return;
    }

    // hosted Checkout — Stripe holds the card form, so no card data touches us
    const stripe = new Stripe(sk);
    const kind = /^invoice/i.test(String(rep.title || '').trim()) ? 'balance' : 'deposit';
    const name = String(rep.project || rep.title || 'Cardinal Roofing & Renovations').slice(0, 90);
    const back = `https://${req.headers.host}/api/share?t=${encodeURIComponent(t)}`;
    const meta = { kind, share_token: t, project_id: rep.project_id || '', report_id: rep.id };
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      /* 1151: ACH alongside card. On roofing money the fee difference is not
         cosmetic — card is 2.9% + 30c uncapped, a bank debit is 0.8% capped at
         $5, so a $12k deposit costs ~$348 on a card and $5 by ACH. Stripe
         Checkout collects the mandate for us_bank_account itself.
         ⚠ ACH does NOT settle at checkout: the session completes with
         payment_status 'unpaid' and the money arrives days later as
         checkout.session.async_payment_succeeded (or never, as
         async_payment_failed). api/pay-webhook.js handles both — do not add a
         delayed method here without checking that it still does. */
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: { name: `${label} — ${name}` }
        }
      }],
      success_url: `${back}&paid=1`,
      cancel_url:  `${back}&paid=0`,
      client_reference_id: rep.project_id || rep.id,
      metadata: meta,
      payment_intent_data: { metadata: meta }
    });

    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (err) {
    res.status(500).send('Could not start the payment: ' + ((err && err.message) || String(err)));
  }
}
