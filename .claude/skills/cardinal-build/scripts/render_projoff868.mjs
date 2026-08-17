/*
 * Build 868 gate — client/job edits save offline through CardinalOutbox, and a
 * stale offline reload doesn't revert them (the reload() overlay).
 * Boots the REAL app, loads the cache, goes OFFLINE (CDP), changes a job's stage
 * via setStage():
 *   - no throw, queued as a projects UPDATE (pending >= 1), badge shown
 *   - the in-memory row shows the new stage (optimistic), the mock STORE still
 *     holds the OLD stage (no direct DB write while offline)
 * then reload()s WHILE STILL OFFLINE (mock returns the old stage, as a stale
 * cache would):
 *   - cacheProjects STILL shows the new stage (overlay re-applied the queued edit)
 * then goes ONLINE and flushes:
 *   - the queue drains to 0 and a projects UPDATE {stage} was actually sent.
 * v867 has no offline pdb.update path -> offline it writes directly / never queues -> RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('867') ? '867' : '868';
const PID = 'pj-marcus';
const SEED = {
  projects: [{ id: PID, name: 'Marcus Cole', address: '88 Oak St', phone: '', email: '', stage: 'Lead', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' }],
  team_profiles: [], inspection_reports: [], appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [],
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
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
  await page.waitForFunction(() => typeof reload === 'function' && typeof setStage === 'function' && window.pdb && window.cacheProjects !== undefined, { timeout: 20000 });

  // Load the cache online, then select the project.
  await page.evaluate(async (pid) => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    window.alert = function (m) { window.__alert = (window.__alert || 0) + 1; window.__alertMsg = String(m); };
    window.prompt = function () { return ''; };
    try { await reload(); } catch (e) {}
    var p = (window.cacheProjects || []).find(function (x) { return x.id === pid; });
    if (p) window.currentProject = p;
  }, PID);
  const loaded = await page.evaluate((pid) => {
    var p = (window.cacheProjects || []).find(function (x) { return x.id === pid; });
    return { found: !!p, stage: p && p.stage, hasOutbox: !!(window.CardinalOutbox && window.CardinalOutbox.patchesFor) };
  }, PID);
  ok('project loaded into cache (stage Lead)', loaded.found && loaded.stage === 'Lead', loaded);
  ok('CardinalOutbox.patchesFor is present', loaded.hasOutbox);

  // Go OFFLINE and change the stage.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });

  const off = await page.evaluate(async (pid) => {
    window.__alert = 0;
    var writesBefore = (window.__WRITES__ || []).length;
    var threw = false;
    try { await setStage(pid, 'Approved'); } catch (e) { threw = true; }
    await new Promise(r => setTimeout(r, 400));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var badge = document.getElementById('cr-outbox-badge');
    var cacheRow = (window.cacheProjects || []).find(function (x) { return x.id === pid; });
    var directWrite = (window.__WRITES__ || []).slice(writesBefore).some(function (w) { return w.table === 'projects' && w.op !== 'select' && /:REFUSED$/.test(w.op) === false; });
    return {
      threw: threw, alerted: window.__alert || 0,
      pending: pend,
      badgeShown: !!(badge && getComputedStyle(badge).display !== 'none'),
      cacheStage: cacheRow && cacheRow.stage,
      directWriteWhileOffline: directWrite,
      onLine: navigator.onLine,
    };
  }, PID);
  ok('offline: navigator reports offline', off.onLine === false, off.onLine);
  ok('offline stage change did not throw', off.threw === false);
  ok('offline stage change was QUEUED (pending >= 1)', off.pending >= 1, off.pending);
  ok('no direct DB write happened while offline (via __WRITES__)', off.directWriteWhileOffline === false, off.directWriteWhileOffline);
  ok('in-memory row shows the new stage (optimistic)', off.cacheStage === 'Approved', off.cacheStage);
  ok('"N waiting to sync" badge is shown', off.badgeShown);

  // Force a genuinely STALE server read: reset the row the mock will return to
  // the OLD stage (the server never received the queued edit). Then reload()
  // while still OFFLINE: only the overlay can restore the new stage.
  const afterReload = await page.evaluate(async (pid) => {
    /* server copy is stale: nothing the reload can READ has the edit — only the
       queued outbox entry does. Reset every row the reload might return. */
    (window.__SEED__.projects || []).forEach(function (r) { if (r.id === pid) r.stage = 'Lead'; });
    (window.cacheProjects || []).forEach(function (r) { if (r.id === pid) r.stage = 'Lead'; });
    var beforeRow = (window.cacheProjects || []).find(function (x) { return x.id === pid; });
    var staleWas = beforeRow ? String(beforeRow.stage) : null;   /* snapshot the VALUE before reload mutates the ref */
    try { await reload(); } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
    var p = (window.cacheProjects || []).find(function (x) { return x.id === pid; });
    return { staleWas: staleWas, stage: p && p.stage };
  }, PID);
  ok('stale server read was set up (row reset to Lead)', afterReload.staleWas === 'Lead', afterReload.staleWas);
  ok('offline reload keeps the new stage (overlay re-applied)', afterReload.stage === 'Approved', afterReload.stage);

  // Go ONLINE and flush.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const drained = await page.evaluate(async (pid) => {
    window.dispatchEvent(new Event('online'));
    if (window.CardinalOutbox) await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 400));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var upd = (window.__WRITES__ || []).some(function (w) {
      var p = w.payload || {};
      return w.table === 'projects' && w.op === 'update' && p.stage === 'Approved';
    });
    var badge = document.getElementById('cr-outbox-badge');
    return { pending: pend, updateSent: upd, badgeHidden: !!(badge && getComputedStyle(badge).display === 'none') };
  }, PID);
  ok('back online: the queue flushed to 0', drained.pending === 0, drained.pending);
  ok('a projects UPDATE {stage:Approved} was actually sent', drained.updateSent);
  ok('the sync badge cleared', drained.badgeHidden);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
