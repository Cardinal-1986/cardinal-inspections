/* gate_798.mjs — Convert to Insurance no longer stays dark in light mode.
 *
 *   node gate_798.mjs [path/to/index.html]
 *   PREV=<path>  desktop image-md5 compare against it
 *
 *   A. LIGHT mode: the card is light (not #241a1a), title clears 4.5:1
 *   B. DARK mode: byte-identical colours to before this build (regression
 *      guard — the fix is a guard added AROUND the existing rule, not a
 *      rewrite of it, so dark must be untouched)
 *   C. desktop: byte-identical to the previous build (image compare)
 *   D. insurance: still shows no Convert bar at all (existing `_ct !==
 *      'insurance'` gate, unrelated to this fix, still holds)
 *
 * Negative control: run against 797 — must go RED on A, not crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const PREV = process.env.PREV || null;
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_798 on ' + FILE);

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed',
    address: '804 Burleigh Avenue, Dayton, OH 45402', email: 'bob@debuild.com', phone: '937-333-9192',
    claim_type: kind,
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-08-06T10:00:00Z', lead: { claim_type: kind } }),
    created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
});

async function boot(html, width, kind, theme) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 900 },
    deviceScaleFactor: 1, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
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
  await page.evaluate(t => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'rb-light');
    else document.documentElement.removeAttribute('data-theme');
  }, theme);
  return { browser, page };
}
const open = (page, id) => page.evaluate(i => { if (typeof openProject === 'function') openProject(i); }, id)
  .then(() => page.waitForTimeout(1700));

const CONTRAST = () => {
  window.__c = (fg, bg) => {
    const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
      const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2] }; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const a = parse(fg), b = parse(bg); if (!a || !b) return null;
    const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
};

console.log('\n--- A. light mode: the card is light, title readable ---');
const L1 = await boot(APP, 402, 'retail', 'light');
await open(L1.page, 'p-1');
await L1.page.evaluate(CONTRAST);
const A = await L1.page.evaluate(() => {
  const card = document.querySelector('.convertins'), txt = document.querySelector('.convertins .cvtxt');
  if (!card || !txt) return { none: true };
  const g = e => getComputedStyle(e);
  const bg = g(card).backgroundColor, ink = g(txt).color;
  return { none: false, bg, ink, contrast: window.__c(ink, bg) };
});
ok('the card background is NOT the dark #241a1a value', !A.none && A.bg !== 'rgb(36, 26, 26)', JSON.stringify(A.bg));
ok('the title clears the 4.5:1 body floor', !A.none && A.contrast >= 4.5, JSON.stringify(A.contrast));
await L1.browser.close();

console.log('\n--- B. dark mode: unchanged from before this fix ---');
const D1 = await boot(APP, 402, 'retail', 'dark');
await open(D1.page, 'p-1');
const B = await D1.page.evaluate(() => {
  const card = document.querySelector('.convertins'), txt = document.querySelector('.convertins .cvtxt');
  if (!card || !txt) return { none: true };
  const g = e => getComputedStyle(e);
  return { none: false, bg: g(card).backgroundColor, ink: g(txt).color };
});
ok('dark mode still shows the #241a1a card', !B.none && B.bg === 'rgb(36, 26, 26)', JSON.stringify(B.bg));
await D1.browser.close();

console.log('\n--- D. insurance still shows no Convert bar ---');
const IN = await boot(APP, 402, 'insurance', 'light');
await open(IN.page, 'p-1');
const Dr = await IN.page.evaluate(() => !!document.querySelector('.convertins'));
ok('no Convert to Insurance bar on an insurance profile', !Dr, JSON.stringify(Dr));
await IN.browser.close();

console.log('\n--- C. desktop is byte-identical to the previous build ---');
if (PREV) {
  const PREVHTML = readFileSync(PREV, 'utf8');
  const shot = async (page, w) => {
    const cdp = await page.context().newCDPSession(page);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: 900, scale: 1 } });
    return createHash('md5').update(Buffer.from(r.data, 'base64')).digest('hex');
  };
  const N1 = await boot(APP, 1280, 'retail', 'dark');
  await open(N1.page, 'p-1');
  const hashNow = await shot(N1.page, 1280);
  await N1.browser.close();
  const N2 = await boot(PREVHTML, 1280, 'retail', 'dark');
  await open(N2.page, 'p-1');
  const hashPrev = await shot(N2.page, 1280);
  await N2.browser.close();
  ok('the desktop renders IDENTICALLY to the previous build (image md5)', hashNow === hashPrev, hashNow + ' vs ' + hashPrev);
} else {
  console.log('  (skip) desktop image compare — pass PREV=<previous index.html>');
}

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
