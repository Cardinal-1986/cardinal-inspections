/*
 * Build 871 gate — sign-out clears the WRITE outboxes (multi-user safety).
 * Boots the REAL app, goes OFFLINE, queues writes + a held photo, then:
 *   - CardinalOutbox.clear() empties the write outbox (pending -> 0)
 *   - CardinalPunchCard._clearPhotos() empties the photo outbox (-> 0)
 *   - a cleared queue produces NO writes when back online (nothing resurrects)
 *   - clicking the real Sign-out button (with pending writes) empties the outbox
 *     so the next account can never inherit them.
 * v870 has no clear() / no sign-out wipe -> RED.
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
const TAG = FILE.includes('870') ? '870' : '871';
const SEED = {
  projects: [{ id: 'p1', name: 'Marcus', stage: 'Lead', checklist: '{}' }],
  team_profiles: [{ email: 'scottie@cardinalrenovations.net', name: 'Scottie' }],
  inspection_reports: [], appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [],
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
  await page.waitForFunction(() => window.CardinalOutbox && window.CardinalOutbox.queue && window.CardinalPunchCard, { timeout: 20000 });
  const api = await page.evaluate(() => ({ hasClear: typeof (window.CardinalOutbox && window.CardinalOutbox.clear) === 'function', hasPhotoClear: typeof (window.CardinalPunchCard && window.CardinalPunchCard._clearPhotos) === 'function' }));
  ok('CardinalOutbox.clear() exists', api.hasClear);
  ok('CardinalPunchCard._clearPhotos() exists', api.hasPhotoClear);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });

  // Queue writes + a photo, then clear() them.
  const cleared = await page.evaluate(async () => {
    var O = window.CardinalOutbox, P = window.CardinalPunchCard;
    await O.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { stage: 'Approved' } });
    await O.queue({ table: 'team_profiles', op: 'upsert', row: { email: 'scottie@cardinalrenovations.net', title: 'Lead' }, onConflict: 'email' });
    var before = await O.pending();
    var photoBefore = -1, photoAfter = -1;
    try { if (P._queuePhoto) { await P._queuePhoto('pi-x', new Blob(['x'], { type: 'image/jpeg' })); photoBefore = await P._pendingPhotos(); } } catch (e) {}
    var afterClear = before;
    if (typeof O.clear === 'function') { await O.clear(); afterClear = await O.pending(); }
    try { if (typeof P._clearPhotos === 'function') { await P._clearPhotos(); photoAfter = await P._pendingPhotos(); } } catch (e) {}
    await new Promise(r => setTimeout(r, 150));   /* let every IndexedDB delete settle before we go online */
    return { before: before, afterClear: afterClear, photoBefore: photoBefore, photoAfter: photoAfter };
  });
  ok('writes were queued offline (pending 2)', cleared.before === 2, cleared.before);
  ok('clear() empties the write outbox (pending 0)', cleared.afterClear === 0, cleared.afterClear);
  ok('a photo was held offline', cleared.photoBefore >= 1, cleared.photoBefore);
  ok('_clearPhotos() empties the photo outbox (0)', cleared.photoAfter === 0, cleared.photoAfter);

  // A cleared queue must produce NO writes when back online.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const noResurrect = await page.evaluate(async () => {
    var W0 = (window.__WRITES__ || []).length;
    window.dispatchEvent(new Event('online'));
    if (window.CardinalOutbox && window.CardinalOutbox.flush) await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 300));
    /* only the CLEARED writes must not resurrect; ignore unrelated app writes
       (e.g. the audit_sessions heartbeat that fires on reconnect). */
    var resurrected = (window.__WRITES__ || []).slice(W0).filter(function (w) {
      var p = w.payload || {};
      return (w.table === 'projects' && p.stage === 'Approved') ||
             (w.table === 'team_profiles' && w.op === 'upsert' && p.title === 'Lead');
    });
    return { count: resurrected.length, detail: resurrected.map(function (w) { return w.table + ':' + w.op; }) };
  });
  ok('the cleared writes do NOT resurrect when back online', noResurrect.count === 0, noResurrect.detail);

  // The real Sign-out button: with pending writes, it must empty the outbox.
  // Offline so the queued write stays pending and the handler's clear runs.
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });
  const signout = await page.evaluate(async () => {
    var O = window.CardinalOutbox;
    window.confirm = function () { return true; };
    window.showLogin = window.showLogin || function () {};
    await O.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { notes: 'left a message' } });
    var before = await O.pending();
    var btn = document.getElementById('signOutBtn');
    var clicked = !!btn;
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 500));
    var after = await O.pending();
    return { clicked: clicked, before: before, after: after };
  });
  ok('sign-out button is present and was clicked', signout.clicked);
  ok('a write was queued before sign-out', signout.before >= 1, signout.before);
  ok('sign-out EMPTIES the write outbox (0)', signout.after === 0, signout.after);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
