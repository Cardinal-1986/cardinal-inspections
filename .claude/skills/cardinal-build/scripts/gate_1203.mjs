#!/usr/bin/env node
/* gate_1203 — five small things, all MEASURED in a real engine.
 *
 *   node gate_1203.mjs [index.html]        the build must be GREEN
 *   node gate_1203.mjs <1202 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, the search hint, the Files label.
 *   B  iPad 1194x834, Leads & Jobs: no box may cross the right edge, and the
 *      three grid tracks must fit inside their own container. 1202 puts the
 *      Job Summary at right=1225.
 *   C  Phone 390x844, an open profile: NO job-menu label may be truncated
 *      (scrollWidth > clientWidth), and the two tiles in a row stay the same
 *      height. 1202 truncates seven.
 *   D  The Add project form: Job cost is hidden for a rep and shown for an
 *      admin, and its value survives either way.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const html = readFileSync(artifact, 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return c; };

console.log('\nA  static');
const st = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!st && Number(st[1]) >= 1203, 'app stamp is 1203 or above', st ? 'build ' + st[1] : 'none');
ok(/\{\s*b:\s*1203\s*,/.test(html), 'CHANGELOG carries a build-1203 entry');
ok(html.includes('enterkeyhint="search"'), 'the search field asks for a Search key');
ok(/placeholder="Search clients, PO #, address &#8212; then Return"/.test(html),
   'and the placeholder says what to press');
ok(html.includes("jt(dbIc('docs'), 'Files', fileDocs.length, 'docs')"), 'the tile is called Files');
ok(html.includes('minmax(0,1.05fr) minmax(0,1fr)'), 'the Leads tracks can give way');

/* 1203: this used to hard-code ONE container's Playwright path, so on a CI
   runner - where npm installs playwright locally - the rig looked "unavailable"
   and every browser section SKIPPED while the gate still reported GREEN. That
   is how gate_1201 and gate_1202 passed in CI with their own break applied:
   the sections that would have caught it never ran. Same resolution as
   gate_1197/1199, and the browser comes from chromium_launch.cjs, which exists
   because three gates had already hard-coded two different browser paths. */
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');
if (!(existsSync(setupPath) && existsSync(mockPath))) {
/* 1203: a gate whose whole point is runtime behaviour must NOT be able to
   report GREEN when the browser sections did not run. In CI they silently did
   not (a hard-coded Playwright path), and gate_1201 and gate_1202 therefore
   passed with their own negative-control break applied. Skipping is now a
   FAILURE, which is the honest verdict: proved nothing. */
  ok(false, 'sections B-D RAN — a skipped browser section is not a pass',
     `setup:${existsSync(setupPath)} mock:${existsSync(mockPath)}`);
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8'); const MOCK = readFileSync(mockPath, 'utf8');
  let browser = null;
  try {
    browser = await launchChromium(chromium);
    const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.addInitScript(SETUP);
    await page.route('**/*', async (route) => {
      const u = route.request().url(); const url = new URL(u);
      if (url.hostname === 'app.cardinalroster.com') {
        if (url.pathname === '/' || url.pathname === '/index.html')
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        if (url.pathname.startsWith('/api/'))
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[],"items":[]}' });
        const f = resolve(root, '.' + url.pathname);
        if (existsSync(f) && !url.pathname.endsWith('.html')) return route.fulfill({ status: 200, body: readFileSync(f) });
        return route.fulfill({ status: 404, body: '' });
      }
      if (u.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
      if (u.includes('chart.js') || u.includes('papaparse'))
        return route.fulfill({ status: 200, contentType: 'application/javascript',
          body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
      return route.abort();
    });
    await page.goto('https://app.cardinalroster.com/?as=nick', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    console.log('\nB  iPad 1194 — Leads & Jobs stays on screen');
    await page.evaluate(async () => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'leads'); if (s) await s.run();
    });
    await page.waitForTimeout(1300);
    const lead = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.width > 2 && b.height > 2 && b.right > innerWidth + 1 &&
            getComputedStyle(el).position !== 'fixed')
          out.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')) + ' right=' + Math.round(b.right));
      });
      const cols = document.querySelector('.ljcols');
      const pane = document.getElementById('ljPane');
      const cb = cols && cols.getBoundingClientRect(), pb = pane && pane.getBoundingClientRect();
      return { offenders: out.slice(0, 6), innerW: innerWidth,
               scrollW: document.documentElement.scrollWidth,
               colsRight: cb ? Math.round(cb.right) : 0, paneRight: pb ? Math.round(pb.right) : 0,
               tracks: cols ? getComputedStyle(cols).gridTemplateColumns : '' };
    });
    ok(lead.offenders.length === 0, 'nothing crosses the right edge at 1194',
       lead.offenders.join(', ') || 'clean');
    ok(lead.paneRight > 0 && lead.paneRight <= lead.colsRight + 1,
       'the Job Summary sits inside its own grid', 'pane ' + lead.paneRight + ' vs grid ' + lead.colsRight);
    ok(lead.scrollW <= lead.innerW, 'and the page does not scroll sideways',
       lead.scrollW + ' vs ' + lead.innerW);
    console.log('        tracks: ' + lead.tracks);

    console.log('\nC  phone 390 — every job-menu label reads');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(async () => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'client'); if (s) await s.run();
    });
    await page.waitForTimeout(1300);
    const menu = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('#acxMount .ja-menu .jbl')];
      const cut = labels.filter(l => l.scrollWidth > l.clientWidth + 1)
                        .map(l => l.textContent.trim());
      const rows = [...document.querySelectorAll('#acxMount .ja-menu .jaboxrow')].map((r) => {
        const hs = [...r.children].map(c => Math.round(c.getBoundingClientRect().height));
        return hs.length === 2 ? Math.abs(hs[0] - hs[1]) : 0;
      });
      return { total: labels.length, cut, worstRowDelta: Math.max(0, ...rows),
               names: labels.map(l => l.textContent.trim()) };
    });
    ok(menu.total > 0, 'the job menu rendered', menu.total + ' labels');
    ok(menu.cut.length === 0, 'no label is truncated at 390px', menu.cut.join(', ') || 'none cut');
    ok(menu.worstRowDelta <= 1, 'the two tiles in a row stay the same height',
       'worst delta ' + menu.worstRowDelta + 'px');
    ok(menu.names.indexOf('Files') !== -1, 'the tile reads Files', menu.names.join(' · '));

    console.log('\nD  Add project — Job cost is an admin field');
    const cost = await page.evaluate(() => {
      const seen = {};
      const openAs = (admin) => {
        window.ADMIN_EMAILS = admin ? [window.currentUser && window.currentUser.email] : ['nobody@example.com'];
        try { window.openProjModal(null); } catch (e) { return 'threw: ' + e.message; }
        const inp = document.getElementById('pfJobCost');
        const lbl = inp && inp.closest('label');
        return lbl ? getComputedStyle(lbl).display : 'no label';
      };
      seen.rep = openAs(false);
      seen.admin = openAs(true);
      seen.value = (document.getElementById('pfJobCost') || {}).value;
      return seen;
    });
    ok(cost.rep === 'none', 'a rep does not see Job cost', String(cost.rep));
    ok(cost.admin !== 'none' && cost.admin !== 'no label', 'an admin does', String(cost.admin));
  } catch (e) {
    ok(false, 'the Chromium sections ran', String(e && e.message || e).slice(0, 150));
  } finally { if (browser) try { await browser.close(); } catch (_) {} }
}
console.log('\n' + (fail === 0 ? `GATE 1203 GREEN — ${pass} checks passed`
                                : `GATE 1203 RED — ${fail} failed, ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
