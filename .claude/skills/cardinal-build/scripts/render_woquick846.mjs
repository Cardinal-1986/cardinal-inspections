/*
 * Build 846 render gate — the Work Orders button beside the job section dropdown.
 * Boots the REAL index.html in Chromium against the recording mock, opens a project,
 * and proves the button:
 *   - exists, and its ladder icon was hydrated (data-cri consumed, an <svg class="cri"> child added)
 *   - is HIDDEN before a job is open and VISIBLE once one is (lockstep with #jobMenuSel)
 *   - opens the Work Orders section when clicked (same #tab-workorders the dropdown drives)
 *   - does not push the header into a sideways scroll at 390px or 1194px
 *   node render_woquick846.mjs                          # 846 -> GREEN
 *   node render_woquick846.mjs /path/to/index_v845.html # 845 -> RED (no #woQuick at all)
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
const TAG = FILE.includes('845') ? '845' : '846';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'Test Job', address: '1 Test St, Dayton OH', stage: 'Scheduled', checklist: {} }],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const errs = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + extra : '')); } };

console.log(`artifact : ${FILE}  (build ${TAG})`);

async function runAt(w, h, label, expectSel) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
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

  try {
    await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window.sb || window.supa) && typeof window.openProject === 'function' && typeof window.showTab === 'function', { timeout: 20000 });

    const r = await page.evaluate(async () => {
      const q = () => document.getElementById('woQuick');
      const out = { exists: !!q() };
      if (!out.exists) return out;

      // before a job is open — should be hidden
      out.beforeHidden = getComputedStyle(q()).display === 'none';

      // icon hydration: data-cri consumed once on load, an <svg class="cri"> prepended
      out.iconHydrated = !q().hasAttribute('data-cri') && !!q().querySelector('svg.cri');
      out.label = (q().textContent || '').trim();

      // open the project the real way
      try { window.openProject('p1'); } catch (e) { out.openThrew = String(e && e.message || e); }
      await new Promise(r => setTimeout(r, 250));

      out.projopen = document.body.classList.contains('projopen');
      const cs = getComputedStyle(q());
      out.afterVisible = cs.display !== 'none' && q().offsetParent !== null;
      out.selVisible = (function(){ var s = document.getElementById('jobMenuSel'); return s && getComputedStyle(s).display !== 'none'; })();

      // header does not scroll sideways with the button in it
      var hdr = document.querySelector('header.site');
      out.headerNoOverflow = hdr ? (hdr.scrollWidth <= hdr.clientWidth + 1) : null;
      out.bodyNoOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;

      // click opens the Work Orders section
      q().click();
      await new Promise(r => setTimeout(r, 60));
      out.woShown = (function(){ var t = document.getElementById('tab-workorders'); return t && t.style.display === 'block'; })();
      out.ovHidden = (function(){ var t = document.getElementById('tab-overview'); return t && t.style.display === 'none'; })();

      // leaving the job hides the button again (lockstep with the dropdown)
      try { window.setHeaderJobMenu(false); } catch (e) {}
      out.hiddenAfterLeave = getComputedStyle(q()).display === 'none';
      return out;
    });

    if (!r.exists) { ok(`[${label}] #woQuick exists`, false, 'missing'); await ctx.close(); return; }
    ok(`[${label}] #woQuick exists`, r.exists);
    ok(`[${label}] label reads "Work Orders"`, /Work Orders/.test(r.label), r.label);
    ok(`[${label}] ladder icon hydrated (data-cri consumed, svg.cri added)`, r.iconHydrated);
    ok(`[${label}] hidden before a job is open`, r.beforeHidden);
    ok(`[${label}] openProject set projopen`, r.projopen, r.openThrew || '');
    ok(`[${label}] visible once a job is open`, r.afterVisible);
    // Intent: the button is visible whenever a job is open (both widths). On desktop the
    // section dropdown is beside it; on phone (<=560px) the dropdown is deliberately hidden
    // by the client-band media rule, so the button is the ONLY header path to Work Orders.
    ok(`[${label}] section dropdown visibility is as designed (${expectSel ? 'shown' : 'hidden'})`, r.selVisible === expectSel, `sel=${r.selVisible}`);
    ok(`[${label}] header does not scroll sideways`, r.headerNoOverflow !== false, `hdr scrollWidth vs clientWidth`);
    ok(`[${label}] body does not scroll sideways`, r.bodyNoOverflow);
    ok(`[${label}] click opens the Work Orders section`, r.woShown);
    ok(`[${label}] click hides Overview`, r.ovHidden);
    ok(`[${label}] hidden again after leaving the job`, r.hiddenAfterLeave);
  } catch (e) {
    ok(`[${label}] harness ran`, false, String(e).slice(0, 200));
  } finally { await ctx.close(); }
}

try {
  await runAt(1194, 834, 'desktop-1194', true);   // dropdown shown beside the button
  await runAt(390, 844, 'phone-390', false);      // dropdown hidden by design; button stands in
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 3).join(' | ') + ')' : ''}`);
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
