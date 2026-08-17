/*
 * Build 865 gate — the offline write outbox on the punch-out card.
 * Boots the REAL app, opens CardinalPunchCard, goes OFFLINE (CDP), sends a message:
 *   - no "Could not save" alert
 *   - the message is kept (optimistic), CardinalOutbox.pending() >= 1, badge visible
 * then goes ONLINE and flushes:
 *   - CardinalOutbox.pending() drains to 0
 * v864 has no CardinalOutbox -> the offline save alerts / doesn't queue -> RED.
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
const TAG = FILE.includes('864') ? '864' : '865';
const SEED = {
  team_profiles: [{ email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' }],
  projects: [{ id: 'p2', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: {} }],
  punch_items: [{ id: 'pi1', title: 'Reattach fascia', project_id: 'p2', assigned_to: 'curtis@cardinalrenovations.net', status: 'open', priority: 'high', photos: [], steps: [], comments: [] }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [], appointments: [], inspection_reports: [], estimates: [], insurance_claims: [],
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
  await page.waitForFunction(() => window.CardinalPunchCard && window.CardinalPunchCard.open && window.CardinalPunch, { timeout: 20000 });
  // capture alerts
  page.on('dialog', d => { page.__alerted = (page.__alerted||0)+1; d.dismiss().catch(()=>{}); });
  await page.evaluate(async () => {
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch(e){}
    window.currentUser = { email: 'curtis@cardinalrenovations.net' };
    window.alert = function(m){ window.__alert = (window.__alert||0)+1; window.__alertMsg = String(m); };
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 350));
  });
  const has = await page.evaluate(() => !!window.CardinalOutbox);
  ok('CardinalOutbox module is present', has);

  // go OFFLINE
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch(e){} });

  const off = await page.evaluate(async () => {
    var card = document.getElementById('cr-pk');
    var inp = card.querySelector('[data-f="msg"]');
    inp.value = 'roof looks good, no signal up here';
    window.__alert = 0;
    card.querySelector('[data-act="send"]').click();
    await new Promise(r => setTimeout(r, 500));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var badge = document.getElementById('cr-outbox-badge');
    return {
      alerted: window.__alert || 0,
      pending: pend,
      badgeShown: !!(badge && getComputedStyle(badge).display !== 'none'),
      msgKept: /no signal up here/.test(card.textContent),
      onLine: navigator.onLine,
    };
  });
  ok('offline: navigator reports offline', off.onLine === false, off.onLine);
  ok('offline save did NOT alert an error', off.alerted === 0, off.alerted);
  ok('offline save was QUEUED (pending >= 1)', off.pending >= 1, off.pending);
  ok('the message is kept on screen (optimistic)', off.msgKept);
  ok('"N waiting to sync" badge is shown', off.badgeShown);

  // go ONLINE and flush
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const drained = await page.evaluate(async () => {
    window.dispatchEvent(new Event('online'));
    if(window.CardinalOutbox) await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 300));
    var pend = window.CardinalOutbox ? await window.CardinalOutbox.pending() : -1;
    var badge = document.getElementById('cr-outbox-badge');
    // 873: the badge shows a brief "All changes synced" confirmation before hiding,
    // so right after a drain it is EITHER that confirmation OR already hidden.
    var midText = badge ? badge.textContent : '';
    await new Promise(r => setTimeout(r, 2800));   // let the confirmation flash finish
    var finalHidden = !!(badge && getComputedStyle(badge).display === 'none');
    return { pending: pend, midText: midText, finalHidden: finalHidden };
  });
  ok('back online: the queue flushed to 0', drained.pending === 0, drained.pending);
  ok('the sync badge cleared (after the synced confirmation)', drained.finalHidden, drained);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0,2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0,200)); console.log(errs.slice(0,3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
