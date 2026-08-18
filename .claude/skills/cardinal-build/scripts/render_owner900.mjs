/*
 * Build 900 gate — The Vault (Owner Console module 6).
 * Boots as admin, proves the section + category grouping render, an expiring doc shows
 * a countdown, uploading a real file writes a storage upload + an owner_docs insert and
 * the doc appears, opening a doc signs its stored path and hands it to window.open, and
 * deleting removes both the row and the storage object.
 * v899 has no vault -> RED.
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
const TAG = FILE.includes('899') ? '899 (neg-control)' : '900';

function ymd(o) { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); }
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [],
  owner_docs: [
    { id: 'dcA', label: 'Certificate of Insurance', category: 'insurance', storage_path: 'owner-vault/coi.pdf', file_name: 'coi.pdf', size_bytes: 204800, expires_on: ymd(20), created_at: '2026-08-01T08:00:00Z' },
    { id: 'dcB', label: 'Articles of Organization', category: 'formation', storage_path: 'owner-vault/articles.pdf', file_name: 'articles.pdf', size_bytes: 512000, created_at: '2026-08-02T08:00:00Z' }
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 220) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.CardinalOwner && window.CardinalOwner.open), { timeout: 15000 });
  await page.evaluate(async () => { window.__WRITES__ = []; await window.CardinalOwner.open(); await new Promise(r => setTimeout(r, 400)); });

  const txt = await page.evaluate(() => document.getElementById('cr-owner').innerText);
  ok('The Vault section renders', /the vault/i.test(txt));
  ok('seeded docs render', /Certificate of Insurance/.test(txt) && /Articles of Organization/.test(txt));
  ok('docs are grouped by category (Insurance + Formation headings)', /insurance/i.test(txt) && /formation/i.test(txt));
  ok('an expiring doc shows a countdown', (await page.evaluate(() => { var r = document.querySelector('#cr-owner .ow-doc[data-id="dcA"]'); return r ? r.innerText : ''; })).match(/day|today|ago/i) != null);

  // upload a real file
  await page.setInputFiles('#cr-owner #ow-vault-file', { name: 'ein-letter.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 mock EIN letter') });
  const up = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner #ow-vault-label').value = 'EIN assignment letter';
    document.querySelector('#cr-owner #ow-vault-cat').value = 'tax';
    document.querySelector('#cr-owner [data-act="vault-add"]').click();
    await new Promise(r => setTimeout(r, 500));
    var w = window.__WRITES__ || [];
    return {
      stor: w.filter(x => x.table === 'storage:photos' && x.op === 'upload' && x.payload && /^owner-vault\//.test(x.payload.path)).length,
      row: w.filter(x => x.table === 'owner_docs' && x.op === 'insert' && x.payload && x.payload.label === 'EIN assignment letter' && x.payload.category === 'tax').length,
      pathUnderVault: (w.find(x => x.table === 'owner_docs' && x.op === 'insert') || {}).payload,
      shows: /EIN assignment letter/.test(document.getElementById('cr-owner').innerText)
    };
  });
  ok('uploading writes a storage object under owner-vault/', up.stor >= 1, up);
  ok('uploading inserts an owner_docs row (label + category)', up.row >= 1, up);
  ok('the stored path is under the owner-vault/ prefix', up.pathUnderVault && /^owner-vault\//.test(up.pathUnderVault.storage_path), up.pathUnderVault);
  ok('the new document appears in the list', up.shows, up);

  // open a doc -> signs its stored path and opens it
  const open = await page.evaluate(async () => {
    window.__opened = null;
    window.open = function () { return { set location(v) { window.__opened = v; }, get location() { return window.__opened; }, close() {} }; };
    document.querySelector('#cr-owner .ow-doc[data-id="dcA"] [data-act="vault-open"]').click();
    await new Promise(r => setTimeout(r, 300));
    return { url: window.__opened };
  });
  ok('opening a doc signs and opens its stored path', typeof open.url === 'string' && open.url.indexOf('owner-vault/coi.pdf') !== -1, open);

  // delete a doc -> row delete + storage remove
  const del = await page.evaluate(async () => {
    window.__WRITES__ = [];
    document.querySelector('#cr-owner .ow-doc[data-id="dcB"] [data-act="vault-del"]').click();
    await new Promise(r => setTimeout(r, 350));
    var w = window.__WRITES__ || [];
    return {
      row: w.filter(x => x.table === 'owner_docs' && x.op === 'delete').length,
      stor: w.filter(x => x.table === 'storage:photos' && x.op === 'remove').length,
      gone: !document.querySelector('#cr-owner .ow-doc[data-id="dcB"]')
    };
  });
  ok('deleting removes the owner_docs row', del.row >= 1, del);
  ok('deleting removes the storage object too', del.stor >= 1, del);
  ok('the deleted doc is gone from the list', del.gone, del);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 400)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
