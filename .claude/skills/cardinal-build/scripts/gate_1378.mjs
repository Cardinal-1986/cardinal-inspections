/* gate_1378 — an insurance invoice bills only the homeowner's part (audit W7 option 1; Theo "2 then 1").
 * Fixture: a $9,000 insurance job whose signed contract's INSURANCE & YOUR PART box says $1,500.00 out of pocket;
 * the carrier paid $8,000 (source insurance), a partner $100, the homeowner $500 (cash) and $200 (financing).
 * Homeowner's part = $1,500 − ($500 + $200) = $800.
 *   A  the rule, executed: homeOwedOn() in pay.js and share.js is byte-identical and answers $800 / $1,500 / $700;
 *      no box → null; a "[0.00]" placeholder → null
 *   B  api/share.js: the insurance invoice page shows a pay bar for $800 and the summary reads $1,500 / $700 / $800;
 *      with no box, no pay bar (1377); a retail invoice is unchanged ($9,000 − collected)
 *   C  api/pay.js: insurance → checkout for exactly $800; no box → 400 not paid online; retail unchanged
 *   D  api/sms-link.js: insurance with the box texts; without it, refused; Twilio called only for the first
 *   E  api/receipt.js reads the homeowner's part on an insurance job (source)
 *   F  the app: Create invoice on the insurance job prints "Your part (deductible + upgrades)" $1,500.00, paid
 *      $700.00, due $800.00, its stored total stays the job's $9,000 and no job lines are seeded; the link maker gives a link; with no box the invoice keeps the
 *      job figures, the toast says it goes by hand, and the link maker refuses
 * Arg: [index.html] [api dir] -> negative control (1377 + its api: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIDIR = process.argv[3] || '/home/user/cardinal-inspections/api';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const src = f => fs.readFileSync(path.join(APIDIR, f), 'utf8');

const BOX = '<div data-cr-inspart="1"><table><tr><td>Your deductible</td><td><span class="fill" data-ip="ded">$1,000.00</span></td></tr>'
  + '<tr><td>Upgrades</td><td><span class="fill" data-ip="upg">$500.00</span></td></tr><tr><td>Your total out of pocket</td><td><b data-ip="oop">$1,500.00</b></td></tr></table></div>';
const COLLS = [{ amount: 8000, source: 'insurance' }, { amount: 100, source: 'partner' }, { amount: 500, source: null }, { amount: 200, source: 'finance' }];

/* ---------- A: the rule, executed on the shipped text ---------- */
const grab = (t, name) => { const i = t.indexOf(name); if (i < 0) return null; let d = 0, j = t.indexOf('{', i); for (let k = j; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(t.lastIndexOf('\n', i) + 1, k + 1); } return null; };
const pieces = f => { const t = src(f); return ['class LookupFailed', 'async function readRows', 'function oopFromHtml', 'async function homeOwedOn'].map(n => grab(t, n)); };
const pp = pieces('pay.js'), ps = pieces('share.js');
ok(pp[3] && ps[3] && pp[2] === ps[2] && pp[3] === ps[3], 'A: homeOwedOn + oopFromHtml are byte-identical in pay.js and share.js', pp[3] ? (pp[3].length + '/' + (ps[3] || '').length) : 'absent');
const fakeDb = (ct, html, extra) => async (url) => {
  url = String(url);
  const J = v => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
  if (url.includes('share_token=eq.')) return J([{ id: 'd1', project_id: 'p1', project: 'Job', title: 'Invoice — Job', total: 9000, html: '<html><body><table><tr><td id="invTotal">$9,000.00</td></tr><tr><td id="invPaid">x</td></tr><tr><td id="estTotal">x</td></tr></table></body></html>', signed_at: null }]);
  if (url.includes('/collections')) return J(url.includes('source') ? COLLS : COLLS.map(c => ({ amount: c.amount })));
  if (url.includes('/inspection_reports?project_id')) return J([{ title: 'Contract — Job', total: 9000, signed_at: '2026-09-01', html: html }]);
  if (url.includes('/inspection_reports?select=title,html,signed_at')) return J([{ title: 'Contract — Job', signed_at: '2026-09-01', html: html }]);
  if (url.includes('/contracts')) return J([]);
  if (url.includes('/estimates')) return J([]);
  if (url.includes('/projects')) return J([{ checklist: JSON.stringify({ lead: { claim_type: ct } }) }]);
  return J(extra || []);
};
if (pp[3]) {
  const fn = new AsyncFunction('fetch', 'SUPABASE_URL', pp[0] + '\n' + pp[1] + '\n' + pp[2] + '\n' + pp[3] + '\nreturn homeOwedOn;');
  const run = async html => (await fn(fakeDb('insurance', html), 'https://x'))({}, { project_id: 'p1' });
  const a = await run('<p>contract</p>' + BOX), b = await run('<p>contract, signed before 1324</p>'), c = await run(BOX.replace('$1,500.00', '[0.00]'));
  ok(a && a.cents === 80000 && a.totalCents === 150000 && a.paidCents === 70000, 'A: $1,500 part − ($500 cash + $200 financing) = $800; carrier and partner money not counted', JSON.stringify(a));
  ok(b === null && c === null, 'A: no box → null; an unfilled "[0.00]" → null', JSON.stringify([b, c]));
} else { ok(false, 'A: the rule executes', 'homeOwedOn absent'); ok(false, 'A: no-box answers null', 'homeOwedOn absent'); }

