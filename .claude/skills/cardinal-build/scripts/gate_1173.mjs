/* gate_1173 — the numbers stop wandering. Reproduces Theo's round trip in a
 * real engine: home -> Community hub -> home, home -> Cardinal Truth -> home,
 * asserting after every leg that the pipeline counts EXACTLY the book of the
 * portal the header names, and that two reads 700ms apart are identical.
 * Also: the ⌂ home button is gone. Optional path arg -> negative control
 * (1172 paints the outgoing portal's book under the Retail header, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(path.join(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 120000);

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, name, stage, type) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: ck(type), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    P('r1', 'R Lead', 'Lead', 'retail'), P('r2', 'R Prospect', 'Prospect', 'retail'),
    P('c1', 'C One', 'Lead', 'community'), P('c2', 'C Two', 'Lead', 'community'), P('c3', 'C Three', 'Lead', 'community'),
    P('i1', 'I One', 'Lead', 'insurance')
  ],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};
const BOOK = { retail: { Lead: 1, Prospect: 1 }, community: { Lead: 3 }, insurance: { Lead: 1 } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
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

const boardState = () => page.evaluate(() => {
  const pipe = {};
  document.querySelectorAll('#pipeRow .pipebtn').forEach(b => {
    pipe[b.getAttribute('data-stg')] = parseInt(b.querySelector('.pcount').textContent, 10);
  });
  return { pipe, crm: document.body.dataset.crm || 'retail',
           h1: (document.querySelector('#brandTitle h1') || {}).textContent || '',
           mainShown: (() => { const m = document.getElementById('mainView'); return !!m && m.style.display !== 'none'; })() };
});
function coherent(s, leg) {
  const want = BOOK[s.crm] || {};
  const lead = want.Lead || 0, pro = want.Prospect || 0;
  ok(s.pipe.Lead === lead && s.pipe.Prospect === pro,
    leg + ': board matches the ' + s.crm + ' book (want L' + lead + '/P' + pro + ', got L' + s.pipe.Lead + '/P' + s.pipe.Prospect + ') under header "' + s.h1 + '"');
}

// leg 0: at rest
coherent(await boardState(), 'rest');

// leg 1: Theo's repro — Community, then back to retail through the Front Door door
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('#cr-fd .fdrow[data-fd="community"]').click());
await page.waitForTimeout(900);
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('#cr-fd .fdrow[data-fd="retail"]').click());
await page.waitForTimeout(900);
let s = await boardState();
ok(s.mainShown, 'back on the home after the Community round trip');
coherent(s, 'after Community round trip');
const again = await (async () => { await page.waitForTimeout(700); return boardState(); })();
ok(JSON.stringify(again.pipe) === JSON.stringify(s.pipe), 'numbers hold still across 700ms (got ' + JSON.stringify(again.pipe) + ' vs ' + JSON.stringify(s.pipe) + ')');

// leg 2: Cardinal Truth and back
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('#cr-fd .fdrow[data-fd="insurance"]').click());
await page.waitForTimeout(900);
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('#cr-fd .fdrow[data-fd="retail"]').click());
await page.waitForTimeout(900);
s = await boardState();
coherent(s, 'after Cardinal Truth round trip');
ok(/retail/i.test(s.crm) && /Retail/.test(s.h1), 'header and stamp agree on retail (crm=' + s.crm + ', h1=' + s.h1 + ')');

// leg 3: the torn path — land on home with NO portal claim (a hub exit shape)
await page.evaluate(() => { try { window.CardinalPortal.set('community', false); } catch (_) {} });
await page.waitForTimeout(300);
await page.evaluate(() => { hideAllViews(); showHome(); });
await page.waitForTimeout(900);
s = await boardState();
coherent(s, 'home reached without a portal claim');

// the ⌂ is gone
const home = await page.evaluate(() => !!document.getElementById('cr-hd2-home'));
ok(!home, 'the header home button no longer exists');

ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
