/*
 * Build 859 gate — the punch-out card's separate photo gallery + photo attribution.
 * Boots the REAL index.html, opens CardinalPunchCard on an item with 7 photos (a mix of
 * legacy string URLs and tagged {u,by,name,at} objects), taps "View all", and asserts the
 * gallery shows ALL 7 (not just 5), renders attribution captions, a tap opens the viewer,
 * and Back returns to the card. v858 has no gallery -> RED.
 *   node render_pkgallery859.mjs                          # 859 -> GREEN
 *   node render_pkgallery859.mjs /path/to/index_v858.html # 858 -> RED (no gallery button)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('858') ? '858' : '859';
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3b7d9014-74de-597e-b825-c1f5c6f1451c/scratchpad';

// 1x1 transparent PNG data URL for the imgs (no network)
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const PHOTOS = [
  PX + '#1', PX + '#2', PX + '#3', PX + '#4', PX + '#5',                 // 5 legacy strings
  { u: PX + '#6', by: 'nick@cardinalrenovations.net', name: 'Nick Rep', at: '2026-08-15T14:00:00Z' },
  { u: PX + '#7', by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: '2026-08-16T09:30:00Z' },
];

const SEED = {
  team_profiles: [
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' },
    { email: 'nick@cardinalrenovations.net', name: 'Nick Rep', role: 'sales' },
  ],
  projects: [{ id: 'p2', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: {} }],
  punch_items: [
    { id: 'pi1', title: 'Reattach fascia', project_id: 'p2', assigned_to: 'curtis@cardinalrenovations.net',
      status: 'open', priority: 'high', photos: PHOTOS, steps: [], comments: [] },
  ],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  appointments: [], inspection_reports: [], estimates: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalPunchCard && window.CardinalPunchCard.open && window.CardinalPunch, { timeout: 20000 });
  const r = await page.evaluate(async () => {
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch(e){}
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 400));
    var card = document.getElementById('cr-pk');
    var out = {};
    // the card shows the gallery door with the full count
    var door = card.querySelector('[data-act="gallery"]');
    out.hasDoor = !!door;
    out.doorCount = door ? (door.textContent.match(/\d+/) || [])[0] : null;
    // slots still show only 5
    out.slotCount = card.querySelectorAll('[data-slot]').length;
    // open the gallery
    if (door) door.click();
    await new Promise(r => setTimeout(r, 250));
    var gal = card.querySelector('.pkgal');
    out.galOpen = !!gal;
    out.tiles = card.querySelectorAll('.pkgtile').length;
    out.tileImgs = card.querySelectorAll('.pkgimg img').length;
    // attribution captions: the two tagged photos show a name; legacy show "Added earlier"
    var caps = Array.from(card.querySelectorAll('.pkgcap')).map(function(c){ return c.textContent; });
    out.hasNick = caps.some(function(t){ return /Nick Rep/.test(t); });
    out.hasCurtis = caps.some(function(t){ return /Curtis/.test(t); });
    out.hasAddedEarlier = caps.filter(function(t){ return /Added earlier/.test(t); }).length;
    out.hasAddTile = !!card.querySelector('[data-act="galadd"]');
    // tap a photo -> the resource image viewer opens
    var vt = card.querySelector('[data-gview]');
    if (vt) vt.click();
    await new Promise(r => setTimeout(r, 200));
    var zoom = document.getElementById('cr-ri-zoom');
    out.viewerOpened = !!(zoom && zoom.classList.contains('open'));
    // close viewer if present, then Back
    try { if (window.CardinalResourceImages && window.CardinalResourceImages.close) window.CardinalResourceImages.close(); } catch(e){}
    await new Promise(r => setTimeout(r, 120));
    var back = card.querySelector('[data-act="galback"]');
    if (back) back.click();
    await new Promise(r => setTimeout(r, 200));
    out.galClosedAfterBack = !card.querySelector('.pkgal');
    out.cardStillOpen = card.classList.contains('open');
    return out;
  });

  ok('card shows a "View all" gallery door', r.hasDoor);
  ok('door counts ALL photos (7, not 5)', r.doorCount === '7', r.doorCount);
  ok('card still shows exactly 5 guided slots', r.slotCount === 5, r.slotCount);
  ok('tapping the door opens the separate gallery', r.galOpen);
  ok('gallery shows ALL 7 photos', r.tiles === 7, r.tiles);
  ok('every tile has an image', r.tileImgs === 7, r.tileImgs);
  ok('tagged photo shows rep name (Nick Rep)', r.hasNick);
  ok('tagged photo shows Curtis', r.hasCurtis);
  ok('legacy photos show "Added earlier" (5)', r.hasAddedEarlier === 5, r.hasAddedEarlier);
  ok('gallery has an Add photo tile', r.hasAddTile);
  ok('tapping a photo opens the image viewer', r.viewerOpened, r.viewerOpened);
  ok('Back closes the gallery, card stays open', r.galClosedAfterBack && r.cardStillOpen, { gal: r.galClosedAfterBack, card: r.cardStillOpen });

  // screenshot the open gallery
  await page.evaluate(async () => {
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 300));
    var d = document.querySelector('#cr-pk [data-act="gallery"]'); if (d) d.click();
    await new Promise(r => setTimeout(r, 300));
  });
  const c1 = await ctx.newCDPSession(page);
  const png = (await c1.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 900, scale: 2 } })).data;
  writeFileSync(OUT + '/pkgallery859.png', Buffer.from(png, 'base64'));
  console.log('  (wrote pkgallery859.png)');
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
