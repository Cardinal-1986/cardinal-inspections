/*
 * gate_771.mjs — the rebuilt Production screen, in a REAL browser.
 *
 * jsdom cannot answer the questions this build raises: whether a rule actually
 * wins, whether an ink clears its contrast floor, whether a pane really swaps.
 * So this boots the repo's own index.html in Chromium against the e2e mock
 * Supabase, seeds production-shaped rows, drives the screen, and measures.
 *
 *   node .claude/skills/cardinal-build/scripts/gate_771.mjs [path/to/index.html]
 *
 * Negative control: point it at the previous build — it must go RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const ROOT = process.cwd();
const APP = readFileSync(process.argv[2] || ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const OUT = process.env.GATE_OUT || '/tmp/cardinal-771';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? '  — ' + x : '')); } };

/* ---- dates relative to now, so the gate never rots ---- */
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ISO = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString(); };

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production Manager' },
    { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' },
  ],
  projects: [
    // Approved, scheduled, NOT ordered  -> Scheduled box + Needs ordered box
    { id: 'j-alv', name: 'M. Alvarez', address: '6633 Edenhill Ave', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-30) },
    // Approved, NO appointment          -> Needs ordered + "Needs scheduling"
    { id: 'j-hol', name: 'Dan Hollis', address: '1240 Creekview Dr', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-20) },
    // Scheduled AND ordered             -> Ordered box
    { id: 'j-bre', name: 'T. Brennan', address: '88 Ridge Rd', stage: 'Scheduled', checklist: JSON.stringify({ materials_ordered_at: ISO(-2), materials_ordered_by: 'curtis@cardinalrenovations.net' }), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-40) },
    // A Prospect carrying punch         -> the off-stage tail
    { id: 'j-tac', name: 'R. Tackett', address: '418 Wilmington Pk', stage: 'Prospect', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-10) },
  ],
  appointments: [
    { id: 'ap-1', project_id: 'j-alv', kind: 'job',  appt_date: D(2), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-2', project_id: 'j-alv', kind: 'drop', appt_date: D(1), appt_time: '07:00', title: 'Material drop', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-3', project_id: 'j-bre', kind: 'job',  appt_date: D(6), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
  ],
  punch_items: [
    { id: 'pi-1', project_id: 'j-tac', title: 'Re-seat drip edge, north gable', detail: 'Rattles in wind', kind: 'punch', priority: 'high', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-1), scheduled_at: D(0), photos: [], comments: [], steps: [] },
    { id: 'pi-2', project_id: 'j-tac', title: 'Downspout strap, rear', kind: 'punch', priority: 'normal', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-14), photos: [], comments: [], steps: [] },
    { id: 'pi-3', project_id: 'j-alv', title: 'Garage ceiling stain', kind: 'callback', priority: 'normal', status: 'done', assigned_to: 'curtis@cardinalrenovations.net', done_by: 'curtis@cardinalrenovations.net', done_at: ISO(-2), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-8), photos: [], comments: [], steps: [] },
  ],
  estimates: [], inspection_reports: [], crew_work_orders: [], collections: [], commissions: [],
  ai_estimates: [], contracts: [], insurance_claims: [], crews: [], pricing_items: [], pricing_categories: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

/* page.screenshot() blocks on document.fonts.ready and the harness aborts font
   requests, so capture through CDP instead — otherwise every shot times out
   into a silent catch and the gate "passes" with no picture to look at. */
const cdp = await ctx.newCDPSession(page);
const shot = async (n) => {
  try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); }
  catch (e) { console.log('  (shot ' + n + ' failed: ' + String(e).slice(0, 60) + ')'); }
};



console.log('gate_771 — the audit repairs, in Chromium');
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none'; });
await page.evaluate(() => { window.is_admin = () => true; window.currentUser = { email: 'theo@cardinalrenovations.net' }; });

console.log('\n--- FIX 1 (was BROKEN): the tick writes what you actually tapped ---');
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(1300);
/* 856 routes the Punch-outs / Closed boxes to the full Punch & Repairs page,
   which has no [data-tick]. The hub's internal list — the code FIX 1 proves —
   survives as the shipped fallback for a boot where that module is absent, so
   exercise exactly that path: drop the router hook, keeping the hub's own
   toggle()/write pipeline under test unchanged. */