/* ---------- B/C: share.js and pay.js, executed ---------- */
const procEnv = { SUPABASE_SERVICE_ROLE_KEY: 'srk', STRIPE_SECRET_KEY: 'sk' };
const mkRes = () => { const res = { code: 0, body: '', headers: {} };
  res.status = c => { res.code = c; return res; }; res.send = b => { res.body = String(b ?? ''); return res; };
  res.json = b => { res.body = JSON.stringify(b); return res; }; res.setHeader = (k, v) => { res.headers[k] = v; };
  res.writeHead = (c, h) => { res.code = c; Object.assign(res.headers, h || {}); }; res.end = () => {}; return res; };
const load = (text, params) => new AsyncFunction(...params, text
  .replace(/^import\s+Stripe\s+from\s+'stripe';\s*$/m, '')
  .replace(/^export default async function handler/m, 'async function handler')
  .replace(/^export\s*\{[^}]*\};?.*$/m, '')
  .replace(/^export\s+(async\s+)?function\s+/mg, '$1function ') + '\nreturn handler;');
const TOK = 'abcdef0123456789abcdef01';
{
  const run = async (ct, html) => { const h = await load(src('share.js'), ['fetch', 'process'])(fakeDb(ct, html), { env: procEnv }); const res = mkRes(); await h({ query: { t: TOK }, headers: { host: 'app.test' } }, res); return res; };
  const n = await run('insurance', BOX), nb = await run('insurance', '<p>old</p>'), r = await run('retail', BOX);
  const bar = b => /\/api\/pay\?t=/.test(b), amt = (b, v) => b.includes(v);
  ok(n.code === 200 && bar(n.body) && amt(n.body, '$800.00') && /id="invTotal"[^>]*>\$1,500\.00/.test(n.body), 'B: insurance invoice page: pay bar for $800, summary Your part $1,500', 'bar=' + bar(n.body) + ' 800=' + amt(n.body, '$800.00'));
  ok(nb.code === 200 && !bar(nb.body), 'B: insurance with no box: no pay bar (1377 kept)', 'bar=' + bar(nb.body));
  ok(r.code === 200 && bar(r.body) && /id="invTotal"[^>]*>\$9,000\.00/.test(r.body), 'B: retail invoice page unchanged (the whole job)', 'bar=' + bar(r.body));
}
{
  const made = [];
  class StripeStub { constructor() { this.checkout = { sessions: { create: async o => { made.push(o); return { url: 'https://checkout.test/s' }; } } }; this.paymentIntents = { search: async () => ({ data: [] }) }; } }
  const run = async (ct, html) => { made.length = 0; const h = await load(src('pay.js'), ['Stripe', 'fetch', 'process'])(StripeStub, fakeDb(ct, html), { env: procEnv }); const res = mkRes(); await h({ query: { t: TOK }, headers: { host: 'app.test' } }, res);
    const li = made[0] && made[0].line_items; return { code: res.code, body: res.body.slice(0, 120), cents: li ? li[0].price_data.unit_amount : null }; };
  const n = await run('insurance', BOX), nb = await run('insurance', '<p>old</p>'), r = await run('retail', BOX);
  ok(n.code === 303 && n.cents === 80000, 'C: insurance checkout is for exactly $800', JSON.stringify(n));
  ok(nb.code === 400 && nb.cents === null && /not paid online/i.test(nb.body), 'C: insurance with no box: 400, no checkout', JSON.stringify(nb));
  ok(r.code === 303 && r.cents === (9000 - 8800) * 100, 'C: retail checkout unchanged (job − everything collected)', JSON.stringify(r));
}
/* ---------- D: sms-link ---------- */
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g1378-')); const f = path.join(tmp, 'sms.mjs'); fs.copyFileSync(path.join(APIDIR, 'sms-link.js'), f);
  const mod = await import('file://' + f);
  process.env.TWILIO_ACCOUNT_SID = 'ACgate0000000000000000000000000000'; process.env.TWILIO_AUTH_TOKEN = 'gate-token'; process.env.TWILIO_FROM = '+19375550000';
  const run = async html => { let tw = 0; const real = global.fetch;
    global.fetch = async u => { u = String(u);
      if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
      if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => ([{ id: 'p', name: 'Client P', phone: '9375550101', checklist: JSON.stringify({ lead: { claim_type: 'insurance' } }) }]) };
      if (u.includes('/rest/v1/inspection_reports')) return { ok: true, json: async () => ([{ title: 'Contract — Job', signed_at: '2026-09-01', html }]) };
      if (u.includes('twilio.com')) { tw++; return { ok: true, status: 201, json: async () => ({ sid: 'SM' }), text: async () => '{}' }; }
      return { ok: true, json: async () => ({}), text: async () => '' }; };
    let out = null; const res = { status() { return this; }, json(j) { out = j; return this; } };
    try { await mod.default({ method: 'POST', headers: { authorization: 'Bearer x', host: 'app.cardinalroster.com' }, body: { project_id: 'p', url: 'https://app.cardinalroster.com/api/share?t=abcdefgh1234' } }, res); }
    finally { global.fetch = real; }
    return { out, tw }; };
  const y = await run(BOX), nb = await run('<p>old</p>');
  ok(y.tw === 1, 'D: insurance with the homeowner\'s part on its contract: Company text sends', JSON.stringify(y));
  ok(nb.tw === 0 && nb.out && nb.out.reason === 'insurance', 'D: insurance with no box: refused, Twilio not called', JSON.stringify(nb));
}
/* ---------- E: receipt ---------- */
ok(/ct === 'insurance' \? \(inv \? await homeOwedOn\(sbH, inv\) : null\)/.test(src('receipt.js')) && /import \{ owedOn, homeOwedOn \} from '\.\/pay\.js'/.test(src('receipt.js')), 'E: the receipt reads the homeowner\'s part on an insurance job (source)');

