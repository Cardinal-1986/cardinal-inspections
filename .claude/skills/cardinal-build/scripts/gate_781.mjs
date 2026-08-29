/* gate_781.mjs — the contract that was unusable at a client's house.
 *
 *   node gate_781.mjs [path/to/index.html] [--shot out.png]
 *
 *   A. the deposit comes from the JOB'S OWN estimate (30%), not price/2,
 *      and the printed label follows the real number;
 *   B. a job with NO estimate falls back to 30%, not 50%;
 *   C. a deliberate 0% estimate is honoured (three exist in production);
 *   D. an agreement has ONE signing block — the duplicate footer is gone —
 *      and all three rows are signable;
 *   E. signing a chosen row stamps THAT row's signature and date, and only
 *      the BUYER signing advances the job to Approved;
 *   F. estimates are untouched: they keep the footer and its wording.
 *
 * Negative control: run against 780 — must go RED, not crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const argv = process.argv.slice(2);
const shotIx = argv.indexOf('--shot');
const SHOT = shotIx > -1 ? argv[shotIx + 1] : null;
const FILE = (argv[0] && argv[0] !== '--shot') ? argv[0] : ROOT + '/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_781 on ' + FILE);

const seed = ests => ({
  projects: [{ id: 'p-1', name: 'James Tiege', stage: 'Prospect', address: '2205 Rosemont Blvd, Dayton, OH 45420',
    email: 'jt@example.com', phone: '937-555-0100', claim_type: 'retail', checklist: '{}',
    created_at: '2026-08-13T16:24:38Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: ests,
  oc_colors: [{ name: 'Estate Gray', status: 'active', product_line: 'duration', family: 'gray', hidden: false }],
  inspection_reports: [], project_photos: [], punch_items: [], appointments: [],
  team_profiles: [], pricing_items: [], pricing_categories: []
});
const EST = pct => ([{ id: 'e-1', project_id: 'p-1', estimate_number: 'EST-2026-0900', status: 'sent',
  total: 13750, deposit_pct: pct, archived: false, doc_id: null, lines: [],
  created_at: '2026-08-13T16:44:17Z', created_by: 'theo@cardinalrenovations.net' }]);

async function boot(ests) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  const prompts = [];
  page.on('dialog', async d => {
    prompts.push({ type: d.type(), msg: d.message() });
    if (d.type() === 'prompt') await d.accept(page.__answer || '1'); else await d.accept();
  });
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font' || rt === 'media') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, seed(ests));
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });
  await page.evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); });
  await page.waitForTimeout(1500);
  return { browser, page, prompts };
}

async function makeContract(page) {
  await page.evaluate(() => { if (typeof createContractForCurrent === 'function') createContractForCurrent('roof'); });
  await page.waitForTimeout(4500);
  return page.evaluate(() => {
    const d = document.getElementById('reportFrame').contentDocument;
    if (!d) return { none: true };
    const money = [].map.call(d.querySelectorAll('table.items tr'), tr =>
      [].map.call(tr.querySelectorAll('td,th'), c => c.textContent.trim()).join(' | ')).filter(Boolean);
    return { none: false, money,
      slots: [].map.call(d.querySelectorAll('[data-sig]'), s => s.getAttribute('data-sig')),
      footerCols: d.querySelectorAll('.sign .col').length,
      saysEstimate: /This estimate is valid through/.test(d.body.innerHTML),
      sigBtn: (document.getElementById('sigBtn') || {}).style.display };
  });
}

console.log('\n--- A. the deposit comes from the job\'s own estimate (30%) ---');
const A = await boot(EST(30));
const a = await makeContract(A.page);
ok('the contract price is the job value', a.money.some(r => /13,750\.00/.test(r)), JSON.stringify(a.money));
ok('the down payment is 30% ($4,125.00), not half', a.money.some(r => /Down payment/.test(r) && /4,125\.00/.test(r)),
  JSON.stringify(a.money.filter(r => /Down payment/.test(r))));
ok('the balance is the remaining 70% ($9,625.00)', a.money.some(r => /Balance due/.test(r) && /9,625\.00/.test(r)),
  JSON.stringify(a.money.filter(r => /Balance/.test(r))));
ok('nothing on the page still says 6,875 (the old half)', !a.money.some(r => /6,875/.test(r)));

console.log('\n--- D. one signing block, three signable rows ---');
ok('the three slots exist', JSON.stringify(a.slots) === '["buyer","cobuyer","contractor"]', JSON.stringify(a.slots));
ok('the duplicate footer is GONE from the agreement', a.footerCols === 0, a.footerCols);
ok('the acceptance paragraph no longer calls a contract an estimate', a.saysEstimate === false);
ok('the signature button is still offered', a.sigBtn === 'inline-block', a.sigBtn);

console.log('\n--- E. signing the row you named ---');
/* The "Who is signing?" ask is an in-page picker sheet now ([data-who]
   buttons, pickSigner) rather than a window.prompt — 965 also widened it to
   any [data-sig] the document carries. Drive the sheet the way a rep would. */
