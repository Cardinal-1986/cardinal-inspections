/* gate_1178 — the header names the portal you are actually in.
 *
 * Reproduces Theo's 30 Aug report — "The community header appeared as I logged
 * in" — by seeding the sticky portal to community and booting fresh, which is
 * exactly his state: last used Community, then signed in.
 *
 * This is the SECOND time this shipped. Build 1087 fixed it by keying on
 * #landingView being visible; 1165 retired the Landing, so that guard has been
 * unable to fire ever since and nothing said so. Hence the last two assertions:
 * the guard must be anchored to something that still EXISTS on the screen.
 *
 * Optional path arg -> negative control (1177 shows a Community header over the
 * retail board at sign-in; must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
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
await page.addInitScript(() => {
  try { localStorage.setItem('cardinal.portal.theo@cardinalrenovations.net', 'community'); } catch (e) {}
});
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);


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

const show = (label, s) => {
  console.log(`\n── ${label}`);
  console.log(`   crm=${s.crm}  crmHead=${s.head}  title="${s.h1}"  barBg=${s.barBg}`);
  console.log(`   pipe=${JSON.stringify(s.pipe)}  searchRowOpen=${s.srchOpen}`);
  console.log(`   header children L→R: ` + s.kids.map(k => `${k.id || k.cls}@${k.x}w${k.w}"${k.txt}"`).join('  '));
  console.log(`   #cr-dark-toggle: ${JSON.stringify(s.darkToggle)}`);
  console.log(`   .cr-ins-theme:   ${JSON.stringify(s.insTheme)}`);
};

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

await page.setViewportSize({ width: 440, height: 900 });
await page.waitForTimeout(900);

// ---- 1. Theo's report: fresh sign-in with community as the last-used portal
const s0 = await state();
ok(s0.crm === s0.head,
  `at sign-in the header names the portal the body is in (body="${s0.crm}", header="${s0.head}", title="${s0.h1}")`);
ok(/retail/i.test(s0.head), `the sign-in header is retail, not the last-used portal (got "${s0.head}")`);
ok(!/Community/i.test(s0.h1), `the title does not say Community over the retail board (got "${s0.h1}")`);

// ---- 2. the guard must key on something that still exists (the 1165 lesson)
const anchors = await page.evaluate(() => {
  const l = document.getElementById('landingView'), m = document.getElementById('mainView');
  return { landingShown: !!l && getComputedStyle(l).display !== 'none',
           mainShown: !!m && getComputedStyle(m).display !== 'none' };
});
ok(anchors.landingShown === false, 'the Landing is still retired (its guard cannot fire — that is the bug being fixed, not a regression)');
ok(anchors.mainShown === true, 'the dashboard IS on screen at sign-in — the anchor the new guard uses is real');

// ---- 3. switching portals must still name them (the fix must not pin retail)
for (const portal of ['community', 'insurance', 'retail']) {
  await page.evaluate(() => window.CardinalFrontDoor.open());
  await page.waitForTimeout(400);
  await page.evaluate(p => { const r = document.querySelector(`#cr-fd .fdrow[data-fd="${p}"]`); if (r) r.click(); }, portal);
  await page.waitForTimeout(1100);
  const s = await state();
  ok(s.head === portal, `after choosing ${portal} the header says ${portal} (got "${s.head}", title "${s.h1}")`);
  ok(s.crm === s.head, `${portal}: header and board still agree (body="${s.crm}", header="${s.head}")`);
}

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
