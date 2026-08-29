/* gate_1141.mjs — build 1141: one-tap send-for-signature.
 *
 *   (0) buildDocHtml's acceptance block now matches share.js/clientsign.js
 *       SIGN_RX ("Client Acceptance"), so the estimate proposal's shared link
 *       is actually signable — the 1027/1099 redesign had left it "Client
 *       Signature & Date", which SIGN_RX never matched (review-only).
 *   (1) a "Text to sign" button on the document toolbar: with a client phone it
 *       navigates to an sms: link carrying the share URL; with no phone it
 *       copies the link and prompts.
 *
 * Control (1140 tree): RED — buildDocHtml is not SIGN_RX-signable AND there is
 * no #textSignBtn.
 * Usage: node gate_1141.mjs [path/to/index.html]
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('gate_1141: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

// share.js's own regex — the contract this build must satisfy.
const SIGN_RX = /(<div class="line">)(<\/div>\s*<div class="lbl">\s*Client Acceptance)([^<]*)(<\/div>)/;

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Prospect', sales_rep: 'theo@cardinalrenovations.net',
               address: '5735 Webster Street', city: 'Dayton', state: 'OH', zip: '45414',
               email: 'bob@example.com', phone: '937-555-0101',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).split('\n')[0]));
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {}
  window.__PROMPTS__ = [];
  window.prompt = (msg, val) => { window.__PROMPTS__.push(String(val || msg || '')); return val || ''; };
  window.confirm = () => true;
  window.alert = () => {};
  window.__CLIP__ = [];
  try {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => ({ writeText: t => { window.__CLIP__.push(String(t)); return Promise.resolve(); } }) });
  } catch (e) {}
});

let R = null;
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);

  /* ---- Phase 0: signability of the estimate proposal (pure, exported fn) ---- */
  const sign = await page.evaluate(({ SIGN_SRC }) => {
    const rx = new RegExp(SIGN_SRC);
    const P = window.CardinalEstimatePublish;
    if (!P || typeof P.buildDocHtml !== 'function') return { ok: false, why: 'buildDocHtml missing' };
    const project = { id: 'P1', name: 'Bob DeBuilder', address: '5735 Webster Street' };
    const est = { id: 'e1', estimate_number: 'EST-1', title: 'Roof', total: 46000, subtotal: 46000,
      deposit_pct: 30, deposit_amount: 13800, valid_through: '2026-09-28',
      line_items: [{ name: 'Tear-off', qty: 1, unit: 'EA', unit_price: 0, amount: 46000, flat: true }], photos: [] };
    const html = P.buildDocHtml(est, project, null);
    return { ok: true, signable: rx.test(html), hasAccept: html.indexOf('Client Acceptance') !== -1 };
  }, { SIGN_SRC: SIGN_RX.source });
  chk('buildDocHtml is exported', sign.ok === true, sign.why || '');
  chk('the estimate proposal is now SIGN_RX-signable (share.js will inject Accept & Sign)', sign.signable === true, 'signable=' + sign.signable);

  /* ---- open a real document in the editor (contract path, like gate_731) ---- */
  await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { try { showTab('contracts'); } catch (e) {} const t = document.getElementById('tab-contracts'); if (t) t.style.display = 'block'; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const m = document.getElementById('pContractMenu');
    if (m) { m.style.display = 'block'; const o = m.querySelector('[data-ctpl="siding"]'); if (o) return o.click(); }
    const b = document.getElementById('pNewContractBtn'); if (b) b.click();
  });
  await page.waitForTimeout(1800);

  const open = await page.evaluate(() => ({
    editorOpen: !!document.getElementById('editorView') && getComputedStyle(document.getElementById('editorView')).display !== 'none',
    hasBtn: !!document.getElementById('textSignBtn'),
    proj: (function () { try { const p = currentDocProject(); return p ? p.id : null; } catch (e) { return 'ERR'; } })()
  }));
  chk('a document is open in the editor', open.editorOpen === true, 'editorOpen=' + open.editorOpen);
  chk('the "Text to sign" button exists on the toolbar', open.hasBtn === true, 'hasBtn=' + open.hasBtn);
  chk('the open document resolves its client', open.proj === 'P1', 'proj=' + open.proj);

  /* ---- Phase A: NO phone -> copy + prompt with the share link ---- */
  const a = await page.evaluate(async () => {
    const p = (window.cacheProjects || []).find(x => x.id === 'P1');
    if (p) p.phone = '';
    window.__PROMPTS__ = []; window.__CLIP__ = [];
    const btn = document.getElementById('textSignBtn');
    btn && btn.click();
    await new Promise(r => setTimeout(r, 700));
    return { prompts: window.__PROMPTS__.slice(), clips: window.__CLIP__.slice() };
  });
  const aHasLink = [...a.prompts, ...a.clips].some(s => /\/api\/share\?t=/.test(s));
  chk('with no phone on file, the share link is offered (copy/prompt)', aHasLink === true,
      'prompts=' + JSON.stringify(a.prompts).slice(0, 120) + ' clips=' + JSON.stringify(a.clips).slice(0, 80));

  /* ---- Phase B: WITH phone -> sms branch (no prompt, no copy). Do this LAST
          because it assigns location.href = 'sms:…'. Capture the intent via
          a same-scope override installed just before the click. ---- */
  const errBefore = pageErrors.length;
  const b = await page.evaluate(async () => {
    const p = (window.cacheProjects || []).find(x => x.id === 'P1');
    if (p) p.phone = '937-555-0101';
    const row = (typeof currentDocRow === 'function') ? currentDocRow() : null;
    if (row) row.share_token = '';           // force the URL to be re-minted
    window.__PROMPTS__ = []; window.__CLIP__ = [];
    // capture the sms: navigation without letting it tear down the page
    window.__SMS__ = null;
    const a = document.createElement('a');
    const nativeClick = HTMLAnchorElement.prototype.click;
    // location.href can't be redefined; instead trap it via a beforeunload guard
    const guard = (e) => { };
    window.addEventListener('beforeunload', guard);
    let navUrl = null;
    const origAssign = window.location.assign ? window.location.assign.bind(window.location) : null;
    try { window.location.assign = u => { navUrl = String(u); }; } catch (e) {}
    // most robust: shadow the setter path the handler uses by stubbing document.location? not possible.
    const btn = document.getElementById('textSignBtn');
    let href0 = location.href;
    btn && btn.click();
    await new Promise(r => setTimeout(r, 700));
    let href1 = location.href;
    return { prompts: window.__PROMPTS__.slice(), clips: window.__CLIP__.slice(),
             navUrl, changed: href0 !== href1, href1: String(href1).slice(0, 12) };
  });
  const errAfter = pageErrors.length;
  const bTookSms = b.prompts.length === 0 && b.clips.length === 0 && (errAfter === errBefore);
  chk('with a phone on file, it takes the SMS branch (no copy/prompt, no error)', bTookSms === true,
      'prompts=' + b.prompts.length + ' clips=' + b.clips.length + ' newErr=' + (errAfter - errBefore) +
      (b.navUrl ? ' nav=' + b.navUrl.slice(0, 24) : '') + (b.changed ? ' href->' + b.href1 : ''));

  R = { ok: checks.every(c => c.pass) };
} catch (e) {
  console.error('gate_1141: harness threw:', String(e).split('\n')[0]);
  await browser.close();
  process.exit(1);
}
await browser.close();

if (pageErrors.length) console.log('  page errors:', pageErrors.slice(0, 4).join(' | '));
let ok = true;
for (const c of checks) { console.log(`  ${c.pass ? '✓' : '✗'} ${c.n}${c.d ? '  — ' + c.d : ''}`); if (!c.pass) ok = false; }
console.log(ok ? 'gate_1141 GREEN — proposal is signable and Text-to-sign works both ways' : 'gate_1141 RED');
process.exit(ok ? 0 : 1);
