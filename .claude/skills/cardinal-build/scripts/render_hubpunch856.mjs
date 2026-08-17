/*
 * Build 856 gate — the hub's Punch-outs / Closed repairs open the FULL Punch & Repairs page.
 * Boots the REAL index.html, opens CardinalProduction, spies on window.openPunchView, and taps
 * the Punch-outs tile ([data-box="punch"]) and the Closed repairs bar ([data-box="closed"]):
 * both must call openPunchView and show #punchView, NOT drop into the hub's internal list pane.
 * A materials box ([data-box="needs"]) must still use the internal list. Writes hubpunch856.png.
 *   node render_hubpunch856.mjs                          # 856 -> GREEN
 *   node render_hubpunch856.mjs /path/to/index_v855.html # 855 -> RED (punch -> internal list)
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
const TAG = FILE.includes('855') ? '855' : '856';
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
  appointments: [{ id: 'a1', project_id: 'p1', appt_date: iso, appt_time: '08:00', kind: 'job', title: 'Whitfield tear-off' }],
  punch_items: [
    { id: 'pi1', title: 'Leak', project_id: 'p2', assigned_to: 'scottie@cardinalrenovations.net', scheduled_at: iso + 'T13:00:00', status: 'open', priority: 'high' },
    { id: 'pi2', title: 'Reattach fascia', project_id: 'p1', assigned_to: 'curtis@cardinalrenovations.net', status: 'open', priority: 'normal' },
    { id: 'pi3', title: 'Old repair', project_id: 'p1', assigned_to: 'curtis@cardinalrenovations.net', status: 'done', done_at: iso + 'T09:00:00', priority: 'normal' },
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
    window.__hit = { punch: 0 };
    var real = window.openPunchView;
    window.openPunchView = function(){ window.__hit.punch++; return real && real.apply(this, arguments); };

    async function openHub(){ try { window.CardinalProduction.open(); } catch(e){} await new Promise(r => setTimeout(r, 350)); }
    function tile(box){ return document.querySelector('#cr-pb [data-box="' + box + '"]'); }
    function paneIsList(){ // hub internal list shows a .pbwrap with a data-back and the BOX_TITLE sub
      var pv = document.getElementById('punchView');
      var punchShown = pv && getComputedStyle(pv).display !== 'none';
      var hub = document.getElementById('cr-pb');
      var hubShown = hub && getComputedStyle(hub).display !== 'none';
      return { punchShown: !!punchShown, hubShown: !!hubShown };
    }

    var out = {};
    // 1) Punch-outs tile
    await openHub();
    out.hasPunchTile = !!tile('punch');
    var before = window.__hit.punch;
    if (tile('punch')) tile('punch').click();
    await new Promise(r => setTimeout(r, 400));
    out.punchCalledOpenPunch = window.__hit.punch === before + 1;
    var st1 = paneIsList();
    out.punchShowsFullPage = st1.punchShown && !st1.hubShown;

    // 2) Closed repairs bar
    await openHub();
    out.hasClosedBar = !!tile('closed');
    var before2 = window.__hit.punch;
    if (tile('closed')) tile('closed').click();
    await new Promise(r => setTimeout(r, 400));
    out.closedCalledOpenPunch = window.__hit.punch === before2 + 1;

    // 3) a materials box must still use the internal hub list (NOT openPunchView)
    await openHub();
    var before3 = window.__hit.punch;
    var nb = tile('needs') || tile('scheduled') || tile('ordered');
    out.hasMaterialsBox = !!nb;
    if (nb) nb.click();
    await new Promise(r => setTimeout(r, 300));
    out.materialsDidNotCallPunch = window.__hit.punch === before3;
    var hub = document.getElementById('cr-pb');
    out.materialsStayedInHub = hub && getComputedStyle(hub).display !== 'none';

    return out;
  });

  ok('hub has a Punch-outs tile', r.hasPunchTile);
  ok('tapping Punch-outs calls openPunchView', r.punchCalledOpenPunch, r.punchCalledOpenPunch);
  ok('Punch-outs shows the full #punchView (hub hidden)', r.punchShowsFullPage, r.punchShowsFullPage);
  ok('hub has a Closed repairs bar', r.hasClosedBar);
  ok('tapping Closed repairs calls openPunchView', r.closedCalledOpenPunch, r.closedCalledOpenPunch);
  ok('a materials box does NOT call openPunchView', r.materialsDidNotCallPunch, r.materialsDidNotCallPunch);
  ok('a materials box stays in the hub (internal list)', r.materialsStayedInHub);

  // screenshot: the full punch page reached from the hub's Punch-outs
  await page.evaluate(async () => {
    try { window.CardinalProduction.open(); } catch(e){}
    await new Promise(r => setTimeout(r, 300));
    var t = document.querySelector('#cr-pb [data-box="punch"]'); if (t) t.click();
    await new Promise(r => setTimeout(r, 500));
  });
  const c1 = await ctx.newCDPSession(page);
  const h = await page.evaluate(() => { var w = document.getElementById('punchView'); return Math.min(w ? Math.ceil(w.getBoundingClientRect().height) + 30 : 1100, 1700); });
  const png = (await c1.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 2 } })).data;
  writeFileSync(OUT + '/hubpunch856.png', Buffer.from(png, 'base64'));
  console.log('  (wrote hubpunch856.png)');
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
