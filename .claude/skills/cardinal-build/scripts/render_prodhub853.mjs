/*
 * Build 853 gate — Production hub reordered: month calendar, tiles, then the day's agenda.
 * Boots the REAL index.html, opens CardinalProduction, and asserts the home hub renders
 * the compact month calendar (.pbmonth) FIRST, then the command tiles (.pbtiles), then the
 * agenda — and that tapping a day and paging the month keep working. Writes prodhub853.png.
 *   node render_prodhub853.mjs                          # 853 -> GREEN
 *   node render_prodhub853.mjs /path/to/index_v852.html # 852 -> RED (no .pbmonth on home)
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
const TAG = FILE.includes('852') ? '852' : '853';
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
    await window.CardinalProduction.open();
    await new Promise(r => setTimeout(r, 400));
    var el = document.getElementById('cr-pb');
    var wrap = el && el.querySelector('.pbwrap');
    if (!wrap) return { none: true };
    var month = wrap.querySelector('.pbmonth');
    var tiles = wrap.querySelector('.pbtiles');
    var order = Array.from(wrap.children).concat(Array.from(wrap.querySelectorAll('.pbmonth,.pbtiles,.pbrule')));
    // positional order via compareDocumentPosition
    function idx(sel){ var n = wrap.querySelector(sel); return n ? Array.prototype.indexOf.call(wrap.querySelectorAll('*'), n) : -1; }
    var out = {
      hasMonth: !!month,
      hasTiles: !!tiles,
      dayCells: month ? month.querySelectorAll('.pbday').length : 0,
      monthBeforeTiles: month && tiles ? (month.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false,
      tilesBeforeRule: false,
      noWeekStrip: !wrap.querySelector('.pbweek'),
    };
    var rule = wrap.querySelector('.pbrule');
    out.tilesBeforeRule = tiles && rule ? (tiles.compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false;
    // interaction: page the month, then pick a day
    var nxt = month && month.querySelector('[data-mon="1"]'); if (nxt) nxt.click();
    await new Promise(r => setTimeout(r, 120));
    out.monthStillThere = !!document.querySelector('#cr-pb .pbmonth');
    var someDay = document.querySelector('#cr-pb .pbmonth .pbday:not(.out)'); if (someDay) someDay.click();
    await new Promise(r => setTimeout(r, 120));
    out.agendaAfterTap = !!document.querySelector('#cr-pb .pbrule');
    return out;
  });

  if (r.none) { ok('Production home rendered', false); }
  else {
    ok('home leads with a month calendar (.pbmonth)', r.hasMonth);
    ok('the month has a full grid of day cells', r.dayCells >= 28, r.dayCells);
    ok('command tiles still present', r.hasTiles);
    ok('order: calendar BEFORE tiles', r.monthBeforeTiles);
    ok('order: tiles BEFORE the day agenda rule', r.tilesBeforeRule);
    ok('week strip removed from the home', r.noWeekStrip);
    ok('paging the month keeps the calendar', r.monthStillThere);
    ok('tapping a day keeps the agenda below', r.agendaAfterTap);
  }

  // reset to home + today, screenshot
  await page.evaluate(async () => { try { window.CardinalProduction.close && window.CardinalProduction.close(false); window.CardinalProduction.open(); } catch (e) {} await new Promise(r => setTimeout(r, 300)); });
  const c1 = await ctx.newCDPSession(page);
  const h = await page.evaluate(() => { var w = document.querySelector('#cr-pb .pbwrap'); return Math.min(w ? Math.ceil(w.getBoundingClientRect().height) + 30 : 1100, 1600); });
  const png = (await c1.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 2 } })).data;
  writeFileSync(OUT + '/prodhub853.png', Buffer.from(png, 'base64'));
  console.log('  (wrote prodhub853.png)');
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
