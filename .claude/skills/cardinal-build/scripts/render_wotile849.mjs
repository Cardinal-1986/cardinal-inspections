/*
 * Build 849 render gate — a Work Orders tile in the profile Job Menu.
 * Boots the REAL index.html in Chromium, opens a project, and proves the tile:
 *   - exists in the Job Menu (data-jm="workorders"), labelled "Work Orders", with its icon
 *   - sits full-width (its row is a single 1fr column) so the pair grid stays even
 *   - opens the Work Orders section when clicked (the same #tab-workorders the dropdown drives)
 *   node render_wotile849.mjs                          # 849 -> GREEN
 *   node render_wotile849.mjs /path/to/index_v848.html # 848 -> RED (no tile)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('848') ? '848' : '849';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'Sandra Whitfield', address: '1042 Maple Ave, Dayton OH', stage: 'Scheduled', checklist: {} }],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (window.sb || window.supa) && typeof window.openProject === 'function' && typeof window.showTab === 'function', { timeout: 20000 });

  const r = await page.evaluate(async () => {
    window.openProject('p1');
    await new Promise(r => setTimeout(r, 400));
    const t = document.querySelector('#acxMount [data-jm="workorders"]') || document.querySelector('[data-jm="workorders"]');
    const out = { exists: !!t };
    if (!t) return out;
    out.label = (t.querySelector('.jbl') || {}).textContent || t.textContent.trim();
    out.hasIcon = !!t.querySelector('svg');
    const row = t.closest('.jaboxrow');
    out.rowCols = row ? getComputedStyle(row).gridTemplateColumns : '';
    out.isFullWidth = row ? row.getAttribute('style') && /1fr/.test(row.getAttribute('style')) : false;
    // click it -> Work Orders section shows
    t.click();
    await new Promise(r => setTimeout(r, 80));
    out.woShown = (function(){ var x = document.getElementById('tab-workorders'); return x && x.style.display === 'block'; })();
    out.ovHidden = (function(){ var x = document.getElementById('tab-overview'); return x && x.style.display === 'none'; })();
    return out;
  });

  if (!r.exists) { ok('Work Orders tile exists in the Job Menu', false); }
  else {
    ok('Work Orders tile exists in the Job Menu', true);
    ok('tile is labelled "Work Orders"', /Work Orders/.test(r.label), r.label);
    ok('tile carries an icon', r.hasIcon);
    ok('tile row is full-width (single 1fr column)', r.isFullWidth, r.rowCols);
    ok('clicking the tile opens the Work Orders section', r.woShown);
    ok('clicking the tile hides Overview', r.ovHidden);
  }
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
