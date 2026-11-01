// rig_1436.mjs — build 1436's render rig. Copies gate_1400_lib's approach (the sentinel
// production seed, the repo's own e2e mock) with three differences the Sun work needs:
//   1. the APPEARANCE is set through localStorage in an init script BEFORE boot —
//      never by reload, never by writing data-theme by hand (the app's 1s sweep
//      would undo a hand-set attribute, and a reload under a registered sw.js
//      comes back signed out);
//   2. sw.js is BLOCKED (aborted), so no service worker can answer a fetch;
//   3. phone = 390x844 with navigator.standalone=true (the installed app, so the
//      bottom tab bar renders the way it does on Scottie's phone); desktop = 1440x900.
// Personas: curtis / scottie / theo / nick via the sentinel setup's ?as= param.
// Real client names in the seed are scrubbed to sample names before anything renders.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
export const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const MOCK = fs.readFileSync(S + 'e2e_mock_supa.js', 'utf8');
const BASE = fs.readFileSync(S + 'sentinel_setup_cardinal.js', 'utf8');
const PROD = fs.readFileSync(S + 'sentinel_setup_production.js', 'utf8');
const EXTRA = fs.readFileSync(S + 'gate_1400_seed.js', 'utf8');
export const PROBE = fs.readFileSync(new URL('./probe_1436.js', import.meta.url), 'utf8');

const SCRUB = `(function(){
  var S = window.__SEED__; if(!S) return;
  var MAP = [
    ['Bob The Beast Deaton','Sample Client Three'], ['Robert W Deaton','Sample Contact Three'],
    ['Mark Diamond','Sample Client One'], ['Amanda Hoskins','Sample Client Two'],
    ['Kathy May','Sample Client Four'], ['Harold Bench','Sample Client Five'],
    ['Dena Whitmore','Sample Client Six'], ['Ray & Alma Fitch','Sample Client Seven'],
    ['Alberto Campuzano','Sample Crew Lead A'], ['Francisco Ramirez','Sample Crew Lead B'],
    ['Jamie & Robin','Sample Crew Leads C'], ['Betos Home Improvements','Sample Roofing Crew'],
    ['Jiminez Gutters','Sample Gutter Crew'], ['Pineda Siding','Sample Siding Crew'],
    ['Joan Dorion','Sample Admin'], ['Theo Dorion','Sample Owner'],
    ['7990 Germantown Pike','100 Sample Rd'], ['145 Rosemont Blvd','145 Sample Blvd'],
    ['212 Wayne Ave','212 Sample Ave'], ['48 Creekside Ct','48 Sample Ct'], ['990 Shroyer Rd','990 Sample Rd']
  ];
  function fix(s){ for (var i=0;i<MAP.length;i++) s = s.split(MAP[i][0]).join(MAP[i][1]); return s; }
  function walk(o){ if(!o||typeof o!=='object') return; for (var k in o){ var v=o[k];
    if (typeof v==='string') o[k]=fix(v); else walk(v); } }
  walk(S);
})();`;

let BROWSER = null;
export async function browser() {
  if (!BROWSER) BROWSER = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  return BROWSER;
}
export async function closeBrowser() { if (BROWSER) { await BROWSER.close(); BROWSER = null; } }

/* o.app: path to index.html · o.as · o.desktop · o.theme: undefined (no stored choice) | '0' | '1' | 'sun'
   o.text: undefined | 'md' | 'lg' | 'xl' */
