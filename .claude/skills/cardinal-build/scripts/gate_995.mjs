/* gate_995.mjs — a deliberate 0% deposit survives a reopen.

   THE DEFECT. The estimate editor's reopen path read
     deposit_pct : Number(existing.deposit_pct) || 30
   and `|| 30` cannot tell "the user chose nought" from "there is no value".
   Reopening a 0% estimate to change anything else silently rewrote the deposit
   to 30%, and computeTotals wrote that straight back on save. Measured live:
   6 of 18 estimates carry deposit_pct 0.00, INCLUDING BOTH of the two Cardinal
   has ever had accepted — Annette Wright $14,760 and Vandalyn Robinson $12,550,
   which is $4,428 and $3,765 of down payment appearing on signed paperwork.

   The contract side has done this correctly since build 781 (fillContractMoney)
   and its own comment says so: "A deliberate 0% estimate is a real answer and
   is kept." Two halves of one file disagreed; 995 makes them agree.

   ⚠ WHY THIS IS A RENDER AND NOT A JSDOM HARNESS. The value has to survive
   PostgREST's string form ("0.00", truthy as a string, falsy through Number),
   the editor's own state, the DOM input, computeTotals, and a reopen. jsdom
   can read the state object but cannot settle what the control shows or what a
   second pass through the editor produces.

   Usage: node gate_995.mjs [path]
   Previous build is the negative control and MUST go red with NAMED failures
   rather than crash (BUG_CLASSES 37). At 993 it fails 3 of 8 and passes 5, so
   it is not vacuously red. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_995: playwright not found'); process.exit(2); }
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
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

/* Open the editor on an estimate whose deposit_pct is what PostgREST actually
   returns for a numeric column — a STRING. Read back three things: what the
   control shows, what the module would persist, and what a second reopen of
   that persisted value produces. */
const probe = async (deposit_pct) => page.evaluate(async (dep) => {
  const m = window.CardinalEstimates;
  const p = (window.cacheProjects || [])[0];
  if (!m || !m.openEditor || !p) return { err: 'no editor or no project' };
  try { m.close(); } catch (e) {}
  const existing = {
    id: 'e-gate995', estimate_number: 'EST-GATE-995', title: 'Gate 995',
    /* ⚠ the field is unit_price, NOT price — computeTotals reads
       (qty * unit_price). An invented `price` makes the subtotal 0, the
       deposit $0.00 on EVERY build, and the 'asks for nothing' assertion
       below unable to fail. BUG_CLASSES 45, caught by the negative control
       showing $0.00 on both sides. */
    status: 'draft', line_items: [{ name: 'Roof', qty: 1, unit_price: 10000 }],
    photos: [], itemized: true, discount: 0,
    deposit_pct: dep, valid_days: 30, notes: '',
  };
  await m.openEditor(p, existing);
  await new Promise(r => setTimeout(r, 500));
  const el = document.querySelector('[data-f="deposit_pct"]');
  const st = m.currentState ? m.currentState() : null;
  /* ⚠ currentState() returns deposit_pct but NOT the deposit amount — read the
     figure the DOCUMENT shows instead, which is the number a client reads. */
  const amt = document.querySelector('[data-t="deposit"]');
  return {
    control: el ? el.value : '(no control)',
    persisted: st ? st.deposit_pct : '(no state)',
    shown: amt ? amt.textContent.trim() : '(no deposit line)',
  };
}, deposit_pct);

/* 1-3 — a deliberate nought, in the shape the database actually returns. */
const zero = await probe('0.00');
need('a stored "0.00" shows 0 in the control', String(zero.control) === '0',
     `the deposit box reads "${zero.control}" on a 0% estimate`);
need('a stored "0.00" persists as 0', Number(zero.persisted) === 0,
     `the editor would save deposit_pct ${zero.persisted}`);
need('a stored "0.00" asks the client for nothing', /^\$?0(\.00)?$/.test(zero.shown),
     `the deposit line on the document reads "${zero.shown}" on a 0% estimate`);

/* 4 — THE ROUND TRIP. Feed what the module would persist straight back in, the
   way a save-then-reopen does. A one-pass check cannot see a value that only
   drifts on the second visit. */
const again = await probe(zero.persisted);
need('0 survives a save and a second reopen', Number(again.persisted) === 0,
     `reopening a saved 0% estimate produced ${again.persisted}`);

/* 5-6 — THE LOOK-ALIKES, which must NOT change. An absent deposit still
   defaults to 30, and an ordinary value is untouched. Without these the fix
   could have been "always 0" and this gate would still be green. */
const absent = await probe(null);
need('an ABSENT deposit still defaults to 30', Number(absent.persisted) === 30,
     `a null deposit_pct produced ${absent.persisted}, not the 30 default`);
const ordinary = await probe('15.5');
need('an ordinary 15.5% is untouched', Number(ordinary.persisted) === 15.5,
     `15.5 became ${ordinary.persisted}`);

/* 7 — out-of-range values are still clamped, the way the contract side clamps. */
const silly = await probe('140');
need('an out-of-range 140% is clamped to 100', Number(silly.persisted) === 100,
     `140 became ${silly.persisted}`);

/* 8 — the page must not be throwing while we do any of this. */
need('no page errors during the round trip', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();

console.log(`gate_995 — ${FILE}`);
console.log(`  0.00 → control "${zero.control}", persists ${zero.persisted}, document shows ${zero.shown}`);
console.log(`  reopen → ${again.persisted}   null → ${absent.persisted}   15.5 → ${ordinary.persisted}   140 → ${silly.persisted}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
