/* gate_1181 — one light/dark button, the same one, in every portal.
 *
 * Theo: "Just make it just like retail and community, [insurance] doesn't have
 * to be the unique one, that's no good." Measured at 1180: retail and community
 * used #cr-dark-toggle floating at (372,832); insurance alone had .cr-ins-theme
 * in the banner. This asserts the SAME element, in the SAME place, on all three
 * — and that it flips the right palette in each, because the button is shared
 * but the theme systems underneath are genuinely two.
 *
 * Optional path arg -> negative control (1180 has insurance on its own button
 * and hides the shared one; must go RED). */
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

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

const look = () => page.evaluate(() => {
  const d = document.getElementById('cr-dark-toggle');
  const bx = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { shown: cs.display !== 'none' && r.width > 0, pos: cs.position,
             x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
             cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2), txt: (e.textContent||'').trim() }; };
  const insBtns = [...document.querySelectorAll('.cr-ins-theme')]
    .filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0);
  return { crm: document.body.dataset.crm || '', dark: bx(d), insBtnCount: insBtns.length,
           appTheme: document.documentElement.getAttribute('data-theme') || '',
           insTheme: document.body.getAttribute('data-rltheme') || '' };
});
async function go(p){
  await page.evaluate(() => window.CardinalFrontDoor.open());
  await page.waitForTimeout(400);
  await page.evaluate(x => { const r = document.querySelector(`#cr-fd .fdrow[data-fd="${x}"]`); if (r) r.click(); }, p);
  await page.waitForTimeout(1200);
}

await page.setViewportSize({ width: 440, height: 900 });
const seen = {};
for (const p of ['retail', 'community', 'insurance']) {
  await go(p);
  const s = await look();
  ok(s.crm === p, `on ${p} (crm=${s.crm})`);
  ok(!!s.dark && s.dark.shown, `${p}: the shared #cr-dark-toggle is on screen`);
  ok(s.insBtnCount === 0, `${p}: no separate insurance button is rendered (found ${s.insBtnCount})`);
  if (s.dark) seen[p] = `${s.dark.x},${s.dark.y},${s.dark.w},${s.dark.h},${s.dark.pos}`;
}
/* "just like retail and community" is a MEASUREMENT, not a feeling */
ok(seen.retail && seen.retail === seen.community && seen.community === seen.insurance,
   `the button is in the identical place in all three (retail ${seen.retail} | community ${seen.community} | insurance ${seen.insurance})`);

/* it must flip the RIGHT palette in each — a shared button over two real systems */
await go('insurance');
let s = await look();
const insBefore = s.insTheme, appBefore = s.appTheme;
await page.touchscreen.tap(s.dark.cx, s.dark.cy);
await page.waitForTimeout(700);
let after = await look();
ok(after.insTheme !== insBefore, `on insurance the tap flips the INSURANCE theme (${insBefore} -> ${after.insTheme})`);
ok(after.appTheme === appBefore, 'and it does NOT touch the app theme there');
ok(after.dark && after.dark.txt !== s.dark.txt, `the glyph reports insurance's own state (${s.dark.txt} -> ${after.dark.txt})`);
await page.touchscreen.tap(after.dark.cx, after.dark.cy);
await page.waitForTimeout(700);
after = await look();
ok(after.insTheme === insBefore, `and back again (${after.insTheme})`);

await go('retail');
s = await look();
const rAppBefore = s.appTheme, rInsBefore = s.insTheme;
await page.touchscreen.tap(s.dark.cx, s.dark.cy);
await page.waitForTimeout(700);
after = await look();
ok(after.appTheme !== rAppBefore, `on retail the same tap flips the APP theme ("${rAppBefore}" -> "${after.appTheme}")`);
ok(after.insTheme === rInsBefore, 'and it does NOT touch the insurance theme there');
await page.touchscreen.tap(after.dark.cx, after.dark.cy);
await page.waitForTimeout(700);

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
