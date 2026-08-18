/*
 * Build 892 gate — the "+ New work order" button must issue against the OPEN CLIENT,
 * not the click Event.
 * The button was wired addEventListener('click', openWorkOrderPicker), so the click
 * Event arrived as `project` and shadowed currentProject -> blank homeowner/address.
 * Drives the REAL picker two ways and captures the pr handed to createWorkOrder:
 *   A) openWorkOrderPicker() with no arg  -> uses currentProject
 *   B) openWorkOrderPicker(<click Event>) -> must STILL use currentProject (the guard)
 * v891 fails B (captures the Event, no address) -> RED.
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
const TAG = FILE.includes('891') ? '891' : '892';
const SEED = { crews: [{ id: 'c1', trade: 'Roofing', name: 'Betos', legal_name: 'Betos', archived: false }], projects: [], team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }], crew_rates: [], pricing_items: [], inspection_reports: [], appointments: [], estimates: [], insurance_claims: [], project_photos: [], crew_work_orders: [] };
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 160) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

const PR = { id: 'p1', name: 'Karen Duffy', address: '8743 Shadycreek Dr, Dayton OH 45458', phone: '(937) 672-3978', checklist: '{}', stage: 'Approved' };

// drive the picker with `arg`, pick the crew, click Create, capture the pr createWorkOrder got
async function drive(argKind) {
  return page.evaluate(async (args) => {
    window.currentProject = args.PR;
    window.__pr = undefined;
    window.createWorkOrder = function (pr) { window.__pr = pr; var m = document.getElementById('tskModal'); if (m) m.style.display = 'none'; return Promise.resolve(); };
    var arg = args.argKind === 'event' ? new MouseEvent('click') : undefined;
    try { await openWorkOrderPicker(arg); } catch (e) { return { err: String(e) }; }
    await new Promise(r => setTimeout(r, 400));
    var sel = document.getElementById('woCrew'); if (sel) sel.value = 'c1';
    var go = document.getElementById('woGo'); if (go) go.click();
    await new Promise(r => setTimeout(r, 200));
    var pr = window.__pr;
    return { name: pr && pr.name, address: pr && pr.address, isEvent: !!(pr && typeof pr.preventDefault === 'function') };
  }, { PR, argKind });
}

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof openWorkOrderPicker === 'function', { timeout: 20000 });

  // the button is wired to pass nothing
  const wiring = await page.evaluate(() => {
    var b = document.getElementById('pNewWorkOrderBtn');
    return { present: !!b };
  });
  ok('the "+ New work order" button exists', wiring.present);

  const A = await drive('none');
  ok('A: no-arg call uses the open client (name)', A.name === 'Karen Duffy', A);
  ok('A: no-arg call uses the open client (address)', A.address === '8743 Shadycreek Dr, Dayton OH 45458', A);

  const B = await drive('event');
  ok('B: a click Event does NOT shadow the client (name)', B.name === 'Karen Duffy', B);
  ok('B: a click Event does NOT shadow the client (address)', B.address === '8743 Shadycreek Dr, Dayton OH 45458', B);
  ok('B: createWorkOrder never receives a DOM Event', B.isEvent === false, B);

  // the real button click path also resolves to the client (wrapped listener passes no arg)
  const C = await page.evaluate(async (pr) => {
    window.currentProject = pr;
    window.__pr = undefined;
    window.createWorkOrder = function (p) { window.__pr = p; var m = document.getElementById('tskModal'); if (m) m.style.display = 'none'; return Promise.resolve(); };
    document.getElementById('pNewWorkOrderBtn').click();
    await new Promise(r => setTimeout(r, 400));
    var sel = document.getElementById('woCrew'); if (sel) sel.value = 'c1';
    var go = document.getElementById('woGo'); if (go) go.click();
    await new Promise(r => setTimeout(r, 200));
    return { name: window.__pr && window.__pr.name, address: window.__pr && window.__pr.address };
  }, PR);
  ok('C: clicking the real button issues against the client', C.name === 'Karen Duffy' && C.address === '8743 Shadycreek Dr, Dayton OH 45458', C);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 300)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
