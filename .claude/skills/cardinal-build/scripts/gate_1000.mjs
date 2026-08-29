/* gate_1000.mjs — a claim shows how long since the date of loss, as a fact.

   THE POINT. Beside the date of loss the card now reads "· N days ago". It is
   arithmetic, never a deadline — the Library card is emphatic that GUESSING a
   suit-limitation period is the harm, so this says how long it has BEEN and
   nothing about how long is left.

   Two ways, because both matter: the extracted lossAge() run as a pure unit
   (deterministic edges), and a real render that the number reaches the card.

   Usage: node gate_1000.mjs [path]   Control: build 999, red + named. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1000: playwright not found'); process.exit(2); }
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

/* ── unit: extract the SHIPPED lossAge and run it ── */
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
const fnText = extract('lossAge');
need('lossAge exists in the artifact', !!fnText, 'no such function — nothing to render the age');
if (fnText) {
  // eslint-disable-next-line no-new-func
  /* the shipped lossAge later gained a window.crDate reference; this rig runs
     it in Node, where bare `window` THREW at call time and the crash read as
     'not green'. Hand it an empty window — crDate absent takes the function's
     own new Date(iso) fallback, the exact behavior this gate always tested. */
  const lossAge = new Function('window', fnText + '; return lossAge;')({});
  const iso = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  need('a loss 100 days ago reads "· 100 days ago"', lossAge(iso(100)) === ' · 100 days ago', JSON.stringify(lossAge(iso(100))));
  need('a loss 1 day ago is singular', lossAge(iso(1)) === ' · 1 day ago', JSON.stringify(lossAge(iso(1))));
  need('a loss today reads "· 0 days ago"', lossAge(iso(0)) === ' · 0 days ago', JSON.stringify(lossAge(iso(0))));
  need('no date -> empty (no guessing)', lossAge(null) === '' && lossAge('') === '', 'null/empty produced a string');
  need('a future/garbage date -> empty', lossAge(iso(-5)) === '' && lossAge('not-a-date') === '',
       'future=' + JSON.stringify(lossAge(iso(-5))) + ' garbage=' + JSON.stringify(lossAge('not-a-date')));
}

/* ── render: inject a date of loss on cl1 (NOT mutating the shared seed on
   disk — an init script, the gate_996 pattern) and read the card. ── */
const DAYS = 200;
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S || !S.insurance_claims) return;
  var c = S.insurance_claims.find(function(x){ return x.id === 'cl1'; });
  if(c){ var d = new Date(Date.now() - ${DAYS}*86400000); c.date_of_loss = d.toISOString().slice(0,10); }
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
  if (!m || !m.openOne) return { err: 'no CardinalClaims.openOne' };
  await m.openOne('cl1');
  await new Promise(r => setTimeout(r, 900));
  const mount = document.getElementById('cr-claims-mount');
  return { text: mount ? (mount.textContent || '').replace(/\s+/g, ' ') : '(no mount)' };
});
need('the claim card shows the loss age', /200 days ago/.test(card.text || ''),
     'card did not contain "200 days ago" — text: ' + (card.text || '').slice(0, 160));

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_1000 — ${FILE}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
