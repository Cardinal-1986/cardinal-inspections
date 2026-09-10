#!/usr/bin/env node
/* gate_1199 — the money routes fail closed, the bank payment is labelled as
 * one, the conversion route authorizes before it reads, and Google Maps waits
 * for a focus. Driven on the SHIPPED modules and the SHIPPED gmap block.
 *
 *   node gate_1199.mjs [index.html] [--api <dir>]     the build must be GREEN
 *   node gate_1199.mjs <1198 index.html> --api <1198 api dir>   control: RED
 *
 *   A  STATIC: stamp, changelog, the sign-in placeholder domain.
 *   B  THE RESOLVER, executed. owedOn + readRows + LookupFailed are extracted
 *      from api/pay.js and api/share.js, asserted byte-identical, and RUN
 *      against a fake PostgREST: a $10,000 invoice with $2,000 collected owes
 *      $8,000; when the collections read answers 503 the resolver must THROW
 *      (the 1198 code returned $10,000); the same for a failed contracts read,
 *      a failed estimates read and an unreachable host.
 *   C  THE PAY ROUTE, executed with a stub Stripe: a failed ledger read is a
 *      503 with no checkout session; a good read is a 303 for the right cents;
 *      nothing due is a 400.
 *   D  THE WEBHOOK, executed with a stub Stripe: a card completion records
 *      method 'card'; a cleared bank debit records method 'ach' with the ACH
 *      note (the 1198 code wrote 'card' for both).
 *   E  THE CONVERSION ROUTE, executed with a stub Supabase client: a roster
 *      account that is neither creator nor assignee gets 403 even when the
 *      job already has a contract (1198 returned it with 200); an assigned rep
 *      whose assignment is in the serialized checklist is admitted (1198
 *      refused, because it read a property off a string).
 *   F  THE GMAP BLOCK, in Chromium: with a hidden address field in the DOM
 *      (the sign-in screen's situation) no Maps script tag exists after boot;
 *      focusing a visible address field appends one; a field that is already
 *      focused when armed attaches at once.
 *
 * ⚠ THE CONTROL IS THE POINT. On the 1198 tree B's throw checks, C's 503,
 *   D's ach, E's 403 and 200 and F's boot check must FAIL. Sections that pass
 *   on both trees are the "preserved" checks and are labelled as such.
 *
 * No jsdom, no Stripe SDK: the SDK imports are stripped from the module text
 * and a stub is passed in, so this runs where npm cannot.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import { Readable } from 'stream';

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const argv = process.argv.slice(2);
let artifact = null, apiDir = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--api') apiDir = resolve(argv[++i]);
  else if (!artifact) artifact = resolve(argv[i]);
}
artifact = artifact || resolve(root, 'index.html');
apiDir = apiDir || resolve(root, 'api');
const html = readFileSync(artifact, 'utf8');
const src = (f) => readFileSync(resolve(apiDir, f), 'utf8');

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
let pass = 0, fail = 0;
const ok = (c, m, detail = '') => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + m + (detail ? '  → ' + detail : ''));
  c ? pass++ : fail++;
};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/* brace-match a top-level function/class by name; returns '' when absent */
function extract(text, head) {
  const i = text.indexOf(head);
  if (i < 0) return '';
  let j = text.indexOf('{', i), depth = 0;
  for (; j < text.length; j++) {
    const ch = text[j];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return '';
}

/* ── A · static ─────────────────────────────────────────────────────────── */
console.log('A · static');
/* the FLOOR, not the literal stamp: gate_chromium runs this against every later
   build too, and a literal stamp is red the moment 1200 ships (gate_1198's fault
   on this very build) */
const stampBuild = Number((html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/) || [])[1] || 0);
ok(stampBuild >= 1199, 'app stamp is 1199 or later', 'stamp ' + stampBuild);
ok(html.includes('{ b: 1199,'), 'CHANGELOG carries 1199');
ok(!html.includes('you@cardinalroofing.com') && html.includes('you@cardinalrenovations.net'),
   'sign-in placeholder uses the company domain');

