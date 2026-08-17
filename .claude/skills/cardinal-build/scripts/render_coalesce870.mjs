/*
 * Build 870 gate — the outbox COALESCES same-target writes.
 * Boots the REAL app, goes OFFLINE (so flush holds), then via CardinalOutbox.queue:
 *   - two UPDATES to the SAME job fold into ONE entry (pending stays 1), fields merged
 *   - an update to a DIFFERENT job is a separate entry (pending 2)
 *   - two UPSERTS to the same teammate (onConflict email) fold into one (pending 3), merged
 *   - two document saves (big html) to the same report fold into one, latest html kept
 * then ONLINE + flush:
 *   - the queue drains to 0 and each target is sent ONCE with the merged value.
 * v869 has no coalescing -> same-target queues stack -> RED.
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
const TAG = FILE.includes('869') ? '869' : '870';
const SEED = {
  projects: [{ id: 'p1', name: 'Marcus', stage: 'Lead', notes: '', checklist: '{}' }, { id: 'p2', name: 'Dana', stage: 'Lead', checklist: '{}' }],
  team_profiles: [{ email: 'scottie@cardinalrenovations.net', name: 'Scottie' }],
  inspection_reports: [{ id: 'rep-1', title: 'Report', html: '<html>orig</html>', status: 'unsent' }],
  appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [],
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
  await page.waitForFunction(() => window.CardinalOutbox && window.CardinalOutbox.queue && window.CardinalOutbox.patchesFor, { timeout: 20000 });
  // Start from an empty queue (a previous run in this profile could linger).
  await page.evaluate(async () => {
    var ps = await window.CardinalOutbox.patchesFor('projects');
    // no direct clear API; rely on a fresh context — but drain any leftovers online first
  });

  // OFFLINE so flush holds and we can inspect the queue.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });

  const q = await page.evaluate(async () => {
    var O = window.CardinalOutbox;
    var big1 = '<html>' + 'A'.repeat(2000) + '</html>';
    var big2 = '<html>' + 'B'.repeat(2000) + '</html>';
    await O.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { stage: 'Approved' } });
    var afterFirst = await O.pending();
    await O.queue({ table: 'projects', match: { col: 'id', val: 'p1' }, patch: { notes: 'called homeowner' } });
    var afterSameTarget = await O.pending();
    await O.queue({ table: 'projects', match: { col: 'id', val: 'p2' }, patch: { stage: 'Scheduled' } });
    var afterDiffTarget = await O.pending();
    await O.queue({ table: 'team_profiles', op: 'upsert', row: { email: 'scottie@cardinalrenovations.net', title: 'Lead Tech' }, onConflict: 'email' });
    await O.queue({ table: 'team_profiles', op: 'upsert', row: { email: 'scottie@cardinalrenovations.net', phone: '555-1212' }, onConflict: 'email' });
    var afterTeam = await O.pending();
    await O.queue({ table: 'inspection_reports', match: { col: 'id', val: 'rep-1' }, patch: { html: big1, title: 'v1' } });
    await O.queue({ table: 'inspection_reports', match: { col: 'id', val: 'rep-1' }, patch: { html: big2, title: 'v2' } });
    var afterDocs = await O.pending();

    var pj = await O.patchesFor('projects');
    var p1 = pj.find(function (e) { return e.match && e.match.val === 'p1'; });
    var tp = await O.patchesFor('team_profiles');
    var doc = (await O.patchesFor('inspection_reports'))[0];
    return {
      afterFirst: afterFirst, afterSameTarget: afterSameTarget, afterDiffTarget: afterDiffTarget, afterTeam: afterTeam, afterDocs: afterDocs,
      p1HasBoth: !!(p1 && p1.patch && p1.patch.stage === 'Approved' && p1.patch.notes === 'called homeowner'),
      p1Count: pj.filter(function (e) { return e.match && e.match.val === 'p1'; }).length,
      teamCount: tp.length,
      teamMerged: !!(tp[0] && tp[0].row && tp[0].row.title === 'Lead Tech' && tp[0].row.phone === '555-1212'),
      docCount: (await O.patchesFor('inspection_reports')).length,
      docLatest: !!(doc && doc.patch && doc.patch.title === 'v2' && /BBBB/.test(doc.patch.html)),
    };
  });
  ok('1 entry after first queue', q.afterFirst === 1, q.afterFirst);
  ok('same-target second queue COALESCES (still 1)', q.afterSameTarget === 1, q.afterSameTarget);
  ok('the merged entry carries BOTH fields (stage + notes)', q.p1HasBoth, q);
  ok('exactly one entry for that job', q.p1Count === 1, q.p1Count);
  ok('different job is a separate entry (2)', q.afterDiffTarget === 2, q.afterDiffTarget);
  ok('two upserts to same teammate coalesce (3 total)', q.afterTeam === 3, q.afterTeam);
  ok('the merged upsert row carries both fields', q.teamMerged && q.teamCount === 1, q);
  ok('two document saves coalesce (still 4 total)', q.afterDocs === 4, q.afterDocs);
  ok('the merged document keeps the LATEST html + title', q.docLatest && q.docCount === 1, q);

  // ONLINE + flush: each target sent once with the merged value.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const drained = await page.evaluate(async () => {
    window.dispatchEvent(new Event('online'));
    await window.CardinalOutbox.flush();
    await new Promise(r => setTimeout(r, 500));
    var W = window.__WRITES__ || [];
    var p1w = W.filter(function (w) { return w.table === 'projects' && w.op === 'update' && w.filters && w.filters.some && false; });
    // count projects updates by matching payload contents
    var p1Updates = W.filter(function (w) { return w.table === 'projects' && w.op === 'update' && w.payload && w.payload.stage === 'Approved' && w.payload.notes === 'called homeowner'; }).length;
    var teamUpserts = W.filter(function (w) { return w.table === 'team_profiles' && w.op === 'upsert' && w.payload && w.payload.title === 'Lead Tech' && w.payload.phone === '555-1212'; }).length;
    var docUpdates = W.filter(function (w) { return w.table === 'inspection_reports' && w.op === 'update' && w.payload && w.payload.title === 'v2'; }).length;
    return { pending: await window.CardinalOutbox.pending(), p1Updates: p1Updates, teamUpserts: teamUpserts, docUpdates: docUpdates };
  });
  ok('back online: the queue flushed to 0', drained.pending === 0, drained.pending);
  ok('the job synced ONCE with both merged fields', drained.p1Updates === 1, drained.p1Updates);
  ok('the teammate synced ONCE with both merged fields', drained.teamUpserts === 1, drained.teamUpserts);
  ok('the document synced ONCE with the latest content', drained.docUpdates === 1, drained.docUpdates);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
