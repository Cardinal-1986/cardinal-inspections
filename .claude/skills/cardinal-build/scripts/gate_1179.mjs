/* gate_1179 — the Community home is one attention list, and the tabs are doors.
 *
 * Theo picked option 3 from the preview and asked for the tabs to become doors.
 * The risk this build carries is BUG_CLASSES 16: the door dispatch was scoped to
 * '.tabbar [data-pane]' and the doors live in the home pane, so left alone every
 * door would render perfectly and do nothing. So this gate drives REAL TAPS at
 * real coordinates (class 71's rule), never the exported function.
 *
 * Optional path arg -> negative control (1178 still has three tabs and no
 * attention list; must go RED). */
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

async function intoCommunity(){
  await page.evaluate(() => window.CardinalFrontDoor.open());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="community"]'); if (r) r.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const h = window.CardinalCommunityHub; if (h && h.show) h.show(); });
  await page.waitForTimeout(1200);
}
const look = () => page.evaluate(() => {
  const host = document.getElementById('cr-ch2');
  const vis = el => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  const onPane = [...(host ? host.querySelectorAll('[data-pane].on') : [])].map(e => e.getAttribute('data-pane'));
  const doors = [...(host ? host.querySelectorAll('.cc-door') : [])].map(d => {
    const r = d.getBoundingClientRect();
    return { pane: d.getAttribute('data-pane'), label: (d.querySelector('b')||{}).textContent || '',
             x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), h: Math.round(r.height),
             vis: vis(d) };
  });
  return {
    exists: !!host,
    onPane,
    doors,
    tabs: [...(host ? host.querySelectorAll('.tabbar [data-pane]') : [])]
            .map(b => (b.textContent||'').trim()).filter(t => /Clients|Estimates|Partners/.test(t)),
    attn: !!(host && host.querySelector('.cc-acard')),
    groups: [...(host ? host.querySelectorAll('.cc-aqh') : [])].map(e => e.textContent.trim()),
    rows: host ? host.querySelectorAll('.cc-arow').length : 0,
    srchFirst: !!(host && host.querySelector('[data-pane="home"] > :first-child .cc-srch, [data-pane="home"] > .cc-srch')),
    back: !!(host && host.querySelector('.cc-back'))
  };
});

await page.setViewportSize({ width: 390, height: 844 });
await intoCommunity();
let s = await look();
ok(s.exists, 'the Community hub rendered');
ok(s.onPane.includes('home'), 'it lands on the HOME pane, not the client table (on: ' + s.onPane.join(',') + ')');
ok(s.tabs.length === 0, 'the three tabs are gone from the strip (found: ' + s.tabs.join(', ') + ')');
ok(s.attn, 'the attention list card is on screen');
ok(s.srchFirst, 'the search bar keeps the top line (option 3)');
ok(!s.back, 'no Back control on the home — there is nothing above it');
ok(s.doors.length === 3, 'three doors: Clients, Estimates, Partners (got ' + s.doors.length + ')');
ok(s.doors.every(d => d.vis && d.h >= 44), 'every door is visible and clears the 44px touch floor');

// ---- the whole point: a REAL TAP on each door must change the pane
for (const want of ['clients', 'bids', 'partners']) {
  s = await look();
  const door = s.doors.find(d => d.pane === want);
  if (!door) { ok(false, 'no door for ' + want); continue; }
  await page.touchscreen.tap(door.x, door.y);
  await page.waitForTimeout(700);
  let after = await look();
  ok(after.onPane.includes(want), `tapping the ${want} door actually opens it (on: ${after.onPane.join(',')})`);
  ok(after.back, `${want} shows a Back control`);
  // and Back returns home
  const bk = await page.evaluate(() => {
    const b = document.querySelector('#cr-ch2 .cc-back'); if (!b) return null;
    const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  });
  if (bk) { await page.touchscreen.tap(bk.x, bk.y); await page.waitForTimeout(700); }
  after = await look();
  ok(after.onPane.includes('home'), `Back from ${want} returns to the home (on: ${after.onPane.join(',')})`);
}

// ---- tarps rode into the attention list rather than becoming a fourth door
s = await look();
ok(!s.doors.some(d => /tarp/i.test(d.label)), 'Tarps did NOT become a fourth door');
ok(s.groups.length >= 1, 'the attention list has grouped queues (' + s.groups.join(' / ') + ')');

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
