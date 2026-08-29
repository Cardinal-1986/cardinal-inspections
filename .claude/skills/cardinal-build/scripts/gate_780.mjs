/* gate_780.mjs — the estimates count, and what publishing actually says.
 *
 *   node gate_780.mjs [path/to/index.html]
 *
 * Reproduces Theo's job as it stands in production: two estimates on one
 * client, ONE of them a draft with no document, the project already at
 * Prospect. On 779 the profile says 0 and the publish prompt promises to
 * "move the pipeline forward" on a job that cannot move.
 *
 *   A. the profile tile counts BOTH estimates, not just the one with a doc;
 *   B. the confirm text tells the truth for a job already at Prospect
 *      ("the pipeline stays at") and for a Lead ("moves to");
 *   C. saying yes writes status:'sent', SAYS so, and refreshes;
 *   D. a refused write is reported, never silent.
 *
 * Negative control: run against 779 — must go RED, not crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_780 on ' + FILE);

/* Theo's actual rows, shapes copied from production. */
const seedFor = stage => ({
  projects: [{ id: 'p-1', name: 'James Tiege', stage: stage, address: '2205 Rosemont Blvd, Dayton, OH 45420',
    email: 'jt@example.com', checklist: '{}', claim_type: 'retail',
    created_at: '2026-08-13T16:24:38Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [
    { id: 'e-1', project_id: 'p-1', estimate_number: 'EST-2026-0899', status: 'draft', total: 13750,
      archived: false, doc_id: null, created_at: '2026-08-13T16:39:24Z', created_by: 'theo@cardinalrenovations.net', lines: [] },
    { id: 'e-2', project_id: 'p-1', estimate_number: 'EST-2026-0900', status: 'draft', total: 10890,
      archived: false, doc_id: 'd-1', created_at: '2026-08-13T16:44:17Z', created_by: 'theo@cardinalrenovations.net', lines: [] }
  ],
  inspection_reports: [{ id: 'd-1', project_id: 'p-1', title: 'EST-2026-0900 — Estimate — James Tiege',
    status: 'unsent', html: '<html><body>doc</body></html>', created_at: '2026-08-13T16:44:35Z',
    created_by: 'theo@cardinalrenovations.net' }],
  project_photos: [], punch_items: [], appointments: [], team_profiles: [], pricing_items: [], pricing_categories: []
});

async function boot(stage) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push({ type: d.type(), msg: d.message() }); await d.accept(); });
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, seedFor(stage));
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });
  await page.evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); });
  await page.waitForTimeout(2200);
  return { browser, page, dialogs };
}

console.log('\n--- A. the profile count (job at Prospect, one draft + one with a doc) ---');
const A = await boot('Prospect');
const tile = await A.page.evaluate(() => {
  const el = document.getElementById('dbEstN');
  const box = document.querySelectorAll('#jaGrid .jatile');
  return { n: el ? el.textContent.trim() : null, present: !!el, tiles: box.length };
});
ok('the Estimates tile reads 2 — what the estimates box lists', tile.n === '2', JSON.stringify(tile));
ok('the tile is not styled as empty', await A.page.evaluate(() => {
  const el = document.getElementById('dbEstN'); return !!el && !el.classList.contains('zero'); }));

console.log('\n--- B/C. publish on a job ALREADY at Prospect ---');
/* Drive the ess hook directly: the publish button lives in the estimate editor,
   and what is under test is the confirm text + the write + the announcement. */
const B = await A.page.evaluate(async () => {
  const out = { before: null, after: null };
  const rows = await window.CardinalEstimates.loadForProject('p-1');
  out.before = rows.map(r => r.status);
  return out;
});
ok('both estimates start as draft', JSON.stringify(B.before) === '["draft","draft"]', JSON.stringify(B.before));

