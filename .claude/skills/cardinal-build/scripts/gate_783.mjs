/* gate_783.mjs — booking the build day moves the job to SCHEDULED.
 *
 *   node gate_783.mjs [path/to/index.html]
 *
 * Drives the real adb.create in Chromium. Point it at 782 as the negative
 * control: there the appointment lands and the stage sits on Approved.
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
console.log('gate_783 on ' + FILE);

const D = o => { const d = new Date(Date.now() + o * 86400000), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };

/* one project per stage we care about, so a single boot tests every branch */
const SEED = {
  projects: [
    { id: 'p-app',  name: 'Approved Job',  stage: 'Approved',  address: '1 A St', checklist: '{}', created_at: new Date().toISOString() },
    { id: 'p-lead', name: 'A Lead',        stage: 'Lead',      address: '2 B St', checklist: '{}', created_at: new Date().toISOString() },
    { id: 'p-comp', name: 'Completed Job', stage: 'Completed', address: '3 C St', checklist: '{}', created_at: new Date().toISOString() },
    { id: 'p-drop', name: 'Drop Only',     stage: 'Approved',  address: '4 D St', checklist: '{}', created_at: new Date().toISOString() }
  ],
  appointments: [], punch_items: [], team_profiles: [], inspection_reports: [], estimates: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('dialog', d => d.accept());
const notifies = [];
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.includes('/api/notify')) { let b = null; try { b = JSON.parse(route.request().postData() || 'null'); } catch (e) {} notifies.push(b && b.title); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });

/* book through the app's own data layer — the one writer this build hooks */
async function book(projectId, kind, day) {
  return await page.evaluate(async (a) => {
    try {
      await adb.create({ title: 'Test — ' + a.kind, appt_date: a.day, appt_time: '08:00',
        project_id: a.projectId, notes: null, kind: a.kind });
      const p = (window.__SEED__.projects || []).filter(x => x.id === a.projectId)[0];
      return { ok: true, stage: p && p.stage };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  }, { projectId, kind, day });
}
function stageOf(id) {
  return page.evaluate(i => { const p = (window.__SEED__.projects || []).filter(x => x.id === i)[0]; return p && p.stage; }, id);
}

console.log('\n--- the hop that was missing ---');
const r1 = await book('p-app', 'job', D(7));
await page.waitForTimeout(900);
ok('the appointment still saves', r1.ok, r1.err);
ok('an Approved job with a build day becomes Scheduled', (await stageOf('p-app')) === 'Scheduled', await stageOf('p-app'));
const appts = await page.evaluate(() => (window.__SEED__.appointments || []).length);
ok('and the appointment itself is written', appts === 1, 'appointments = ' + appts);

console.log('\n--- what it must NOT do ---');
const r2 = await book('p-lead', 'job', D(7));
await page.waitForTimeout(700);
ok('a LEAD does not jump the pipeline', (await stageOf('p-lead')) === 'Lead', await stageOf('p-lead'));
const r3 = await book('p-comp', 'job', D(7));
await page.waitForTimeout(700);
ok('a COMPLETED job is not walked backwards', (await stageOf('p-comp')) === 'Completed', await stageOf('p-comp'));
const r4 = await book('p-drop', 'drop', D(3));
await page.waitForTimeout(700);
ok('a material DROP is not a build day', (await stageOf('p-drop')) === 'Approved', await stageOf('p-drop'));
const r5 = await book('p-drop', 'appt', D(3));
await page.waitForTimeout(700);
ok('a plain appointment is not a build day', (await stageOf('p-drop')) === 'Approved', await stageOf('p-drop'));

console.log('\n--- it is quiet ---');
ok('moving to Scheduled emails nobody', !notifies.some(t => /schedul/i.test(t || '')),
  JSON.stringify(notifies));

console.log('\n--- booking twice is harmless ---');
await book('p-app', 'job', D(14));
await page.waitForTimeout(700);
ok('a second build day leaves it Scheduled', (await stageOf('p-app')) === 'Scheduled', await stageOf('p-app'));

console.log('\n--- the stage write is a real one ---');
const w = await page.evaluate(() => (window.__WRITES__ || [])
  .filter(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage === 'Scheduled').length);
ok('exactly one projects.stage=Scheduled write for the whole run', w === 1, 'writes = ' + w);
const ck = await page.evaluate(() => {
  const p = (window.__SEED__.projects || []).filter(x => x.id === 'p-app')[0];
  let c = {}; try { c = JSON.parse(p.checklist || '{}'); } catch (e) {}
  return { t: !!c.t_Scheduled, since: !!c.stage_since };
});
ok('setStage stamped t_Scheduled and stage_since', ck.t && ck.since, JSON.stringify(ck));

console.log('\n--- source guards ---');
ok('the rule lives on the ONE appointment writer', (APP_HTML.match(/from\('appointments'\)\.insert\(/g) || []).length === 1);
/* 3, not 2: `async function __apptMayAdvanceStage(fields){` matches this pattern
   too. A definition looks exactly like a call — the same trap as counting a
   value inside its own explanatory comment. */
ok('it is called on both branches of create (definition + 2 calls = 3)',
  (APP_HTML.match(/__apptMayAdvanceStage\(fields\)/g) || []).length === 3,
  'sites = ' + (APP_HTML.match(/__apptMayAdvanceStage\(fields\)/g) || []).length);
/* "no reverse" has to be asserted against the remove() function itself, not a
   character window — remove: sits ~40 chars after the create: call, so any
   proximity regex matches and reports a reverse that is not there. */
const removeFn = (function () {
  const i = APP_HTML.indexOf('  remove: async function(id){');
  if (i < 0) return '';
  const j = APP_HTML.indexOf('\n  }', i);
  return APP_HTML.slice(i, j < 0 ? i + 600 : j);
})();
ok('remove() exists to be checked', removeFn.length > 40, 'sliced ' + removeFn.length + ' chars');
ok('there is deliberately no reverse on delete', removeFn.indexOf('__apptMayAdvanceStage') === -1);

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
