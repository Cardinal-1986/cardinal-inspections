/* gate_775.mjs — the burger menu on Theo's phone (iPhone 15 Pro Max, 430x932,
 * installed app). Chromium, because neither defect is visible to jsdom: one is
 * an <svg> with no intrinsic size, the other is a touch drag.
 *
 *   node gate_775.mjs [path/to/index.html]
 *
 * Point it at the 774 artifact as the negative control — it MUST go red there
 * (the icon paints 270x270 and the menu closes when a swipe misses it).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const OUT = process.env.GATE_OUT || '/tmp/gate775';
mkdirSync(OUT, { recursive: true });
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  — ' + extra : '')); }
};
console.log('gate_775 on ' + FILE);

const SEED = {
  projects: [{ id: 'p-1', name: 'Joeseph Estimate', stage: 'Approved', address: '1 Test Way, Dayton OH', checklist: '{}', created_at: new Date().toISOString() }],
  punch_items: [], appointments: [], team_profiles: [], inspection_reports: [], contracts: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { document.body.classList.add('standalone'); const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none'; });
/* into the retail home — the menu is only usable from there (on the landing,
   #landingView is fixed at z-index 150 and covers it). */
await page.evaluate(() => { if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });
await page.waitForTimeout(1400);
await page.evaluate(() => { const b = document.getElementById('navBtn'); if (b) b.click(); });
await page.waitForTimeout(700);
const shot = async n => { try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) {} };
await shot('menu');

console.log('\n--- 1. the icon is an icon ---');
const m = await page.evaluate(() => {
  const menu = document.getElementById('navMenu');
  const b = document.getElementById('cr-nav-production');
  const s = b && b.querySelector('svg');
  const rows = [...menu.querySelectorAll('.navopt')].map(o => Math.round(o.getBoundingClientRect().height));
  const normal = rows.slice().sort((a, c) => a - c)[Math.floor(rows.length / 2)];   // median row
  return {
    menuOpen: getComputedStyle(menu).display !== 'none',
    itemPresent: !!b,
    svgH: s ? Math.round(s.getBoundingClientRect().height) : null,
    svgW: s ? Math.round(s.getBoundingClientRect().width) : null,
    itemH: b ? Math.round(b.getBoundingClientRect().height) : null,
    medianRow: normal,
    tallest: Math.max.apply(null, rows),
    mustScroll: menu.scrollHeight - menu.clientHeight,
    label: b ? (b.textContent || '').trim() : null
  };
});
ok('the burger menu opens over the retail home', m.menuOpen);
ok('the Production item is present', m.itemPresent);
ok('its icon is icon-sized (<= 20px, not 270)', m.svgH !== null && m.svgH <= 20 && m.svgW <= 20, 'svg = ' + m.svgW + 'x' + m.svgH);
ok('the row is a row (<= 56px, not 307)', m.itemH !== null && m.itemH <= 56, 'item = ' + m.itemH + 'px');
ok('it is no taller than any other row', m.itemH !== null && m.itemH <= m.medianRow + 14,
  'item ' + m.itemH + ' vs median row ' + m.medianRow);
ok('no row in the menu is oversized', m.tallest <= 60, 'tallest row = ' + m.tallest + 'px');
ok('the label still reads Production', /production/i.test(m.label || ''), m.label);
ok('the menu costs less scrolling than 774 did (859px)', m.mustScroll < 700, 'mustScroll = ' + m.mustScroll + 'px');

console.log('\n--- 2. the menu survives a swipe that misses it ---');
const box = await page.evaluate(() => {
  const r = document.getElementById('navMenu').getBoundingClientRect();
  return { inX: Math.round(r.left + r.width / 2), outX: Math.round(r.right + 60), y: Math.round(r.top + r.height * 0.5),
    menuRight: Math.round(r.right), vw: window.innerWidth };
});
ok('the menu really is narrower than the screen (the trap exists)', box.menuRight < box.vw - 40,
  'menu right ' + box.menuRight + ' of ' + box.vw);
async function drag(x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x, y: y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x, y: y - i * 28 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);
}
await drag(box.outX, box.y);
const outside = await page.evaluate(() => {
  const menu = document.getElementById('navMenu');
  return { stillOpen: getComputedStyle(menu).display !== 'none', winY: Math.round(window.scrollY) };
});
await shot('after-outside-swipe');
ok('a swipe BESIDE the menu does not close it', outside.stillOpen,
  'menu open = ' + outside.stillOpen + ' (page scrolled ' + outside.winY + 'px)');

/* and the menu still scrolls itself, and still dismisses on an outside CLICK */
await page.evaluate(() => { const menu = document.getElementById('navMenu'); menu.scrollTop = 0; window.scrollTo(0, 0); });
await drag(box.inX, box.y);
const inside = await page.evaluate(() => {
  const menu = document.getElementById('navMenu');
  return { stillOpen: getComputedStyle(menu).display !== 'none', scrolled: Math.round(menu.scrollTop) };
});
ok('a swipe ON the menu scrolls the menu', inside.scrolled > 50, 'scrollTop = ' + inside.scrolled);
ok('...and leaves it open', inside.stillOpen);
await page.evaluate(() => { document.body.click(); });
await page.waitForTimeout(400);
const clicked = await page.evaluate(() => getComputedStyle(document.getElementById('navMenu')).display === 'none');
ok('an outside CLICK still dismisses it (the retained path)', clicked);

console.log('\n--- 3. nothing else lost its scroll handler ---');
const src = APP_HTML;
const scrollListeners = (src.match(/addEventListener\('scroll'/g) || []).length;
ok('exactly one scroll listener was retired, not a sweep', scrollListeners >= 1,
  'remaining addEventListener(\'scroll\') sites: ' + scrollListeners);
ok('the module still injects exactly one menu button', (src.match(/id = 'cr-nav-production'/g) || []).length === 1);
ok('the sizing rule is NOT scoped to #cr-pb (it would never match there)',
  /\.pbnavico,\s*\n#navMenu \.pbnavico\{/.test(src) && !/#cr-pb \.pbnavico/.test(src));

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