export async function boot(o) {
  const APP = fs.readFileSync(o.app, 'utf8');
  const b = await browser();
  const ctx = await b.newContext(o.desktop
    ? { viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York' }
    : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const log = [];
  page.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  page.on('dialog', d => { log.push('DIALOG ' + d.message().slice(0, 120)); d.dismiss().catch(() => {}); });
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (/\/sw\.js(\?|$)/.test(url)) return route.abort();                    /* no service worker, ever */
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) { log.push('API ' + url.replace('https://app.cardinalroster.com', '')); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  /* appearance + text size, the app's OWN keys, before a single script of the app runs */
  await page.addInitScript(([theme, text, phone]) => {
    try {
      if (theme == null) localStorage.removeItem('cardinal.theme.rb'); else localStorage.setItem('cardinal.theme.rb', theme);
      if (text == null) localStorage.removeItem('cr-textsize'); else localStorage.setItem('cr-textsize', text);
    } catch (e) {}
    try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return new Promise(function () {}); }; } catch (e) {}
    if (phone) { try { Object.defineProperty(navigator, 'standalone', { configurable: true, get: function () { return true; } }); } catch (e) {} }
  }, [o.theme == null ? null : o.theme, o.text == null ? null : o.text, !o.desktop]);
  await page.addInitScript(BASE);
  await page.addInitScript(PROD);
  await page.addInitScript(EXTRA);
  await page.addInitScript(SCRUB);
  await page.addInitScript(MOCK);
  await page.addInitScript(PROBE);
  const q = o.as && o.as !== 'theo' ? '?as=' + o.as : '?as=theo';
  /* the box is shared with other builds' browsers: a 6.5 MB page can take far longer than
     Playwright's 30s default to parse under load, so wait for it, and retry once */
  for (let attempt = 0; ; attempt++) {
    try { await page.goto('https://app.cardinalroster.com/' + q, { waitUntil: 'domcontentloaded', timeout: 150000 }); break; }
    catch (e) { if (attempt >= 1) { await ctx.close().catch(() => {}); throw e; } }
  }
  /* signed in = the role mirror has run (cr-prod for production) or the main view is up */
  await page.waitForFunction(() => { const m = document.getElementById('mainView'); return !!(m && m.style.display === 'block' && window.CardinalProduction && window.CardinalRBTheme); }, null, { timeout: 60000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(o.wait || 1800);
  return { ctx, page, log, close: () => ctx.close() };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── the covered screens. Each returns the CSS selector(s) whose text is scored. ── */
const LEAVE = `(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } });
  document.body.classList.remove('cr-drawer-open','cr-drawer-lift'); const m = document.getElementById('navMenu'); if (m) m.classList.remove('open','show');
  try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {} })()`;
const until = (page, fn, arg, ms = 12000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 150 }).catch(() => {});
async function prodOpen(page) { await page.evaluate(LEAVE); await page.evaluate(() => window.CardinalProduction.open());
  await until(page, () => { const v = document.getElementById('cr-pb'); return !!(v && v.classList.contains('open') && v.querySelector('[data-day]')); }); await sleep(700); }
async function shown(page, sel) { await until(page, s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length && e.getBoundingClientRect().height > 40 && e.getBoundingClientRect().left > -50), sel); await sleep(500); }

export const STATES = {
  board: { scope: '#cr-pb', run: async page => { await prodOpen(page); } },
  daysheet: { scope: '#cr-pb-modal', run: async page => {
    await prodOpen(page);
    const ok = await page.evaluate(() => { const b = [...document.querySelectorAll('#cr-pb [data-day]')].find(e => e.getClientRects().length); if (!b) return false; b.click(); return true; });
    if (!ok) throw new Error('no [data-day] on the board');
    await until(page, () => !!document.querySelector('#cr-pb-modal.open .pbdaysheet')); await sleep(500);
    const open = await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); return !!(m && m.getClientRects().length && m.querySelector('.pbdaysheet')); });
    if (!open) throw new Error('day sheet did not open');
  } },
  calendar: { scope: '#cr-pb', run: async page => {
    await prodOpen(page);
    const ok = await page.evaluate(() => { const g = document.querySelector('#cr-pb [data-go="cal"]'); if (!g) return false; g.click(); return true; });
    if (!ok) throw new Error('[data-go=cal] missing'); await until(page, () => !!document.querySelector('#cr-pb .pbcal, #cr-pb .pbmonth')); await sleep(800);
  } },
  box: { scope: '#cr-pb', run: async page => {
    await prodOpen(page);
    const ok = await page.evaluate(() => { const b = document.querySelector('#cr-pb [data-box]'); if (!b) return false; b.click(); return true; });
    if (!ok) throw new Error('[data-box] missing'); await until(page, () => !!document.querySelector('#cr-pb .pbjob, #cr-pb .pbitem')); await sleep(800);
  } },
  punchlist: { scope: '#punchView', run: async page => { await page.evaluate(LEAVE); await page.evaluate(() => window.openPunchView()); await until(page, () => !!document.querySelector('#punchView .pl-row, #punchView .pu-tab')); await sleep(800); } },
  punchcard: { scope: '#cr-pk', run: async page => {
    await page.evaluate(LEAVE); await page.evaluate(() => window.CardinalPunchCard.open('i6', { back: 'production' })); await until(page, () => !!document.querySelector('#cr-pk .pkslot')); await sleep(800);
  } },
  dispatch: { scope: '#cr-disp', run: async page => { await page.evaluate(LEAVE); await page.evaluate(() => window.CardinalDispatch.open()); await until(page, () => !!document.querySelector('#cr-disp .crewc')); await sleep(800); } },
  drawer: { scope: '#navMenu, #cr-lnav', run: async page => {
    await prodOpen(page);
    await page.evaluate(() => { const b = document.getElementById('navBtn') || document.querySelector('[data-pwa-tab="menu"]'); if (b) b.click(); });
    await shown(page, '#navMenu .navopt');
  } },
  tabbar: { scope: '#pwaNav', run: async page => { await prodOpen(page); } },
  header: { scope: '#cr-hd2-bar, #cr-hd2', desktopOnly: true, run: async page => { await prodOpen(page); } },
  toast: { scope: '#crToasts', run: async page => {
    await prodOpen(page);
    await page.evaluate(() => { window.crTell('Saved — sample', 'ok'); window.crTell('Could not save — sample', 'err'); window.crTell('Heads up — sample', 'info'); });
    await until(page, () => document.querySelectorAll('#crToasts .crt').length >= 3); await sleep(400);
  } },
  ask: { scope: '#crAsk', run: async page => {
    await prodOpen(page);
    await page.evaluate(() => { window.__askP = window.crAsk('Mark this punch-out done?\n\nThe crew will be told.', { ok: 'Mark done', cancel: 'Not yet' }); });
    await until(page, () => !!document.querySelector('#crAsk.open .askcard')); await sleep(400);
  } }
};
