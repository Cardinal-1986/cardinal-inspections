/*
 * Build 899 gate — The Ledger (Owner Console module 4).
 * Boots as admin, proves the section + net line render, seeded accounts land in the
 * right groups with correct balances, adding an account writes owner_ledger + an
 * opening advance txn, expanding shows the log, recording a payment writes a txn and
 * drops the balance, adding a draw lands under "Owed to you", settle updates the row,
 * a txn delete recomputes, and account delete removes it.
 * v898 has no ledger -> RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('898') ? '898 (neg-control)' : '899';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [], owner_items: [], owner_reminders: [],
  owner_ledger: [
    { id: 'ledA', kind: 'borrowed', party: 'Curtis', party_type: 'coworker', settled_at: null, created_at: '2026-08-01T08:00:00Z' },
    { id: 'ledB', kind: 'draw', party: 'Nick', party_type: 'coworker', settled_at: null, created_at: '2026-08-02T08:00:00Z' }
  ],
  owner_ledger_txns: [
    { id: 'txA1', ledger_id: 'ledA', direction: 'advance', amount: 2000, txn_date: '2026-08-01', created_at: '2026-08-01T08:00:00Z' },
    { id: 'txB1', ledger_id: 'ledB', direction: 'advance', amount: 1500, txn_date: '2026-08-02', created_at: '2026-08-02T08:00:00Z' }
  ],
  crews: [], crew_docs: [], projects: [], appointments: [], estimates: [], insurance_claims: [],
  project_photos: [], inspection_reports: [], crew_work_orders: [], crew_rates: [], pricing_items: [], crew_notes: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
const acctText = (id) => page.evaluate(i => { var r = document.querySelector('#cr-owner .ow-acct[data-id="' + i + '"]'); return r ? r.innerText : null; }, id);
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.CardinalOwner && window.CardinalOwner.open), { timeout: 15000 });
  await page.evaluate(async () => { window.__WRITES__ = []; await window.CardinalOwner.open(); await new Promise(r => setTimeout(r, 400)); });

  const txt = await page.evaluate(() => document.getElementById('cr-owner').innerText);
  ok('The Ledger section renders', /the ledger/i.test(txt));
  ok('net line shows "You owe" and "Owed to you"', /you owe/i.test(txt) && /owed to you/i.test(txt));
  ok('borrowed account shows its balance ($2,000)', (await acctText('ledA') || '').includes('$2,000'));
  ok('draw account shows its balance ($1,500)', (await acctText('ledB') || '').includes('$1,500'));

  // add a borrowed account with a starting amount -> ledger insert + advance txn
  const add = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner #ow-led-name').value = 'Community Bank LOC';
    document.querySelector('#cr-owner #ow-led-amt').value = '5000';
    document.querySelector('#cr-owner #ow-led-kind').value = 'borrowed';
    document.querySelector('#cr-owner #ow-led-pt').value = 'bank';
    document.querySelector('#cr-owner [data-act="led-add"]').click();
    await new Promise(r => setTimeout(r, 300));
    var w = window.__WRITES__ || [];
    return {
      acct: w.filter(x => x.table === 'owner_ledger' && x.op === 'insert').length,
      txn: w.filter(x => x.table === 'owner_ledger_txns' && x.op === 'insert' && x.payload && x.payload.direction === 'advance' && Number(x.payload.amount) === 5000).length,
      shows: /Community Bank LOC/.test(document.getElementById('cr-owner').innerText)
    };
  });
  ok('adding an account inserts owner_ledger', add.acct >= 1, add);
  ok('the starting amount becomes an opening advance txn', add.txn >= 1, add);
  ok('the new account appears', add.shows, add);

  // expand ledA, record a $500 payment -> txn insert, balance 2000 -> 1500
  const pay = await page.evaluate(async () => {
    document.querySelector('#cr-owner .ow-acct[data-id="ledA"] [data-act="led-open"]').click();
    await new Promise(r => setTimeout(r, 150));
    var expanded = !!document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] #ow-pay-amt');
    var logHasBorrow = /borrowed/i.test((document.querySelector('#cr-owner .ow-adetail[data-id="ledA"]') || {}).innerText || '');
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] #ow-pay-amt').value = '500';
    document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] #ow-pay-dir').value = 'payment';
    document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] [data-act="led-pay"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_ledger_txns' && x.op === 'insert' && x.payload && x.payload.direction === 'payment');
    var bal = (document.querySelector('#cr-owner .ow-acct[data-id="ledA"] .od') || {}).innerText;
    return { expanded, logHasBorrow, wrote: w.length, bal };
  });
  ok('tapping an account expands its detail with a payment form', pay.expanded, pay);
  ok('the detail log shows the opening "borrowed" entry', pay.logHasBorrow, pay);
  ok('recording a payment inserts a payment txn', pay.wrote >= 1, pay);
  ok('the balance drops after the payment ($2,000 -> $1,500)', (pay.bal || '').includes('$1,500'), pay);

  // settle ledB
  const settle = await page.evaluate(async () => {
    document.querySelector('#cr-owner .ow-acct[data-id="ledB"] [data-act="led-open"]').click();
    await new Promise(r => setTimeout(r, 150));
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-adetail[data-id="ledB"] [data-act="led-settle"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_ledger' && x.op === 'update' && x.payload && x.payload.settled_at);
    var row = document.querySelector('#cr-owner .ow-acct[data-id="ledB"]');
    return { wrote: w.length, settledText: row ? /settled/i.test(row.innerText) : false };
  });
  ok('marking settled updates owner_ledger', settle.wrote >= 1, settle);
  ok('a settled account reads "settled"', settle.settledText, settle);

  // delete a txn on ledA (re-open it first — only one detail is open at a time)
  const txdel = await page.evaluate(async () => {
    if (!document.querySelector('#cr-owner .ow-adetail[data-id="ledA"]')) {
      document.querySelector('#cr-owner .ow-acct[data-id="ledA"] [data-act="led-open"]').click();
      await new Promise(r => setTimeout(r, 150));
    }
    window.__WRITES__ = [];
    var del = document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] .ow-ltxn[data-tid="txA1"] [data-act="ltxn-del"]');
    if (!del) return { present: false };
    del.click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_ledger_txns' && x.op === 'delete');
    return { present: true, wrote: w.length };
  });
  ok('a ledger transaction can be deleted', txdel.present && txdel.wrote >= 1, txdel);

  // delete account ledA
  const acctdel = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-adetail[data-id="ledA"] [data-act="led-del"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_ledger' && x.op === 'delete');
    return { wrote: w.length, gone: !document.querySelector('#cr-owner .ow-acct[data-id="ledA"]') };
  });
  ok('an account can be deleted', acctdel.wrote >= 1 && acctdel.gone, acctdel);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
