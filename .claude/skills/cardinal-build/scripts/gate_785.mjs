/* gate_785.mjs — the contract deposit section is editable and adds up.
 *
 *   node gate_785.mjs [path/to/index.html] [--shot out.png]
 *
 *   A. after lockTemplate the three money cells are ACTUALLY contenteditable
 *      (the whole point — plain text was not, which is why they were dead);
 *   B. typing a new deposit makes the balance follow, and the printed % with it;
 *   C. typing a new balance makes the deposit follow (the other direction);
 *   D. the cell being typed in is never rewritten under the caret;
 *   E. a contract with no price still wires up once a price is typed;
 *   F. it does not touch an ESTIMATE (no #estItems fight, no markers);
 *   G. serialising for save strips contenteditable but keeps the figures.
 *
 * Negative control: run against 784 — must go RED, not crash.
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
console.log('gate_785 on ' + FILE);

const seed = ests => ({
  projects: [{ id: 'p-1', name: 'James Tiege', stage: 'Prospect', address: '2205 Rosemont Blvd, Dayton, OH 45420',
    email: 'jt@example.com', phone: '937-555-0100', claim_type: 'retail', checklist: '{}',
    created_at: '2026-08-13T16:24:38Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: ests,
  oc_colors: [{ name: 'Estate Gray', status: 'active', product_line: 'duration', family: 'gray', hidden: false }],
  inspection_reports: [], project_photos: [], punch_items: [], appointments: [],
  team_profiles: [], pricing_items: [], pricing_categories: []
});
const EST = (pct, amt) => ([{ id: 'e-1', project_id: 'p-1', estimate_number: 'EST-2026-0900', status: 'sent',
  total: 13750, deposit_pct: pct, deposit_amount: amt == null ? null : amt, archived: false, doc_id: null, lines: [],
  created_at: '2026-08-13T16:44:17Z', created_by: 'theo@cardinalrenovations.net' }]);

async function boot(ests) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  page.on('dialog', d => d.accept('1'));
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
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
    if (typeof openProject === 'function') openProject('p-1'); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { if (typeof createContractForCurrent === 'function') createContractForCurrent('roof'); });
  await page.waitForTimeout(4500);
  return { browser, page };
}
const read = page => page.evaluate(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const g = s => d.querySelector(s);
  const txt = e => e ? e.textContent.trim() : null;
  const ed = e => e ? e.getAttribute('contenteditable') : null;
  return { price: txt(g('[data-cprice]')), down: txt(g('[data-cmoney="down"]')), bal: txt(g('[data-cmoney="balance"]')),
    edPrice: ed(g('[data-cprice]')), edDown: ed(g('[data-cmoney="down"]')), edBal: ed(g('[data-cmoney="balance"]')),
    pctDep: txt(g('[data-cpct="dep"]')), pctBal: txt(g('[data-cpct="bal"]')) };
});
/* Type into a cell the way a person does: focus it, select all, type.
   Returns false rather than throwing when the cell is absent — on the 784
   control none of these cells exist, and a crashing harness proves nothing.
   A negative control has to report RED, not blow up. */
async function typeInto(page, sel, value) {
  const found = await page.evaluate(s => {
    const d = document.getElementById('reportFrame').contentDocument;
    const el = d && d.querySelector(s);
    if (!el) return false;
    el.focus();
    const r = d.createRange(); r.selectNodeContents(el);
    const sn = d.defaultView.getSelection(); sn.removeAllRanges(); sn.addRange(r);
    return true;
  }, sel);
  if (!found) { console.log('       (no ' + sel + ' cell to type into)'); return false; }
  await page.keyboard.type(value);
  await page.waitForTimeout(600);      /* past the 250ms debounce */
  return true;
}

console.log('\n--- A. the cells are genuinely editable after lockTemplate ---');
const A = await boot(EST(30, null));
let r = await read(A.page);
ok('the deposit cell is contenteditable', r.edDown === 'true', 'contenteditable=' + r.edDown);
ok('the balance cell is contenteditable', r.edBal === 'true', 'contenteditable=' + r.edBal);
ok('the contract price is contenteditable', r.edPrice === 'true', 'contenteditable=' + r.edPrice);
ok('and they start at the estimate\'s 30%', /4,125\.00/.test(r.down) && /9,625\.00/.test(r.bal), JSON.stringify(r));

