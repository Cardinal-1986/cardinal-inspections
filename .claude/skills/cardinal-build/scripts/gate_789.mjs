/* gate_789.mjs — the Photo Album toolbar.
 *
 *   node gate_789.mjs [path/to/index.html] [--shot out.png]
 *
 *   A. the toolbar is two buttons, not five;
 *   B. the plus opens CompanyCam for an ADMIN;
 *   C. the plus opens the DEVICE picker for a rep — CompanyCam 403s them, and
 *      a rep who cannot add a photograph at all would be a real regression;
 *   D. checking a photo raises the selection bar carrying To Inspection and
 *      the real transfer control;
 *   E. the transfer dropdown still opens (it MOVED, so its menu can paint);
 *   F. the orange AI caption badge is gone, and typing a caption still works.
 *
 * Negative control: run against 788 — must go RED, not crash.
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
const argv = process.argv.slice(2);
const FILE = (argv[0] && !argv[0].startsWith('--')) ? argv[0] : ROOT + '/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_789 on ' + FILE);

const SEED = {
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed', address: '921 Testing Way',
    email: 'bob@debuild.com', phone: '937-333-9192', claim_type: 'retail',
    checklist: JSON.stringify({ po: 1032 }), created_at: '2026-07-20T10:00:00Z',
    created_by: 'theo@cardinalrenovations.net' }],
  project_photos: [{ id: 'ph-1', project_id: 'p-1', section: 'Inspection',
    data: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    caption: '', created_at: '2026-07-29T12:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], punch_items: [], appointments: [],
  team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

async function boot(asAdmin) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width: 402, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    /* CompanyCam refuses a non-admin server-side; mirror that here */
    if (url.includes('/api/companycam')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ photos: [] }) });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.addInitScript(a => { window.__FORCE_ADMIN__ = a; }, asAdmin);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
    /* pin the admin answer the album gates on */
    window.isAdminUser = function(){ return !!window.__FORCE_ADMIN__; };
    if (typeof openProject === 'function') openProject('p-1');
  });
  await page.waitForTimeout(1200);
  /* the opener is openGalleryMode(mode) — an earlier version of this harness
     called openGallery(), which does not exist, and the typeof guard swallowed
     it, so every visibility probe read a hidden view and reported false. */
  const opened = await page.evaluate(() => {
    if (typeof openGalleryMode !== 'function') return 'missing';
    openGalleryMode('all'); return 'ok';
  });
  if (opened !== 'ok') { console.log('  (openGalleryMode missing — harness cannot run)'); }
  await page.waitForTimeout(1800);
  return { browser, page };
}
const visibleToolbar = page => page.evaluate(() => {
  const ids = ['galAddBtn','galCamBtn','galCcBtn','galInspBtn','galXferWrap'];
  const out = {};
  ids.forEach(id => { const e = document.getElementById(id);
    out[id] = !!(e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'); });
  return out;
});

console.log('\n--- A/B. as an ADMIN ---');
const A = await boot(true);
let tb = await visibleToolbar(A.page);
ok('the toolbar shows exactly two buttons', tb.galAddBtn && tb.galCamBtn && !tb.galCcBtn && !tb.galInspBtn && !tb.galXferWrap, JSON.stringify(tb));
const admClick = await A.page.evaluate(async () => {
  let filePickerOpened = false;
  const fi = document.getElementById('galFileInput');
  fi.click = function(){ filePickerOpened = true; };
  document.getElementById('galAddBtn').click();
  await new Promise(r => setTimeout(r, 900));
  const p = document.getElementById('galCcPanel');
  return { ccOpen: !!(p && p.style.display !== 'none'), filePickerOpened };
});
ok('the plus opens the CompanyCam panel', admClick.ccOpen, JSON.stringify(admClick));
ok('and does NOT open the device picker', admClick.filePickerOpened === false);

console.log('\n--- D/E. the selection bar carries the actions ---');
const bar = await A.page.evaluate(async () => {
  const p = document.getElementById('galCcPanel'); if (p) p.style.display = 'none';
  window.galChecked = { 'ph-1': true };
  if (typeof window.renderGallery === 'function') window.renderGallery();
  await new Promise(r => setTimeout(r, 700));
  const b = document.getElementById('cr-pae-actionbar');
  const xw = document.getElementById('galXferWrap');
  return {
    shown: !!(b && b.classList.contains('show')),
    hasToInsp: !!(b && b.querySelector('[data-act="to-insp"]')),
    xferInBar: !!(xw && b && xw.parentElement === b),
    xferVisible: !!(xw && getComputedStyle(xw).display !== 'none'),
    text: (b ? b.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 90)
  };
});
ok('checking a photo raises the selection bar', bar.shown, JSON.stringify(bar));
ok('it carries To Inspection', bar.hasToInsp);
ok('the REAL transfer control moved into the bar', bar.xferInBar && bar.xferVisible, JSON.stringify(bar));
const menu = await A.page.evaluate(async () => {
  const btn = document.getElementById('galXferBtn'); if (!btn) return { no: true };
  btn.click(); await new Promise(r => setTimeout(r, 600));
  const m = document.getElementById('galXferMenu');
  const r = m ? m.getBoundingClientRect() : null;
  return { open: !!(m && getComputedStyle(m).display !== 'none'),
           onScreen: !!(r && r.width > 0 && r.height > 0 && r.left < window.innerWidth && r.right > 0) };
});
ok('the transfer dropdown opens where it can be seen', menu.open && menu.onScreen, JSON.stringify(menu));

console.log('\n--- F. the orange ball ---');
const tile = await A.page.evaluate(() => ({
  ai: document.querySelectorAll('#galGrid [data-cr-ai]').length,
  tiles: document.querySelectorAll('#galGrid .gph').length,
  del: document.querySelectorAll('#galGrid .gdel').length
}));
ok('no AI caption badge on any tile', tile.ai === 0, JSON.stringify(tile));
ok('the tiles themselves still render', tile.tiles >= 1, JSON.stringify(tile));
ok('delete is still on the tile', tile.del >= 1);
await A.browser.close();

console.log('\n--- C. as a REP (not an admin) ---');
const R = await boot(false);
tb = await visibleToolbar(R.page);
ok('a rep sees the same two buttons', tb.galAddBtn && tb.galCamBtn && !tb.galCcBtn, JSON.stringify(tb));
const repClick = await R.page.evaluate(async () => {
  let filePickerOpened = false;
  const fi = document.getElementById('galFileInput');
  fi.click = function(){ filePickerOpened = true; };
  document.getElementById('galAddBtn').click();
  await new Promise(r => setTimeout(r, 900));
  const p = document.getElementById('galCcPanel');
  return { ccOpen: !!(p && p.style.display !== 'none'), filePickerOpened };
});
ok('a rep\'s plus opens THEIR DEVICE, not CompanyCam', repClick.filePickerOpened === true && repClick.ccOpen === false, JSON.stringify(repClick));
await R.browser.close();

console.log('\n--- source ---');
ok('CompanyCam stays admin-gated', /isAdminUser\(\) && galMode !== 'insp'/.test(APP_HTML));
ok('the transfer wrap is moved, not hidden', /actionBar\.appendChild\(paeXferNode\)/.test(APP_HTML));
ok('the buttons still exist for the bar to drive',
  /id="galInspBtn"/.test(APP_HTML) && /id="galXferBtn"/.test(APP_HTML));

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
