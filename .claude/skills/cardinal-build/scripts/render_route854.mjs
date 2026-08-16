/*
 * Build 854 gate — production accounts open into the Production hub on login.
 * Boots the REAL index.html, then drives the login entry (showMain) as each user:
 *   - curtis@ (production) -> the Production hub (#cr-pb) is shown, landing hidden
 *   - theo@   (admin)      -> the landing is shown, Production not force-opened
 *   node render_route854.mjs                          # 854 -> GREEN
 *   node render_route854.mjs /path/to/index_v853.html # 853 -> RED (both get the landing)
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
const TAG = FILE.includes('853') ? '853' : '854';

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' },
  ],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'A', address: '1 St', stage: 'Scheduled', checklist: {} }],
  appointments: [], inspection_reports: [], estimates: [], punch_items: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
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

async function loginAs(email) {
  return await page.evaluate(async (em) => {
    // set the signed-in user and drive the real login entry
    window.currentUser = { email: em };
    try { window.TEAM = true; } catch (e) {}
    var vis = document.getElementById('cr-pb'); if (vis) vis.style.display = 'none';
    var lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
    try { window.showMain(em); } catch (e) { return { threw: String(e && e.message || e) }; }
    await new Promise(r => setTimeout(r, 300));
    var pb = document.getElementById('cr-pb');
    var land = document.getElementById('landingView');
    return {
      prodShown: !!(pb && getComputedStyle(pb).display !== 'none'),
      landShown: !!(land && getComputedStyle(land).display !== 'none'),
    };
  }, email);
}

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.showMain === 'function' && window.CardinalProduction && (window.sb || window.supa), { timeout: 20000 });

  const curtis = await loginAs('curtis@cardinalrenovations.net');
  ok('Curtis (production) opens into the Production hub', curtis.prodShown === true, curtis);
  ok('Curtis does NOT land on the front door', curtis.landShown === false, curtis);

  const theo = await loginAs('theo@cardinalrenovations.net');
  ok('Theo (admin) still opens on the landing', theo.landShown === true, theo);
  ok('Theo is NOT force-routed to Production', theo.prodShown === false, theo);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
