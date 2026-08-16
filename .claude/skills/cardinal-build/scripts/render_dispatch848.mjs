/*
 * Build 848 render gate — Crew Dispatch empty cells no longer inherit the global
 * .empty placeholder (a dashed 8px card with a folder ::before illustration).
 * Boots the REAL index.html in Chromium, opens the dispatch with idle crews (all
 * cells empty), and inspects a childless day cell:
 *   - its ::before paints NO mask image (the folder glyph is gone)
 *   - it has NO 2px dashed border and no 8px radius (the placeholder card is gone)
 *   - it still carries the faint hatch background (the intended quiet-empty look)
 *   node render_dispatch848.mjs                          # 848 -> GREEN
 *   node render_dispatch848.mjs /path/to/index_v847.html # 847 -> RED (folder + dashed box)
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
const TAG = FILE.includes('847') ? '847' : '848';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  crews: [
    { id: 'c1', name: 'Betos Home Improvements', trade: 'Roofing', archived: false, contact_name: 'Alberto' },
    { id: 'c2', name: 'Pineda Siding', trade: 'Siding', archived: false, contact_name: 'Jamie' },
  ],
  crew_work_orders: [], crew_rates: [], pricing_items: [], projects: [],
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
  await page.waitForFunction(() => window.CardinalDispatch && typeof window.CardinalDispatch.open === 'function' && (window.sb || window.supa), { timeout: 20000 });
  await page.evaluate(async () => { await window.CardinalDispatch.open(); await new Promise(r => setTimeout(r, 400)); });

  const r = await page.evaluate(() => {
    // a childless day cell inside the grid, whatever its class
    const cells = Array.from(document.querySelectorAll('#cr-disp .dcell')).filter(c => c.children.length === 0 && !/week/.test(c.className));
    const c = cells[0];
    if (!c) return { none: true };
    const cs = getComputedStyle(c);
    const b = getComputedStyle(c, '::before');
    const mask = (b.webkitMaskImage && b.webkitMaskImage !== 'none') ? b.webkitMaskImage : (b.maskImage || 'none');
    return {
      count: cells.length,
      cls: c.className,
      beforeMask: mask,
      beforeContent: b.content,
      borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle,
      radius: cs.borderTopLeftRadius,
      bg: cs.backgroundImage.slice(0, 40),
    };
  });

  if (r.none) { ok('found an empty dispatch cell', false); }
  else {
    ok('empty cell ::before paints NO folder mask', r.beforeMask === 'none', r.beforeMask);
    ok('empty cell has NO 2px dashed border', !/2px dashed/.test(r.borderTop), r.borderTop);
    ok('empty cell has NO 8px placeholder radius', r.radius !== '8px', r.radius);
    ok('empty cell keeps the hatch background', /repeating-linear-gradient/.test(r.bg), r.bg);
    ok('empty cell no longer uses the bare `empty` class', !/\bempty\b/.test(r.cls), r.cls);
  }
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
