// api/pay-webhook.js — Stripe webhook. The SINGLE money-writer for online
// payments: records a completed deposit into `collections`.
//
// POST from Stripe. The request is verified by signature (STRIPE_WEBHOOK_SECRET)
// BEFORE anything is written — an unverified body is never trusted, never
// recorded. On checkout.session.completed / paid, it writes exactly one
// collection row and relies on the collections.external_ref UNIQUE index for
// idempotency: Stripe redelivers events by design, and the second write hits
// the unique violation and no-ops, so a single deposit can never double-record
// (and can never fire the 10% commission trigger twice).
//
// ⚠ Stripe signature verification needs the RAW request body, so Vercel's
// automatic body parsing is turned off here and the bytes are read off the
// stream. This is the one piece that must be verified on a real deploy against
// a real Stripe test event — a parsed/altered body fails verification.
//
// Needs STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY.
export const config = { api: { bodyParser: false } };
import Stripe from 'stripe';

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  const sk = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk || !whsec || !srk) { res.status(500).send('Webhook is not configured'); return; }

  const stripe = new Stripe(sk);

  // 1) verify — never write on an unverified event
  let event;
  try {
    const buf = await rawBody(req);
    event = stripe.webhooks.constructEvent(buf, req.headers['stripe-signature'], whsec);
  } catch (err) {
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  // 2) record a paid deposit — exactly one row, idempotent on external_ref
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object || {};
      const meta = s.metadata || {};
      const paid = s.payment_status === 'paid' || s.status === 'complete';
      const amount = (Number(s.amount_total) || 0) / 100;
      if (paid && meta.kind === 'deposit' && meta.project_id && amount > 0) {
        const ins = await fetch(`${SUPABASE_URL}/rest/v1/collections`, {
          method: 'POST',
          headers: {
            apikey: srk, Authorization: `Bearer ${srk}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal'
          },
          body: JSON.stringify([{
            project_id: meta.project_id,
            collected_at: new Date().toISOString().slice(0, 10),
            amount,
            type: 'deposit',
            source: 'homeowner',
            method: 'card',
            external_ref: String(s.payment_intent || s.id),
            notes: 'Online card deposit via secure link',
            created_by: 'stripe'
          }])
        });
        // 409 / Postgres 23505 = the external_ref unique guard fired = this
        // payment is already recorded = success. Anything else is a real failure
        // — return non-2xx so Stripe retries (the guard makes the retry safe).
        if (!ins.ok && ins.status !== 409) {
          const t = await ins.text();
          if (t.indexOf('23505') < 0) { res.status(500).send('record failed'); return; }
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).send('handler error');
  }
}
