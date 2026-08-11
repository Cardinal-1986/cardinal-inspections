/* supp.js — build 688: the Suppliers sheet actually opens and is structured
   as a category with ABC as one card. Usage: node supp.js [index.html] */
const path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const c = await b.newContext({ viewport: { width: 1194, height: 900 } });
  const p = await c.newPage();
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForTimeout(1200);
  const R = await p.evaluate(() => {
    const o = {};
    o.hasApi = !!(window.CardinalABC && typeof window.CardinalABC.open === 'function');
    try { window.CardinalABC.open(); } catch (e) { o.threw = String(e).slice(0, 120); }
    const el = document.getElementById('cr-abc');
    o.mounted = !!el;
    if (!el) return o;
    o.h3 = (el.querySelector('.hd h3') || {}).textContent || '';
    o.card = !!el.querySelector('.supp');
    o.cardTitle = (el.querySelector('.supphd') || {}).textContent || '';
    o.envInCard = !!el.querySelector('.supp .supphd .env');
    o.envInHeader = !!el.querySelector('.hd .env');
    o.more = !!el.querySelector('.more');
    // the working parts must all still be inside the card
    o.fields = el.querySelectorAll('.supp [data-f]').length;
    o.search = !!el.querySelector('.supp [data-act="search"]');
    o.results = !!el.querySelector('.supp [data-results]');
    o.status = !!el.querySelector('.supp [data-status]');
    o.emoji = /[\u{1F000}-\u{1FAFF}]/u.test(el.textContent || '');
    return o;
  });
  console.log(`\nsupp — ${FILE}\n`);
  ok(R.hasApi, 'CardinalABC.open exists');
  ok(!R.threw, `open() did not throw (${R.threw || 'clean'})`);
  ok(R.mounted, '#cr-abc mounted');
  ok(R.h3.trim() === 'Suppliers', `the sheet is titled Suppliers (got ${JSON.stringify(R.h3.trim())})`);
  ok(R.card, 'there is a supplier CARD, not just a bare sheet');
  ok(/ABC Supply/.test(R.cardTitle), `the card is ABC Supply (got ${JSON.stringify(R.cardTitle.trim())})`);
  ok(R.envInCard, "ABC's environment chip moved onto its card");
  ok(!R.envInHeader, 'the chip is no longer on the Suppliers header');
  ok(R.more, 'the sheet says another yard can be added here');
  ok(R.fields === 3, `all 3 account fields survive inside the card (got ${R.fields})`);
  ok(R.search && R.results && R.status, 'catalogue search, results and status all still inside the card');
  ok(!R.emoji, 'no emoji left in the sheet');
  await b.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
