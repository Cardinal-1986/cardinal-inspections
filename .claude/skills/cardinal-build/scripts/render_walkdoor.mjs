/* render_walkdoor.mjs (1076) — a picture of the Job Menu with The Walk on it,
 * and of the prefilled start form.
 *
 * `.mjs` rather than the folder's `render_*.js` because it is ESM (playwright
 * + top-level await), same as the gate_*.mjs family.
 *
 * Build 1076 — a picture of the Job Menu with The Walk on it, and of the
 * prefilled start form.  Gates prove structure; pictures catch meaning.
 *
 * Boots exactly the way sentinel.js does — the artifact SERVED from
 * https://sentinel.test/ with every subresource stubbed, and
 * sentinel_setup_cardinal.js as an init script — because on file:// the app
 * boots differently and the client profile never renders at all.
 */
import fs from 'fs';
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const OUT  = process.argv[3] || '/tmp/shot';
const HTML = fs.readFileSync(FILE, 'utf8');
/* ⚠ TWO setup files, in THIS order, and the order is the opposite of what it
   looks like: the seed must land before the mock, because e2e_mock_supa.js
   reads `window.__SEED__` at its own execution time. Loading only the first
   sweeps the LOGIN SCREEN and reports it as a walk of the app — which is
   exactly what my first run of this did. */
const D = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const SETUP = fs.readFileSync(D + 'sentinel_setup_cardinal.js', 'utf8')
            + '\n;\n' + fs.readFileSync(D + 'e2e_mock_supa.js', 'utf8');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror] ' + String(e).split('\n')[0]));
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || /image/i.test(r.request().headers().accept || ''))
    return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  /* ⚠ ABORT fonts, do not fulfil them empty. An empty body leaves the
     @font-face load PENDING forever, so document.fonts.ready never resolves
     and every screenshot dies on "waiting for fonts to load". */
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(u) || /font/i.test(r.request().headers().accept || ''))
    return r.abort();
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

await page.evaluate(async () => {
  const st = (window.__sentinelStates || []).find(s => s.name === 'client');
  if (st) await st.run();
});
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const t = document.querySelector('#acxMount .ja-menu .jabox[data-jm="walk"]');
  const all = [...document.querySelectorAll('#acxMount .ja-menu .jabox')].map(b => b.dataset.jm);
  if (!t) return { present: false, tiles: all, admin: (typeof isAdminUser === 'function') ? !!isAdminUser() : 'n/a' };
  const r = t.getBoundingClientRect();
  const lb = t.querySelector('.jbl');
  return { present: true, tiles: all, label: lb && lb.textContent,
           w: Math.round(r.width), h: Math.round(r.height),
           ink: lb ? getComputedStyle(lb).color : null };
});
console.log(JSON.stringify(info, null, 2));

/* ⚠ CDP, not page.screenshot(). Playwright waits on document.fonts.ready
   before every screenshot, and under a route that stubs the network that
   promise never settles — every capture died on "waiting for fonts to load".
   Page.captureScreenshot has no such wait. */
const cdp = await page.context().newCDPSession(page);
async function shot(path, sel) {
  const clip = sel ? await page.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  }, sel) : null;
  if (sel && !clip) { console.log('no element for ' + sel); return false; }
  const { data } = await cdp.send('Page.captureScreenshot',
    clip ? { format: 'png', clip: { ...clip, scale: 2 }, captureBeyondViewport: true }
         : { format: 'png' });
  fs.writeFileSync(path, Buffer.from(data, 'base64'));
  console.log('wrote ' + path);
  return true;
}

await shot(OUT + '_jobmenu.png', '#acxMount .ja-menu');

if (info.present) {
  await page.evaluate(() => document.querySelector('#acxMount .ja-menu .jabox[data-jm="walk"]').click());
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const el = document.getElementById('cr-show'), form = document.getElementById('cr-show-form');
    const v = k => { const i = form && form.querySelector('[data-f="' + k + '"]'); return i ? i.value : null; };
    return { showOpen: !!(el && el.classList.contains('open')),
             tab: el ? ((el.querySelector('.cr-sh-tabs .on') || {}).textContent || null) : null,
             formOpen: !!(form && form.classList.contains('open')),
             title: v('title'), address: v('address'), city: v('city') };
  });
  console.log(JSON.stringify(st, null, 2));
  if (st.formOpen) await shot(OUT + '_walkform.png', '#cr-show-form.open .bx');
  if (st.showOpen) await shot(OUT + '_walkscreen.png');
}
await browser.close();
