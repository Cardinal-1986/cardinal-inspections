/* gate_1176 — the header's right-hand group is on the RIGHT again, and Insurance
 * has exactly one light/dark control.
 *
 * Reproduces Theo's 30 Aug screenshots in a real engine at 440px, the width his
 * phone actually reports — every earlier header gate ran at 390px, where the
 * <=430px media query hides this entirely. THAT is why 1173 shipped it: the bug
 * only exists above the breakpoint, and nothing here had ever looked there.
 *
 * Optional path arg -> negative control (1175 packs + and lens against the
 * burger and floats a second theme button inside Insurance; must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, waitForSoft, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 150000);

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, name, stage, type) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: ck(type), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1','R Lead','Lead','retail'), P('r2','R Pro','Prospect','retail'),
    P('c1','C One','Lead','community'), P('c2','C Two','Lead','community'), P('c3','C Three','Lead','community'),
    P('i1','I One','Lead','insurance')],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
/* was a fixed 3.5-second sleep — a guess. Measured on the shipped tree: the app
   is fully booted at 555ms, so that was six times too long AND still unsafe
   under load. waitAppReady polls real signals and throws naming the stuck one. */
await waitAppReady(page);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} try { hideAllViews(); showHome(); } catch (_) {} });
/* ⚠ waitForSoft, NOT waitFor. Not every gate's flow lands on the home board, so
   a THROWING predicate here killed gate_1176 outright on the first attempt —
   the helper was right and the predicate was wrong, but the gate crashed
   instead of reporting (BUG_CLASSES 37). This degrades to a bounded wait. */
await waitForSoft(page, () => document.querySelectorAll('.pipecard').length >= 3);
await settle(page);
await page.waitForTimeout(800);

const state = () => page.evaluate(() => {
  const bar = document.getElementById('cr-hd2-bar');
  const cs = bar ? getComputedStyle(bar) : null;
  const site = document.querySelector('header.site');
  const pipe = {};
  document.querySelectorAll('#pipeRow .pipebtn').forEach(b => {
    pipe[b.getAttribute('data-stg')] = (b.querySelector('.pcount') || {}).textContent;
  });
  // header bar children in visual order, with their rendered label + x position
  const kids = bar ? [...bar.children].map(el => {
    const r = el.getBoundingClientRect();
    return { id: el.id || '', cls: el.className || '', txt: (el.textContent || '').trim().slice(0, 14),
             x: Math.round(r.x), w: Math.round(r.width), vis: getComputedStyle(el).display !== 'none' && r.width > 0 };
  }).filter(k => k.vis) : [];
  const dark = document.getElementById('cr-dark-toggle');
  const dr = dark ? dark.getBoundingClientRect() : null;
  const ins = document.querySelector('.cr-ins-theme');
  const ir = ins ? ins.getBoundingClientRect() : null;
  return {
    crm: document.body.dataset.crm || '', head: document.body.dataset.crmHead || '',
    h1: (document.querySelector('#brandTitle h1') || {}).textContent || '',
    siteBg: site ? getComputedStyle(site).background.slice(0, 60) : '',
    barBg: cs ? cs.backgroundColor : '',
    pipe, kids,
    darkToggle: dark ? { shown: getComputedStyle(dark).display !== 'none', pos: getComputedStyle(dark).position,
                         x: Math.round(dr.x), y: Math.round(dr.y), txt: dark.textContent.trim() } : null,
    insTheme: ins ? { shown: getComputedStyle(ins).display !== 'none', x: Math.round(ir.x), w: Math.round(ir.width),
                      txt: JSON.stringify(ins.textContent), color: getComputedStyle(ins).color } : null,
    srchOpen: document.body.classList.contains('cr-srch-open')
  };
});

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

await page.setViewportSize({ width: 440, height: 900 });
await page.waitForTimeout(700);

// ---- 1. RETAIL at 440px: + and lens sit right of the title, not left of it
let s = await state();
const byId = (st, id) => st.kids.find(k => k.id === id);
let plus = byId(s, 'addProjectBtn'), lens = byId(s, 'cr-hd2-lens'), burger = byId(s, 'navBtn'), mid = byId(s, 'cr-hd2-mid');
ok(!!plus && !!lens && !!burger && !!mid, 'header has burger, +, lens and the title');
if (plus && lens && burger && mid) {
  ok(plus.x > mid.x, `+ is right of the title (plus@${plus.x} vs title@${mid.x})`);
  ok(lens.x > plus.x, `lens is right of + (lens@${lens.x} vs plus@${plus.x})`);
  ok(plus.x > 220, `+ is on the RIGHT half of a 440px bar (x=${plus.x})`);
  ok(lens.x + lens.w > 380, `lens reaches the right edge (right edge=${lens.x + lens.w})`);
  ok(mid.x + mid.w <= plus.x + 1, `the title clears the right group (title ends ${mid.x + mid.w}, + starts ${plus.x})`);
}

// ---- 2. the <=430px layout is UNTOUCHED (the auto margin must not reach it)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
let s390 = await state();
let p390 = byId(s390, 'addProjectBtn'), l390 = byId(s390, 'cr-hd2-lens'), m390 = byId(s390, 'cr-hd2-mid');
ok(!!p390 && !!l390 && !!m390 && p390.x > m390.x && l390.x > p390.x,
   `390px still orders title, +, lens (title@${m390 && m390.x} +@${p390 && p390.x} lens@${l390 && l390.x})`);
ok(!!m390 && m390.w > 120, `390px title still grows to fill (w=${m390 && m390.w}) — the auto margin did not leak below the breakpoint`);

// ---- 3. INSURANCE at 440px: exactly ONE light/dark control, and it is visible
await page.setViewportSize({ width: 440, height: 900 });
await page.waitForTimeout(400);
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="insurance"]'); if (r) r.click(); });
await page.waitForTimeout(1200);
s = await state();
ok(s.crm === 'insurance', 'on insurance (crm=' + s.crm + ')');
/* ⚠ SUPERSEDED BY 1181, and these are removed rather than "fixed". 1176
   asserted that insurance showed its OWN moon in the header and that the shared
   floating toggle was hidden there. Theo reversed exactly that at 1181 — "it
   doesn't have to be the unique one" — so the insurance-only button is retired
   and the shared toggle is the control everywhere. Asserting the old shape here
   would make this gate demand the very thing the next build deleted, which is
   how a stale test starts dictating the app. gate_1181 owns the light/dark
   question now; what stays below is 1176's OWN subject, the header layout. */
const themeCount = await page.evaluate(() => {
  const vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  let n = 0;
  document.querySelectorAll('.cr-ins-theme').forEach(e => { if (vis(e)) n++; });
  const d = document.getElementById('cr-dark-toggle'); if (vis(d)) n++;
  return n;
});
ok(themeCount === 1, 'exactly ONE light/dark control on the insurance screen (got ' + themeCount + ')');

/* the ink assertion that sat here went with the control it measured — see the
   note above. The "exactly one light/dark control" check below is kept, because
   that invariant SURVIVED the reversal: 1176 satisfied it with the module's own
   button, 1181 satisfies it with the shared one, and either way two would be a
   defect. An assertion that outlives the implementation it was written against
   is the one worth keeping. */

// ---- 4. retail keeps its floating toggle (this build narrowed insurance only)
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="retail"]'); if (r) r.click(); });
await page.waitForTimeout(1100);
s = await state();
ok(s.crm === 'retail' && !!s.darkToggle && s.darkToggle.shown,
   'retail still has its light/dark control (crm=' + s.crm + ', shown=' + (s.darkToggle && s.darkToggle.shown) + ')');

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