await page.evaluate(() => { window.__origOPV = window.openPunchView; window.openPunchView = undefined; });
await page.click('#cr-pb .pbtile[data-box="punch"]');
await page.waitForTimeout(600);
await page.evaluate(() => { window.__WRITES__ = []; });
// pi-2 is OPEN. tick it -> must become done.
await page.click('#cr-pb [data-tick="pi-2"]');
await page.waitForTimeout(1300);
let st = await page.evaluate(() => {
  const r = window.CardinalPunch.rows().find(x => x.id === 'pi-2');
  const w = (window.__WRITES__ || []).filter(x => x.table === 'punch_items')
    .map(x => JSON.stringify(x.payload || {}));
  return { status: r && r.status, done_by: r && r.done_by, writes: w };
});
ok('ticking an OPEN item closes it', st.status === 'done', JSON.stringify(st));
ok('...and the write says done, not open', st.writes.some(w => /"status":"done"/.test(w)), JSON.stringify(st.writes));
ok('...stamped with who closed it', !!st.done_by, String(st.done_by));

await page.evaluate(() => { window.__WRITES__ = []; });
await page.click('#cr-pb [data-back]');            /* back to the boxes */
await page.waitForTimeout(500);
await page.click('#cr-pb .pbclosed');              /* the green Closed repairs row */
await page.waitForTimeout(600);
await page.click('#cr-pb [data-tick="pi-2"]');
await page.waitForTimeout(1300);
st = await page.evaluate(() => {
  const r = window.CardinalPunch.rows().find(x => x.id === 'pi-2');
  const w = (window.__WRITES__ || []).filter(x => x.table === 'punch_items').map(x => JSON.stringify(x.payload || {}));
  return { status: r && r.status, done_at: r && r.done_at, done_by: r && r.done_by, writes: w };
});
ok('ticking a CLOSED item reopens it', st.status === 'open', JSON.stringify(st));
ok('...and clears done_at/done_by instead of re-stamping them',
  !st.done_at && !st.done_by, JSON.stringify({ done_at: st.done_at, done_by: st.done_by }));
ok('...the write says open', st.writes.some(w => /"status":"open"/.test(w)), JSON.stringify(st.writes));

console.log('\n--- FIX 2: the card clears the installed app bottom bar ---');
await page.evaluate(() => { if (window.__origOPV) window.openPunchView = window.__origOPV; });
await page.evaluate(() => window.CardinalPunchCard.open('pi-1', { back: 'production' }));
await page.waitForTimeout(900);
const pad = await page.evaluate(() => {
  const w = document.querySelector('#cr-pk .pkwrap');
  const b = document.querySelector('#cr-pb .pbwrap');
  return { card: getComputedStyle(w).paddingBottom, board: b ? getComputedStyle(b).paddingBottom : null };
});
ok('card wrap clears >= 96px at the bottom', parseFloat(pad.card) >= 96, pad.card);
ok('board wrap clears >= 96px at the bottom', parseFloat(pad.board) >= 96, pad.board);

console.log('\n--- FIX 3: delete / remove photo / edit description are reachable again ---');
const back3 = await page.evaluate(() => ({
  editDesc: !!document.querySelector('#cr-pk [data-act="editdesc"]'),
  del: !!document.querySelector('#cr-pk [data-act="del"]'),
  descAlwaysRenders: /Description/.test(document.getElementById('cr-pk').textContent),
}));
ok('description has an Edit control', back3.editDesc);
ok('description section renders even when empty', back3.descAlwaysRenders);
/* 947 retired the always-on Remove section: Delete now lives behind the header
   ⋯ menu (same mayDelete gate). Open the menu and prove it is still there. */
ok('a delete control exists for admins/production (behind the 947 ⋯ menu)', await page.evaluate(() => {
  const m = document.querySelector('#cr-pk [data-act="menu"]');
  if (!m) return false;
  m.click();
  return true;
}) && await (async () => { await page.waitForTimeout(400);
  return page.evaluate(() => !!document.querySelector('#cr-pk [data-act="del"]')); })());
// give it a photo, then prove the remove pip appears and works
await page.evaluate(async () => {
  const r = window.CardinalPunch.rows().find(x => x.id === 'pi-1');
  r.photos = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];
  window.CardinalPunchCard.open('pi-1', { back: 'production' });
});
await page.waitForTimeout(800);
ok('filled photo slots carry a remove control',
  await page.evaluate(() => document.querySelectorAll('#cr-pk [data-rmphoto]').length === 2));
/* 1080-1083: window.confirm became the in-app crAsk sheet — stub both. */
await page.evaluate(() => { window.confirm = () => true; window.crAsk = () => Promise.resolve(true); window.__WRITES__ = []; });
await page.click('#cr-pk [data-rmphoto="0"]');
await page.waitForTimeout(1000);
ok('removing a photo writes the shortened array', await page.evaluate(() => {
  const r = window.CardinalPunch.rows().find(x => x.id === 'pi-1');
  return Array.isArray(r.photos) && r.photos.length === 1 && /b\.jpg/.test(r.photos[0]);
}), await page.evaluate(() => JSON.stringify((window.CardinalPunch.rows().find(x=>x.id==='pi-1')||{}).photos)));
ok('delete is gated on is_full_access, not invented locally', APP.includes('window.is_full_access'));

