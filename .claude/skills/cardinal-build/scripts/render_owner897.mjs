/*
 * Build 897 gate — Owner Console Quick Reminders.
 * Boots as admin, proves the Reminders section renders, adding a one-time and a
 * weekly reminder writes owner_reminders inserts, checking a one-time completes it,
 * checking a repeating one rolls remind_on FORWARD (future date, no done_at),
 * editing writes an update, and delete removes it.
 * v896 has no owner_reminders section -> those assertions go RED.
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
const TAG = FILE.includes('896') ? '896 (neg-control)' : '897';

function ymd(o) { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); }
const PAST_WEEKLY = ymd(-3);
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [], owner_items: [],
  owner_reminders: [
    { id: 'rmA', text: 'Deposit the checks', remind_on: PAST_WEEKLY, repeat: 'weekly', notify: false, created_at: '2026-08-18T08:00:00Z' },
    { id: 'rmB', text: 'Standing: review bank feed', remind_on: null, repeat: 'none', notify: false, created_at: '2026-08-18T08:00:00Z' }
  ],
  crews: [], crew_docs: [], projects: [], appointments: [], estimates: [], insurance_claims: [],
  project_photos: [], inspection_reports: [], crew_work_orders: [], crew_rates: [], pricing_items: [], crew_notes: []
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

  const txt = await page.evaluate(() => document.getElementById('cr-owner').innerText);
  ok('Reminders section renders', /reminders/i.test(txt)); /* .ow-sl uppercases via CSS; innerText reflects it */
  ok('seeded reminders render', /Deposit the checks/.test(txt) && /review bank feed/.test(txt));
  ok('the add row has a repeat selector', await page.evaluate(() => !!document.querySelector('#cr-owner #ow-rem-rep')));

  // add a one-time reminder
  const a1 = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner #ow-rem-in').value = 'Order more yard signs';
    document.querySelector('#cr-owner [data-act="rem-add"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'insert');
    return { wrote: w.length, text: w[0] && w[0].payload && w[0].payload.text, repeat: w[0] && w[0].payload && w[0].payload.repeat, shows: /Order more yard signs/.test(document.getElementById('cr-owner').innerText) };
  });
  ok('adding a reminder inserts into owner_reminders', a1.wrote >= 1 && a1.text === 'Order more yard signs', a1);
  ok('a plain add defaults to one-time', a1.repeat === 'none', a1);
  ok('the new reminder appears', a1.shows, a1);

  // add a weekly reminder with a date
  const a2 = await page.evaluate(async (d) => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner #ow-rem-in').value = 'Pay the subs';
    document.querySelector('#cr-owner #ow-rem-date').value = d;
    document.querySelector('#cr-owner #ow-rem-rep').value = 'weekly';
    document.querySelector('#cr-owner [data-act="rem-add"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'insert');
    var p = w[0] && w[0].payload;
    return { repeat: p && p.repeat, date: p && p.remind_on };
  }, ymd(2));
  ok('a weekly reminder stores repeat + date', a2.repeat === 'weekly' && !!a2.date, a2);

  // check the standing one-time reminder -> completes
  const done = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-obl[data-id="rmB"] [data-act="rem-done"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'update');
    return { setDone: !!(w.length && w[w.length - 1].payload && w[w.length - 1].payload.done_at) };
  });
  ok('checking a one-time reminder completes it (done_at set)', done.setDone, done);

  // check the weekly (past-dated) reminder -> rolls forward, no done_at
  const rolled = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-obl[data-id="rmA"] [data-act="rem-done"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'update');
    var p = w.length && w[w.length - 1].payload;
    var future = p && p.remind_on ? (new Date(p.remind_on + 'T00:00:00') > new Date(new Date().toDateString())) : false;
    return { hasDate: !!(p && p.remind_on), future: future, noDone: !(p && p.done_at) };
  });
  ok('checking a repeating reminder rolls remind_on forward', rolled.hasDate && rolled.future, rolled);
  ok('a rolled-forward repeating reminder is not marked done', rolled.noDone, rolled);

  // edit a reminder (text + repeat)
  const ed = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-obl[data-id="rmA"] [data-act="rem-edit"]').click();
    await new Promise(r => setTimeout(r, 120));
    var ti = document.querySelector('#cr-owner #ow-edit-rtext'), rp = document.querySelector('#cr-owner #ow-edit-rrep');
    var opened = !!ti && ti.value === 'Deposit the checks' && !!rp;
    ti.value = 'Deposit checks at the bank';
    rp.value = 'monthly';
    document.querySelector('#cr-owner [data-act="edit-save"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'update');
    var p = w.length && w[w.length - 1].payload;
    return { opened: opened, text: p && p.text, repeat: p && p.repeat, shows: /Deposit checks at the bank/.test(document.getElementById('cr-owner').innerText) };
  });
  ok('tapping a reminder opens its editor (text + repeat)', ed.opened, ed);
  ok('saving writes an owner_reminders UPDATE with new text + repeat', ed.text === 'Deposit checks at the bank' && ed.repeat === 'monthly', ed);
  ok('the edited reminder shows the new text', ed.shows, ed);

  // delete
  const del = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-obl[data-id="rmA"] [data-act="rem-del"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'delete');
    return { wrote: w.length, gone: !/Deposit checks at the bank/.test(document.getElementById('cr-owner').innerText) };
  });
  ok('deleting a reminder removes it', del.wrote >= 1 && del.gone, del);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
