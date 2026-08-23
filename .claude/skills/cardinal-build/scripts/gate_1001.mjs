/* gate_1001.mjs — one documented definition of a claim's "outstanding".

   Theo's rule (23 Aug): outstanding = RCV + decided supplements − received.
     · deductible counted as owed (it is inside RCV)
     · an undecided (draft/submitted) supplement is NOT in the total; shown on
       its own pending line, never as $0
     · denied/withdrawn contribute nothing and are not pending

   ⚠ Display maths only — make_commission() fires on each collection, not on
   this number. Verified against the shipped trigger; the research's "skews a
   commission via a trigger" worry does not hold.

   Usage: node gate_1001.mjs [path]   Control: build 1000, red + named. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1001: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

/* ── unit: extract the SHIPPED claimMoney and its two status maps ── */
function extract(name) {
  const at = APP.indexOf('function ' + name + '(');
  if (at < 0) return null;
  let i = APP.indexOf('{', at), depth = 0;
  for (let j = i; j < APP.length; j++) {
    if (APP[j] === '{') depth++;
    else if (APP[j] === '}') { depth--; if (!depth) return APP.slice(at, j + 1); }
  }
  return null;
}
const fnText = extract('claimMoney');
const decided = (APP.match(/var CLAIM_SUPP_DECIDED\s*=\s*\{[^}]*\}/) || [''])[0];
const pending = (APP.match(/var CLAIM_SUPP_PENDING\s*=\s*\{[^}]*\}/) || [''])[0];
need('claimMoney exists in the artifact', !!fnText, 'no such function');
if (fnText) {
  // eslint-disable-next-line no-new-func
  const cm = new Function(`${decided}; ${pending}; ${fnText}; return claimMoney;`)();
  const claim = { approved_rcv: 20000, approved_acv: 16000, approved_depreciation: 4000, deductible: 1000 };
  const pay = amt => [{ amount: amt }];

  const base = cm(claim, pay(5000), []);
  need('deductible is counted as owed (inside RCV)', base.outstanding === 15000,
       'outstanding = ' + base.outstanding + ', expected 20000 − 5000 with the $1000 deductible still owed');

  const appr = cm(claim, pay(5000), [{ status: 'approved', amount_approved: 3000 }]);
  need('an approved supplement is added to the total', appr.outstanding === 18000,
       'outstanding = ' + appr.outstanding);

  const sub = cm(claim, pay(5000), [{ status: 'submitted', amount_requested: 4000 }]);
  need('a SUBMITTED supplement is NOT in the total', sub.outstanding === 15000,
       'outstanding = ' + sub.outstanding + ' — an undecided supplement leaked into it');
  need('...but it is surfaced as pending', sub.pendingCount === 1 && sub.pendingReq === 4000,
       'pendingCount=' + sub.pendingCount + ' pendingReq=' + sub.pendingReq);

  const den = cm(claim, pay(5000), [{ status: 'denied', amount_approved: null, amount_requested: 9000 }]);
  need('a DENIED supplement contributes nothing and is not pending',
       den.outstanding === 15000 && den.pendingCount === 0,
       'outstanding=' + den.outstanding + ' pendingCount=' + den.pendingCount);

  const part = cm(claim, pay(0), [{ status: 'partial', amount_approved: 1500 }]);
  need('a PARTIAL counts its approved amount', part.outstanding === 21500, 'outstanding=' + part.outstanding);

  const over = cm(claim, pay(25000), []);
  need('an overpaid claim floors at 0', over.outstanding === 0, 'outstanding=' + over.outstanding);
}

/* ── render: inject one approved + one submitted(null req) supplement on cl1
   and read the card. ── */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  S.insurance_supplements = [
    { id:'sup-appr', claim_id:'cl1', status:'approved', amount_requested:3200, amount_approved:3000,
      reason:'Concealed decking', filed_at:'2026-08-01' },
    { id:'sup-sub',  claim_id:'cl1', status:'submitted', amount_requested:null, amount_approved:null,
      reason:'Code upgrades', filed_at:'2026-08-14' }
  ];
}catch(e){} })();`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
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
await page.waitForTimeout(1600);

const card = await page.evaluate(async () => {
  ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  const m = window.CardinalClaims;
  if (!m || !m.openOne) return { err: 'no openOne' };
  await m.openOne('cl1');
  await new Promise(r => setTimeout(r, 900));
  const mount = document.getElementById('cr-claims-mount');
  const text = mount ? (mount.textContent || '').replace(/\s+/g, ' ') : '';
  const pending = mount ? mount.querySelector('.cr-c-pending') : null;
  return { text, pending: pending ? pending.textContent.replace(/\s+/g, ' ').trim() : null };
});
/* cl1: rcv 24180.44, one acv payment 18922.10, +3000 approved supp
   → outstanding = 24180.44 + 3000 − 18922.10 = 8258.34 → "$8,258" */
need('the card shows outstanding WITH the approved supplement', /8,258/.test(card.text || ''),
     'card text lacked 8,258: ' + (card.text || '').slice(0, 200));
need('the pending supplement is shown on its own line', !!card.pending && /awaiting a decision/i.test(card.pending),
     'pending line: ' + JSON.stringify(card.pending));
need('the pending line says NOT counted', !!card.pending && /not counted/i.test(card.pending),
     'pending line: ' + JSON.stringify(card.pending));
need('the outstanding total does NOT include the pending 4000-ish', !/11,2|12,2/.test(card.text || ''),
     'a figure consistent with the pending supp being added appeared');

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_1001 — ${FILE}`);
console.log(`  pending line: ${JSON.stringify(card.pending)}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