/* ── B · the resolver, executed ─────────────────────────────────────────── */
console.log('B · owedOn, executed (pay.js and share.js)');
const SB = 'https://sb.test';
function resolverOf(text) {
  const cls = extract(text, 'class LookupFailed');
  const rr  = extract(text, 'async function readRows(');
  const ow  = extract(text, 'async function owedOn(');
  return { cls, rr, ow, all: [cls, rr, ow].filter(Boolean).join('\n') };
}
const rPay = resolverOf(src('pay.js')), rShare = resolverOf(src('share.js'));
console.log(`        extracted pay.js: class ${rPay.cls.length} readRows ${rPay.rr.length} owedOn ${rPay.ow.length}; share.js: ${rShare.cls.length}/${rShare.rr.length}/${rShare.ow.length}`);
ok(rPay.ow.length > 200 && rShare.ow.length > 200, 'owedOn extracted from both files');
ok(rPay.all === rShare.all, 'resolver is byte-identical in pay.js and share.js (the KEEP IN SYNC contract)');
ok(rPay.cls && rPay.rr, 'fail-closed helpers present (LookupFailed + readRows)');

function fakeFetch(answers) {
  return async (url) => {
    const key = ['collections', 'inspection_reports', 'estimates'].find(k => String(url).includes('/rest/v1/' + k)) || 'other';
    const a = answers[key];
    if (a === 'unreachable') throw new TypeError('fetch failed');
    if (typeof a === 'number') return { ok: false, status: a, json: async () => [] , text: async () => '' };
    return { ok: true, status: 200, json: async () => (a || []), text: async () => '' };
  };
}
async function runOwed(r, answers, rep) {
  const fn = new AsyncFunction('SUPABASE_URL', 'fetch', r.all + '\nreturn owedOn;');
  const owedOn = await fn(SB, fakeFetch(answers));
  try { return { value: await owedOn({}, rep) }; }
  catch (e) { return { threw: e }; }
}
const INV = { id: 'doc1', project_id: 'p1', title: 'Invoice — Roof', total: 10000 };
const CONTRACTS = [{ title: 'Contract — Roof', total: 10000, signed_at: '2026-08-01' }];
const DEP = { id: 'doc2', project_id: 'p1', title: 'Estimate — Roof', total: 12000 };
for (const [label, r] of [['pay.js', rPay], ['share.js', rShare]]) {
  let x = await runOwed(r, { collections: [{ amount: 2000 }], inspection_reports: CONTRACTS }, INV);
  ok(x.value && x.value.cents === 800000, `${label}: $10,000 contract − $2,000 collected → $8,000 (preserved)`, JSON.stringify(x.value || String(x.threw)));
  x = await runOwed(r, { collections: 503, inspection_reports: CONTRACTS }, INV);
  ok(!!x.threw && x.threw.code === 'LOOKUP_FAILED', `${label}: collections 503 → THROWS LookupFailed, never $10,000`, x.value ? 'returned ' + JSON.stringify(x.value) : String(x.threw && x.threw.message));
  x = await runOwed(r, { collections: [{ amount: 2000 }], inspection_reports: 503 }, INV);
  ok(!!x.threw && x.threw.code === 'LOOKUP_FAILED', `${label}: contracts 503 → THROWS (no silent fallback to the invoice total)`, x.value ? 'returned ' + JSON.stringify(x.value) : '');
  x = await runOwed(r, { collections: [], estimates: [{ deposit_amount: 3000 }] }, DEP);
  ok(x.value && x.value.cents === 300000 && x.value.label === 'Deposit', `${label}: deposit $3,000 (preserved)`);
  x = await runOwed(r, { collections: [], estimates: 503 }, DEP);
  ok(!!x.threw && x.threw.code === 'LOOKUP_FAILED', `${label}: estimates 503 → THROWS (not a silent $0)`, x.value ? 'returned ' + JSON.stringify(x.value) : '');
  x = await runOwed(r, { collections: 'unreachable' }, INV);
  ok(!!x.threw && x.threw.code === 'LOOKUP_FAILED', `${label}: unreachable host → LookupFailed, not a bare TypeError`, String(x.threw && (x.threw.code || x.threw.name)));
}

