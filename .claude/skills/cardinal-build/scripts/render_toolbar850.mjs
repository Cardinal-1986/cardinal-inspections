/*
 * Build 850 render gate — the document editor toolbar, tidied.
 * Boots the REAL index.html, opens the editor view, and proves the action set:
 *   - lives in one .edbtns container, each dark button with a hydrated drawn icon
 *     (svg.cri present, data-cri consumed) and a .bl label span
 *   - on the phone the set is a 2-column grid (aligned), not a scattered wrap
 *   - the email button keeps a .bl span so its JS label churn never wipes the icon
 * Also writes toolbar_phone.png / toolbar_desktop.png for the eye.
 *   node render_toolbar850.mjs                          # 850 -> GREEN
 *   node render_toolbar850.mjs /path/to/index_v849.html # 849 -> RED (emoji, no grid)
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
const TAG = FILE.includes('849') ? '849' : '850';
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3b7d9014-74de-597e-b825-c1f5c6f1451c/scratchpad';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [], projects: [],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
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
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalIcons && document.getElementById('editorView'), { timeout: 20000 });
  // open the editor view directly and dress it to match a real Work Order
  await page.evaluate(() => {
    var v = document.getElementById('editorView');
    v.classList.add('open'); v.setAttribute('aria-hidden', 'false');
    var logo = document.getElementById('editorLogo'); if (logo) { logo.style.display = ''; logo.src = '/apple-touch-icon.png'; }
    var rep = document.getElementById('edRepChip'); if (rep) { rep.style.display = ''; rep.innerHTML = '<small>REP</small> Theo'; }
    var t = document.getElementById('reportTitle'); if (t) t.value = 'Work Order — Roofing — Alberto Campuzano Rutledge';
    // show the situational buttons so the full set is visible (like the screenshot)
    ['sigBtn','rccBtn'].forEach(function(id){ var b = document.getElementById(id); if (b) b.style.display = ''; });
    var chip = document.getElementById('editorStatusChip'); if (chip) chip.textContent = 'UNSENT';
  });
  await new Promise(r => setTimeout(r, 250));
  return { ctx, page };
}

try {
  // ---- structure @ phone ----
  const { ctx, page } = await boot(390, 900);
  const r = await page.evaluate(() => {
    var box = document.querySelector('.toolbar .edbtns');
    if (!box) return { none: true };
    var darks = Array.from(box.querySelectorAll('.btn.dark'));
    var withIcon = darks.filter(b => b.querySelector('svg.cri') && !b.hasAttribute('data-cri'));
    var withLabel = darks.filter(b => b.querySelector('.bl'));
    var email = document.getElementById('emailDocBtn');
    var cs = getComputedStyle(box);
    return {
      darkCount: darks.length,
      iconCount: withIcon.length,
      labelCount: withLabel.length,
      display: cs.display,
      cols: cs.gridTemplateColumns.split(' ').length,
      emailHasSpan: !!(email && email.querySelector('.bl')),
      emailHasIcon: !!(email && email.querySelector('svg.cri')),
      anyEmoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u.test(box.textContent),
    };
  });
  if (r.none) { ok('.edbtns exists', false); }
  else {
    ok('all 8 dark action buttons present', r.darkCount === 8, r.darkCount);
    ok('every dark button has a hydrated drawn icon (svg.cri, data-cri consumed)', r.iconCount === 8, r.iconCount);
    ok('every dark button has a .bl label span', r.labelCount === 8, r.labelCount);
    ok('no emoji left in the action set', !r.anyEmoji);
    ok('phone: the set is a 2-column grid (aligned)', r.display === 'grid' && r.cols === 2, { display: r.display, cols: r.cols });
    ok('email button keeps its icon AND a label span (JS-safe)', r.emailHasIcon && r.emailHasSpan);
  }
  const c1 = await ctx.newCDPSession(page);
  const png1 = (await c1.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 340, scale: 2 } })).data;
  writeFileSync(OUT + '/toolbar_phone.png', Buffer.from(png1, 'base64'));
  await ctx.close();

  // ---- desktop shot ----
  const d = await boot(1194, 800);
  const c2 = await d.ctx.newCDPSession(d.page);
  const png2 = (await c2.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1194, height: 200, scale: 1 } })).data;
  writeFileSync(OUT + '/toolbar_desktop.png', Buffer.from(png2, 'base64'));
  await d.ctx.close();
  console.log('  (wrote toolbar_phone.png, toolbar_desktop.png)');

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
