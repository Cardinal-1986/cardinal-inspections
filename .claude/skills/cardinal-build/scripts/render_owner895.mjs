/*
 * Build 895 gate — the Owner Console (admin-only Daily Brief).
 * Boots the app as an admin against the mock Supabase, opens window.CardinalOwner,
 * and proves: the three sections render, the computed tax calendar shows countdowns,
 * seeded owner_tasks/owner_items appear, adding a task writes to owner_tasks and
 * re-renders, and a non-admin open() is refused.
 * v894 has no CardinalOwner -> the module-present assertions go RED (negative control).
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
const TAG = FILE.includes('894') ? '894 (neg-control)' : '895';

function ymd(offsetDays) { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10); }
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [
    { id: 't1', title: 'Call the accountant about Q3', done: false, position: 1, created_at: '2026-08-18T10:00:00Z' },
    { id: 't2', title: 'Renew the box-truck plates', done: true, done_at: '2026-08-18T09:00:00Z', position: 0, created_at: '2026-08-18T08:00:00Z' }
  ],
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
  const hasMod = await page.waitForFunction(() => !!(window.CardinalOwner && typeof window.CardinalOwner.open === 'function'), { timeout: 15000 }).then(() => true).catch(() => false);
  ok('window.CardinalOwner.open exists', hasMod);
  if (!hasMod) { console.log(`\nRED — ${pass} passed, ${fail + 1} failed (module absent)`); await browser.close(); process.exit(1); }

  // open the console
  const opened = await page.evaluate(async () => {
    window.__WRITES__ = [];
    await window.CardinalOwner.open();
    await new Promise(r => setTimeout(r, 400));
    var v = document.getElementById('cr-owner');
    return { shown: !!v && v.style.display === 'block', txt: v ? v.innerText : '' };
  });
  ok('console view is shown', opened.shown, opened.shown);
  ok('renders "Today · Top 10" section', /Top 10/i.test(opened.txt));
  ok('renders "On the horizon" section', /On the horizon/i.test(opened.txt));
  ok('renders "Renewals & expirations" section', /Renewals\s*&\s*expirations/i.test(opened.txt) || /Renewals/i.test(opened.txt));

  // tax calendar rows present with the four canonical obligations
  const cal = await page.evaluate(() => document.getElementById('cr-owner').innerText);
  ok('tax calendar: quarterly estimated tax row', /Estimated income tax/i.test(cal));
  ok('tax calendar: 1099-NEC row', /1099-NEC/i.test(cal));
  ok('tax calendar: Ohio BWC row', /BWC/i.test(cal));
  ok('tax calendar: annual return row', /Schedule C|Form 1040/i.test(cal));
  ok('a countdown is rendered (days / today / ago)', /\bday(s)?\b|today|ago/i.test(cal));

  // seeded data
  ok('seeded open task renders', /Call the accountant about Q3/.test(cal));
  ok('seeded done task renders (struck)', /Renew the box-truck plates/.test(cal));
  ok('seeded owner obligation renders', /City income tax filing/.test(cal));
  ok('seeded owner renewal renders', /General liability policy/.test(cal));
  ok('seeded crew certificate renders', /Betos/.test(cal) && /Certificate of insurance/i.test(cal));

  // add a task -> writes owner_tasks and re-renders
  const added = await page.evaluate(async () => {
    var inp = document.querySelector('#cr-owner #ow-task-in');
    inp.value = 'Pay the subs Friday';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    var btn = document.querySelector('#cr-owner [data-act="task-add"]');
    btn.click();
    await new Promise(r => setTimeout(r, 350));
    var writes = (window.__WRITES__ || []).filter(w => w.table === 'owner_tasks' && w.op === 'insert');
    return { wrote: writes.length, title: writes[0] && (writes[0].payload && writes[0].payload.title), shows: /Pay the subs Friday/.test(document.getElementById('cr-owner').innerText) };
  });
  ok('adding a task inserts into owner_tasks', added.wrote >= 1, added);
  ok('the inserted task carries its title', added.title === 'Pay the subs Friday', added);
  ok('the new task appears in the list', added.shows, added);

  // toggle a task done -> update recorded
  const toggled = await page.evaluate(async () => {
    var row = document.querySelector('#cr-owner .ow-ag[data-id="t1"] [data-act="task-done"]');
    row.click();
    await new Promise(r => setTimeout(r, 300));
    var upd = (window.__WRITES__ || []).filter(w => w.table === 'owner_tasks' && w.op === 'update');
    return { updated: upd.length };
  });
  ok('checking a task updates owner_tasks', toggled.updated >= 1, toggled);

  // admin gate — a non-admin open() is refused
  const gated = await page.evaluate(async () => {
    var v = document.getElementById('cr-owner');
    v.style.display = 'none';
    var orig = window.isAdminUser;
    window.isAdminUser = function () { return false; };
    window.alert = function () {};
    try { await window.CardinalOwner.open(); } catch (e) {}
    await new Promise(r => setTimeout(r, 150));
    var shown = v.style.display === 'block';
    window.isAdminUser = orig;
    return { shown };
  });
  ok('non-admin open() is refused (view stays hidden)', gated.shown === false, gated);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
