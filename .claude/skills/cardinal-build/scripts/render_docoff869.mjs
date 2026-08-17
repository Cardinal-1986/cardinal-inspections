/*
 * Build 869 gate — the document/inspection editor saves offline through the outbox,
 * and reopening a report offline still shows the edit (the db.get overlay).
 * Boots the REAL app, loads the cache, goes OFFLINE (CDP), edits a report via
 * db.update():
 *   - no throw, queued as an inspection_reports UPDATE (pending >= 1), badge shown
 *   - the metadata list (cacheRows) shows the new title (optimistic)
 *   - no direct DB write happened (via __WRITES__)
 * then, with the server row forced STALE, db.get() STILL returns the edit (overlay),
 * and an offline reload() keeps the new title in the list (overlay);
 * then goes ONLINE and flushes:
 *   - the queue drains to 0 and an inspection_reports UPDATE {title} was actually sent.
 * v868 has no offline db.update path / no db.get overlay -> RED.
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
const TAG = FILE.includes('868') ? '868' : '869';
const RID = 'rep-1';
const SEED = {
  inspection_reports: [{ id: RID, title: 'Roof Inspection — 88 Oak', project: 'Marcus Cole', project_id: 'pj-marcus', status: 'unsent', html: '<html><body>original</body></html>', total: 0, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' }],
  projects: [{ id: 'pj-marcus', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: '{}' }],
  team_profiles: [], appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [],
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
const NEWTITLE = 'Roof Inspection — 88 Oak (EDITED)';
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof reload === 'function' && window.db && window.db.update && window.db.get && window.cacheRows !== undefined, { timeout: 20000 });

  await page.evaluate(async () => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    window.alert = function (m) { window.__alert = (window.__alert || 0) + 1; window.__alertMsg = String(m); };
    try { await reload(); } catch (e) {}
  });
  const loaded = await page.evaluate((rid) => {
    var r = (window.cacheRows || []).find(function (x) { return x.id === rid; });
    return { found: !!r, title: r && r.title, hasPatchesFor: !!(window.CardinalOutbox && window.CardinalOutbox.patchesFor) };
  }, RID);
  ok('report loaded into the metadata cache', loaded.found, loaded);
  ok('CardinalOutbox.patchesFor is present', loaded.hasPatchesFor);

  // OFFLINE, edit the report.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });

  const off = await page.evaluate(async (args) => {
    var rid = args.rid, newTitle = args.newTitle;
    var writesBefore = (window.__WRITES__ || []).length;
    var threw = false;
    try { await db.update(rid, { title: newTitle, html: '<html><body>EDITED offline</body></html>', status: 'draft' }); }
    catch (e) { threw = true; }
    await new Promise(r => setTimeout(r, 400));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var badge = document.getElementById('cr-outbox-badge');
    var row = (window.cacheRows || []).find(function (x) { return x.id === rid; });
    var directWrite = (window.__WRITES__ || []).slice(writesBefore).some(function (w) { return w.table === 'inspection_reports' && w.op !== 'select' && /:REFUSED$/.test(w.op) === false; });
    return { threw: threw, pending: pend, badgeShown: !!(badge && getComputedStyle(badge).display !== 'none'), cacheTitle: row && row.title, directWriteWhileOffline: directWrite, onLine: navigator.onLine };
  }, { rid: RID, newTitle: NEWTITLE });
  ok('offline: navigator reports offline', off.onLine === false, off.onLine);
  ok('offline document save did not throw', off.threw === false);
  ok('offline save was QUEUED (pending >= 1)', off.pending >= 1, off.pending);
  ok('no direct DB write happened while offline (via __WRITES__)', off.directWriteWhileOffline === false, off.directWriteWhileOffline);
  ok('metadata list shows the new title (optimistic)', off.cacheTitle === NEWTITLE, off.cacheTitle);
  ok('"N waiting to sync" badge is shown', off.badgeShown);

  // db.get overlay: force the server row STALE, reopen offline — overlay must win.
  const reopened = await page.evaluate(async (args) => {
    var rid = args.rid;
    var storeRow = (window.__SEED__.inspection_reports || []).find(function (x) { return x.id === rid; });
    if (storeRow) { storeRow.title = 'Roof Inspection — 88 Oak'; storeRow.html = '<html><body>original</body></html>'; storeRow.status = 'unsent'; }
    var got = null; try { got = await db.get(rid); } catch (e) {}
    return { title: got && got.title, htmlHasEdited: !!(got && /EDITED offline/.test(got.html || '')) };
  }, { rid: RID });
  ok('reopen offline: db.get returns the edited title (overlay)', reopened.title === NEWTITLE, reopened.title);
  ok('reopen offline: db.get returns the edited html (overlay)', reopened.htmlHasEdited === true, reopened.htmlHasEdited);

  // reload overlay: server still stale, reload offline keeps the new title in the list.
  const afterReload = await page.evaluate(async (args) => {
    var rid = args.rid;
    (window.__SEED__.inspection_reports || []).forEach(function (r) { if (r.id === rid) r.title = 'Roof Inspection — 88 Oak'; });
    (window.cacheRows || []).forEach(function (r) { if (r.id === rid) r.title = 'Roof Inspection — 88 Oak'; });
    try { await reload(); } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
    var row = (window.cacheRows || []).find(function (x) { return x.id === rid; });
    return { title: row && row.title };
  }, { rid: RID });
  ok('offline reload keeps the new title in the list (overlay)', afterReload.title === NEWTITLE, afterReload.title);

  // ONLINE, flush.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const drained = await page.evaluate(async (args) => {
    window.dispatchEvent(new Event('online'));
    if (window.CardinalOutbox) await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 400));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var upd = (window.__WRITES__ || []).some(function (w) { var p = w.payload || {}; return w.table === 'inspection_reports' && w.op === 'update' && p.title === args.newTitle; });
    var badge = document.getElementById('cr-outbox-badge');
    return { pending: pend, updateSent: upd, badgeHidden: !!(badge && getComputedStyle(badge).display === 'none') };
  }, { newTitle: NEWTITLE });
  ok('back online: the queue flushed to 0', drained.pending === 0, drained.pending);
  ok('an inspection_reports UPDATE {title} was actually sent', drained.updateSent);
  ok('the sync badge cleared', drained.badgeHidden);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
