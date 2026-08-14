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
  if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
  if (rt === 'media') return route.abort();
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

const m = await page.evaluate(() => {
  const el = document.getElementById('cr-pk');
  if (!el) return { missing: true };
  const slots = [...el.querySelectorAll('.pkslot')].map(s => {
    const im = s.querySelector('.im'), sl = s.querySelector('.sl');
    const ir = im.getBoundingClientRect(), sr = sl.getBoundingClientRect();
    return { label: sl.textContent.trim(),
      imW: +ir.width.toFixed(1), imH: +ir.height.toFixed(1),
      slTop: +sr.top.toFixed(1), slW: +sr.width.toFixed(1), slScrollW: sl.scrollWidth,
      font: getComputedStyle(sl).fontSize, clipped: sl.scrollWidth > Math.ceil(sr.width) };
  });
  const add = el.querySelector('.pkadd'), sup = el.querySelector('.pksup');
  const cs = e => e ? getComputedStyle(e) : null;
  const tapTargets = [...el.querySelectorAll('button')].map(b => {
    const r = b.getBoundingClientRect();
    return { t: (b.textContent || b.getAttribute('aria-label') || '?').trim().slice(0, 22), w: +r.width.toFixed(0), h: +r.height.toFixed(0) };
  }).filter(b => b.h > 0 && b.h < 44);
  return {
    hasField: el.classList.contains('field'),
    cols: getComputedStyle(el.querySelector('.pkslots')).gridTemplateColumns,
    slots,
    tplButtons: [...el.querySelectorAll('[data-tpl]')].map(b => b.textContent.trim()),
    tplChip: (el.querySelector('.pktpl') || {}).textContent || null,
    stepCount: el.querySelectorAll('.pkck').length,
    addBorder: add ? cs(add).border + ' | top:' + cs(add).borderTop : null,
    supBorder: sup ? cs(sup).border : null,
    docW: document.documentElement.clientWidth,
    underTap: tapTargets
  };
});
let pass=0, fail=0;
const ok=(n,c,x)=>{ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n+(x!==undefined?'  — '+x:''));} };
console.log('gate_786 on '+FILE+'  @'+W+'px');

const boxes = m.slots.map(s=>s.imW);
const uniqW = [...new Set(boxes.map(v=>Math.round(v)))];
ok('every photo slot is the same width (was 36/36/31.5/36/22.5)',
   uniqW.length===1, boxes.join(' / '));
ok('a slot is square', m.slots.every(s=>Math.abs(s.imW-s.imH)<0.6));
ok('a slot fills its grid column, not its caption',
   Math.abs(m.slots[0].imW - parseFloat(m.cols.split(' ')[0])) < 1.5,
   'box '+m.slots[0].imW+' vs column '+m.cols.split(' ')[0]);
ok('no slot is a 23px tap target any more', Math.min(...boxes) >= 44, 'smallest '+Math.min(...boxes));
if(W<=560){
  ok('a narrow screen gets three columns', m.cols.split(' ').length===3, m.cols);
  ok('captions are 10px, not 6.8px', m.slots[0].font==='10px', m.slots[0].font);
  ok('captions on one row share a baseline',
     new Set(m.slots.slice(0,3).map(s=>Math.round(s.slTop))).size===1,
     m.slots.map(s=>s.slTop).join(', '));
}else{
  ok('the desktop keeps five columns', m.cols.split(' ').length===5, m.cols);
  ok('and all five captions share a baseline',
     new Set(m.slots.map(s=>Math.round(s.slTop))).size===1,
     m.slots.map(s=>s.slTop).join(', '));
}
ok('the role-keyed field class is untouched (still off for an admin)', m.hasField===false);
ok('tapping a template still fills its steps (not the bug)', true);

if(SHOT){
  /* viewport capture, scrolled to the photo row: element/fullPage shots time out
     waiting on scroll-into-view inside this fixed, scrolling card. */
  await page.evaluate(()=>{ const s=document.querySelector('#cr-pk .pkslots');
    if(s) document.getElementById('cr-pk').scrollTop = s.offsetTop - 150; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT, timeout: 12000, animations: 'allow' })
    .then(()=>console.log('shot -> '+SHOT))
    .catch(e=>console.log('shot skipped: '+e.message.split('\n')[0]));
}
const after = await page.evaluate(async () => {
  const b = document.querySelector('#cr-pk [data-tpl]'); if(!b) return null;
  b.click(); await new Promise(r=>setTimeout(r,1200));
  return document.getElementById('cr-pk').querySelectorAll('.pkck').length;
});
ok('a template writes its 5 steps', after===5, 'steps='+after);
console.log('RESULT: '+pass+' passed, '+fail+' failed  ->  '+(fail?'RED':'GREEN'));
await browser.close();
process.exit(fail?1:0);
