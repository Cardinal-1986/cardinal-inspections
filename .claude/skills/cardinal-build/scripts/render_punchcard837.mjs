/*
 * Build 837 render proof — tapping a Punch & Repairs strip card opens the ONE
 * detail screen (CardinalPunchCard, #cr-pk), not the retired 724-era sheet
 * (#puDetail). Boots the REAL index.html in Chromium against the recording mock,
 * renders the REAL strip from a seeded punch row, dispatches a REAL click, and
 * reads which detail surface opened.
 *
 * Same assertion on both builds → a real negative control:
 *   node render_punchcard837.mjs                       # 837  -> GREEN (card opens)
 *   node render_punchcard837.mjs /path/to/index_808.html  # 808 -> RED (old sheet opens)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const OUT = process.env.GATE_OUT || '/tmp/claude-0/-home-user-cardinal-inspections/3b7d9014-74de-597e-b825-c1f5c6f1451c/scratchpad/punchshots';
mkdirSync(OUT, { recursive: true });
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('808') ? '808' : '837';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [{ id: 'proj-1', name: 'Test Job', address: '123 Test St', stage: 'Scheduled', checklist: {}, created_by: 'theo@cardinalrenovations.net' }],
  punch_items: [{
    id: 'punch-1', title: 'Replace ridge cap', status: 'open', priority: 'high',
    photos: [], project_id: 'proj-1', detail: 'From the roof inspection',
    assigned_to: null, done_at: null, done_by: null, created_at: '2026-08-16T10:00:00Z'
  }],
  appointments: [], estimates: [], inspection_reports: [], crews: [], insurance_claims: []
};

const errs = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });   // a phone
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('pageerror', e => errs.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return"";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  → ' + extra : '')); } };

const shot = async name => { try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('  shot ' + `${OUT}/${name}.png`); } catch (e) {} };

console.log(`artifact : ${FILE}  (build ${TAG})`);
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalPunch && window.CardinalPunchStrip && window.CardinalPunchCard && typeof window.renderPunchStrips === 'function', { timeout: 20000 });

  // Render the REAL strip from the seeded row, into a real mount.
  const built = await page.evaluate(async () => {
    if (!document.getElementById('kpPunchStrip')) {
      const d = document.createElement('div'); d.id = 'kpPunchStrip';
      d.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:1;background:#111;padding:12px';
      document.body.appendChild(d);
    }
    try { await window.CardinalPunch.reload(); } catch (e) {}
    window.renderPunchStrips();
    await new Promise(r => setTimeout(r, 400));
    const rows = (window.CardinalPunch.rows && window.CardinalPunch.rows()) || [];
    const cards = document.querySelectorAll('.pu-strip .pu-card, #kpPunchStrip .pu-card');
    return { rows: rows.length, cards: cards.length, hasSheetInDom: !!document.getElementById('puDetail') };
  });
  console.log(`  seeded rows: ${built.rows}   strip cards rendered: ${built.cards}   #puDetail in DOM: ${built.hasSheetInDom}`);

  ok('the seeded punch row loaded', built.rows >= 1, built.rows);
  ok('the real strip rendered a tappable card', built.cards >= 1, built.cards);
  ok(`legacy #puDetail sheet is ${TAG === '837' ? 'GONE from the DOM' : 'present (pre-837)'}`,
     TAG === '837' ? !built.hasSheetInDom : built.hasSheetInDom, built.hasSheetInDom);

  // Tap the first strip card, the way a thumb does.
  const clicked = await page.evaluate(async () => {
    const card = document.querySelector('#kpPunchStrip .pu-card, .pu-strip .pu-card');
    if (!card) return { clicked: false };
    card.click();
    await new Promise(r => setTimeout(r, 600));
    const ck = document.getElementById('cr-pk');
    const sheet = document.getElementById('puDetail');
    return {
      clicked: true,
      cardOpen: !!(ck && ck.classList.contains('open')),
      cardZ: ck ? getComputedStyle(ck).zIndex : null,
      sheetOpen: !!(sheet && sheet.classList.contains('open')),
      // does the opened card carry the newer controls the old sheet lacked?
      cardHasSteps: !!(ck && /step|photo|message/i.test(ck.textContent || '')),
    };
  });
  await shot(`punch_${TAG}_after_tap`);

  console.log(`  after tap → cardOpen=${clicked.cardOpen}  sheetOpen=${clicked.sheetOpen}  cardZ=${clicked.cardZ}`);

  // THE claim (same on both builds → real negative control):
  ok('tapping a strip card opens the CARD (#cr-pk.open)', clicked.cardOpen, clicked.cardOpen);
  ok('the old sheet (#puDetail) does NOT open', !clicked.sheetOpen, clicked.sheetOpen);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 3).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 300));
  console.log(errs.length ? 'pageerrors: ' + errs.slice(0, 5).join(' | ') : '');
  fail++;
} finally {
  await browser.close();
}
process.exit(fail === 0 ? 0 : 1);
