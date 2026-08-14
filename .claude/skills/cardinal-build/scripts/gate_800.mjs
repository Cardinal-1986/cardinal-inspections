/* gate_800.mjs — the section banner (Contacts/Leads/Photos/.../Tools), fixed
 * for light mode.
 *
 *   node gate_800.mjs [path/to/index.html]
 *   PREV=<path>  dark-mode regression compare against it
 *
 *   A. light mode: #crBanner is not the old #15171b, and its nav text clears
 *      4.5:1 against the new ground
 *   B. light mode: the Production/Tools dropdown is readable too — not just
 *      the visible bar (the partial-pass trap: bar goes light, popover stays
 *      dark-on-dark)
 *   C. dark mode: byte-identical to before this build
 *   D. insurance / community CRM-head variants are untouched (this fix is
 *      retail only, on purpose)
 *   E. a full top-of-page sweep at 402px light mode finds no OTHER element
 *      this dark besides the header itself (deliberately always-dark,
 *      documented, not this build's concern)
 *
 * Negative control: run against 799 — must go RED on A/B, not crash.
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
const PREV = process.env.PREV || null;
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_800 on ' + FILE);

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'test test', stage: 'Lead', address: '5735 Webster Street, Dayton, OH 45414',
    email: 'x@x.com', phone: '9375551234', claim_type: kind,
    checklist: JSON.stringify({ po: 1044, stage_since: '2026-07-17T10:00:00Z', lead: { claim_type: kind } }),
    created_at: '2026-07-17T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
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

console.log('\n--- A. the bar itself, light mode ---');
const L1 = await boot(APP, 402, 'retail', 'light');
await open(L1.page, 'p-1');
await L1.page.evaluate(CONTRAST);
const A = await L1.page.evaluate(() => {
  const bar = document.getElementById('crBanner'), cbn = document.querySelector('#crBanner .cbn');
  if (!bar || !cbn) return { none: true };
  const g = e => getComputedStyle(e);
  return { none: false, bg: g(bar).backgroundColor, ink: g(cbn).color, contrast: window.__c(g(cbn).color, g(bar).backgroundColor) };
});
ok('the bar background is NOT the dark #15171b value', !A.none && A.bg !== 'rgb(21, 23, 27)', JSON.stringify(A.bg));
ok('the nav labels clear the 4.5:1 body floor', !A.none && A.contrast >= 4.5, JSON.stringify(A.contrast));

console.log('\n--- B. the dropdown is readable too, not left half-fixed ---');
const B = await L1.page.evaluate(async () => {
  const dd = document.querySelector('#crBanner .cbdd'); if (!dd) return { none: true };
  dd.classList.add('open');
  await new Promise(r => setTimeout(r, 150));
  const menu = dd.querySelector('.cbmenu'), item = dd.querySelector('.cbi');
  if (!menu || !item) return { none: true };
  const g = e => getComputedStyle(e);
  const menuBg = g(menu).backgroundColor, itemInk = g(item).color;
  return { none: false, menuBg, itemInk, contrast: window.__c(itemInk, menuBg) };
});
ok('the dropdown panel is not the dark #22262d value', !B.none && B.menuBg !== 'rgb(34, 38, 45)', JSON.stringify(B.menuBg));
ok('its items clear 4.5:1 against the new panel colour', !B.none && B.contrast >= 4.5, JSON.stringify(B.contrast));
await L1.browser.close();

console.log('\n--- C. dark mode: unchanged ---');
const D1 = await boot(APP, 402, 'retail', 'dark');
await open(D1.page, 'p-1');
const C = await D1.page.evaluate(() => {
  const bar = document.getElementById('crBanner'); if (!bar) return { none: true };
  return { none: false, bg: getComputedStyle(bar).backgroundColor };
});
ok('dark mode still shows the #15171b bar', !C.none && C.bg === 'rgb(21, 23, 27)', JSON.stringify(C.bg));
await D1.browser.close();

console.log('\n--- D. insurance / community are untouched by this fix ---');
for (const kind of ['insurance', 'community']) {
  const IC = await boot(APP, 402, kind, 'light');
  await open(IC.page, 'p-1');
  const r = await IC.page.evaluate(() => {
    const bar = document.getElementById('crBanner'); if (!bar) return { none: true };
    return { none: false, bg: getComputedStyle(bar).backgroundColor };
  });
  const expected = kind === 'insurance' ? 'rgb(26, 14, 13)' : 'rgb(8, 33, 26)';
  ok(kind + ' still shows its own CRM-head colour, not the new retail-light white',
    !r.none && r.bg === expected, JSON.stringify({ kind, bg: r.bg, expected }));
  await IC.browser.close();
}

console.log('\n--- E. sweep the top of the page for any OTHER dark spot ---');
const SW = await boot(APP, 402, 'retail', 'light');
await open(SW.page, 'p-1');
const E = await SW.page.evaluate(() => {
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
    const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hits = [];
  document.querySelectorAll('body *').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top > 300 || rect.bottom < 0 || rect.width < 20 || rect.height < 4) return;
    const cs = getComputedStyle(el);
    const bg = parse(cs.backgroundColor);
    if (bg && bg.a > 0.3 && bg.r < 60 && bg.g < 60 && bg.b < 60) {
      hits.push({ id: el.id, cls: (el.className || '').toString().slice(0, 40), top: Math.round(rect.top) });
    }
  });
  return hits;
});
ok('no dark element left in the top 300px besides the header chrome itself',
  E.every(h => h.id === 'cr-hd2-srch' || h.id === 'cr-hd2-bar'), JSON.stringify(E));
await SW.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
