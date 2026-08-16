/*
 * Build 851 gate — the Email button label is context-aware by document type.
 * Boots the REAL index.html, opens a Work Order document and an Estimate document
 * through the real openEditor(), and asserts:
 *   - Work Order  -> the Email button reads "Email to crew"
 *   - Estimate    -> it reads "Email to client"
 *   - the label is stored on the button (data-lbl) so a send-state reset restores it
 *   node render_email851.mjs                          # 851 -> GREEN
 *   node render_email851.mjs /path/to/index_v850.html # 850 -> RED (always "client")
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('850') ? '850' : '851';

const DOC = '<html><head></head><body><table class="items"><tr><td>x</td></tr></table></body></html>';
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'Sandra Whitfield', address: '1 Test St', stage: 'Scheduled', checklist: {}, email: 'sandra@example.com' }],
  inspection_reports: [
    { id: 'wo1', title: 'Work Order — Roofing — Alberto Campuzano', html: DOC, status: 'draft', project_id: 'p1' },
    { id: 'es1', title: 'Estimate — Roofing', html: DOC, status: 'draft', project_id: 'p1' },
  ],
  appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 850 } });
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
  await page.waitForFunction(() => typeof window.openEditor === 'function' && (window.sb || window.supa), { timeout: 20000 });

  const r = await page.evaluate(async () => {
    function lbl(){ var b = document.querySelector('#emailDocBtn .bl') || document.getElementById('emailDocBtn'); return b ? b.textContent.trim() : null; }
    var out = {};
    try { await window.openEditor('wo1'); } catch (e) { out.woErr = String(e && e.message || e); }
    await new Promise(r => setTimeout(r, 120));
    out.wo = lbl();
    out.woData = (document.getElementById('emailDocBtn') || {}).dataset ? document.getElementById('emailDocBtn').dataset.lbl : null;
    try { await window.openEditor('es1'); } catch (e) { out.esErr = String(e && e.message || e); }
    await new Promise(r => setTimeout(r, 120));
    out.es = lbl();
    return out;
  });

  ok('Work Order: button reads "Email to crew"', r.wo === 'Email to crew', r);
  ok('Work Order: label stored on the button (data-lbl)', r.woData === 'Email to crew', r.woData);
  ok('Estimate: button reads "Email to client"', r.es === 'Email to client', r.es);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,4).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
