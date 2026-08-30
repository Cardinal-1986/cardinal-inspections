/* gate_1180 — the Insurance light/dark sits one row down, in the banner.
 *
 * Theo, on 1176's fix: "Still off, the light dark should be one row down."
 * Measured at 440px on the 1179 tree: the moon was in #cr-hd2-bar at y=10; the
 * banner strip (#crBanner) is at y=65.
 *
 * ⚠ The assertion that matters most is REACHABILITY, not position. Build 804
 * moved this button out of #cr-hd2-srch precisely because that row is collapsed
 * by default, so it rendered into something nobody could reach and has no
 * floating fallback. This gate proves the new host is actually displayed and
 * that a real tap on it flips the theme.
 *
 * Optional path arg -> negative control (1179 has it in the bar; must go RED). */
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
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} try { hideAllViews(); showHome(); } catch (_) {} });
await page.waitForTimeout(800);

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

await page.setViewportSize({ width: 440, height: 900 });
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="insurance"]'); if (r) r.click(); });
await page.waitForTimeout(1300);

const look = () => page.evaluate(() => {
  const m = document.querySelector('.cr-ins-theme');
  const bar = document.getElementById('cr-hd2-bar');
  const ban = document.getElementById('crBanner');
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
             x: Math.round(r.x), cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2),
             shown: getComputedStyle(e).display !== 'none' && r.width > 0 }; };
  return {
    crm: document.body.dataset.crm || '',
    moon: box(m), bar: box(bar), banner: box(ban),
    inBanner: !!(m && ban && ban.contains(m)),
    inBar: !!(m && bar && bar.contains(m)),
    bannerShown: !!(ban && getComputedStyle(ban).display !== 'none'),
    txt: m ? m.textContent.trim() : '',
    theme: document.body.getAttribute('data-rltheme') || ''
  };
});

let s = await look();
ok(s.crm === 'insurance', 'on insurance (crm=' + s.crm + ')');
ok(!!s.moon && s.moon.shown, 'the light/dark control is on screen');
ok(s.inBanner, 'it lives in #crBanner, the row under the bar');
ok(!s.inBar, 'it is NO LONGER in #cr-hd2-bar');

/* the 804 trap, asserted directly: the host must actually be displayed */
ok(s.bannerShown, 'the banner row is DISPLAYED — not the collapsed-row mistake of 804');
ok(!!s.moon && !!s.bar && s.moon.y >= s.bar.h - 2,
   `it sits BELOW the bar (moon y=${s.moon && s.moon.y}, bar height=${s.bar && s.bar.h})`);
ok(!!s.moon && !!s.banner && Math.abs(s.moon.cy - (s.banner.y + s.banner.h / 2)) <= 14,
   'it is vertically centred in the banner row');
ok(!!s.moon && s.moon.h >= 44 && s.moon.w >= 44,
   `it clears the 44px touch floor (${s.moon && s.moon.w}x${s.moon && s.moon.h})`);
ok(!!s.moon && !!s.banner && (s.moon.x + s.moon.w) >= (s.banner.x + s.banner.w - 60),
   'it is pushed to the right end of the row');

/* it must still WORK — a real tap, never the exported function (class 71) */
const before = s.theme;
await page.touchscreen.tap(s.moon.cx, s.moon.cy);
await page.waitForTimeout(600);
let after = await look();
ok(after.theme && after.theme !== before,
   `a real tap flips the insurance theme (${before} -> ${after.theme})`);
await page.touchscreen.tap(after.moon.cx, after.moon.cy);
await page.waitForTimeout(600);
after = await look();
ok(after.theme === before, `and tapping again flips it back (now ${after.theme})`);

/* and it stays insurance-only */
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="retail"]'); if (r) r.click(); });
await page.waitForTimeout(1100);
s = await look();
ok(!s.moon || !s.moon.shown, 'it is hidden outside insurance (crm=' + s.crm + ')');

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
