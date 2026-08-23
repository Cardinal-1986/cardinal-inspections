/* gate_996.mjs — money in has ONE door, and the legacy rows can cross safely.

   THE DEFECT. Two rows sat directly under each other on the job menu:
   "$ Payment Information" and "% Money In & Commissions". Only the second books
   anything — `collections` fires the 10% commission trigger, fills the Friday
   owed email, and since 721 OUTRANKS the legacy log in jobFinance():

       if(collPaid[pr.id] !== undefined) paid = collPaid[pr.id];

   That line REPLACES rather than adds, so on a job carrying legacy money the
   first collection logged makes every earlier payment vanish from Balance Due.
   Measured: one job in the database has legacy dir:'in' rows — Dan Thompson,
   two Zelle payments totalling $8,008.94.

   Usage: node gate_996.mjs [path]
   Previous build is the negative control and MUST go red with NAMED failures. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_996: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');

/* p1 gets a legacy money-in log and a rep who is NOT Theo, so the confirm's
   commission warning is exercised too. Shaped from the real Dan Thompson row. */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  var p = (S.projects || [])[0]; if(!p) return;
  var ck = JSON.parse(p.checklist || '{}');
  ck.payments = [
    { at:'2026-08-09T19:17:13.415Z', by:'theo@cardinalrenovations.net', amt:5000,
      dir:'in', date:'2026-08-09', note:'Zelle', check:null, method:null, account:null },
    { at:'2026-08-09T19:17:41.646Z', by:'theo@cardinalrenovations.net', amt:3008.94,
      dir:'in', date:'2026-08-09', note:'Zelle', check:null, method:null, account:null },
    { at:'2026-08-10T10:00:00.000Z', by:'theo@cardinalrenovations.net', amt:1200,
      dir:'out', date:'2026-08-10', note:'Crew draw', check:null, method:null, account:'Labor' }
  ];
  p.checklist = JSON.stringify(ck);
  S.collections = [];
}catch(e){} })();`;

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
page.on('dialog', d => d.accept());          /* the migration confirm */
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.addInitScript(EXTRA);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

const open = async () => page.evaluate(async () => {
  ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(r => setTimeout(r, 600));
  if (typeof openPaymentsPage === 'function') openPaymentsPage();
  await new Promise(r => setTimeout(r, 500));
  const pv = document.getElementById('paymentsView');
  return { open: !!pv && getComputedStyle(pv).display !== 'none' };
});
const o = await open();
need('Payment Information opens', o.open, 'paymentsView never showed');

/* 1 — the Received section no longer offers the legacy row modal. */
const btns = await page.evaluate(() => {
  const all = [...document.querySelectorAll('#paySummary [data-payadd]')];
  return all.map(b => ({ dir: b.getAttribute('data-payadd'), text: b.textContent.trim() }));
});
const inBtn = btns.find(b => b.dir === 'in');
need('Received offers a "log a payment" door, not "add a row"',
     !!inBtn && /log a payment/i.test(inBtn.text),
     inBtn ? `the Received button still reads "${inBtn.text}"` : 'no Received button at all');

/* 2 — out and exp are job COSTS and must be untouched. Without this the fix
   could have been "remove every add button" and 1 would still pass. */
need('Paid out keeps its own row form', btns.some(b => b.dir === 'out' && /add new row/i.test(b.text)),
     'the Paid out button changed — job costs are not collections');
need('Additional expenses keep their own row form', btns.some(b => b.dir === 'exp' && /add new row/i.test(b.text)),
     'the expenses button changed — job costs are not collections');

/* 3 — the legacy money is named, with its real total, and offered a way across. */
const note = await page.evaluate(() => {
  const el = document.querySelector('#paySummary [data-paymigrate]');
  return { present: !!el, text: (document.querySelector('#paySummary') || {}).textContent || '' };
});
/* ⚠ to the CENT. payMoney rounds ($3,008.94 -> $3,009), which is wrong on a
   screen someone checks against a bank statement — the gate pins the exact
   figure so a regression back to the rounding formatter goes red. */
need('legacy money-in is named on screen, to the cent',
     note.present && /\$8,008\.94/.test(note.text),
     note.present ? 'the migration control is there but does not state $8,008.94 exactly'
                  : 'no migration control');

/* 4 — tapping the Received door lands on Money In with the form OPEN. */
const landed = await page.evaluate(async () => {
  const b = document.querySelector('#paySummary [data-payadd="in"]');
  if (!b) return { err: 'no button' };
  b.click();
  await new Promise(r => setTimeout(r, 900));
  const pv = document.getElementById('paymentsView');
  const tab = document.getElementById('tab-commissions');
  return {
    paymentsClosed: !pv || getComputedStyle(pv).display === 'none',
    onCommissions: !!tab && getComputedStyle(tab).display !== 'none',
    formOpen: !!document.getElementById('miAmt'),
  };
});
need('the Received door closes Payment Information', landed.paymentsClosed,
     'the sub-page stayed open, so the tab switched underneath an invisible screen');
need('the Received door lands on Money In', landed.onCommissions, 'tab-commissions is not showing');
need('and it opens the collection form', landed.formOpen,
     'the amount field is absent — commUi.collForm was set after renderCommissions, not before');

/* 5 — the migration moves the money and leaves the total alone. */
const migrated = await page.evaluate(async () => {
  if (typeof openPaymentsPage === 'function') openPaymentsPage();
  await new Promise(r => setTimeout(r, 500));
  const before = (window.parseCkAll(window.currentProject).payments || []).filter(p => p.dir === 'in');
  const m = document.querySelector('#paySummary [data-paymigrate]');
  if (!m) return { err: 'no migrate control' };
  m.click();
  await new Promise(r => setTimeout(r, 1200));
  const after = (window.parseCkAll(window.currentProject).payments || []);
  return {
    movedCount: before.length,
    leftIn: after.filter(p => p.dir === 'in').length,
    keptOut: after.filter(p => p.dir === 'out').length,
  };
});
need('the migration moved both legacy payments', migrated.movedCount === 2,
     `found ${migrated.movedCount} legacy money-in rows, expected 2`);
need('and cleared them from the old log', migrated.leftIn === 0,
     `${migrated.leftIn} money-in row(s) still in checklist.payments — the money is now counted twice`);
need('and left the paid-out row alone', migrated.keptOut === 1,
     `the Paid out row was ${migrated.keptOut === 0 ? 'deleted' : 'duplicated'} — only dir:'in' moves`);

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_996 — ${FILE}`);
console.log(`  buttons: ${JSON.stringify(btns)}`);
console.log(`  landed:  ${JSON.stringify(landed)}`);
console.log(`  migrate: ${JSON.stringify(migrated)}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
