#!/usr/bin/env node
/* gate_1279 — card payments carry a 3% fee, bank payments none, and the ledger
   never credits the fee toward the balance. Executes the SHIPPED api/pay.js,
   api/pay-webhook.js and share.js's payUi() with stubs (gate_1199's pattern).

     A  pay.js ?m=card → card-only Checkout: $12,000 principal line + $360 fee line
     B  pay.js ?m=bank → bank-only, one $12,000 line, no fee
     C  pay.js bare link (no m) → bank-only, no fee — never a card without its fee
     D  webhook: a $12,360 card checkout records $12,000, the fee named in notes
     E  webhook: a pre-1279 session (no principal_cents) records amount_total
     F  share.js pay bar shows both totals and discloses the fee before checkout
     G  CARD_FEE_PCT / cardFeeCents byte-identical in pay.js and share.js
     H  on a phone, an estimate served at its 900px Letter viewport (1278) keeps its pay
        bar and signing bar at full size — the page shrinks to fit, the buttons do not

   Usage: node gate_1279.mjs [index.html] [--api <dir>]   (control: --api <1278 api dir>) */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { Readable } from 'stream';

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const argv = process.argv.slice(2);
let apiDir = null;
for (let i = 0; i < argv.length; i++) if (argv[i] === '--api') apiDir = resolve(argv[++i]);
apiDir = apiDir || resolve(root, 'api');
const src = (f) => readFileSync(resolve(apiDir, f), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function extract(text, head) {
  const i = text.indexOf(head); if (i < 0) return '';
  let j = text.indexOf('{', i), depth = 0;
  for (; j < text.length; j++) { const ch = text[j];
    if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) return text.slice(i, j + 1); } }
  return '';
}
function loadModule(text, params) {
  const t = text.replace(/^import\s+Stripe\s+from\s+'stripe';\s*$/m, '')
                .replace(/^export const config\b/m, 'const config')
                .replace(/^export default async function handler/m, 'async function handler');
  return new AsyncFunction(...params, t + '\nreturn handler;');
}
function mkRes() {
  const res = { code: 0, body: '', headers: {} };
  res.status = c => { res.code = c; return res; };
  res.send = b => { res.body = String(b ?? ''); return res; };
  res.json = b => { res.body = JSON.stringify(b); return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.writeHead = (c, h) => { res.code = c; Object.assign(res.headers, h || {}); };
  res.end = () => {};
  return res;
}
const J = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });

/* ── A–C · pay.js ── */
const created = [];
class PayStripe { constructor() { this.checkout = { sessions: { create: async (o) => { created.push(o); return { url: 'https://checkout.test/s' }; } } }; } }
const payFetch = async (url) => {
  url = String(url);
  if (url.includes('share_token=eq.')) return J([{ id: 'doc1', project_id: 'p1', project: 'Kirby', title: 'Estimate — Kirby', total: 40000, signed_at: null }]);
  if (url.includes('/collections')) return J([]);
  if (url.includes('/estimates')) return J([{ deposit_amount: 12000 }]);
  return J([]);
};
const pay = async (m) => {
  created.length = 0;
  let handler;
  try { handler = await loadModule(src('pay.js'), ['Stripe', 'fetch', 'process'])(PayStripe, payFetch, { env: { SUPABASE_SERVICE_ROLE_KEY: 'srk', STRIPE_SECRET_KEY: 'sk' } }); }
  catch (e) { return { res: { code: -1, body: String(e) }, s: null }; }
  const res = mkRes(); const q = { t: 'abcdef0123456789abcdef01' }; if (m) q.m = m;
  await handler({ query: q, headers: { host: 'app.test' } }, res);
  return { res, s: created[0] || null };
};
const amounts = (s) => s ? s.line_items.map(l => l.price_data.unit_amount) : [];
let r = await pay('card');
ok(r.res.code === 303 && r.s && JSON.stringify(r.s.payment_method_types) === '["card"]' && JSON.stringify(amounts(r.s)) === '[1200000,36000]'
   && /card processing fee \(3%\)/i.test(r.s.line_items[1] && r.s.line_items[1].price_data.product_data.name),
   'A  card → card only, $12,000 + a separate $360 "Card processing fee (3%)" line', JSON.stringify({ code: r.res.code, pm: r.s && r.s.payment_method_types, amounts: amounts(r.s) }));
ok(r.s && r.s.metadata && r.s.metadata.principal_cents === '1200000' && r.s.metadata.fee_cents === '36000' && r.s.metadata.pay_by === 'card',
   '   · metadata carries principal_cents and fee_cents for the webhook', JSON.stringify(r.s && r.s.metadata));
r = await pay('bank');
ok(r.res.code === 303 && r.s && JSON.stringify(r.s.payment_method_types) === '["us_bank_account"]' && JSON.stringify(amounts(r.s)) === '[1200000]',
   'B  bank → bank only, one $12,000 line, no fee', JSON.stringify({ pm: r.s && r.s.payment_method_types, amounts: amounts(r.s) }));
r = await pay(null);
ok(r.res.code === 303 && r.s && !r.s.payment_method_types.includes('card') && JSON.stringify(amounts(r.s)) === '[1200000]',
   'C  a bare link → bank only, no fee (never a card without its fee)', JSON.stringify({ pm: r.s && r.s.payment_method_types, amounts: amounts(r.s) }));

