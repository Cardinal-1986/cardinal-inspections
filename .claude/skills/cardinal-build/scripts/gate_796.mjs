/* gate_796.mjs — the Payments card goes; Money In moves next to Payment Info.
 *
 *   node gate_796.mjs [path/to/index.html]
 *
 *   A. the Payments pill is gone from the Overview
 *   B. History survives, and its toggle still works (shared .kpsec shell)
 *   C. Money In & Commissions is a row directly under Payment Information,
 *      and the Job Menu no longer carries it as an orphan tile
 *   D. THE ONE THAT MATTERS: tapping it still opens #tab-commissions. Deleting
 *      the tile instead of moving it would have stranded that whole pane —
 *      it was the only door to it anywhere in the app.
 *   E. Payment Information still opens, and still lists the payments the
 *      deleted card was showing. This is the evidence for the deletion, so it
 *      is asserted rather than asserted-about.
 *   F. an insurance profile is unaffected
 *
 * Negative control: run against 795 — must go RED, not crash.
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
const FILE = process.argv[2] || ROOT + '/index.html';
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_796 on ' + FILE);

/* two real payments, so "Payment Information shows what the card showed" is a
   measurement and not a claim */
const PAYMENTS = [
  { dir: 'in',  amt: 2500, date: '2026-07-02', method: 'Check', check: '1187', note: 'Deposit' },
  { dir: 'out', amt: 400,  date: '2026-07-19', method: 'ACH',   note: 'Dumpster' }
];

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed',
    address: '804 Burleigh Avenue, Dayton, OH 45402', email: 'bob@debuild.com', phone: '937-333-9192',
    claim_type: kind,
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-08-06T10:00:00Z', lead: { claim_type: kind },
      job_category: 'Residential', work_type: 'New', lead_source: 'Referral',
      trades: ['Roofing'], manual_value: 12000, payments: PAYMENTS }),
    created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
});

async function boot(width, kind) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 1000 },
    deviceScaleFactor: 2, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, mkSeed(kind));
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  });
  await page.evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); });
  await page.waitForTimeout(1800);
  return { browser, page };
}
const vis = () => {
  window.__v = el => !!(el && el.getClientRects().length && getComputedStyle(el).display !== 'none');
};

/* ======================================================================= */
const P = await boot(402, 'retail');
await P.page.evaluate(vis);

console.log('\n--- A. the Payments pill is gone ---');
const A = await P.page.evaluate(() => ({
  kpPay: !!document.getElementById('kpPay'),
  payBtn: !!document.querySelector('.kppaybtn'),
  /* the pill's HEADING, not its empty-state copy. "No payments logged yet."
     only renders when the log is empty, and this seed has two payments — so
     that assertion passed on BOTH builds and proved nothing. The heading is
     there either way. */
  heads: Array.from(document.querySelectorAll('#acxMount .kpst')).map(e => (e.textContent || '').trim()),
  bar: !!document.querySelector('#acxMount .kppaybar')
}));
ok('no #kpPay in the Overview', !A.kpPay, JSON.stringify({ kpPay: A.kpPay }));
ok('no "Open payments" button and no Paid bar', !A.payBtn && !A.bar, JSON.stringify(A));
ok('no Payments heading left in the card stack',
  !A.heads.some(h => /Payments/i.test(h)), JSON.stringify(A.heads));

console.log('\n--- B. History survives, toggle and all ---');
const B = await P.page.evaluate(async () => {
  const h = document.getElementById('kpHis');
  if (!h) return { none: true };
  const body = h.querySelector('.kpsecb');
  const before = window.__v(body);
  const head = h.querySelector('.kpsech');
  if (!head) return { none: true };
  head.click();
  await new Promise(r => setTimeout(r, 250));
  const after = window.__v(body);
  head.click();
  await new Promise(r => setTimeout(r, 250));
  return { none: false, label: (h.textContent || '').trim().slice(0, 12),
    before, after, back: window.__v(body) };
});
ok('History still renders', !B.none && /History/.test(B.label || ''), JSON.stringify(B.label));
ok('and its toggle still opens and closes it',
  !B.none && B.before !== B.after && B.back === B.before, JSON.stringify(B));

