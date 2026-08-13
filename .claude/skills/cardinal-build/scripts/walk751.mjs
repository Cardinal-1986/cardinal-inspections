/* walk751.mjs — the full touch-target walk Theo asked for.
   Visits the screens his list names — stage controls, Mark Paid, photo
   thumbnails, "+" buttons — plus the chrome, at 390px with touch, and measures
   every interactive control's RENDERED rect (not its CSS, not its display).

   Instrument only: measures and reports, changes nothing. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
const PX = 'data:image/png;base64,iVBORw0KGgoAAAABAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='.replace('AAAABAAEAAAAB','AAAAAQAAAAEC'); // keep a valid 1x1
const PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: Array.from({ length: 5 }, (_, i) => ({
    id: 'p' + i, name: 'Client ' + i, stage: ['Lead', 'Approved', 'Scheduled', 'Completed', 'Invoiced'][i],
    crm: 'retail', checklist: '{}', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z',
    address: (100 + i) + ' Webster St', phone: '9375551212', email: 'c' + i + '@x.com',
  })),
  commissions: [
    { id: 'c1', project_id: 'p1', rep_email: 'nick@cardinalrenovations.net', amount: 1200, status: 'approved', created_at: '2026-08-10T12:00:00Z' },
    { id: 'c2', project_id: 'p1', rep_email: 'joey@cardinalrenovations.net', amount: 800, status: 'pending', created_at: '2026-08-10T12:00:00Z' },
  ],
  draws: [{ id: 'd1', project_id: 'p1', rep_email: 'nick@cardinalrenovations.net', amount: 300, status: 'outstanding', paid_at: null }],
  project_photos: Array.from({ length: 6 }, (_, i) => ({
    id: 'ph' + i, project_id: 'p' + (i % 3), data: PIX, storage_path: null,
    created_by: 'curtis@cardinalrenovations.net', created_at: '2026-08-12T0' + (i + 1) + ':00:00Z',
  })),
  punch_items: [{ id: 'pi1', project_id: 'p1', title: 'Reseal pipe boot', status: 'open', comments: '[]', created_at: '2026-08-11T12:00:00Z' }],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
};
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const MEASURE = (min) => {
  const SEL = 'button, a[href], a[onclick], [role="button"], input[type="checkbox"], input[type="radio"], ' +
              'select, summary, [onclick], .chip, .chipbtn, .pill, .tab, [data-act], [data-open], [data-tab], ' +
              '[data-stage], [data-pay], [data-paynet], [data-payfull], [data-repay], .phc, .pay-chip, .pay-btn';
  const out = []; const seen = new Set();
  document.querySelectorAll(SEL).forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.pointerEvents === 'none') return;
    const w = Math.round(r.width), h = Math.round(r.height);
    const id = (el.id ? '#' + el.id : '') +
               (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    out.push({ tag: el.tagName.toLowerCase(), id: id.slice(0, 56), w, h,
               small: (w < min || h < min),
               text: (el.textContent || '').trim().slice(0, 20) });
  });
  return out;
};

const shots = [];
async function screen(name, prep, probes) {
  let err = null;
  try { await page.evaluate(prep); } catch (e) { err = String(e).split('\n')[0]; }
  await page.waitForTimeout(1100);
  const all = await page.evaluate(MEASURE, 44);
  const small = all.filter(c => c.small);
  const byKey = {};
  for (const c of small) { const k = `${c.tag}${c.id}|${c.w}x${c.h}`; (byKey[k] = byKey[k] || { ...c, n: 0 }).n++; }
  console.log(`\n===== ${name}${err ? '  (prep error: ' + err + ')' : ''} =====`);
  console.log(`  ${small.length} of ${all.length} visible controls under 44px`);
  Object.values(byKey).sort((a, b) => b.n - a.n || a.w * a.h - b.w * b.h).slice(0, 14)
    .forEach(c => console.log(`   ${String(c.n).padStart(3)}x  ${String(c.w).padStart(3)}x${String(c.h).padStart(3)}  ${c.tag}${c.id}  ${c.text ? '“' + c.text + '”' : ''}`));
  if (probes) {
    const res = await page.evaluate(probes);
    for (const [k, v] of Object.entries(res)) console.log(`   PROBE ${k}: ${JSON.stringify(v)}`);
  }
}

const rects = sel => [...document.querySelectorAll(sel)]
  .map(e => { const r = e.getBoundingClientRect(); return r.width && r.height ? Math.round(r.width) + 'x' + Math.round(r.height) : null; })
  .filter(Boolean).slice(0, 6);

await screen('1. HOME', () => {}, null);

await screen('2. BURGER MENU', () => { const b = document.getElementById('navBtn'); if (b) b.click(); },
  () => {
    const m = [...document.querySelectorAll('nav, .menu, [id*="enu"]')].find(x => { const r = x.getBoundingClientRect(); return r.width > 200 && r.height > 300; });
    if (!m) return { menuFound: false };
    const links = [...m.querySelectorAll('a,button')].map(e => { const r = e.getBoundingClientRect(); return r.height ? Math.round(r.height) : 0; }).filter(Boolean);
    return { menuFound: true, itemHeights: links.slice(0, 12), minItem: Math.min(...links) };
  });
await page.evaluate(() => { const b = document.getElementById('navBtn'); if (b) b.click(); }).catch(() => {});

await screen('3. ALL CLIENTS LIST', () => { if (typeof openLeadsView === 'function') openLeadsView(); },
  () => {
    const g = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return r.width && r.height ? Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean).slice(0, 6);
    return { ljbtn: g('#leadsView .ljbtn'), sortFilter: g('#leadsView select, #leadsView .chipbtn') };
  });

await screen('4. CLIENT PROFILE (overview)', () => { if (typeof openProject === 'function') openProject('p1'); },
  () => {
    const g = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return r.width && r.height ? Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean).slice(0, 8);
    const sel = document.getElementById('stageSel');
    const jobMenu = [...document.querySelectorAll('#projectView select')].map(e => { const r = e.getBoundingClientRect(); return (e.id || e.className || 'select') + ':' + Math.round(r.width) + 'x' + Math.round(r.height); }).slice(0, 4);
    return {
      stageSelHidden: sel ? getComputedStyle(sel).display === 'none' : 'absent',
      stageChips: g('[data-stage]'),
      milestoneCircles: g('.pcirc, [class*="pcirc"]'),
      jobMenuSelects: jobMenu,
      plusButtons: g('#projectView [data-act="add"], #projectView .chipbtn'),
    };
  });

await screen('5. COMMISSIONS TAB (Mark Paid)', () => { if (typeof showTab === 'function') showTab('commissions'); },
  () => {
    const g = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return r.width && r.height ? Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean).slice(0, 8);
    return { markPaidChips: g('.pay-chip'), payButtons: g('.pay-btn'), repayLinks: g('[data-repay]') };
  });

await screen('6. PUNCH TAB', () => { if (typeof showTab === 'function') showTab('punch'); },
  () => {
    const g = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return r.width && r.height ? Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean).slice(0, 8);
    return { addBtn: g('.cr-pp-wrap [data-act="add"], #tab-punch [data-act="add"]'), items: g('.cr-pp-item'), toggles: g('[data-act="toggle"]') };
  });

await screen('7. PHOTO ACTIVITY (thumbnails)', () => { if (typeof openPhotosView === 'function') openPhotosView(); },
  () => {
    const tiles = [...document.querySelectorAll('.phc')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    return { tileCount: tiles.length, tiles: tiles.slice(0, 6) };
  });

await browser.close();
console.log('\nWALK COMPLETE');
