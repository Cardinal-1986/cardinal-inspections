/* Reproduce Theo's punch-out screen: admin, iPhone width, the item from the shot. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
import { readFileSync } from 'fs';
const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const SHOT = process.argv[3] || null;
const W = Number(process.argv[4] || 402);
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

const SEED = {
  projects: [{ id: 'p-1', name: 'James Tiege', stage: 'Approved', address: '2205 Rosemont Blvd, Dayton, OH 45420',
    claim_type: 'retail', checklist: '{}', created_at: '2026-08-13T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  punch_items: [{ id: 'pi-1', project_id: 'p-1', title: 'Wood replacement', detail: 'Needs wood left side',
    priority: 'high', status: 'open', template: 'roof', steps: [], photos: [], comments: [],
    assigned_to: null, scheduled_at: null, created_at: '2026-08-13T10:05:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], project_photos: [], appointments: [], team_profiles: [],
  pricing_items: [], pricing_categories: [], oc_colors: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'font' || rt === 'media') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
});
await page.evaluate(() => window.CardinalPunchCard && window.CardinalPunchCard.open('pi-1'));
await page.waitForTimeout(1800);

let pass=0, fail=0;
const ok=(n,c,x)=>{ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n+(x!==undefined?'  — '+x:''));} };
console.log('gate_787 on '+FILE);

console.log('\n--- 1. everyone on the team can be tagged ---');
const chips = await page.evaluate(() => [...document.querySelectorAll('#cr-pk .pktag')].map(b=>b.textContent.trim()));
ok('@Curtis is offered', chips.includes('@Curtis'), JSON.stringify(chips));
ok('@Scottie is offered', chips.includes('@Scottie'), JSON.stringify(chips));
ok('everyone but me is offered (7 of the 8-person roster)', chips.length === 7, chips.length + ': ' + JSON.stringify(chips));
ok('and I am not in my own tag list', !chips.includes('@Theo'), JSON.stringify(chips));

console.log('\n--- 2. a jump to an unloaded client does not fail silently ---');
const res = await page.evaluate(async () => {
  /* The app prefers showError() over alert(); watch BOTH, and then check the
     message actually reaches the screen — 762 fixed a class where errors were
     written to the home page while the user was somewhere else entirely. */
  const seen = { alerted: null, shown: null, onScreen: false, reloaded: 0 };
  const oa = window.alert; window.alert = m => { seen.alerted = m; };
  const ose = window.showError;
  if (typeof window.showError === 'function') window.showError = function(m){ seen.shown = m; return ose.apply(this, arguments); };
  const orl = window.reload;
  if (typeof window.reload === 'function') { window.reload = async function(){ seen.reloaded++; return orl.apply(this, arguments); }; }
  window.cacheProjects = [];                       /* the client is not loaded */
  window.openProject('p-NOT-LOADED');
  await new Promise(r => setTimeout(r, 2500));
  const msg = seen.shown || seen.alerted;
  if (msg) {
    const txt = String(msg).slice(0, 30);
    seen.onScreen = [...document.querySelectorAll('body *')].some(e => {
      if (!e.textContent || e.children.length) return false;
      if (e.textContent.indexOf(txt) === -1) return false;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0;
    });
  }
  window.alert = oa; if (orl) window.reload = orl; if (ose) window.showError = ose;
  return seen;
});
ok('it reloads before giving up', res.reloaded >= 1, 'reload calls: ' + res.reloaded);
const told = res.shown || res.alerted;
ok('and then says so out loud instead of doing nothing',
   !!told && /could not be opened/i.test(told), JSON.stringify(res));
ok('and the message is actually ON SCREEN, not written to a hidden home page',
   res.onScreen === true, JSON.stringify({ via: res.shown ? 'showError' : 'alert', onScreen: res.onScreen }));

console.log('\n--- 3. the normal path is untouched ---');
const good = await page.evaluate(async () => {
  window.openProject('p-1');
  await new Promise(r => setTimeout(r, 800));
  return { hash: location.hash, pv: getComputedStyle(document.getElementById('projectView')).display };
});
ok('a loaded client still opens straight away', good.hash === '#p/p-1' && good.pv !== 'none', JSON.stringify(good));

console.log('\n--- source ---');
ok('the retry latch exists (no loop on a genuine miss)', /openProject\.__retrying/.test(APP_HTML));
ok('the roster itself is unchanged', /name:'Curtis',\s+email:'curtis@cardinalrenovations\.net'/.test(APP_HTML));
console.log('\nRESULT: '+pass+' passed, '+fail+' failed  ->  '+(fail?'RED':'GREEN'));
await browser.close();
process.exit(fail?1:0);