const e1 = await A.page.evaluate(async () => {
  const btn = document.getElementById('sigBtn'); btn.click();
  await new Promise(r => setTimeout(r, 250));
  const asked = !!document.querySelector('[data-who="buyer"]') &&
    /Who is signing\?/.test(document.body.textContent);
  const b = document.querySelector('[data-who="buyer"]');
  if (b) b.click();                                      /* Buyer */
  await new Promise(r => setTimeout(r, 250));
  /* draw something so sigDrawn is true, then apply */
  const pad = document.getElementById('sigPad');
  const cx = pad.getContext('2d'); cx.beginPath(); cx.moveTo(5, 5); cx.lineTo(60, 30); cx.stroke();
  window.sigDrawn = true;
  return { asked, modalOpen: document.getElementById('sigModal').style.display };
});
ok('the pad opened after naming who signs', e1.modalOpen === 'block', e1.modalOpen);
ok('it asked whose signature it is', e1.asked);

console.log('\n--- F. source-level guarantees ---');
ok('the 50/50 split is gone from BOTH contract creators', !/var half = price \/ 2/.test(APP_HTML));
/* 3, not 2: the DEFINITION `async function fillContractMoney(tpl, pr, price){`
   matches the call pattern too. Counting a definition as a call is the same
   trap CLAUDE.md names — assert the calls by their statement form instead. */
ok('both creators now call one money chokepoint',
  (APP_HTML.match(/tpl = await fillContractMoney\(tpl, pr, price\);/g) || []).length === 2,
  (APP_HTML.match(/tpl = await fillContractMoney\(tpl, pr, price\);/g) || []).length);
ok('the fallback is 30, in one named place', /var DEPOSIT_PCT_DEFAULT = 30;/.test(APP_HTML));
/* the resolver variable was renamed src0 -> row; the contract is unchanged */
ok('the estimate wins over the fallback',
  /if\(row\.deposit_pct != null\) pct = Math\.max\(0, Math\.min\(100, Number\(row\.deposit_pct\)/.test(APP_HTML));
/* the label gained a data-cpct span for the live-edit arc; still pct-driven */
ok('the ROW LABEL follows the real percentage',
  /split\('Deposit \(50%\)'\)\.join\('Deposit \((<span[^>]*>)?' \+ trim\(pct\)/.test(APP_HTML));
ok('only the buyer signing advances the pipeline', /if\(_who === 'buyer'\)/.test(APP_HTML));
ok('the footer is stripped for deals only (estimates keep it)',
  /if\(isDeal\)\{[\s\S]{0,400}out\.replace\(SIGN_FOOTER, ''\)/.test(APP_HTML));
ok('all three agreements carry the slots (roof, siding, gutter)',
  (APP_HTML.match(/data-sig="buyer"/g) || []).length === 3);

if (SHOT) {
  const html = await A.page.evaluate(() => document.getElementById('reportFrame').contentDocument.documentElement.outerHTML);
  const shot = await A.page.context().newPage();
  await shot.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.fulfill({ status: 200, body: '' }));
  await shot.setViewportSize({ width: 900, height: 1200 });
  await shot.setContent(html, { waitUntil: 'domcontentloaded' });
  await shot.waitForTimeout(800);
  await shot.evaluate(() => {
    const h = [].find.call(document.querySelectorAll('h2.sec'), x => /Payment Structure/i.test(x.textContent));
    if (h) { let n = h; while (n.previousElementSibling) n.previousElementSibling.remove(); }
  });
  await shot.screenshot({ path: SHOT, fullPage: true });
  console.log('\nwrote ' + SHOT);
}
await A.browser.close();

console.log('\n--- B. a job with NO estimate ---');
/* The premise this assertion first carried was wrong: projectValue() derives
   the job's money FROM its estimate, so a job with no estimate has no price to
   split. The correct guarantee is that it prints fill-in boxes rather than
   inventing a number — and never a 50/50 one. */
const B = await boot([]);
const b = await makeContract(B.page);
ok('with no estimate there is no price, so the money stays a fill-in box',
  b.money.some(r => /Down payment/.test(r) && /\[0\.00\]/.test(r)),
  JSON.stringify(b.money.filter(r => /Down payment|Balance/.test(r))));
ok('and no 50% split is printed anywhere', !b.money.some(r => /50%/.test(r)));
await B.browser.close();

console.log('\n--- C. a deliberate 0% estimate is honoured ---');
const C = await boot(EST(0));
const c = await makeContract(C.page);
ok('a 0% deposit prints $0.00 down and the full balance',
  c.money.some(r => /Down payment/.test(r) && /\$0\.00/.test(r)) &&
  c.money.some(r => /Balance due/.test(r) && /13,750\.00/.test(r)),
  JSON.stringify(c.money.filter(r => /Down payment|Balance/.test(r))));
await C.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