console.log('\n--- B. type a deposit, the balance follows ---');
await typeInto(A.page, '[data-cmoney="down"]', '$3,000.00');
r = await read(A.page);
ok('the balance became $10,750.00', /10,750\.00/.test(r.bal || ''), JSON.stringify(r));
ok('the deposit kept exactly what was typed', /3,000\.00/.test(r.down || ''), r.down);

console.log('\n--- C. type a balance, the deposit follows ---');
await typeInto(A.page, '[data-cmoney="balance"]', '$10,000.00');
r = await read(A.page);
ok('the deposit became $3,750.00', /3,750\.00/.test(r.down || ''), JSON.stringify(r));

console.log('\n--- D. the caret is never fought ---');
await typeInto(A.page, '[data-cmoney="down"]', '$5,000.00');
r = await read(A.page);
ok('the typed deposit survived the recalc verbatim', r.down === '$5,000.00', r.down);
ok('the balance followed it to $8,750.00', /8,750\.00/.test(r.bal || ''), r.bal);

console.log('\n--- G. saving strips contenteditable but keeps the figures ---');
const ser = await A.page.evaluate(() => {
  const html = (typeof serializeFrame === 'function') ? serializeFrame() : '';
  return { hasEditable: /contenteditable/i.test(html), keepsDown: /5,000\.00/.test(html), keepsBal: /8,750\.00/.test(html) };
});
ok('no contenteditable attribute is saved', ser.hasEditable === false);
ok('the edited deposit is saved', ser.keepsDown);
ok('the recalculated balance is saved', ser.keepsBal);
if (SHOT) {
  const html = await A.page.evaluate(() => document.getElementById('reportFrame').contentDocument.documentElement.outerHTML);
  const s2 = await A.page.context().newPage();
  await s2.route('**/*', q => q.request().url().startsWith('data:') ? q.continue() : q.fulfill({ status: 200, body: '' }));
  await s2.setViewportSize({ width: 900, height: 560 });
  await s2.setContent(html, { waitUntil: 'domcontentloaded' });
  await s2.waitForTimeout(700);
  await s2.evaluate(() => {
    const h = [].find.call(document.querySelectorAll('h2.sec'), x => /Payment Structure/i.test(x.textContent));
    if (h) { let n = h; while (n.previousElementSibling) n.previousElementSibling.remove(); }
    const c = [].find.call(document.querySelectorAll('h2.sec'), x => /Acknowledgement/i.test(x.textContent));
    if (c) { while (c.nextElementSibling) c.nextElementSibling.remove(); c.remove(); }
  });
  await s2.screenshot({ path: SHOT, fullPage: true });
  console.log('\nwrote ' + SHOT);
}
await A.browser.close();

console.log('\n--- E. a job with no estimate wires up once a price is typed ---');
const E = await boot([]);
r = await read(E.page);
ok('the blank cells are still marked', r.down !== null && r.bal !== null, JSON.stringify(r));
ok('and still editable while blank', r.edDown === 'true', r.edDown);
await typeInto(E.page, '[data-cprice]', '$8,000.00');
await typeInto(E.page, '[data-cmoney="down"]', '$2,400.00');
r = await read(E.page);
ok('typing a price then a deposit computes the balance ($5,600.00)', /5,600\.00/.test(r.bal || ''), JSON.stringify(r));
await E.browser.close();

console.log('\n--- F/source. it leaves estimates and the selector list alone ---');
ok('the editable-selector list is byte-identical to 784',
  /var EDITABLE_SELECTOR = \[\s*'\.ph', '\.fill',/.test(APP_HTML));
ok('wireEstimateCalc still keys off #estItems (contracts have none)',
  /function wireEstimateCalc\(doc\)\{\s*var table = doc\.getElementById\('estItems'\);/.test(APP_HTML));
ok('the recalc does not run on load (a saved contract is never rewritten)',
  /Deliberately NOT called on load/.test(APP_HTML));
ok('the third writer now shares the chokepoint',
  !/var pctLabel/.test(APP_HTML) && /await window\.fillContractMoney\(tpl, project, total, est\)/.test(APP_HTML));
ok('an explicit dollar deposit outranks the percentage',
  /if\(Number\(row\.deposit_amount\) > 0\) down = Number\(row\.deposit_amount\);/.test(APP_HTML));

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
