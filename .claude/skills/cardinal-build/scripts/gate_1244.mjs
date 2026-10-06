/* gate_1244.mjs — ABC ordering: the sandbox pair and the live-order switch (api/abc.js).
   Runs the SHIPPED handler (imported, not re-implemented) against a recording fake network:
     A. a TEST order (sandbox:true) authenticates with ABC_SB_* on the sandbox auth host and posts to
        partners-sb.abcsupply.com — never the live host, never the live credential;
     B. a LIVE order with ABC_ORDERS_LIVE unset is refused 403 LIVE_ORDERS_OFF and NO request reaches
        ABC's order host at all (validation still runs first, so a malformed live order says why);
     C. with ABC_ORDERS_LIVE=1 the same live order posts to partners.abcsupply.com;
     D. a sales rep is refused before any ABC traffic (the 1009 full-access gate still holds);
     E. status reports sandbox + liveOrders, so the screen can say why Send is or is not available;
     F. read actions (searchItems) also honour sandbox:true.
   Negative control: the 1243 abc.js has no sandbox pair and no switch — it must go RED, not crash.
   usage: node gate_1244.mjs [path/to/abc.js]
*/
import { pathToFileURL } from 'node:url';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const FILE = resolve(process.argv[2] || '/home/user/cardinal-inspections/api/abc.js');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  -> ' + d : '')); c ? pass++ : fail++; };

let calls = [];
let who = 'theo@cardinalrenovations.net';
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); const body = opts.body; calls.push({ url, method: opts.method || 'GET', auth: (opts.headers || {}).Authorization || '', body });
  const json = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o, text: async () => JSON.stringify(o) });
  if (url.includes('/auth/v1/user')) return json({ email: who });
  if (url.includes('/oauth2/')) return json({ access_token: 'tok-' + (url.includes('sandbox') ? 'sb' : 'live') });
  if (url.includes('/api/order/v2/orders')) return json([{ confirmationNumber: 'CONF-1' }]);
  if (url.includes('/api/product/v1/search/items')) return json({ items: [{ itemNumber: 'X1' }] });
  return json({});
};
// fresh module copy per scenario so the per-target token cache never leaks between runs
async function load() {
  const d = mkdtempSync(join(tmpdir(), 'g1244-')); const f = join(d, 'abc.mjs'); copyFileSync(FILE, f);
  return (await import(pathToFileURL(f).href)).default;
}
async function call(h, body) {
  let code = 0, out = null;
  const res = { status(c) { code = c; return this; }, json(o) { out = o; return this; } };
  await h({ method: 'POST', headers: { authorization: 'Bearer x' }, body }, res);
  return { code, out };
}
const ORDER = { action: 'placeOrder', branchNumber: '106', deliveryService: 'CPU',
  shipTo: { number: '2153354-2', address: { line1: '7990 Germantown Pike', city: 'Dayton', state: 'OH', postal: '45449' } },
  items: [{ itemNumber: '11IWRRGU2', quantity: 3, uom: 'BD' }] };
const setEnv = (o) => { for (const k of ['ABC_CLIENT_ID','ABC_CLIENT_SECRET','ABC_ENV','ABC_SB_CLIENT_ID','ABC_SB_CLIENT_SECRET','ABC_ORDERS_LIVE','SUPABASE_SERVICE_ROLE_KEY','ABC_API_BASE']) delete process.env[k]; Object.assign(process.env, o); };
const BASE = { ABC_CLIENT_ID: 'live-id', ABC_CLIENT_SECRET: 'live-secret', ABC_ENV: 'production', ABC_SB_CLIENT_ID: 'sb-id', ABC_SB_CLIENT_SECRET: 'sb-secret' };
const basic = (id, sec) => 'Basic ' + Buffer.from(id + ':' + sec).toString('base64');

