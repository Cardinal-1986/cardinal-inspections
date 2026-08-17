/*
 * Build 867 gate — the Team Directory saves offline through CardinalOutbox.
 * Boots the REAL app, renders the Team view, goes OFFLINE (CDP), edits a
 * teammate's name and clicks Save:
 *   - no "Could not save" error
 *   - the edit is queued as an UPSERT (CardinalOutbox.pending() >= 1), badge shown
 *   - the roster card shows the new name right away (optimistic cacheTeam)
 * then goes ONLINE and flushes:
 *   - the queue drains to 0
 *   - a team_profiles UPSERT with the new name was actually sent (window.__WRITES__)
 * v866 has no offline team path -> offline it writes directly / never queues -> RED.
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
const TAG = FILE.includes('866') ? '866' : '867';
const EM = 'scottie@cardinalrenovations.net';
const SEED = {
  team_profiles: [{ email: EM, name: 'Scottie', title: 'Production', phone: '' }],
  projects: [], punch_items: [], crews: [], crew_work_orders: [], crew_rates: [],
  pricing_items: [], appointments: [], inspection_reports: [], estimates: [], insurance_claims: [],
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
  await page.waitForFunction(() => typeof loadTeamProfiles === 'function' && typeof renderTeamView === 'function' && document.getElementById('tmMount'), { timeout: 20000 });

  // Render the Team Directory with our seeded teammate.
  await page.evaluate(async (em) => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    window.alert = function (m) { window.__alert = (window.__alert || 0) + 1; window.__alertMsg = String(m); };
    try { await loadTeamProfiles(); } catch (e) {}
    try { renderTeamView(); } catch (e) {}
  }, EM);

  const rendered = await page.evaluate((em) => {
    var card = document.querySelector('#tmMount .tmcard[data-em="' + em + '"]');
    return { found: !!card, hasName: !!(card && card.querySelector('.tmName')), hasSave: !!(card && card.querySelector('[data-save]')) };
  }, EM);
  ok('Team card rendered for the teammate', rendered.found && rendered.hasName && rendered.hasSave, rendered);
  const hasOutbox = await page.evaluate(() => !!(window.CardinalOutbox && window.CardinalOutbox.queue));
  ok('CardinalOutbox is present', hasOutbox);

  // Go OFFLINE
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });

  const off = await page.evaluate(async (em) => {
    var card = document.querySelector('#tmMount .tmcard[data-em="' + em + '"]');
    card.classList.add('editing');
    var nameInp = card.querySelector('.tmName');
    nameInp.value = 'Scottie Steinbrugge';
    window.__alert = 0;
    var writesBefore = (window.__WRITES__ || []).length;
    card.querySelector('[data-save]').click();
    await new Promise(r => setTimeout(r, 500));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var badge = document.getElementById('cr-outbox-badge');
    var card2 = document.querySelector('#tmMount .tmcard[data-em="' + em + '"]');
    var directWrite = (window.__WRITES__ || []).slice(writesBefore).some(function (w) { return w.table === 'team_profiles' && /:REFUSED$/.test(w.op) === false && w.op !== 'select'; });
    return {
      alerted: window.__alert || 0,
      alertMsg: window.__alertMsg || '',
      pending: pend,
      badgeShown: !!(badge && getComputedStyle(badge).display !== 'none'),
      cardShowsNew: !!(card2 && /Steinbrugge/.test(card2.textContent)),
      cacheUpdated: !!(window.cacheTeam && window.cacheTeam[em] && window.cacheTeam[em].name === 'Scottie Steinbrugge'),
      directWriteWhileOffline: directWrite,
      onLine: navigator.onLine,
    };
  }, EM);
  ok('offline: navigator reports offline', off.onLine === false, off.onLine);
  ok('offline save did NOT alert an error', off.alerted === 0, off.alertMsg);
  ok('offline save was QUEUED (pending >= 1)', off.pending >= 1, off.pending);
  ok('no direct DB write happened while offline', off.directWriteWhileOffline === false, off.directWriteWhileOffline);
  ok('"N waiting to sync" badge is shown', off.badgeShown);
  ok('roster card shows the new name now (optimistic)', off.cardShowsNew && off.cacheUpdated, off);

  // Go ONLINE and flush
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const drained = await page.evaluate(async (em) => {
    window.dispatchEvent(new Event('online'));
    if (window.CardinalOutbox) await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 400));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var upsert = (window.__WRITES__ || []).some(function (w) {
      var p = w.payload || {};
      return w.table === 'team_profiles' && w.op === 'upsert' && p.email === em && p.name === 'Scottie Steinbrugge';
    });
    var badge = document.getElementById('cr-outbox-badge');
    return { pending: pend, upsertSent: upsert, badgeHidden: !!(badge && getComputedStyle(badge).display === 'none') };
  }, EM);
  ok('back online: the queue flushed to 0', drained.pending === 0, drained.pending);
  ok('a team_profiles UPSERT with the new name was actually sent', drained.upsertSent);
  ok('the sync badge cleared', drained.badgeHidden);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