/* ── C · the pay route, executed ────────────────────────────────────────── */
console.log('C · api/pay.js handler, executed with a stub Stripe');
function loadModule(text, params) {
  let t = text.replace(/^import\s+Stripe\s+from\s+'stripe';\s*$/m, '')
              .replace(/^import\s+\{\s*createClient\s*\}\s+from\s+'@supabase\/supabase-js';\s*$/m, '')
              .replace(/^export const config\b/m, 'const config')
              .replace(/^export default async function handler/m, 'async function handler');
  if (/^\s*(import|export)\b/m.test(t)) throw new Error('module still carries an import/export after stripping');
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
{
  const created = [];
  class StripeStub { constructor() { this.checkout = { sessions: { create: async (o) => { created.push(o); return { url: 'https://checkout.test/s' }; } } }; } }
  const procStub = { env: { SUPABASE_SERVICE_ROLE_KEY: 'srk', STRIPE_SECRET_KEY: 'sk' } };
  const TOKEN = 'abcdef0123456789abcdef01';
  const REP = [{ id: 'doc1', project_id: 'p1', project: 'Lawson', title: 'Invoice — Roof', total: 10000, signed_at: null }];
  const fetchFor = (answers) => async (url) => {
    if (String(url).includes('share_token=eq.')) return { ok: true, status: 200, json: async () => REP };
    return fakeFetch(answers)(url);
  };
  const drive = async (answers) => {
    created.length = 0;
    const handler = await loadModule(src('pay.js'), ['Stripe', 'fetch', 'process'])(StripeStub, fetchFor(answers), procStub);
    const res = mkRes();
    await handler({ query: { t: TOKEN }, headers: { host: 'app.test' } }, res);
    return res;
  };
  let res = await drive({ collections: 503, inspection_reports: CONTRACTS });
  ok(res.code === 503 && created.length === 0, 'collections 503 → 503, and NO checkout session is created', `http ${res.code}, sessions created: ${created.length}${created[0] ? ' for ' + created[0].line_items[0].price_data.unit_amount + ' cents' : ''}`);
  ok(res.code === 503 && /could not verify the balance/i.test(res.body) && res.headers['Retry-After'], '  · the message says the balance could not be verified, with Retry-After');
  res = await drive({ collections: [{ amount: 2000 }], inspection_reports: CONTRACTS });
  ok(res.code === 303 && created.length === 1 && created[0].line_items[0].price_data.unit_amount === 800000, 'good reads → 303 to a checkout for exactly $8,000 (preserved)', `http ${res.code}, cents ${created[0] && created[0].line_items[0].price_data.unit_amount}`);
  res = await drive({ collections: [{ amount: 10000 }], inspection_reports: CONTRACTS });
  ok(res.code === 400 && created.length === 0, 'fully paid → 400 nothing due (preserved)');
}

/* ── D · the webhook, executed ──────────────────────────────────────────── */
console.log('D · api/pay-webhook.js, executed with a stub Stripe');
{
  const writes = [];
  class StripeStub { constructor() { this.webhooks = { constructEvent: (buf) => JSON.parse(buf.toString()) }; } }
  const procStub = { env: { STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'whsec', SUPABASE_SERVICE_ROLE_KEY: 'srk' } };
  const fetchStub = async (url, opt = {}) => {
    if (String(url).includes('/rest/v1/collections') && opt.method === 'POST') { writes.push(JSON.parse(opt.body)[0]); return { ok: true, status: 201, text: async () => '' }; }
    return { ok: true, status: 200, text: async () => '[]', json: async () => [] };
  };
  const handler = await loadModule(src('pay-webhook.js'), ['Stripe', 'fetch', 'process', 'Buffer'])(StripeStub, fetchStub, procStub, Buffer);
  const META = { kind: 'deposit', share_token: 't', project_id: 'p1', report_id: 'r1' };
  const fire = async (type, over) => {
    writes.length = 0;
    const raw = JSON.stringify({ id: 'evt', type, data: { object: { id: 'cs_1', amount_total: 1200000, metadata: META, payment_intent: 'pi_1', ...over } } });
    const req = Readable.from([Buffer.from(raw)]); req.method = 'POST'; req.headers = { 'stripe-signature': 'sig' };
    const res = mkRes(); await handler(req, res); return { res, rows: writes.slice() };
  };
  let r = await fire('checkout.session.completed', { status: 'complete', payment_status: 'paid' });
  ok(r.res.code === 200 && r.rows.length === 1 && r.rows[0].method === 'card', 'a paid CARD completion records method card (preserved)', JSON.stringify(r.rows[0] && { method: r.rows[0].method, notes: r.rows[0].notes }));
  r = await fire('checkout.session.async_payment_succeeded', { status: 'complete', payment_status: 'paid' });
  ok(r.res.code === 200 && r.rows.length === 1 && r.rows[0].method === 'ach', 'a CLEARED bank debit records method ach', JSON.stringify(r.rows[0] && { method: r.rows[0].method, notes: r.rows[0].notes }));
  ok(r.rows[0] && /ACH|bank/i.test(r.rows[0].notes || '') && !/card/i.test(r.rows[0].notes || ''), '  · and its note names the bank payment, not a card');
  r = await fire('checkout.session.completed', { status: 'complete', payment_status: 'unpaid' });
  ok(r.res.code === 200 && r.rows.length === 0, 'an UNSETTLED debit at checkout still records nothing (1151 preserved)');
}

/* ── E · the conversion route — RETIRED AT 1212 ─────────────────────
   ⚠ THIS SECTION USED TO EXECUTE api/estimate-to-contract.js, AND IT CRASHED
   THE MOMENT 1212 DELETED THAT FILE — ENOENT out of readFileSync, at 0s, before
   a single check ran. gate_chromium reports that as "FAILED on the shipped
   artifact" with a Node stack trace and no gate line, which reads as "this gate
   went red" rather than "this gate proved nothing". BUG_CLASSES 37.

   1199 fixed two real defects in that route: the access check sat below the
   idempotency return, and assignedRepFromChecklist() read a property off a
   serialized JSON string. Both fixes went with the route, and that is correct —
   1199's own note recorded the route was dead in production regardless, because
   its select named `client_name` and `estimate`, columns `projects` has never
   had, so every call 404'd before reaching the fixed line.

   ⚠ EIGHT CHECKS WERE LOST HERE, AND IT IS SAID OUT LOUD RATHER THAN LEFT TO A
   SHRINKING NUMBER NOBODY READS. What replaces them watches the same subject
   from the other side: the route is gone, nothing calls it, and the path that
   actually converts an estimate — cr-e2c, in the browser — is intact. */
console.log('E · the conversion route is retired (1212), and cr-e2c still converts');
{
  ok(!existsSync(resolve(apiDir, 'estimate-to-contract.js')),
     'api/estimate-to-contract.js is gone from the repo');
  ok(!html.includes("api('/api/estimate-to-contract'") && !html.includes("api('/api/estimate_to_contract'"),
     'nothing in index.html calls it, in either spelling');
  ok(html.includes('was RETIRED at build 1212'),
     'the install instructions say so, so it is not re-added');
  ok(html.includes("btn.id = 'cr-e2c-btn';") && html.includes('var docId = await generate(est, project);'),
     'the \u2192 Contract button still builds the contract in the browser');
  ok((html.match(/from\('contracts'\)/g) || []).length >= 8,
     'the contracts table is still read and written by the client — the FEATURE stays',
     (html.match(/from\('contracts'\)/g) || []).length + ' sites');
}

/* ── F · the gmap block, in Chromium ────────────────────────────────────── */
console.log('F · cr-gmap-script in Chromium');
{
  const m = html.match(/<script id="cr-gmap-script">([\s\S]*?)<\/script>/);
  ok(!!m, 'cr-gmap-script block extracted', m ? m[1].length + ' chars' : 'missing');
  let chromium = null;
  try {
    const req = createRequire(import.meta.url);
    chromium = req(existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright').chromium;
  } catch (e) { ok(false, 'Chromium available', e.message.split('\n')[0]); }
  if (m && chromium) {
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const MAPS = 'script[src*="maps.googleapis.com/maps/api/js"]';
      const body = `<div style="display:none"><input id="h1" placeholder="Address"><input id="h2" data-field="address"></div>
                    <input id="v" data-field="address" placeholder="Property address">`;
      const doc = `<!doctype html><html><body>${body}<script id="cr-gmap-script">${m[1]}</script></body></html>`;
      const page = async () => {
        const p = await browser.newPage();
        /* everything is served from the route: the document itself, the config
           route, and a hard abort for Maps — nothing here may reach a network.
           (The first version let the fake host fall through to DNS and CRASHED
           before its first assertion — BUG_CLASSES 37, on the gate that cites it.) */
        await p.route('**/*', (route) => {
          const u = route.request().url();
          if (u === 'http://gate.test/' || u === 'http://gate.test') return route.fulfill({ status: 200, contentType: 'text/html', body: doc });
          if (u.endsWith('/api/config')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ googleMapsKey: 'k-test' }) });
          return route.abort();
        });
        return p;
      };
      const p1 = await page();
      await p1.goto('http://gate.test/', { waitUntil: 'load' });
      await p1.waitForTimeout(600);
      const boot = await p1.evaluate((sel) => ({
        maps: !!document.querySelector(sel),
        armed: document.querySelectorAll('input[data-cr-gmap-armed="1"]').length,
        attached: document.querySelectorAll('input[data-cr-autocomplete="1"]').length,
      }), MAPS);
      ok(!boot.maps, 'after boot with hidden address fields present, NO Maps script tag exists', JSON.stringify(boot));
      ok(boot.armed >= 3 && boot.attached === 0, '  · the address fields are armed, none attached', JSON.stringify(boot));
      await p1.focus('#v');
      let after = false;
      for (let i = 0; i < 40 && !after; i++) { await p1.waitForTimeout(100); after = await p1.evaluate((sel) => !!document.querySelector(sel), MAPS); }
      ok(after, 'focusing a visible address field appends the Maps script tag');
      const attachedNow = await p1.evaluate(() => document.getElementById('v').dataset.crAutocomplete === '1');
      ok(attachedNow, '  · and that field is now attached');
      await p1.close();

      /* an already-focused field must not be stranded */
      const p2 = await page();
      await p2.goto('http://gate.test/', { waitUntil: 'load' });
      await p2.waitForTimeout(300);
      await p2.evaluate(() => { const i = document.createElement('input'); i.id = 'auto'; i.dataset.field = 'address'; document.body.appendChild(i); i.focus(); });
      let attachedAuto = false;
      for (let i = 0; i < 40 && !attachedAuto; i++) { await p2.waitForTimeout(100); attachedAuto = await p2.evaluate(() => document.getElementById('auto').dataset.crAutocomplete === '1'); }
      ok(attachedAuto, 'a field that is already focused when the scan arms it attaches at once (not stranded)');
      await p2.close();
    } catch (e) {
      ok(false, 'Chromium section ran to completion', (e && e.message || String(e)).split('\n')[0]);
    } finally { if (browser) await browser.close(); }
  }
}

console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
