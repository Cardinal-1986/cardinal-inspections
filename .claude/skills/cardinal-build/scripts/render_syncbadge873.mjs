/*
 * Build 873 gate — the sync indicator has real states.
 * Boots the REAL app and drives #cr-outbox-badge through:
 *   - OFFLINE with pending   -> "N saved — offline"  (amber)
 *   - SYNCING (flush in flight, forced slow via __MOCK_DELAY__) -> "Syncing…" (blue)
 *   - DONE (queue drained by a real sync) -> "All changes synced" flash (green), then hides
 *   - LOGOUT wipe does NOT show the "synced" confirmation (it wasn't a sync)
 * v872 has one text ("N waiting to sync") and no states -> RED.
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
const TAG = FILE.includes('872') ? '872' : '873';
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
let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);
const badge = () => page.evaluate(() => {
  var b = document.getElementById('cr-outbox-badge');
  if (!b) return { present: false };
  return { present: true, shown: getComputedStyle(b).display !== 'none', text: b.textContent, bg: getComputedStyle(b).backgroundColor };
});
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalOutbox && window.CardinalOutbox.queue, { timeout: 20000 });

  // OFFLINE + a pending write -> "saved — offline"
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });
  await page.evaluate(async () => { await window.CardinalOutbox.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { stage: 'Approved' } }); });
  await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
  const off = await badge();
  ok('offline: badge is shown', off.shown, off);
  ok('offline: text says "saved — offline"', /saved.*offline/i.test(off.text || ''), off.text);
  ok('offline: amber ground rgb(58, 45, 10)', off.bg === 'rgb(58, 45, 10)', off.bg);

  // SYNCING: force the flush slow, go online, catch the transient state.
  await page.evaluate(() => { window.__MOCK_DELAY__ = 500; });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.evaluate(() => { window.dispatchEvent(new Event('online')); if (window.CardinalOutbox) window.CardinalOutbox.flush(); });
  await page.evaluate(() => new Promise(r => setTimeout(r, 300)));   /* > the 200ms colour transition, < the 500ms flush */
  const syncing = await badge();
  ok('syncing: text says "Syncing…"', /syncing/i.test(syncing.text || ''), syncing.text);
  ok('syncing: blue ground rgb(14, 39, 51)', syncing.bg === 'rgb(14, 39, 51)', syncing.bg);

  // DONE: let the flush finish -> "All changes synced" flash (green).
  await page.evaluate(() => { window.__MOCK_DELAY__ = 0; });
  await page.evaluate(() => new Promise(r => setTimeout(r, 600)));
  const done = await badge();
  ok('done: text says "All changes synced"', /synced/i.test(done.text || ''), done.text);
  ok('done: green ground rgb(18, 51, 34)', done.bg === 'rgb(18, 51, 34)', done.bg);
  ok('done: still shown during the flash', done.shown, done);

  // the flash auto-hides
  await page.evaluate(() => new Promise(r => setTimeout(r, 2800)));
  const gone = await badge();
  ok('the confirmation auto-hides after the flash', gone.shown === false, gone);

  // LOGOUT wipe must NOT read as a successful sync.
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });
  const logout = await page.evaluate(async () => {
    await window.CardinalOutbox.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { notes: 'x' } });
    await new Promise(r => setTimeout(r, 150));
    await window.CardinalOutbox.clear();
    await new Promise(r => setTimeout(r, 250));
    var b = document.getElementById('cr-outbox-badge');
    return { text: b ? b.textContent : '', shown: b ? getComputedStyle(b).display !== 'none' : false };
  });
  ok('logout wipe does NOT flash "synced"', !/synced/i.test(logout.text || '') && logout.shown === false, logout);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