/* ---------- F: the app ---------- */
const P = (id, ct) => ({ id, name: 'Client ' + id, stage: 'Completed', address: '1 Main St', phone: '9375550101', email: 'c@example.com',
  checklist: JSON.stringify({ lead: { claim_type: ct } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (pid, html) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — ' + pid, total: 9000, signed_at: '2026-09-01T12:00:00Z', html, status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const K = (pid, i, amt, srcv) => ({ id: 'k' + pid + i, project_id: pid, amount: amt, source: srcv, collected_at: '2026-10-01', created_at: '2026-10-01T12:00:00Z', type: 'deposit' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('n1', 'insurance'), P('n2', 'insurance')],
  inspection_reports: [C('n1', '<p>contract</p>' + BOX), C('n2', '<p>signed before 1324</p>')],
  collections: [K('n1', 1, 8000, 'insurance'), K('n1', 2, 100, 'partner'), K('n1', 3, 500, null), K('n1', 4, 200, 'finance'), K('n2', 1, 8000, 'insurance')],
  appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept().catch(() => {}));
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  const make = id => page.evaluate(async id => {
    let msg = ''; const orig = window.crTell; window.crTell = function (m) { msg = String(m); try { return orig.apply(this, arguments); } catch (_) {} };
    const pr = cacheProjects.find(p => p.id === id); await createInvoiceFor(pr); await new Promise(r => setTimeout(r, 900));
    window.crTell = orig; try { closeEditor && closeEditor(); } catch (_) {}
    const row = (window.cacheRows || []).filter(r => r.project_id === id && /^invoice/i.test(r.title || '')).pop();
    let link = null; try { link = await window.CardinalAR.payLink(id).then(u => 'url:' + u, e => 'err:' + (e && e.message || e)); } catch (e) { link = 'threw:' + e; }
    return { html: row ? String(row.html || '') : '', total: row ? row.total : null, msg, link };
  }, id);
  const a = await make('n1'), b = await make('n2');
  const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  ok(/Your part \(deductible \+ upgrades\)\s*\$1,500\.00/.test(txt(a.html)) && /You have paid\s*−?\s*\$700\.00/.test(txt(a.html).replace(/&#8722;/g, '−')) && /\$800\.00/.test(txt(a.html)), 'F: insurance invoice prints Your part $1,500.00, You have paid $700.00, Balance due $800.00', txt(a.html).match(/Your part[^.]*\.\d\d[^.]*\.\d\d[^.]*\.\d\d/) ? txt(a.html).match(/Your part[^.]*\.\d\d[^.]*\.\d\d[^.]*\.\d\d/)[0] : 'not found');
  ok(Number(a.total) === 9000 && !/id="invLines"/.test(a.html), 'F: its stored total stays the job\'s (A/R reads it) and no job line table is seeded onto it', String(a.total));
  ok(/^url:/.test(a.link), 'F: the link maker gives the insurance invoice a link', a.link);
  ok(!/Your part/.test(b.html) && /by hand/i.test(b.msg) && /^err:.*by hand/i.test(b.link), 'F: no box: job figures kept, the toast and the link maker say it goes by hand', JSON.stringify({ msg: b.msg.slice(0, 80), link: b.link.slice(0, 80) }));
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1378 RED — ${pass} passed, ${fail} failed` : `GATE 1378 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
