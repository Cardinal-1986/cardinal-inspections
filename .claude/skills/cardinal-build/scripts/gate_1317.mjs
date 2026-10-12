/* gate_1317 — Scottie stays in Production; Curtis keeps everything.
 *   A  Scottie signs in to the Production hub and carries body.cr-field; Curtis does not
 *   B  as Scottie: showHome(), goToLanding() and a Back to "clients" all land on the Production hub
 *   C  as Scottie: openProject() opens no client profile and says why
 *   D  as Scottie: the Front Door does not open; banner, CRM switch, searches, + New are not on screen
 *   E  as Scottie: the menu offers only Production Board, Crew Dispatch, Punch List, Notifications
 *   F  as Curtis: showHome() shows the home, openProject() opens the profile, the Front Door opens
 * Arg: [index.html] -> negative control (1316: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' },
                  { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' }],
  projects: [{ id: 'p1', name: 'Dana Test', stage: 'Scheduled', address: '1 Main St', phone: '9375550101', email: '', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.waitForTimeout(1500); await settle(page);
  return { ctx, page };
}

const hubOpen = page => page.evaluate(() => { const h = document.getElementById('cr-pb'); return !!(h && h.classList.contains('open')); });
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; }, sel);
try {
  let { ctx, page } = await boot('scottie@cardinalrenovations.net', false);
  /* the rig signs in after its own boot; run the sign-in landing (showMain) as the app does */
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} }); await page.waitForTimeout(900);
  const s = await page.evaluate(() => ({ field: document.body.classList.contains('cr-field'), prod: document.body.classList.contains('cr-prod') }));
  ok(s.field && s.prod && await hubOpen(page), 'A  Scottie: lands on the Production hub, body.cr-field', JSON.stringify(s));
  await page.evaluate(() => { try { window.CardinalProduction && document.getElementById('cr-pb').classList.remove('open'); } catch (_) {} showHome(); });
  await page.waitForTimeout(600);
  const b1 = await hubOpen(page) && !(await vis(page, '#mainView'));
  await page.evaluate(() => { document.getElementById('cr-pb').classList.remove('open'); goToLanding(); });
  await page.waitForTimeout(600);
  const b2 = await hubOpen(page) && !(await page.evaluate(() => { const f = document.getElementById('cr-fd'); return !!(f && f.classList.contains('open')); }));
  await page.evaluate(() => { document.getElementById('cr-pb').classList.remove('open'); window.dispatchEvent(new PopStateEvent('popstate', { state: { app: 'cardinal-nav', view: 'clients', data: null } })); });
  await page.waitForTimeout(900);
  const b3 = await hubOpen(page);
  ok(b1 && b2 && b3, 'B  Scottie: showHome, goToLanding and Back-to-clients all land on Production', JSON.stringify({ showHome: b1, landing: b2, back: b3 }));
  const c = await page.evaluate(async () => { const told = []; const k = window.crTell; window.crTell = t => told.push(String(t)); openProject('p1'); await new Promise(r => setTimeout(r, 400)); window.crTell = k;
    const pv = document.getElementById('projectView'); return { pv: !!(pv && getComputedStyle(pv).display !== 'none'), told: told.join(' | ') }; });
  ok(!c.pv && /punch card/i.test(c.told), 'C  Scottie: openProject opens no profile and points to the punch card', JSON.stringify(c));
  const d = await page.evaluate(() => { try { window.CardinalFrontDoor.open(); } catch (_) {} const f = document.getElementById('cr-fd'); return !!(f && f.classList.contains('open')); });
  const doors = {}; for (const sel of ['#crBanner', '#cbCrm', '#cbSearch', '#headSearch', '#newWrap']) doors[sel] = await vis(page, sel);
  ok(!d && Object.values(doors).every(v => !v), 'D  Scottie: no Front Door, no banner, CRM switch, searches or + New', JSON.stringify({ frontDoor: d, doors }));
  /* The menu module hides rows per portal and folds sections (accordion), so a computed
     display says nothing about THIS build. Ask the browser which rows the 1317 rule hides:
     the rule must be in the live stylesheets, and the rows it leaves are the field menu. */
  const m = await page.evaluate(() => {
    let rule = null;
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (_) { continue; }
      for (const r of rs) if (r.selectorText && r.selectorText.indexOf('body.cr-field #navMenu .navopt:not(') === 0) rule = r.selectorText; }
    if (!rule) return { rule: false };
    const left = [...document.querySelectorAll('#navMenu .navopt')].filter(b => !b.matches(rule)).map(b => b.getAttribute('data-nav') || b.id).filter(Boolean).sort();
    return { rule: true, left };
  });
  ok(m.rule && JSON.stringify(m.left) === JSON.stringify(['dispatch', 'notify', 'prodboard', 'punch']), 'E  Scottie: the menu keeps only Production Board, Dispatch, Punch List, Notifications', JSON.stringify(m));
  /* …and what he actually sees when he opens the drawer (sections are a flat list for him) */
  const real = await page.evaluate(async () => { document.getElementById('navBtn').click(); await new Promise(r => setTimeout(r, 600));
    const rows = [...document.querySelectorAll('#navMenu .navopt')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.getAttribute('data-nav')).sort();
    const ts = !!document.querySelector('#navMenu .cr-ts') && getComputedStyle(document.querySelector('#navMenu .cr-ts')).display !== 'none';
    return { rows, ts }; });
  ok(JSON.stringify(real.rows) === JSON.stringify(['dispatch', 'notify', 'prodboard', 'punch']) && real.ts, 'E  Scottie opens the menu: those four rows and Text size, nothing folded away', JSON.stringify(real));
  await ctx.close();

  ({ ctx, page } = await boot('curtis@cardinalrenovations.net', false));
  const f = await page.evaluate(async () => {
    const o = { field: document.body.classList.contains('cr-field') };
    try { document.getElementById('cr-pb') && document.getElementById('cr-pb').classList.remove('open'); } catch (_) {}
    showHome(); await new Promise(r => setTimeout(r, 500));
    const mv = document.getElementById('mainView'); o.home = !!(mv && getComputedStyle(mv).display !== 'none');
    openProject('p1'); await new Promise(r => setTimeout(r, 800));
    const pv = document.getElementById('projectView'); o.profile = !!(pv && getComputedStyle(pv).display !== 'none');
    try { window.CardinalFrontDoor.open(); } catch (_) {}
    const fd = document.getElementById('cr-fd'); o.fd = !!(fd && fd.classList.contains('open'));
    o.menu = [...document.querySelectorAll('#navMenu .navopt')].filter(b => b.matches('body.cr-field #navMenu .navopt')).length;   /* rows the field lock touches: none */
    return o; });
  await ctx.close();
  ok(!f.field && f.home && f.profile && f.fd && f.menu === 0, 'F  Curtis: home, client profile, Front Door all work, and the field lock touches none of his menu', JSON.stringify(f));
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1317: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
