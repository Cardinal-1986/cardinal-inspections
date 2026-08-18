/*
 * Build 898 gate (console half) — the reminder "Ping me" notify toggle.
 * Proves the add form and edit form expose a notify checkbox, that it persists
 * on insert and update, that a row shows "pings you" when notify is on, and that
 * the edit form reflects the stored notify state.
 * v897 has no #ow-rem-notify -> RED.
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
const TAG = FILE.includes('897') ? '897 (neg-control)' : '898';

function ymd(o) { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); }
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [], owner_items: [],
  owner_reminders: [{ id: 'rmN', text: 'Deposit the checks', remind_on: ymd(1), repeat: 'weekly', notify: true, created_at: '2026-08-18T08:00:00Z' }],
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

  ok('the add form has a Ping-me toggle', await page.evaluate(() => !!document.querySelector('#cr-owner #ow-rem-notify')));
  ok('a notify reminder shows "pings you"', await page.evaluate(() => /pings you/i.test(document.getElementById('cr-owner').innerText)));

  // add with notify checked
  const a = await page.evaluate(async (d) => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner #ow-rem-in').value = 'Renew the LLC filing';
    document.querySelector('#cr-owner #ow-rem-date').value = d;
    document.querySelector('#cr-owner #ow-rem-notify').checked = true;
    document.querySelector('#cr-owner [data-act="rem-add"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'insert');
    return { notify: w[0] && w[0].payload && w[0].payload.notify };
  }, ymd(5));
  ok('adding with Ping me checked stores notify=true', a.notify === true, a);

  // edit form reflects stored notify, and can be turned off
  const e = await page.evaluate(async () => {
    document.querySelector('#cr-owner .ow-obl[data-id="rmN"] [data-act="rem-edit"]').click();
    await new Promise(r => setTimeout(r, 120));
    var box = document.querySelector('#cr-owner #ow-edit-rnotify');
    var reflected = !!box && box.checked === true;
    box.checked = false;
    window.__WRITES__ = [];
    document.querySelector('#cr-owner [data-act="edit-save"]').click();
    await new Promise(r => setTimeout(r, 250));
    var w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reminders' && x.op === 'update');
    return { reflected: reflected, saved: w.length && w[w.length - 1].payload && w[w.length - 1].payload.notify };
  });
  ok('the edit form reflects the stored notify state', e.reflected, e);
  ok('unchecking and saving writes notify=false', e.saved === false, e);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
