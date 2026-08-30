/* gate_1151  —  run from a dir holding the stripe SDK + a copy of the handler:
 *   node gate_1151.mjs ./pay-webhook.mjs        (the build under test)
 *   node gate_1151.mjs ./pay-webhook-OLD.mjs    (control -> RED 4/4)
 *
 * gate_1151 — ACH money is recorded when it ARRIVES, and never before.
 *
 * The hazard this exists for: with ACH, checkout.session.completed fires with
 * status 'complete' but payment_status 'unpaid' — the bank debit takes days and
 * can bounce. The old test `payment_status==='paid' || status==='complete'`
 * would have booked the deposit at checkout, before the money existed, and left
 * it booked if the debit later failed.
 *
 * Drives the SHIPPED handler through the real three-event ACH sequence.
 */
import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { Readable } from 'stream';
const SECRET = 'whsec_' + 'T3stOnlyLocalSecret0000000000000';
const stripe = new Stripe('sk_test_localonly', { apiVersion: '2024-06-20' });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

process.env.STRIPE_SECRET_KEY = 'sk_test_localonly';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk_test_localonly';
let writes = [];
globalThis.fetch = async (url, opt = {}) => {
  writes.push({ url: String(url), method: opt.method || 'GET', body: opt.body });
  if (String(url).includes('/rest/v1/collections') && (opt.method || 'GET') === 'POST')
    return { ok: true, status: 201, text: async () => '', json: async () => [{}] };
  return { ok: true, status: 200, text: async () => '[]', json: async () => [] };
};
const handler = (await import(process.argv[2] || './pay-webhook.mjs')).default;

const META = { kind: 'deposit', share_token: '00000000-0000-4000-8000-000000000000',
               project_id: 'f0f1898b-791b-46bb-816f-fd0e959b6dd5', report_id: 'rep_x' };
const sess = (over) => ({ id: 'cs_live_ach_1', object: 'checkout.session',
  amount_total: 1200000, currency: 'usd', metadata: META,
  payment_intent: 'pi_live_ach_1', ...over });
const fire = async (type, obj) => {
  writes = [];
  const raw = JSON.stringify({ id: 'evt_' + type, type, data: { object: obj } });
  const r = Readable.from([Buffer.from(raw)]);
  r.method = 'POST';
  r.headers = { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: raw, secret: SECRET }) };
  const res = { code: 0, body: '' };
  res.status = c => { res.code = c; return res; };
  res.send = b => { res.body = String(b ?? ''); return res; };
  res.json = b => { res.body = JSON.stringify(b); return res; };
  await handler(r, res);
  return { res, rows: writes.filter(w => w.url.includes('collections') && w.method === 'POST') };
};

/* ── the ACH sequence, in the order Stripe sends it ── */
console.log('        --- ACH: a $12,000 deposit by bank debit ---');
let a = await fire('checkout.session.completed', sess({ status: 'complete', payment_status: 'unpaid' }));
console.log(`        completed(unpaid)  -> http ${a.res.code}, rows written: ${a.rows.length}`);
ok(a.res.code === 200, 'checkout completed on an UNSETTLED ACH debit is acknowledged');
ok(a.rows.length === 0, '  · and records NOTHING — the money has not arrived yet');

a = await fire('checkout.session.async_payment_succeeded', sess({ status: 'complete', payment_status: 'paid' }));
console.log(`        async_succeeded    -> http ${a.res.code}, rows written: ${a.rows.length}`);
ok(a.res.code === 200 && a.rows.length === 1, 'when the debit CLEARS, exactly one row is written');
ok(a.rows.length === 1 && /pi_live_ach_1/.test(String(a.rows[0].body)),
   '  · keyed on the payment intent, so a redelivery still cannot double it');
ok(a.rows.length === 1 && /"amount":12000\b/.test(String(a.rows[0].body).replace(/\s/g,'')),
   '  · for the full $12,000');

a = await fire('checkout.session.async_payment_failed', sess({ status: 'complete', payment_status: 'unpaid' }));
console.log(`        async_failed       -> http ${a.res.code}, rows written: ${a.rows.length}`);
ok(a.res.code === 200, 'a BOUNCED debit is acknowledged (Stripe stops retrying)');
ok(a.rows.length === 0, '  · and records nothing — there was never a row to undo');

/* ── card must be untouched by all of this ── */
console.log('        --- card: unchanged behaviour ---');
a = await fire('checkout.session.completed', sess({ id: 'cs_live_card_1', payment_intent: 'pi_live_card_1',
                                                    status: 'complete', payment_status: 'paid', amount_total: 100 }));
console.log(`        card completed     -> http ${a.res.code}, rows written: ${a.rows.length}`);
ok(a.res.code === 200 && a.rows.length === 1, 'a paid CARD checkout still records immediately, as before');

console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
