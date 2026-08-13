/* gate_782.mjs — the New Lead form: reachable clients, shorter first screen.
 *
 *   node gate_782.mjs [path/to/index.html]
 *
 * Chromium at phone width. Point it at 781 as the negative control — there a
 * lead with no phone and no email saves happily, which is how 35 of 40 client
 * records ended up with no email address.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const OUT = process.env.GATE_OUT || '/tmp/gate782';
mkdirSync(OUT, { recursive: true });
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_782 on ' + FILE);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('dialog', d => d.accept());
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
await page.addInitScript(seed => { window.__SEED__ = seed; }, { projects: [], team_profiles: [], inspection_reports: [], punch_items: [], appointments: [], estimates: [] });
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });

async function openForm() {
  await page.evaluate(() => { if (typeof openLeadForm === 'function') openLeadForm();
    const m = document.getElementById('leadFormModal'); if (m) m.style.display = 'block'; });
  await page.waitForTimeout(500);
}
async function fillCore() {
  await page.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('ldFirst', 'ZZ-Gate'); set('ldLast', 'Contact'); set('ldStreet', '9 Test Way');
    set('ldCity', 'Dayton'); set('ldZip', '45414');
    const st = document.getElementById('ldState'); if (st) st.value = 'OH';
  });
}
const shot = async n => { try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) {} };

console.log('\n--- 1. the first screen is shorter ---');
await openForm();
const census = await page.evaluate(() => {
  const m = document.getElementById('leadFormModal');
  const vis = el => { const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'none' && (r.width > 0 || r.height > 0); };
  const fields = [...m.querySelectorAll('input,select,textarea')].filter(e => e.type !== 'hidden' && vis(e));
  return { visible: fields.length,
    hasMoreBtn: !!document.getElementById('ldMoreBtn'),
    collapsed: !m.classList.contains('ldshow'),
    coreVisible: ['ldFirst','ldLast','ldStreet','ldCity','ldState','ldZip'].every(id => { const e = document.getElementById(id); return e && vis(e); }),
    hiddenNow: ['ldCompany','ldMailing','ldBilling','ldCategory','ldWorkType','ldSource','ldNotes','ldApptDate'].filter(id => { const e = document.getElementById(id); return e && !vis(e); }).length
  };
});
await shot('collapsed');
ok('a More-detail control exists', census.hasMoreBtn);
ok('the form opens collapsed', census.collapsed);
ok('the essentials are still on the first screen', census.coreVisible);
ok('the long half is hidden (8 of 8 sampled)', census.hiddenNow === 8, 'hidden: ' + census.hiddenNow + '/8');
ok('visible field count is well under the old 43', census.visible < 26, 'visible = ' + census.visible);

console.log('\n--- 1b. the OTHER disclosure still works while collapsed ---');
const lac = await page.evaluate(() => {
  const t = document.getElementById('cr-lac-toggle');
  if (!t) return { present: false };
  t.click();
  const m = document.getElementById('ldMailing');
  const vis = m && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0;
  return { present: true, revealed: !!vis };
});
ok('cr-lac-script\'s mailing/billing toggle still reveals its fields',
  !lac.present || lac.revealed,
  'a second display:none !important over the same fields would make that control dead');

console.log('\n--- 2. More detail reveals them again ---');
await page.evaluate(() => { const b = document.getElementById('ldMoreBtn'); if (b) b.click(); });
await page.waitForTimeout(400);
const expanded = await page.evaluate(() => {
  const m = document.getElementById('leadFormModal');
  const vis = el => { const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'none' && (r.width > 0 || r.height > 0); };
  return { on: m.classList.contains('ldshow'),
    shown: ['ldCompany','ldCategory','ldWorkType','ldSource','ldNotes','ldApptDate'].every(id => { const e = document.getElementById(id); return e && vis(e); }),
    label: ((document.getElementById('ldMoreBtn') || {}).textContent || '').trim().slice(0, 12) };
});
await shot('expanded');
ok('expanding shows the rest', expanded.on && expanded.shown, JSON.stringify(expanded));
ok('the control says how to collapse again', /Less/i.test(expanded.label), expanded.label);
await page.evaluate(() => { const b = document.getElementById('ldMoreBtn'); if (b) b.click(); });
await page.waitForTimeout(300);

console.log('\n--- 3. a lead with no way to reach them is refused ---');
await fillCore();
await page.evaluate(() => { window.__WRITES__ = []; document.getElementById('ldSave').click(); });
await page.waitForTimeout(1200);
const refused = await page.evaluate(() => ({
  err: (document.getElementById('ldError').textContent || '').trim(),
  wrote: (window.__WRITES__ || []).filter(w => w.table === 'projects').length,
  hatchShown: (function () { const w = document.getElementById('ldNoContactWrap'); return !!w && getComputedStyle(w).display !== 'none'; })()
}));
await shot('refused');
ok('the save is refused', refused.wrote === 0, 'projects writes = ' + refused.wrote);
ok('it says why, in the rep\'s terms', /phone number or an email/i.test(refused.err), refused.err.slice(0, 90));
ok('the door-knock escape hatch is revealed', refused.hatchShown);

console.log('\n--- 4. ...but a canvasser can still record the address ---');
await page.evaluate(() => { const n = document.getElementById('ldNoContact'); if (n) n.checked = true; window.__WRITES__ = []; document.getElementById('ldSave').click(); });
await page.waitForTimeout(1600);
const hatched = await page.evaluate(() => {
  const w = (window.__WRITES__ || []).find(x => x.table === 'projects' && x.op === 'insert');
  let ck = {}; try { ck = JSON.parse((w && w.payload && w.payload.checklist) || '{}'); } catch (e) {}
  return { wrote: !!w, noContact: !!(ck.lead && ck.lead.no_contact) };
});
ok('ticking the box lets the lead through', hatched.wrote);
ok('and the lead is marked so it can be chased', hatched.noContact);

console.log('\n--- 5. the normal path is untouched ---');
await openForm();
await fillCore();
await page.evaluate(() => {
  const ph = document.querySelector('#ldPhones input'); if (ph) { ph.value = '937-555-0142'; ph.dispatchEvent(new Event('input', { bubbles: true })); }
  window.__WRITES__ = []; document.getElementById('ldSave').click();
});
await page.waitForTimeout(1600);
const normal = await page.evaluate(() => {
  const w = (window.__WRITES__ || []).find(x => x.table === 'projects' && x.op === 'insert');
  let ck = {}; try { ck = JSON.parse((w && w.payload && w.payload.checklist) || '{}'); } catch (e) {}
  return { wrote: !!w, phones: (ck.lead && ck.lead.phones || []).length, noContact: !!(ck.lead && ck.lead.no_contact),
    err: (document.getElementById('ldError').textContent || '').trim() };
});
ok('a phone alone is enough — saves with no extra tap', normal.wrote && normal.phones === 1, JSON.stringify(normal));
ok('and it is NOT marked no-contact', !normal.noContact);
ok('no error shown on the happy path', !normal.err, normal.err);

console.log('\n--- 6. the six checks that already worked still work ---');
await openForm();
await page.evaluate(() => { window.__WRITES__ = []; document.getElementById('ldSave').click(); });
await page.waitForTimeout(900);
const empty = await page.evaluate(() => ({
  err: (document.getElementById('ldError').textContent || '').trim(),
  wrote: (window.__WRITES__ || []).filter(w => w.table === 'projects').length
}));
ok('an empty form is still refused for name/address', empty.wrote === 0 && /First Name/.test(empty.err), empty.err.slice(0, 80));
ok('...and the contact rule did not replace them', /Street|City|Zip/.test(empty.err), empty.err.slice(0, 80));

console.log('\n--- 7. state does not leak between leads ---');
await openForm();
const reset = await page.evaluate(() => {
  const m = document.getElementById('leadFormModal');
  const nc = document.getElementById('ldNoContact');
  const w = document.getElementById('ldNoContactWrap');
  return { collapsed: !m.classList.contains('ldshow'), unticked: nc && !nc.checked,
    hatchHidden: w && getComputedStyle(w).display === 'none' };
});
ok('the next lead opens collapsed', reset.collapsed);
ok('the no-contact tick does not carry over', reset.unticked);
ok('the escape hatch is put away again', reset.hatchHidden);

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