console.log('\n--- C. Money In is a row under Payment Information ---');
const C = await P.page.evaluate(() => {
  const pay = document.getElementById('dbPayRow'), money = document.getElementById('dbMoneyRow');
  const menu = document.getElementById('acxMount');
  const tiles = menu ? Array.from(menu.querySelectorAll('.jabox')).map(t => (t.querySelector('.jbl') || {}).textContent) : [];
  const rows = menu ? Array.from(menu.querySelectorAll('.jaboxrow')) : [];
  if (!pay || !money) return { none: true, tiles, hasMoneyTile: tiles.some(t => /Money In/i.test(t || '')) };
  const a = pay.getBoundingClientRect(), b = money.getBoundingClientRect();
  const sa = getComputedStyle(pay), sb = getComputedStyle(money);
  /* 797 merged Payment Information into #dbMoneyCard and reparented that card
     ABOVE the client band (syncMoneyCard); Money In & Commissions stays its own
     row in the menu, full-bleed. Adjacency is gone BY DESIGN — what must hold
     now is: pay lives inside the merged card, money follows it in document
     order and sits below it, and both are still .dbrow peers. */
  const card = document.getElementById('dbMoneyCard');
  return { none: false,
    payInCard: !!(card && card.contains(pay)),
    below: b.top >= a.bottom - 1,
    afterCard: !!(card && (money.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_PRECEDING)),
    sameLook: pay.classList.contains('dbrow') && money.classList.contains('dbrow')
              && sa.fontSize === sb.fontSize,
    fullBleed: Math.round(b.left) <= 1 && Math.round(b.right) >= window.innerWidth - 1,
    text: (money.textContent || '').trim(),
    tiles, hasMoneyTile: tiles.some(t => /Money In/i.test(t || '')),
    /* the paired rows must stay paired; a row is only allowed a lone tile when
       it is EXPLICITLY full-width (849's Work Orders row sets
       grid-template-columns:1fr). 981/1076 legitimately grew one row to 4 —
       a 2-column grid wrapping into two full pairs — so the orphan test is
       "odd count in a 2-column row", not "exactly two". */
    rowShapes: rows.map(r => ({ n: r.querySelectorAll('.jabox').length,
      cols: getComputedStyle(r).gridTemplateColumns.split(' ').length })) };
});
ok('the Money In row exists, below the merged Payment Information card (797 layout)',
  !C.none && C.payInCard && C.below && C.afterCard,
  JSON.stringify({ payInCard: C.payInCard, below: C.below, afterCard: C.afterCard }));
ok('and it is still a .dbrow peer of Payment Information, full-bleed per 797',
  !C.none && C.sameLook && C.fullBleed, JSON.stringify({ sameLook: C.sameLook, fullBleed: C.fullBleed }));
ok('labelled Money In & Commissions',
  !C.none && /Money In & Commissions/.test(C.text || ''), JSON.stringify(C.text));
ok('the Job Menu no longer carries a Money In tile',
  !C.hasMoneyTile, JSON.stringify(C.tiles));
ok('and no Job Menu row is left with a single orphan tile',
  !C.none && C.rowShapes.length > 0
  && C.rowShapes.every(r => r.cols === 1 ? true : r.n % r.cols === 0),
  JSON.stringify(C.rowShapes));

console.log('\n--- D. it still opens the commissions pane (the reason it moved) ---');
const D = await P.page.evaluate(async () => {
  const money = document.getElementById('dbMoneyRow');
  const tab = document.getElementById('tab-commissions');
  if (!money || !tab) return { none: true, hasRow: !!money, hasTab: !!tab };
  const before = window.__v(tab);
  money.click();
  await new Promise(r => setTimeout(r, 900));
  return { none: false, before, after: window.__v(tab) };
});
ok('#tab-commissions is closed to begin with', !D.none && D.before === false, JSON.stringify(D));
ok('tapping Money In opens it — the pane is NOT stranded',
  !D.none && D.after === true, JSON.stringify(D));
await P.browser.close();

console.log('\n--- E. Payment Information shows what the deleted card showed ---');
const E1 = await boot(402, 'retail');
await E1.page.evaluate(vis);
const E = await E1.page.evaluate(async () => {
  const pay = document.getElementById('dbPayRow');
  const view = document.getElementById('paymentsView');
  if (!pay || !view) return { none: true };
  const before = window.__v(view);
  pay.click();
  await new Promise(r => setTimeout(r, 900));
  const txt = (document.getElementById('paySummary') || {}).textContent || '';
  return { none: false, before, after: window.__v(view),
    /* both rows from the seed, and the sections the pill never had */
    deposit: /Deposit/.test(txt), dumpster: /Dumpster/.test(txt),
    /* the labels the app actually ships, read out of PAY_SECTIONS at ~13832.
       I first guessed "Paid out" and the gate went red on a correct app — the
       middle section is called "Paid". Half of all reds here are the test's
       fault; this was one. */
    sections: ['Received', 'Paid', 'Additional Job Expenses'].filter(s => new RegExp(s, 'i').test(txt)),
    canAdd: document.querySelectorAll('#paySummary .payadd').length };
});
ok('Payment Information still opens', !E.none && E.before === false && E.after === true, JSON.stringify(E));
ok('it lists BOTH payments the card was showing',
  !E.none && E.deposit && E.dumpster, JSON.stringify({ deposit: E.deposit, dumpster: E.dumpster }));
ok('...split into sections, with a way to add — which the card never had',
  !E.none && E.sections.length === 3 && E.canAdd >= 3, JSON.stringify({ sections: E.sections, add: E.canAdd }));
await E1.browser.close();

console.log('\n--- F. insurance is unaffected ---');
const F1 = await boot(402, 'insurance');
await F1.page.evaluate(vis);
const F = await F1.page.evaluate(() => ({
  kpPay: !!document.getElementById('kpPay'),
  kpHis: !!document.getElementById('kpHis')
}));
ok('an insurance profile has neither pill, as before (that block is gated on it)',
  !F.kpPay && !F.kpHis, JSON.stringify(F));
await F1.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
