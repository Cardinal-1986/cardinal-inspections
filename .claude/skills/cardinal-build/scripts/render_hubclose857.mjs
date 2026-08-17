/*
 * Build 857 gate — opening Punch & Repairs / Crew Dispatch / Crews from the Production
 * hub must NOT leave the retail home (#mainView) showing behind the target page.
 * Boots the REAL index.html, opens CardinalProduction, and for each of the three routes
 * spies on the target's open() and asserts: the target was called, and #mainView is hidden
 * afterwards. The 856 tree leaves #mainView shown (close() -> showHome()), so it goes RED.
 *   node render_hubclose857.mjs                          # 857 -> GREEN
 *   node render_hubclose857.mjs /path/to/index_v856.html # 856 -> RED (mainView shown)
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
const TAG = FILE.includes('856') ? '856' : '857';
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
  punch_items: [{ id: 'pi1', title: 'Leak', project_id: 'p2', assigned_to: 'scottie@cardinalrenovations.net', status: 'open', priority: 'high' }],
  inspection_reports: [], estimates: [], insurance_claims: [],
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

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalProduction && window.CardinalProduction.open && window.openPunchView && window.CardinalDispatch && window.CardinalCrews, { timeout: 20000 });
  const r = await page.evaluate(async () => {
    window.__hit = { punch: 0, dispatch: 0, crews: 0 };
    var rp = window.openPunchView; window.openPunchView = function(){ window.__hit.punch++; return rp && rp.apply(this, arguments); };
    var rd = window.CardinalDispatch.open; window.CardinalDispatch.open = function(){ window.__hit.dispatch++; return rd && rd.apply(this, arguments); };
    var rc = window.CardinalCrews.open; window.CardinalCrews.open = function(){ window.__hit.crews++; return rc && rc.apply(this, arguments); };
    function shown(id){ var e = document.getElementById(id); return e ? getComputedStyle(e).display !== 'none' : false; }
    async function openHub(){ try { window.CardinalProduction.open(); } catch(e){} await new Promise(r => setTimeout(r, 350)); }
    function tap(sel){ var n = document.querySelector(sel); if (n) n.click(); }

    var out = {};
    // Punch-outs
    await openHub();
    tap('#cr-pb [data-box="punch"]'); await new Promise(r => setTimeout(r, 450));
    out.punchCalled = window.__hit.punch >= 1;
    out.punchHomeHidden = !shown('mainView');
    out.punchShown = shown('punchView');

    // Crew Dispatch
    await openHub();
    tap('#cr-pb [data-hub="dispatch"]'); await new Promise(r => setTimeout(r, 450));
    out.dispatchCalled = window.__hit.dispatch >= 1;
    out.dispatchHomeHidden = !shown('mainView');

    // Crews
    await openHub();
    tap('#cr-pb [data-hub="crews"]'); await new Promise(r => setTimeout(r, 450));
    out.crewsCalled = window.__hit.crews >= 1;
    out.crewsHomeHidden = !shown('mainView');
    return out;
  });

  ok('Punch-outs calls openPunchView', r.punchCalled);
  ok('Punch-outs shows #punchView', r.punchShown);
  ok('Punch-outs does NOT leave the retail home (#mainView) showing', r.punchHomeHidden, r.punchHomeHidden);
  ok('Crew Dispatch calls CardinalDispatch.open', r.dispatchCalled);
  ok('Crew Dispatch does NOT leave the retail home showing', r.dispatchHomeHidden, r.dispatchHomeHidden);
  ok('Crews calls CardinalCrews.open', r.crewsCalled);
  ok('Crews does NOT leave the retail home showing', r.crewsHomeHidden, r.crewsHomeHidden);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