try {
  // A — test order to the sandbox
  setEnv(BASE); calls = []; let h = await load();
  let r = await call(h, { ...ORDER, sandbox: true });
  const tok = calls.find(c => c.url.includes('/oauth2/')), post = calls.find(c => c.url.includes('/api/order/v2/orders'));
  ok(r.code === 200, 'A  a TEST order is accepted', JSON.stringify(r));
  ok(!!tok && tok.url.includes('sandbox.auth') && tok.auth === basic('sb-id', 'sb-secret'), 'A  it authenticates with the SANDBOX pair on the sandbox auth host', tok && tok.url);
  ok(!!post && post.url.startsWith('https://partners-sb.abcsupply.com/'), 'A  it posts to partners-sb (sandbox), never the live host', post && post.url);
  ok(!calls.some(c => c.auth === basic('live-id', 'live-secret')), 'A  the live credential is never used for a test order');

  // B — live order, switch off
  setEnv(BASE); calls = []; h = await load();
  r = await call(h, { ...ORDER });
  ok(r.code === 403 && r.out && r.out.code === 'LIVE_ORDERS_OFF', 'B  a LIVE order is refused while ABC_ORDERS_LIVE is off', JSON.stringify(r).slice(0, 160));
  ok(!calls.some(c => c.url.includes('abcsupply.com')), 'B  and nothing at all is sent to ABC', calls.map(c => c.url).join(' '));
  r = await call(h, { ...ORDER, deliveryService: '' });
  ok(r.code === 400 && /deliveryService/.test(r.out.error || ''), 'B  a malformed live order still says what is wrong (validation runs first)', r.out && r.out.error);

  // C — live order, switch on
  setEnv({ ...BASE, ABC_ORDERS_LIVE: '1' }); calls = []; h = await load();
  r = await call(h, { ...ORDER });
  const p2 = calls.find(c => c.url.includes('/api/order/v2/orders'));
  ok(r.code === 200 && !!p2 && p2.url.startsWith('https://partners.abcsupply.com/'), 'C  with ABC_ORDERS_LIVE=1 the live order posts to partners.abcsupply.com', p2 && p2.url);
  ok(!!p2 && Array.isArray(JSON.parse(p2.body)), 'C  the body is ABC\'s documented ARRAY of orders');

  // D — sales rep refused
  setEnv({ ...BASE, ABC_ORDERS_LIVE: '1' }); calls = []; h = await load(); who = 'nick@cardinalrenovations.net';
  r = await call(h, { ...ORDER, sandbox: true });
  ok(r.code === 403 && !calls.some(c => c.url.includes('abcsupply.com')), 'D  a sales rep cannot place even a test order, and nothing reaches ABC', JSON.stringify(r).slice(0, 120));
  who = 'theo@cardinalrenovations.net';

  // E — status
  setEnv(BASE); calls = []; h = await load();
  r = await call(h, { action: 'status' });
  ok(r.code === 200 && r.out.sandbox === true && r.out.liveOrders === false, 'E  status reports sandbox:true and liveOrders:false', JSON.stringify(r.out));
  setEnv({ ABC_CLIENT_ID: 'live-id', ABC_CLIENT_SECRET: 'live-secret', ABC_ENV: 'production' }); h = await load();
  r = await call(h, { action: 'status', sandbox: true });
  ok(r.code === 200 && r.out.configured === false && r.out.env === 'sandbox', 'E  with no sandbox pair, a sandbox status says so instead of using the live key', JSON.stringify(r.out));

  // F — reads honour sandbox too
  setEnv(BASE); calls = []; h = await load();
  r = await call(h, { action: 'searchItems', query: 'duration', sandbox: true });
  const s1 = calls.find(c => c.url.includes('/search/items'));
  ok(!!s1 && s1.url.startsWith('https://partners-sb.abcsupply.com/'), 'F  a sandbox catalog search goes to partners-sb', s1 && s1.url);
} catch (e) {
  ok(false, 'the scenarios ran to the end (a crash is not a pass)', String(e && e.stack || e).slice(0, 200));
}
console.log((fail ? 'GATE 1244 RED' : 'GATE 1244 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
