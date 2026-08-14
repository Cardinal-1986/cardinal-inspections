/* gate_799.mjs — the portal switcher moves into the burger menu.
 *
 *   node gate_799.mjs [path/to/index.html]
 *
 *   A. #crPortalChip is no longer visible, on any width
 *   B. the class-sync side effect (body.classList portal-*) still runs -
 *      paintChip() was NOT touched, only the chip's own display
 *   C. the burger menu has a Switch Portal row, and tapping it opens the
 *      SAME sheet the chip used to (identical portal cards, same click
 *      handler underneath)
 *   D. picking a portal from the new menu entry still actually switches -
 *      the client directory re-filters, exactly as the chip did
 *   E. Cardinal Truth's own unrelated mini-chip (a second, pre-existing
 *      caller of the same pick()) is untouched
 *
 * Negative control: run against 798 — must go RED on C/D, not crash.
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
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_799 on ' + FILE);

const SEED = {
  projects: [
    { id: 'p-1', name: 'Bob DeBuilder', stage: 'Lead', address: '804 Burleigh Ave', claim_type: 'retail',
      checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' },
    { id: 'p-2', name: 'Claim Co', stage: 'Lead', address: '1 Storm Rd', claim_type: 'insurance',
      checklist: JSON.stringify({ lead: { claim_type: 'insurance' } }), created_at: '2026-07-21T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }
  ],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

async function boot(html, width) {
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
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  });
  await page.waitForTimeout(1200);
  return { browser, page };
}
const vis = () => { window.__v = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none'); };

console.log('\n--- A. the chip row is gone ---');
const P = await boot(APP, 402);
await P.page.evaluate(vis);
const A = await P.page.evaluate(() => ({ visible: window.__v(document.getElementById('crPortalChip')) }));
ok('#crPortalChip is not visible on the phone', !A.visible, JSON.stringify(A));

console.log('\n--- B. the class-sync side effect still runs ---');
const B = await P.page.evaluate(() => {
  const cls = [...document.body.classList].filter(c => c.startsWith('portal-'));
  return { classes: cls };
});
ok('body still carries a portal-* class (paintChip untouched)', B.classes.length === 1, JSON.stringify(B.classes));

console.log('\n--- C. Switch Portal in the burger menu opens the sheet ---');
const C = await P.page.evaluate(async () => {
  const btn = document.getElementById('navBtn'); if (!btn) return { none: true };
  btn.click();
  await new Promise(r => setTimeout(r, 200));
  const opt = document.querySelector('.navopt[data-nav="portal"]');
  if (!opt) return { none: true, foundBtn: true };
  const before = document.querySelector('.cr-psheet-bg');
  opt.click();
  await new Promise(r => setTimeout(r, 300));
  const sheet = document.querySelector('.cr-psheet-bg');
  const cards = sheet ? sheet.querySelectorAll('.cr-pcard').length : 0;
  return { none: false, beforeExists: !!before, afterExists: !!sheet, cards };
});
ok('the menu carries a Switch Portal option', !C.none, JSON.stringify(C));
ok('tapping it opens the SAME sheet (portal cards present)',
  !C.none && !C.beforeExists && C.afterExists && C.cards >= 3, JSON.stringify(C));

console.log('\n--- D. picking a portal from it still actually switches ---');
const D = await P.page.evaluate(async () => {
  const card = document.querySelector('.cr-pcard[data-p="insurance"]');
  if (!card) return { none: true };
  card.click();
  await new Promise(r => setTimeout(r, 500));
  return { none: false, cls: [...document.body.classList].filter(c => c.startsWith('portal-')) };
});
ok('picking Insurance actually flips the portal class', !D.none && D.cls.includes('portal-insurance'), JSON.stringify(D));
await P.browser.close();

console.log('\n--- E. Cardinal Truth\'s own mini-chip is untouched ---');
const CT = await boot(APP, 1280);
const e2 = await CT.page.evaluate(() => ({
  hasCall: /window\.CardinalPortal\.pick\(\)/.test(document.documentElement.outerHTML) ||
    (() => { try { return true; } catch (_) { return false; } })()
}));
// the meaningful check is at the source level - the second call site survives
const srcCheck = (APP.match(/window\.CardinalPortal\.pick\(\);/g) || []).length;
ok('exactly two callers of pick() remain — the new menu item and the pre-existing Insurance mini-chip',
  srcCheck === 2, srcCheck);
await CT.browser.close();

console.log('\n--- F. desktop: chip gone there too (deliberately not phone-scoped), menu works there too ---');
const DT = await boot(APP, 1280);
await DT.page.evaluate(vis);
const Fr = await DT.page.evaluate(async () => {
  const chipVisible = window.__v(document.getElementById('crPortalChip'));
  const btn = document.getElementById('navBtn');
  if (btn) { btn.click(); await new Promise(r => setTimeout(r, 200)); }
  const opt = document.querySelector('.navopt[data-nav="portal"]');
  return { chipVisible, menuHasOption: !!opt };
});
ok('the chip is hidden on desktop too (this fix is deliberately global, not @media-scoped)',
  !Fr.chipVisible, JSON.stringify(Fr));
ok('the menu carries Switch Portal on desktop too', Fr.menuHasOption, JSON.stringify(Fr));
await DT.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
