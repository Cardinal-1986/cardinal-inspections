/* gate_1329 — "+ From Library" lists the Library even when the boot-time load came back empty.
 *   A  the boot load is made to answer [] (what RLS gives a read that runs before the session is
 *      back, as on a phone); the picker opened then lists every Library item within 2s
 *   B  while it loads, it says so rather than "The library is empty"
 *   C  an honestly empty Library still says it is empty
 * Arg: [index.html] -> negative control (1328: must go RED on A, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 180000);
const BODY = n => '<!DOCTYPE html><html><head><title>' + n + '</title></head><body><h1>Estimate ' + n + '</h1>' +
  '<table class="items"><tr><td>Roof replacement</td><td>$5,000.00</td></tr></table>' + '<p>' + 'x'.repeat(4000) + '</p></body></html>';
const P = { id: 'p1', name: 'Client One', stage: 'Prospect', address: '1 Main St', phone: '9375550100', email: 'c@example.com',
  checklist: '{}', created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() };
const D = id => ({ id, project_id: 'p1', title: 'EST-2026-09' + id + ' — Estimate — Client One', total: 5000, html: BODY(id), status: 'sent',
  created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P], inspection_reports: [],
  estimate_line_items: [1,2,3].map(i => ({ id: 'li' + i, name: 'Item ' + i, description: 'd', default_price: 100 * i, category: 'Roofing', unit: 'SQ', active: true, sort_order: i })),
  document_versions: [], collections: [], owner_reviews: [], estimates: [], insurance_claims: [],
  appointments: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await waitAppReady(page);
await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
await page.waitForTimeout(900);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
await page.waitForTimeout(500); await settle(page);


/* make the next N estimate_line_items reads answer [] (a signed-out read), then call load() */
const starve = (n) => page.evaluate(async n => {
  const sb = window.supa; const orig = sb.from.bind(sb); let left = n;
  const empty = () => { const c = new Proxy({}, { get: (t, k) => k === 'then' ? (r => r({ data: [], error: null })) : () => c }); return c; };
  sb.from = t => (t === 'estimate_line_items' && left-- > 0) ? empty() : orig(t);
  try { await window.CardinalLineItems.load(); } catch (_) {}
  return window.CardinalLineItems.all().length;
}, n);
const openLib = () => page.evaluate(async () => {
  try { document.getElementById('cr-est-picker') && document.getElementById('cr-est-picker').classList.remove('open'); } catch (_) {}
  const E = window.CardinalEstimates; if (!document.getElementById('cr-est-view') || !document.getElementById('cr-est-view').classList.contains('open')) { await E.openEditor('p1'); await new Promise(r => setTimeout(r, 1200)); }
  const b = document.querySelector('#cr-est-view [data-act="add-lib"]'); if (!b) return { err: 'no + From Library' };
  b.click();
  const pk = () => document.getElementById('cr-est-picker');
  const t0 = (pk() && pk().querySelector('.box-list') || {}).textContent || '';
  await new Promise(r => setTimeout(r, 2000));
  const items = pk() ? pk().querySelectorAll('.p-item').length : -1;
  const txt = (pk() && pk().querySelector('.box-list') || {}).textContent || '';
  return { t0: t0.trim().slice(0, 60), items, txt: txt.trim().slice(0, 60) };
});

const n0 = await starve(1);
const A = await openLib();
ok(n0 === 0 && A.items === 3, 'A  boot load came back empty — the picker still lists all 3 items', 'after starve ' + n0 + ' · ' + JSON.stringify(A));
ok(/Loading the Library/.test(A.t0), 'B  while it loads it says Loading, not "empty"', JSON.stringify(A.t0));
const n1 = await starve(2);
const C = await openLib();
ok(n1 === 0 && C.items === 0 && /library is empty/i.test(C.txt), 'C  an honestly empty Library still says so', 'after starve ' + n1 + ' · ' + JSON.stringify(C));

await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1329: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
