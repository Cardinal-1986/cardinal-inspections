// api/pay.js — start a Stripe Checkout for a document's DEPOSIT.
// GET /api/pay?t=<share_token>  → 303 redirect to hosted Stripe Checkout.
//
// PHASE 1: card, deposit only. The share token is the credential, exactly as
// in api/share.js and api/clientsign.js — this route is intentionally
// unauthenticated so a homeowner with the link can pay.
//
// ⚠ THE AMOUNT IS DERIVED SERVER-SIDE and never accepted from the client.
// It comes from the estimate linked to the shared document (estimates.doc_id →
// inspection_reports.id → estimates.deposit_amount). A client cannot choose
// what to pay, only whether to pay the deposit that is actually due.
//
// Nothing is recorded here. A completed payment is written to `collections` by
// the webhook (api/pay-webhook.js, next), which is the single money-writer and
// carries the idempotency guard (collections.external_ref unique).
//
// Needs STRIPE_SECRET_KEY + SUPABASE_SERVICE_ROLE_KEY (both server-only).
import Stripe from 'stripe';

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const TOKEN_RX = /^[a-f0-9-]{20,60}$/i;          // the shape share.js/clientsign.js accept
const MIN_CENTS = 50;                            // Stripe's own floor ($0.50)
const MAX_CENTS = 100000 * 100;                  // $100k ceiling — a data-error guard on a deposit

export default async function handler(req, res) {
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sk  = process.env.STRIPE_SECRET_KEY;
  if (!srk || !sk) { res.status(500).send('Payments are not configured'); return; }

  const t = (req.query && req.query.t) || '';
  if (!TOKEN_RX.test(t)) { res.status(400).send('Invalid link'); return; }
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };

  try {
    // 1) the shared document
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=id,project_id,project,title&limit=1`,
      { headers: sbHeaders });
    if (!r.ok) throw new Error('lookup failed');
    const rep = (await r.json())[0];
    if (!rep) { res.status(404).send('This link is no longer available.'); return; }

    // 2) the linked estimate's deposit — the ONLY source of the amount
    const e = await fetch(
      `${SUPABASE_URL}/rest/v1/estimates?doc_id=eq.${rep.id}&select=deposit_amount&limit=1`,
      { headers: sbHeaders });
    const est = e.ok ? (await e.json())[0] : null;
    const cents = Math.round((Number(est && est.deposit_amount) || 0) * 100);
    if (!(cents >= MIN_CENTS && cents <= MAX_CENTS)) {
      res.status(400).send('No deposit is due on this document.'); return;
    }

    // 3) don't offer a second deposit if one is already recorded for this job
    if (rep.project_id) {
      const c = await fetch(
        `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&type=eq.deposit&select=id&limit=1`,
        { headers: sbHeaders });
      const paid = c.ok ? await c.json() : [];
      if (paid.length) { res.status(409).send('The deposit on this job has already been recorded.'); return; }
    }

    // 4) hosted Checkout — Stripe holds the card form, so no card data ever
    //    touches this server (keeps us out of PCI scope).
    const stripe = new Stripe(sk);
    const name = String(rep.project || rep.title || 'Cardinal Roofing & Renovations').slice(0, 120);
    const back = `https://${req.headers.host}/api/share?t=${encodeURIComponent(t)}`;
    const meta = { kind: 'deposit', share_token: t, project_id: rep.project_id || '', report_id: rep.id };
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: { name: `Deposit — ${name}` }
        }
      }],
      success_url: `${back}&paid=1`,
      cancel_url:  `${back}&paid=0`,
      client_reference_id: rep.project_id || rep.id,
      // the webhook reads these to write the collection against the right job
      metadata: meta,
      payment_intent_data: { metadata: meta }
    });

    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (err) {
    res.status(500).send('Could not start the payment: ' + ((err && err.message) || String(err)));
  }
}
