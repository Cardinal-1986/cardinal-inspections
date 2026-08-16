/*
 * Build 855 gate — the Production hub gains Crew Dispatch and Crews under the tiles.
 * Boots the REAL index.html, opens CardinalProduction, and asserts the home hub now
 * has a .pbnav with [data-hub="dispatch"] and [data-hub="crews"] buttons placed AFTER
 * the tiles and BEFORE the day agenda rule, and that clicking them calls the existing
 * CardinalDispatch.open / CardinalCrews.open. Writes hubnav855.png.
 *   node render_hubnav855.mjs                          # 855 -> GREEN
 *   node render_hubnav855.mjs /path/to/index_v854.html # 854 -> RED (no .pbnav on home)
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
const TAG = FILE.includes('854') ? '854' : '855';
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3b7d9014-74de-597e-b825-c1f5c6f1451c/scratchpad';
const iso = '2026-08-16';

const SEED = {
  team_profiles: [{ email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' }],
  crews: [{ id: 'c1', name: 'Betos', trade: 'Roofing', archived: false }],
  crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [
    { id: 'p1', name: 'Sandra Whitfield', address: '1042 Maple', stage: 'Scheduled', checklist: { production: true } },
    { id: 'p2', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: {} },
  ],
  appointments: [
    { id: 'a1', project_id: 'p1', appt_date: iso, appt_time: '08:00', kind: 'job', title: 'Whitfield tear-off' },
  ],
  punch_items: [
    { id: 'pi1', title: 'Fix flashing', project_id: 'p2', assigned_to: 'scottie@cardinalrenovations.net', scheduled_at: iso + 'T13:00:00', status: 'open', priority: 'high' },
  ],
  inspection_reports: [], estimates: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1100 }, deviceScaleFactor: 2 });
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
  await page.waitForFunction(() => window.CardinalProduction && typeof window.CardinalProduction.open === 'function', { timeout: 20000 });
  const r = await page.evaluate(async () => {
    // install spies on the existing globals BEFORE clicking
    window.__hit = { dispatch: 0, crews: 0 };
    try { if (window.CardinalDispatch) { var od = window.CardinalDispatch.open; window.CardinalDispatch.open = function(){ window.__hit.dispatch++; return od && od.apply(this, arguments); }; } } catch(e){}
    try { if (window.CardinalCrews) { var oc = window.CardinalCrews.open; window.CardinalCrews.open = function(){ window.__hit.crews++; return oc && oc.apply(this, arguments); }; } } catch(e){}
    await window.CardinalProduction.open();
    await new Promise(r => setTimeout(r, 400));
    var el = document.getElementById('cr-pb');
    var wrap = el && el.querySelector('.pbwrap');
    if (!wrap) return { none: true };
    var nav = wrap.querySelector('.pbnav');
    var tiles = wrap.querySelector('.pbtiles');
    var rule = wrap.querySelector('.pbrule');
    var disp = wrap.querySelector('[data-hub="dispatch"]');
    var crew = wrap.querySelector('[data-hub="crews"]');
    var out = {
      hasNav: !!nav,
      hasDispatchBtn: !!disp,
      hasCrewsBtn: !!crew,
      navAfterTiles: nav && tiles ? (tiles.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false,
      navBeforeRule: nav && rule ? (nav.compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false,
      dispHasIcon: !!(disp && disp.querySelector('svg')),
      crewHasIcon: !!(crew && crew.querySelector('svg')),
      dispLabel: disp ? (disp.querySelector('.t') ? disp.querySelector('.t').textContent : '') : '',
      crewLabel: crew ? (crew.querySelector('.t') ? crew.querySelector('.t').textContent : '') : '',
    };
    // click dispatch, then reopen the hub and click crews
    if (disp) disp.click();
    await new Promise(r => setTimeout(r, 200));
    out.dispatchHit = window.__hit.dispatch;
    // reopen hub
    try { window.CardinalProduction.open(); } catch(e){}
    await new Promise(r => setTimeout(r, 300));
    var crew2 = document.querySelector('#cr-pb [data-hub="crews"]');
    if (crew2) crew2.click();
    await new Promise(r => setTimeout(r, 200));
    out.crewsHit = window.__hit.crews;
    return out;
  });

  if (r.none) { ok('Production home rendered', false); }
  else {
    ok('home has a .pbnav block', r.hasNav);
    ok('nav has a Crew Dispatch button', r.hasDispatchBtn);
    ok('nav has a Crews button', r.hasCrewsBtn);
    ok('nav sits AFTER the command tiles', r.navAfterTiles);
    ok('nav sits BEFORE the day agenda rule', r.navBeforeRule);
    ok('Dispatch button has an icon', r.dispHasIcon);
    ok('Crews button has an icon', r.crewHasIcon);
    ok('Dispatch label reads "Crew Dispatch"', /Crew Dispatch/.test(r.dispLabel), r.dispLabel);
    ok('Crews label reads "Crews"', /Crews/.test(r.crewLabel), r.crewLabel);
    ok('tapping Dispatch calls CardinalDispatch.open', r.dispatchHit >= 1, r.dispatchHit);
    ok('tapping Crews calls CardinalCrews.open', r.crewsHit >= 1, r.crewsHit);
  }

  // reset to home, screenshot
  await page.evaluate(async () => { try { window.CardinalProduction.close && window.CardinalProduction.close(false); window.CardinalProduction.open(); } catch (e) {} await new Promise(r => setTimeout(r, 300)); });
  const c1 = await ctx.newCDPSession(page);
  const h = await page.evaluate(() => { var w = document.querySelector('#cr-pb .pbwrap'); return Math.min(w ? Math.ceil(w.getBoundingClientRect().height) + 30 : 1100, 1700); });
  const png = (await c1.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 2 } })).data;
  writeFileSync(OUT + '/hubnav855.png', Buffer.from(png, 'base64'));
  console.log('  (wrote hubnav855.png)');
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
