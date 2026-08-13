import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Completed', address: '1 Test Way', phone: '937-000-0000',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  punch_items: [
    { id: 'PI1', project_id: 'P1', title: 'Warranty Inspection', detail: 'Leak from the fireplace', kind: 'punch',
      priority: 'high', status: 'open', assigned_to: 'curtis@cardinalrenovations.net', created_at: now, photos: [], comments: [] }
  ],
  inspection_reports: [], estimates: [], contracts: [], collections: [], commissions: [], crew_work_orders: [], appointments: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 430, height: 900 } })).newPage();
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const checks = [];
function chk(n, c, d) { checks.push({ n, pass: !!c, d: d || '' }); }

// structural: the sheet must not live inside the hidden punch view
chk('#puDetail is NOT inside #punchView', await page.evaluate(() => {
  const d = document.getElementById('puDetail'), pv = document.getElementById('punchView');
  return !!(d && pv && !pv.contains(d));
}));

// ---- HOME PAGE: tap a Punch & Repairs card ----
await page.evaluate(() => {
  try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {}
  try { if (typeof showHome === 'function') showHome(); } catch (e) {}
  // the landing is a sibling in normal flow; real navigation hides it. In a
  // headless boot it can still be painted, which would sit over the strip and
  // make hit-testing meaningless. Put it down explicitly — harness only.
  var lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
});
await page.waitForTimeout(1200);
await page.evaluate(async () => {
  try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch (e) {}
  try { if (window.renderPunchStrips) window.renderPunchStrips(); } catch (e) {}
});
await page.waitForTimeout(1200);

chk('home strip renders a punch card', await page.evaluate(() => !!document.querySelector('#kpPunchStrip .pu-card')));

// scroll it into view, then verify a real tap would land on the card (hit-testing)
const hit = await page.evaluate(() => {
  const c = document.querySelector('#kpPunchStrip .pu-card');
  if (!c) return null;
  c.scrollIntoView({ block: 'center' });
  const r = c.getBoundingClientRect();
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { inside: !!(el && c.contains(el)), got: el ? el.tagName + '.' + String(el.className || '').split(' ')[0] : null };
});
chk('a real tap at the card centre lands on the card (nothing intercepts)', hit && hit.inside, hit ? hit.got : 'no card');

await page.click('#kpPunchStrip .pu-card .pu-t', { timeout: 5000 }).catch(async () => {
  await page.evaluate(() => { const t = document.querySelector('#kpPunchStrip .pu-card .pu-t'); if (t) t.click(); });
});
await page.waitForTimeout(700);

const home = await page.evaluate(() => {
  const d = document.getElementById('puDetail');
  if (!d) return { open: false, len: 0, visible: false, z: null, title: '', why: 'no #puDetail' };
  const r = d.getBoundingClientRect();
  let why = '';
  const own = getComputedStyle(d);
  let vis = own.display !== 'none' && own.visibility !== 'hidden' && r.width > 10 && r.height > 10;
  if (!vis) why = 'own display:' + own.display;
  let n = d.parentElement;
  while (n && vis) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') { vis = false; why = 'hidden ancestor ' + (n.id ? '#' + n.id : n.tagName); }
    n = n.parentElement;
  }
  if (vis) { // is it actually painted on top?
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!(el && d.contains(el))) { vis = false; why = 'covered by ' + (el ? el.tagName + '.' + String(el.className || '').split(' ')[0] : 'nothing'); }
  }
  return { open: d.classList.contains('open'), len: d.innerHTML.length, visible: vis, z: own.zIndex,
           title: d.querySelector('.pud-hd b') ? d.querySelector('.pud-hd b').textContent : '', why: why };
});
chk('tapping a home-page card OPENS the detail sheet', home.open && home.len > 0, 'len=' + home.len);
chk('the sheet is actually VISIBLE on the home page', home.visible, 'visible=' + home.visible + ' z=' + home.z + (home.why ? ' — ' + home.why : ''));
chk('the sheet shows the item that was tapped', /Warranty Inspection/.test(home.title), home.title);

// close it
await page.evaluate(() => { const b = document.querySelector('#puDetail [data-pud="close"]'); if (b) b.click(); });
await page.waitForTimeout(400);
chk('close button dismisses the sheet', await page.evaluate(() => { const d = document.getElementById('puDetail'); return d && !d.classList.contains('open'); }));

// ---- REGRESSION: the full punch page still opens the sheet ----
await page.evaluate(() => { const a = document.querySelector('[data-puall]'); if (a) a.click(); });
await page.waitForTimeout(1200);
chk('"See all" still opens the punch page', await page.evaluate(() => {
  const pv = document.getElementById('punchView'); return pv && getComputedStyle(pv).display !== 'none';
}));
await page.evaluate(() => { const c = document.querySelector('#puList .pu-card .pu-t'); if (c) c.click(); });
await page.waitForTimeout(700);
const onPage = await page.evaluate(() => {
  const d = document.getElementById('puDetail');
  if (!d) return { open: false, visible: false };
  const r = d.getBoundingClientRect();
  const own = getComputedStyle(d);
  let vis = own.display !== 'none' && r.width > 10 && r.height > 10;
  let n = d.parentElement;
  while (n && vis) { const cs = getComputedStyle(n); if (cs.display === 'none') vis = false; n = n.parentElement; }
  return { open: d.classList.contains('open'), visible: vis };
});
chk('punch PAGE sheet still opens and is visible (no regression)', onPage.open && onPage.visible, JSON.stringify(onPage));

let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
