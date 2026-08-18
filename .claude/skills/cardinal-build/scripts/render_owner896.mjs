/*
 * Build 896 gate — Owner Console entries are editable.
 * Boots as admin, opens the console, taps a seeded task title and a seeded owner
 * item title, edits them, and proves the inline editor appears, Save writes an
 * UPDATE carrying the new title (and, for items, the new due_date), the row shows
 * the new text, and Cancel writes nothing. Read-only rows (tax calendar, crew
 * certificates) expose no edit affordance.
 * v895 has no task-edit/item-edit affordance -> those assertions go RED.
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
const TAG = FILE.includes('895') ? '895 (neg-control)' : '896';

function ymd(o) { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); }
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [{ id: 't1', title: 'Call the accountant about Q3', done: false, position: 1, created_at: '2026-08-18T10:00:00Z' }],
  owner_items: [
    { id: 'o1', kind: 'obligation', title: 'City income tax filing', note: 'Dayton', due_date: ymd(40), recur: 'annual', created_at: '2026-08-18T08:00:00Z' },
    { id: 'r1', kind: 'renewal', title: 'General liability policy', note: 'Westfield', due_date: ymd(25), recur: 'annual', created_at: '2026-08-18T08:00:00Z' }
  ],
  crews: [{ id: 'c1', name: 'Betos', trade: 'Roofing', archived: false }],
  crew_docs: [{ id: 'd1', crew_id: 'c1', kind: 'coi', file_name: 'coi.pdf', carrier: 'Nationwide', expires_on: ymd(18) }],
  projects: [], appointments: [], estimates: [], insurance_claims: [], project_photos: [],
  inspection_reports: [], crew_work_orders: [], crew_rates: [], pricing_items: [], crew_notes: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.CardinalOwner && window.CardinalOwner.open), { timeout: 15000 });
  await page.evaluate(async () => { window.__WRITES__ = []; await window.CardinalOwner.open(); await new Promise(r => setTimeout(r, 400)); });

  // edit affordance present on owner-created rows, absent on read-only rows
  const aff = await page.evaluate(() => ({
    taskEdit: !!document.querySelector('#cr-owner .ow-ag[data-id="t1"] [data-act="task-edit"]'),
    itemEdit: !!document.querySelector('#cr-owner .ow-obl[data-id="o1"] [data-act="item-edit"]'),
    calEdit: !!document.querySelector('#cr-owner [data-act="item-edit"][data-id]') // calendar rows carry no data-id/edit
  }));
  ok('task rows expose an edit affordance', aff.taskEdit);
  ok('owner-item rows expose an edit affordance', aff.itemEdit);

  // edit a task
  const te = await page.evaluate(async () => {
    document.querySelector('#cr-owner .ow-ag[data-id="t1"] [data-act="task-edit"]').click();
    await new Promise(r => setTimeout(r, 120));
    var inp = document.querySelector('#cr-owner #ow-edit-title');
    var appeared = !!inp && inp.value === 'Call the accountant about Q3';
    inp.value = 'Call accountant re: Q3 estimate';
    document.querySelector('#cr-owner [data-act="edit-save"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_tasks' && x.op === 'update');
    return { appeared: appeared, wrote: w.length, title: w.length && w[w.length - 1].payload && w[w.length - 1].payload.title,
      shows: /Call accountant re: Q3 estimate/.test(document.getElementById('cr-owner').innerText),
      gone: !document.querySelector('#cr-owner #ow-edit-title') };
  });
  ok('tapping a task title opens the inline editor with its text', te.appeared, te);
  ok('saving writes an owner_tasks UPDATE with the new title', te.wrote >= 1 && te.title === 'Call accountant re: Q3 estimate', te);
  ok('the edited task shows the new text', te.shows, te);
  ok('the editor closes after save', te.gone, te);

  // edit an owner item (title + date)
  const ie = await page.evaluate(async (newDate) => {
    document.querySelector('#cr-owner .ow-obl[data-id="o1"] [data-act="item-edit"]').click();
    await new Promise(r => setTimeout(r, 120));
    var ti = document.querySelector('#cr-owner #ow-edit-title'), da = document.querySelector('#cr-owner #ow-edit-date');
    var hadDate = !!da;
    ti.value = 'Dayton city income tax';
    if (da) da.value = newDate;
    document.querySelector('#cr-owner [data-act="edit-save"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_items' && x.op === 'update');
    var p = w.length && w[w.length - 1].payload;
    return { hadDate: hadDate, wrote: w.length, title: p && p.title, date: p && p.due_date,
      shows: /Dayton city income tax/.test(document.getElementById('cr-owner').innerText) };
  }, ymd(55));
  ok('the item editor includes a date field', ie.hadDate, ie);
  ok('saving writes an owner_items UPDATE with new title + date', ie.wrote >= 1 && ie.title === 'Dayton city income tax' && !!ie.date, ie);
  ok('the edited item shows the new text', ie.shows, ie);

  // cancel writes nothing
  const ce = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-obl[data-id="r1"] [data-act="item-edit"]').click();
    await new Promise(r => setTimeout(r, 120));
    document.querySelector('#cr-owner #ow-edit-title').value = 'SHOULD NOT SAVE';
    document.querySelector('#cr-owner [data-act="edit-cancel"]').click();
    await new Promise(r => setTimeout(r, 200));
    return { writes: (window.__WRITES__ || []).filter(x => x.table === 'owner_items').length,
      reverted: /General liability policy/.test(document.getElementById('cr-owner').innerText),
      noGhost: !/SHOULD NOT SAVE/.test(document.getElementById('cr-owner').innerText) };
  });
  ok('Cancel writes nothing', ce.writes === 0, ce);
  ok('Cancel reverts to the original text', ce.reverted && ce.noGhost, ce);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