console.log('\n--- FIX 4: the card is in the history switch ---');
ok("navRestore has a 'punchcard' case", /case 'punchcard':/.test(APP));
ok('the card records which item to restore', /window\.__crPunchCardLast/.test(APP));

console.log('\n--- FIX 5: the home strips actually repaint ---');
ok('refreshOthers calls the real entry point', /typeof window\.renderPunchStrips === 'function'\) window\.renderPunchStrips\(\)/.test(APP));
ok('the dead CardinalPunchStrip.paint call is gone', !/CardinalPunchStrip\.paint/.test(APP));

console.log('\n--- FIX 6: the honest-outcome line no longer throws ---');
ok('notifyOutcomeText is always handed an ARRAY', !/notifyOutcomeText\(res, (shortName|nameOf)\(/.test(APP));
{
  /* Scope to the blocks this build touched. The app's own two pre-existing call
     sites (16568, 49351) already pass arrays and are none of this build's
     business — a file-wide assertion flags them and reads as a regression. */
  const mine = ['cr-pb-script', 'cr-pk-script'].map(id => {
    const a = APP.indexOf('<script id="' + id + '"');
    return APP.slice(a, APP.indexOf('</script>', a));
  }).join('\n');
  const calls = mine.match(/notifyOutcomeText\(res,\s*([^)]*)\)/g) || [];
  const bad = calls.filter(c => !/\[|list/.test(c));
  ok('every new call site passes an ARRAY', calls.length >= 2 && bad.length === 0,
    'calls=' + JSON.stringify(calls) + ' bad=' + JSON.stringify(bad));
}
await page.evaluate(() => {
  window.__NOTIFIED__ = [];
  window.notifyTeam = async (to, t) => { window.__NOTIFIED__.push({ to, t }); return { sent: 1, mailed: 0 }; };
});
await page.selectOption('#cr-pk [data-f="assigned"]', 'curtis@cardinalrenovations.net');
await page.waitForTimeout(1400);
ok('reassigning prints a real outcome line, not nothing', await page.evaluate(() => {
  const t = (document.querySelector('#cr-pk .pkout') || {}).textContent || '';
  return t.trim().length > 0;
}), await page.evaluate(() => (document.querySelector('#cr-pk .pkout') || {}).textContent));

console.log('\n--- FIX 7: hideAllViews HIDES the card, it does not navigate ---');
await page.evaluate(() => { window.__wentToProduction = false;
  const orig = window.CardinalProduction.open;
  window.CardinalProduction.open = function(){ window.__wentToProduction = true; return orig.apply(this, arguments); };
});
await page.evaluate(() => window.hideAllViews());
await page.waitForTimeout(700);
ok('the card is hidden', await page.evaluate(() => !document.getElementById('cr-pk').classList.contains('open')));
ok('hideAllViews did NOT re-open Production on top of the destination',
  await page.evaluate(() => window.__wentToProduction === false));
// but the back button still navigates
await page.evaluate(() => { window.__wentToProduction = false; window.CardinalPunchCard.open('pi-1', { back: 'production' }); });
await page.waitForTimeout(800);
await page.click('#cr-pk [data-act="back"]');
await page.waitForTimeout(800);
ok('the BACK button still goes up one level to Production',
  await page.evaluate(() => window.__wentToProduction === true));

console.log('\n--- FIX 8: the burger menu closes with the lever it actually uses ---');
ok('the injected item hides #navMenu by display', /m\.style\.display = 'none';\n\s*open\(\);/.test(APP));
ok('and stops the click from falling through', /e\.stopPropagation\(\);/.test(APP.slice(APP.indexOf('function addMenuItem'), APP.indexOf('function addMenuItem') + 900)));
{
  /* Scope to addMenuItem AND drop comments first: the fix's own explanatory
     comment quotes the dead lever, and a bare regex counts its own explanation
     — the comment-pollution trap this project keeps paying for. */
  const a = APP.indexOf('function addMenuItem');
  const fn = APP.slice(a, APP.indexOf('\nfunction ', a + 10)).replace(/\/\*[\s\S]*?\*\//g, '');
  ok('no live classList lever remains in addMenuItem', !/classList\.remove\('show'\)/.test(fn));
  ok('the live lever is style.display', /m\.style\.display = 'none'/.test(fn));
}

console.log('\n--- FIX 9: the client profile punch list opens THE card ---');
ok('the profile tab routes into CardinalPunchCard',
  /CardinalPunchCard\.open\(b\.dataset\.open, \{ back:'none' \}\)/.test(APP));
{
  const n = (APP.match(/CardinalPunchCard\.open\(/g) || []).length;
  ok('every punch-out entry point routes to the one card (>=4 call sites)', n >= 4, 'sites=' + n);
}

ok('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