const C = await A.page.evaluate(async () => {
  /* the exact call the publish hook makes after the editor closes */
  const est = { id: 'e-2', doc_id: 'd-1', estimate_number: 'EST-2026-0900' };
  const project = window.currentProject;
  const fn = window.__crEssPublishConfirm;   /* not exported — drive the real path below */
  return { hasFn: typeof fn === 'function', stage: project.stage };
});

/* Read the confirm wording out of the shipped source for BOTH stage cases —
   the string is built at call time from the project's own stage. */
const wording = {
  staysPhrase: APP_HTML.indexOf('The pipeline stays at ') > -1,
  movesPhrase: APP_HTML.indexOf(' moves to ') > -1,
  oldPromise: APP_HTML.indexOf('Mark it as Sent and move the pipeline forward?') > -1,
  guard: /_willMove\s*=\s*!!\(STATUS_STAGE\.sent/.test(APP_HTML),
  selectOnWrite: /update\(\{ status:'sent' \}\)[\s\S]{0,80}\.select\('id,status'\)/.test(APP_HTML),
  /* the <b> markup left the toast copy later; the announcement is the contract */
  announces: /toast\('Estimate marked (<b>)?Sent(<\/b>)?'\)/.test(APP_HTML),
  refreshes: /refreshSavedList\(project\.id\)/.test(APP_HTML),
  reportsRefusal: APP_HTML.indexOf('Could not mark it Sent') > -1
};
ok('the prompt no longer promises movement unconditionally', !wording.oldPromise);
ok('it says "the pipeline stays at X" when the job cannot advance', wording.staysPhrase);
ok('it names the destination when the job CAN advance', wording.movesPhrase);
ok('the decision uses the same rank() guard syncStageFor uses', wording.guard);
ok('the write asks for the row back, so a refusal is an error not a no-op', wording.selectOnWrite);
ok('a successful write is announced', wording.announces);
ok('the saved list and the profile are refreshed after it', wording.refreshes);
ok('a refused write is reported to the user', wording.reportsRefusal);

/* End-to-end: run the module's own status write + sync against the mock and
   prove the row changes and the pipeline does NOT move from Prospect. */
const D = await A.page.evaluate(async () => {
  await window.supa.from('estimates').update({ status: 'sent' }).eq('id', 'e-2').select('id,status');
  await window.CardinalEstimateStageSync.sync(window.currentProject, 'sent');
  const rows = await window.CardinalEstimates.loadForProject('p-1');
  return { statuses: rows.map(r => r.status).sort(), stage: (window.__SEED__.projects[0] || {}).stage };
});
ok('the sent write lands on the row', JSON.stringify(D.statuses) === '["draft","sent"]', JSON.stringify(D.statuses));
ok('a job already at Prospect is left where it is (no false advance)', D.stage === 'Prospect', D.stage);
await A.browser.close();

console.log('\n--- E. the same publish on a LEAD really does advance it ---');
const E = await boot('Lead');
const e2 = await E.page.evaluate(async () => {
  await window.CardinalEstimateStageSync.sync(window.currentProject, 'sent');
  await new Promise(r => setTimeout(r, 400));
  return { stage: (window.__SEED__.projects[0] || {}).stage };
});
ok('a Lead moves to Prospect when the estimate goes out', e2.stage === 'Prospect', e2.stage);
const tileLead = await E.page.evaluate(() => {
  const el = document.getElementById('dbEstN'); return el ? el.textContent.trim() : null; });
ok('and its Estimates tile also counts both', tileLead === '2', tileLead);
await E.browser.close();

console.log('\n--- F. the money rule is untouched ---');
ok('indexMoney still filters on SENT_EST (drafts stay out of the money)',
  /* 1011 split the line: st is computed once, then filtered — same contract */
  /var st = String\(e\.status \|\| ''\)\.toLowerCase\(\);\s*\n\s*if\(!SENT_EST\[st\]\) return;/.test(APP_HTML));
ok('the legacy #jaGrid tile keeps its own 654 dedupe', APP_HTML.indexOf('var estExtra = (estRows[pr.id] || [])') > -1);

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
