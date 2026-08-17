/*
 * Build 872 gate — protect the offline queue from eviction + warn on a store failure.
 * Boots the REAL app (with navigator.storage.persist spied):
 *   - requestPersist() is exposed and navigator.storage.persist was CALLED on load
 *   - a queued write that CANNOT be stored (a non-cloneable payload -> DataCloneError,
 *     standing in for a real quota/eviction failure) fires a visible warning (crToastErr)
 *     instead of dropping silently
 *   - the same for a held PHOTO that cannot be stored
 * v871 has no persist / no store-failure warning -> RED.
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
const TAG = FILE.includes('871') ? '871' : '872';
const SEED = { projects: [{ id: 'p1', name: 'Marcus', stage: 'Lead', checklist: '{}' }], team_profiles: [], inspection_reports: [], appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [] };
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
// Spy on navigator.storage.persist BEFORE the app runs.
await page.addInitScript(() => {
  window.__persistCalls = 0;
  try {
    if (navigator.storage) {
      navigator.storage.persist = function () { window.__persistCalls++; return Promise.resolve(true); };
      navigator.storage.persisted = function () { return Promise.resolve(false); };
    }
  } catch (e) {}
  window.__toastErr = '';
  // crToastErr is defined by the app; capture its calls via a late hook after boot.
});
let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalOutbox && window.CardinalOutbox.queue && window.CardinalPunchCard, { timeout: 20000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

  // Persist
  const persist = await page.evaluate(() => ({
    hasReq: typeof (window.CardinalOutbox && window.CardinalOutbox.requestPersist) === 'function',
    calledOnLoad: (window.__persistCalls || 0) >= 1,
  }));
  ok('CardinalOutbox.requestPersist() is exposed', persist.hasReq);
  ok('navigator.storage.persist was called on load', persist.calledOnLoad);
  if (persist.hasReq) {
    const calledAgain = await page.evaluate(async () => { var b = window.__persistCalls; await window.CardinalOutbox.requestPersist(); return window.__persistCalls > b; });
    ok('requestPersist() invokes navigator.storage.persist', calledAgain);
  } else { ok('requestPersist() invokes navigator.storage.persist', false); }

  // Install a crToastErr capture now that the app has booted.
  await page.evaluate(() => { window.__toastErr = ''; window.crToastErr = function (m) { window.__toastErr = String(m); }; });

  // A write that cannot be STORED (non-cloneable payload -> DataCloneError) must warn.
  const wfail = await page.evaluate(async () => {
    window.__toastErr = '';
    var before = await window.CardinalOutbox.pending();
    try { await window.CardinalOutbox.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { stage: 'X', fn: function () {} } }); } catch (e) {}
    await new Promise(r => setTimeout(r, 150));
    var after = await window.CardinalOutbox.pending();
    return { toast: window.__toastErr, before: before, after: after };
  });
  ok('a write that cannot be stored WARNS (not silent)', /out of storage|Could not save this change/.test(wfail.toast), wfail.toast);
  ok('the unstorable write was not silently queued', wfail.after === wfail.before, { before: wfail.before, after: wfail.after });

  // A held PHOTO that cannot be stored must warn.
  const pfail = await page.evaluate(async () => {
    window.__toastErr = '';
    try { await window.CardinalPunchCard._queuePhoto('pi-x', function () {}); } catch (e) {}
    await new Promise(r => setTimeout(r, 150));
    return { toast: window.__toastErr };
  });
  ok('a photo that cannot be stored WARNS (not silent)', /out of storage|Could not save this photo/.test(pfail.toast), pfail.toast);

  // Sanity: a NORMAL write still queues fine (no false warning).
  const okwrite = await page.evaluate(async () => {
    window.__toastErr = '';
    var cdpOffline = false;
    await window.CardinalOutbox.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { notes: 'ok' } });
    await new Promise(r => setTimeout(r, 150));
    return { toast: window.__toastErr };
  });
  ok('a normal write does NOT trigger a false warning', okwrite.toast === '', okwrite.toast);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
