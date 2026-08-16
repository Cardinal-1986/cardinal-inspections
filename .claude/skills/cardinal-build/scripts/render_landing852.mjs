/*
 * Build 852 gate — landing focused on Option 1, Pop-Up Roof moved to Sales Floor.
 * Boots the REAL index.html, shows the landing, and asserts:
 *   - Quick Inspection, Schedule Board and the Pop-Up Roof are GONE from the landing
 *   - Retail, Cardinal Truth, Community, Production, Sales Floor, Resource Library remain
 *   - Resource Library spans the row (full-width)
 *   - the Sales Floor now carries a "The Pop-Up Roof" button
 * Writes landing852.png for the eye.
 *   node render_landing852.mjs                          # 852 -> GREEN
 *   node render_landing852.mjs /path/to/index_v851.html # 851 -> RED
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('851') ? '851' : '852';
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3b7d9014-74de-597e-b825-c1f5c6f1451c/scratchpad';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'A', address: '1 St', stage: 'Lead', checklist: {} }],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
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
  await page.waitForFunction(() => document.getElementById('landingView') && window.CardinalLanding, { timeout: 20000 });
  const r = await page.evaluate(async () => {
    var lv = document.getElementById('landingView');
    lv.style.display = 'block';
    // nudge the portal builder + paint
    try { if (window.CardinalLanding && window.CardinalLanding.build) window.CardinalLanding.build(); } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
    var q = s => lv.querySelector(s);
    var out = {
      qi: !!q('[data-go="qi"]'),
      board: !!q('[data-go="board"]'),
      popupLink: !!q('.cr-lr-book') || /Pop-Up Roof/.test(lv.textContent),
      retail: !!q('[data-go="retail"]'),
      insurance: !!q('[data-go="insurance"]'),
      community: !!q('[data-go="community"]'),
      production: !!q('[data-go="production"]'),
      sales: !!q('[data-go="sales"]'),
      library: !!q('[data-go="library"]'),
    };
    var lib = q('[data-go="library"]');
    out.libFull = lib ? /1\s*\/\s*-1/.test(lib.getAttribute('style') || '') : false;
    return out;
  });

  ok('Quick Inspection removed from landing', !r.qi);
  ok('Schedule Board removed from landing', !r.board);
  ok('Pop-Up Roof removed from landing', !r.popupLink);
  ok('Retail / Truth / Community all present', r.retail && r.insurance && r.community, r);
  ok('Production present', r.production);
  ok('Sales Floor present', r.sales);
  ok('Resource Library present and full-width', r.library && r.libFull, { library: r.library, full: r.libFull });

  // screenshot the landing
  const c1 = await ctx.newCDPSession(page);
  const h = await page.evaluate(() => Math.min(document.querySelector('.cr-lr') ? Math.ceil(document.querySelector('.cr-lr').getBoundingClientRect().height) + 20 : 1000, 1400));
  const png = (await c1.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 2 } })).data;
  writeFileSync(OUT + '/landing852.png', Buffer.from(png, 'base64'));

  // Sales Floor now has the Pop-Up Roof
  const sf = await page.evaluate(async () => {
    try { if (window.CardinalSalesFloor) window.CardinalSalesFloor.open(); } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
    var el = document.getElementById('cr-sf');
    return { popup: !!(el && el.querySelector('[data-go="popup"]')), text: el ? /Pop-Up Roof/.test(el.textContent) : false };
  });
  ok('Sales Floor now carries the Pop-Up Roof', sf.popup && sf.text, sf);

  console.log('  (wrote landing852.png)');
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
