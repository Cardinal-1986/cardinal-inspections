/* gate_1314 — one balance everywhere.
 *   S1  share page (owedOn) adds manual extras: $20k signed contract + $2k extras − $5k paid → $17,000.00
 *   S2  ...and reads the contracts TABLE: $20k there, no contract doc, $5k paid → $15,000.00
 *   S3  pay.js: a bank payment still processing refuses a second checkout (409); none → checkout for the same $17,000.00
 *   S4  remind.js totals the job the same way (contracts table + manual extras) and owedOn is byte-identical in pay/share
 *   A1  Paid this month counts this month's payment ($5,000), not $0
 *   A2  a failed payments read keeps the last good figures and says so
 *   A3  the worksheet has no Amount Collected box and offers Record payment
 *   A4  "From signed contracts" goes to Record payment; saving an invoice keeps its total; heading is INVOICE
 * Arg: [root] -> negative control (1313 tree: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const ROOT = (process.argv[2] || '/home/user/cardinal-inspections').replace(/\/$/, '') + '/';
const APP_HTML = fs.readFileSync(ROOT + 'index.html', 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const today = new Date().toISOString().slice(0, 10);
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [{ id: 'j1', name: 'Dana Test', stage: 'Invoiced', address: '1 Main St', phone: '', email: '', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  inspection_reports: [{ id: 'c1', project_id: 'j1', title: 'Contract — Dana Test', total: 20000, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  collections: [{ id: 'k1', project_id: 'j1', amount: 5000, collected_at: today, created_at: today + 'T12:00:00Z', type: 'deposit' }],
  appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Curtis' };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  return { ctx, page };
}


function stubFetch(o){
  globalThis.fetch = async (url) => {
    const u = String(url); const j = b => ({ ok: true, status: 200, json: async () => b });
    if (u.includes('share_token=eq.')) return j([{ id: 'inv1', project_id: 'j1', project: 'Dana Test', html: o.html || '<html><body><p>Invoice</p></body></html>', title: 'Invoice — Dana Test', total: o.invTotal == null ? 20000 : o.invTotal, signed_at: null }]);
    if (u.includes('/collections')) return j([{ amount: 5000 }]);
    if (u.includes('/inspection_reports?project_id')) return j(o.docs);
    if (u.includes('/contracts?project_id')) return j(o.table || []);
    if (u.includes('/projects?id=eq.')) return j([{ checklist: JSON.stringify(o.ck || {}) }]);
    return j([]);
  };
}
async function shareBar(o){
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'; stubFetch(o);
  const mod = await import(ROOT + 'api/share.js?v=' + Math.random());
  let body = ''; await mod.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-000000000001' }, headers: {} }, { status() { return this; }, setHeader() {}, send(b) { body = b; }, end(b) { body = b || body; } });
  const i = body.indexOf('id="crPayBar"'); if (i < 0) return 'no bar';
  return (body.slice(i, i + 3000).match(/\$[\d,]+\.\d\d/) || ['no amount'])[0];
}
const DOC = [{ title: 'Contract — Dana Test', total: 20000, signed_at: '2026-09-01' }];
try {
  ok(await shareBar({ docs: DOC, ck: { manual_value: 2000 } }) === '$17,000.00', 'S1  $20k contract + $2k extras − $5k paid → the link asks $17,000.00', await shareBar({ docs: DOC, ck: { manual_value: 2000 } }));
  const s2 = await shareBar({ docs: [], table: [{ total: 20000, homeowner_signed_at: '2026-09-01', voided_at: null }], invTotal: 1 });
  ok(s2 === '$15,000.00', 'S2  contract in the contracts table only → $15,000.00', s2);
  // S3 — pay.js with a stand-in Stripe
  const src = fs.readFileSync(ROOT + 'api/pay.js', 'utf8').replace("import Stripe from 'stripe';", 'const Stripe = globalThis.__FakeStripe;');
  const tmp = '/tmp/claude-0/-home-user-cardinal-inspections/11285e75-bb52-5439-bd47-dc24e2a32109/scratchpad/pay_' + Math.random().toString(36).slice(2) + '.mjs';
  fs.writeFileSync(tmp, src);
  const runPay = async (processing) => {
    let made = null, code = 0, loc = '';
    globalThis.__FakeStripe = function(){ return {
      paymentIntents: { search: async () => ({ data: processing ? [{ id: 'pi_1' }] : [] }) },
      checkout: { sessions: { create: async (o) => { made = o; return { url: 'https://stripe.test/x' }; } } } }; };
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'; process.env.STRIPE_SECRET_KEY = 'sk_test'; stubFetch({ docs: DOC, ck: { manual_value: 2000 } });
    const mod = await import(tmp + '?v=' + Math.random());
    const res = { status(c) { code = c; return this; }, setHeader() {}, send() {}, writeHead(c, h) { code = c; loc = (h && h.Location) || ''; }, end() {} };
    await mod.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-000000000001', m: 'bank' }, headers: { host: 'app.test' } }, res);
    return { code, made };
  };
  const p1 = await runPay(true), p2 = await runPay(false);
  ok(p1.code === 409 && !p1.made, 'S3  a bank payment still processing → no second checkout (409)', 'code ' + p1.code + (p1.made ? ' — checkout created' : ''));
  const amt = p2.made && p2.made.line_items && p2.made.line_items[0].price_data.unit_amount;
  ok(p2.code === 303 && amt === 1700000, 'S3  nothing processing → checkout for $17,000.00, the same as the app', 'code ' + p2.code + ' amount ' + amt);
  try { fs.unlinkSync(tmp); } catch (_) {}
  const rem = fs.readFileSync(ROOT + 'api/remind.js', 'utf8');
  ok(/rest\/v1\/contracts\?project_id=/.test(rem) && /manual_value/.test(rem) && /Math\.max\(contractTotal, ctrByP\[pid\]/.test(rem), 'S4  remind.js totals the job with the contracts table and manual extras');
  const ow = f => { const s = fs.readFileSync(ROOT + 'api/' + f, 'utf8'); const a = s.indexOf('async function owedOn'); return s.slice(a, s.indexOf('\n}\n', a)); };
  ok(ow('pay.js') === ow('share.js') && ow('pay.js').length > 500, 'S4  owedOn is byte-identical in pay.js and share.js');

  const { ctx, page } = await boot(null, false);
  await page.waitForTimeout(800);
  const a = await page.evaluate(async () => {
    const out = {};
    try { window.CardinalAR.open(); } catch (e) { out.openErr = String(e); }
    await new Promise(r => setTimeout(r, 900));
    const k = document.getElementById('crarKpiMonth'); out.month = k ? k.textContent.trim() : null;
    out.hasDate = !!(cacheCollections[0] && cacheCollections[0].collected_at);
    try { window.CardinalAR.close(); } catch (_) {}
    const pr = cacheProjects.find(p => p.id === 'j1');
    let m = document.getElementById('wsMount'); if (!m) { m = document.createElement('div'); m.id = 'wsMount'; document.body.appendChild(m); }
    renderWorksheet(pr, jobFinance(pr));
    out.wsInput = !!m.querySelector('.wspaid'); out.wsRecord = !!m.querySelector('[data-wsrecord]'); out.wsText = m.textContent.replace(/\s+/g, ' ').slice(0, 300);
    out.before = collPaid.j1;
    const told = []; const keep = window.crTell; window.crTell = function(t){ told.push(String(t)); };
    const orig = moneyDb.collections; moneyDb.collections = async function(){ throw new Error('boom'); };
    try { await reload(); } catch (e) { out.reloadErr = String(e); }
    moneyDb.collections = orig; window.crTell = keep;
    out.after = collPaid.j1; out.told = told.join(' | ');
    out.title = /<span>INVOICE<\/span>/.test(INVOICE_TEMPLATE) && !/SERVICE <span>INVOICE/.test(INVOICE_TEMPLATE);
    return out;
  });
  await ctx.close();
  /* the mock hands back every column whatever the select asks for, so the render alone cannot
     see the bug — the select the app actually sends has to name collected_at */
  ok(/from\('collections'\)\.select\('project_id,amount,collected_at/.test(APP_HTML), 'A1  the payments load asks for the date paid (collected_at)');
  ok(a.hasDate && /5,000/.test(a.month || ''), 'A1  Paid this month reads $5,000 (the payment made today)', JSON.stringify({ month: a.month, hasDate: a.hasDate, err: a.openErr }));
  ok(a.before === 5000 && a.after === 5000 && /did not load/i.test(a.told), 'A2  a failed payments read keeps $5,000 paid and says so', JSON.stringify({ before: a.before, after: a.after, told: a.told }));
  ok(!a.wsInput && a.wsRecord && /Balance due/.test(a.wsText), 'A3  worksheet: no Amount Collected box, a Record payment button, Paid · Balance due line', a.wsText);
  const APP = APP_HTML;
  ok(/data-paycontracts\]'\)\)\{ payGoLogCollection\(\); return; \}/.test(APP), 'A4  "From signed contracts" goes to Record payment');
  ok(/if\(tot !== null && !\/\^invoice\/i\.test\(fields\.title\)\) fields\.total = tot;/.test(APP), 'A4  saving an invoice does not overwrite its total');
  ok(a.title === true, 'A4  the heading reads INVOICE, not SERVICE INVOICE');
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1314: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
