/* gate_1174 — one door per destination. Boots the app with the mock, waits
 * for the menu builders (953's sectioned rows + cr-cpartners' tick loop),
 * then asserts: no .cr-dh-switch, exactly one Community Partners door in
 * markup (the sectioned one), exactly one "Switch portal" control, and the
 * surviving doors still work (Front Door opens from the row; the CP row
 * still routes). Optional path arg -> negative control (1173 must go RED). */
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 90000);
const ck = t => JSON.stringify({ lead: { claim_type: t } });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [{ id: 'p1', name: 'C One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('community'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' }],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
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
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
// go community so the cr-cpartners tick loop would want to append its row
await page.evaluate(() => { try { window.CardinalPortal.set('community', false); } catch (_) {} });
await page.waitForTimeout(1500);   // its interval ticks every ~800ms

const s = await page.evaluate(() => {
  const menu = document.getElementById('navMenu');
  const cp953 = document.getElementById('cr-nav-communitypartners');
  const cpOld = menu ? menu.querySelectorAll('.navopt[data-nav="community-partners"]').length : -1;
  const swIcon = document.querySelector('.cr-dh-switch');
  const switchRows = menu ? [...menu.querySelectorAll('button,[role="button"]')]
    .filter(b => !b.hasAttribute('aria-expanded') && /^switch portal$/i.test((b.textContent || b.getAttribute('aria-label') || '').trim())) : [];
  return { cp953: !!cp953, cpOld, swIcon: !!swIcon, switchRows: switchRows.length };
});
ok(!s.swIcon, 'the drawer-header switch icon is gone');
ok(s.cp953, "the 953 sectioned Community Partners row exists");
ok(s.cpOld === 0, 'no second appended Community Partners row (even hidden), got ' + s.cpOld);
ok(s.switchRows === 1, 'exactly one "Switch portal" control in the drawer, got ' + s.switchRows);

// the surviving doors still work
await page.evaluate(() => { const b = document.querySelector('#navMenu .navopt[data-nav="landing"]'); if (b) b.click(); });
await page.waitForTimeout(700);
ok(await page.evaluate(() => { try { return window.CardinalFrontDoor.isOpen(); } catch (_) { return false; } }),
  'the one switch row still opens the Front Door');
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
const cpWorks = await page.evaluate(() => {
  window.__cpOpened = 0;
  const o = window.CardinalCommunityPartners && window.CardinalCommunityPartners.openDirectory;
  if (!o) return 'no-module';
  window.CardinalCommunityPartners.openDirectory = function () { window.__cpOpened++; try { o.call(this); } catch (_) {} };
  const b = document.getElementById('cr-nav-communitypartners');
  if (!b) return 'no-row';
  b.click(); return 'clicked';
});
await page.waitForTimeout(500);
if (cpWorks === 'clicked')
  ok(await page.evaluate(() => window.__cpOpened === 1), 'the sectioned CP row still opens the directory');
else { fail++; bad.push('CP click drive failed: ' + cpWorks); }
ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