/* ── D–E · webhook ── */
const writes = [];
class HookStripe { constructor() { this.webhooks = { constructEvent: (buf) => JSON.parse(buf.toString()) }; } }
const hookFetch = async (url, opt = {}) => {
  if (String(url).includes('/rest/v1/collections') && opt.method === 'POST') { writes.push(JSON.parse(opt.body)[0]); return { ok: true, status: 201, text: async () => '' }; }
  return J([]);
};
const hook = await loadModule(src('pay-webhook.js'), ['Stripe', 'fetch', 'process', 'Buffer'])(HookStripe, hookFetch, { env: { STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'wh', SUPABASE_SERVICE_ROLE_KEY: 'srk' } }, Buffer);
const fire = async (meta, total) => {
  writes.length = 0;
  const raw = JSON.stringify({ id: 'evt', type: 'checkout.session.completed', data: { object: { id: 'cs_1', amount_total: total, metadata: meta, payment_intent: 'pi_1', status: 'complete', payment_status: 'paid' } } });
  const req = Readable.from([Buffer.from(raw)]); req.method = 'POST'; req.headers = { 'stripe-signature': 'sig' };
  const res = mkRes(); await hook(req, res); return writes[0] || null;
};
let row = await fire({ kind: 'deposit', project_id: 'p1', report_id: 'r1', pay_by: 'card', principal_cents: '1200000', fee_cents: '36000' }, 1236000);
ok(row && row.amount === 12000, 'D  a $12,360 card checkout records $12,000 on the job — the fee never counts toward the balance', JSON.stringify(row && { amount: row.amount }));
ok(row && /\$360\.00 card processing fee/.test(row.notes || ''), '   · and the row\'s note names the $360 fee', row && row.notes);
row = await fire({ kind: 'deposit', project_id: 'p1', report_id: 'r1' }, 1200000);
ok(row && row.amount === 12000, 'E  a pre-1279 session (no principal_cents) still records amount_total', JSON.stringify(row && { amount: row.amount }));

/* ── F–G · share.js pay bar ── */
const share = src('share.js'), paySrc = src('pay.js');
const feeOf = (t) => (t.match(/const CARD_FEE_PCT = [^\n]*\nconst cardFeeCents = [^\n]*/) || [''])[0];
let bar = '';
try { bar = new Function(feeOf(share) + '\n' + extract(share, 'function payUi(') + '\nreturn payUi("tok", 1200000, "Deposit", "Kirby");')(); } catch (e) { bar = 'THREW ' + e.message; }
ok(/Pay by bank[^<]*\$12,000\.00/.test(bar) && /No fee/.test(bar) && /m=bank/.test(bar), 'F  the pay bar offers "Pay by bank · $12,000.00 — No fee"', bar.slice(0, 80));
ok(/Pay by card[^<]*\$12,360\.00/.test(bar) && /3% card processing fee/.test(bar) && /m=card/.test(bar), '   · and "Pay by card · $12,360.00", the 3% fee disclosed before checkout');
ok(feeOf(share).length > 40 && feeOf(share) === feeOf(paySrc), 'G  CARD_FEE_PCT / cardFeeCents are byte-identical in pay.js and share.js');

/* ── H · Chromium: the bars on a shrunk Letter page ── */
{
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
  const { mkdtempSync, writeFileSync } = await import('fs');
  const { tmpdir } = await import('os'); const { join } = await import('path'); const { pathToFileURL } = await import('url');
  const DOC = (signed) => '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">'
    + '<div class="est-head" style="display:flex"><b>CARDINAL</b><span>ESTIMATE</span></div><table class="items"><thead><tr><th>Description</th><th>Price</th></tr></thead><tbody><tr><td>Roof</td><td>$12,000</td></tr></tbody></table>'
    + '<div style="height:1400px"></div><div class="line"></div><div class="lbl">Client Acceptance | Date</div>' + (signed ? '<i data-clientsigned="1"></i>' : '') + '</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 'g1279-')); writeFileSync(join(dir, 'share.mjs'), src('share.js'));
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-not-real';
  const serve = async (signed) => {
    globalThis.fetch = async (u) => { u = String(u);
      if (u.includes('/inspection_reports?share_token')) return J([{ id: 'd1', project_id: 'p1', project: 'Kirby', html: DOC(signed), title: 'Estimate — Kirby', total: 40000, signed_at: null }]);
      if (u.includes('/estimates')) return J([{ deposit_amount: 12000 }]);
      return J([]); };
    let out = '';
    try { const mod = await import(pathToFileURL(join(dir, 'share.mjs')).href + '?' + signed);
      await new Promise(async res => { const r = { setHeader() {}, status() { return this; }, send(b) { out = String(b); res(); }, json(j) { out = JSON.stringify(j); res(); } };
        await mod.default({ method: 'GET', query: { t: '0123456789abcdef0123456789abcdef' }, headers: {} }, r); }); } catch (e) { out = 'THREW ' + e.message; }
    return out;
  };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const measure = async (html, sel) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const pg = await ctx.newPage();
    await pg.route('**/*', r => r.request().url().startsWith('https://share.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.fulfill({ status: 200, body: '' }));
    await pg.goto('https://share.test/x', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(700);
    const m = await pg.evaluate((sel) => { const e = document.querySelector(sel); const sc = window.visualViewport ? visualViewport.scale : 1;
      const r = e ? e.getBoundingClientRect() : null;
      return { found: !!e, scale: +sc.toFixed(3), h: r ? Math.round(r.height * sc) : 0, w: r ? Math.round(r.width * sc) : 0, layoutW: document.documentElement.clientWidth }; }, sel);
    await ctx.close(); return m;
  };
  const pay = await measure(await serve(true), '#crPayCard');
  ok(pay.found && pay.layoutW >= 880 && pay.h >= 44, 'H  phone, Letter page: the "Pay by card" button is a real thumb target (≥44px on screen)', JSON.stringify(pay));
  const sign = await measure(await serve(false), '#csOpen');
  ok(sign.found && sign.layoutW >= 880 && sign.h >= 36, '   · and the signing bar\'s button is full size too', JSON.stringify(sign));
  await browser.close();
}

console.log(`\nGATE 1279 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
