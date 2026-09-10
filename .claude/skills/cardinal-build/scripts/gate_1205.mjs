#!/usr/bin/env node
/* gate_1205 — the estimate builder's toolbar clears the 44px floor and stops
 * hiding a button off the right-hand edge.
 *
 *   node gate_1205.mjs [index.html]        the build must be GREEN
 *   node gate_1205.mjs <1204 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, and that the two button rules carry the floor.
 *   B  Phone 390x844, #cr-est-view open on a real job: EVERY button in
 *      .cr-est-head is >= 44px tall, none crosses the right edge, and the row
 *      does not scroll sideways. 1204 renders them 26px with "-> Contract"
 *      past the viewport.
 *   C  The line-item Add buttons clear the floor too (A11's parenthetical).
 *   D  iPad 1194: same floor, no sideways scroll, and .cr-est-phonebar is
 *      still the desktop-hidden thumb bar it has been since 1029.
 *
 * ⚠ Measured in a real engine, not read off the file: three DIFFERENT modules
 * inject buttons into this one row (the base render, cr-epub's
 * Preview/Options/Publish, cr-e2c's -> Contract), so a static check on the
 * stylesheet cannot tell you what the row actually contains.
 *
 * ⚠ A skipped browser section is a FAILURE here, not a pass (BUG_CLASSES 87).
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const html = readFileSync(artifact, 'utf8');
/* ⚠ THE WATCHDOG MUST TAKE THE BROWSER WITH IT. A bare process.exit(3) here
   leaves Playwright's Chromium running as an orphan holding the stdout pipe it
   inherited, and gate_chromium's execFileSync then blocks reading that pipe
   FOREVER — 85 minutes of CI on 10 Sep, cancelled by hand, on a suite that
   takes 5m31s. The runner now writes child output to a file so it can never
   happen again from that side; this is the same fix from this side. */
let BROWSER = null;
setTimeout(async () => {
  console.log('GATE TIMEOUT');
  try { if (BROWSER) await BROWSER.close(); } catch (_) {}
  process.exit(3);
}, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return !!c; };
const FLOOR = 44;

console.log('\nA  static');
const st = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!st && Number(st[1]) >= 1205, 'app stamp is 1205 or above', st ? 'build ' + st[1] : 'none');
ok(/\{\s*b:\s*1205\s*,/.test(html), 'CHANGELOG carries a build-1205 entry');
ok(/\.cr-est-head button\{[^}]*min-height:44px/.test(html), 'the toolbar rule carries the 44px floor');
ok(/\.cr-est-items-head button\{[^}]*min-height:44px/.test(html), 'the line-item Add rule carries it too');
ok(html.includes('.cr-est-head{flex-wrap:wrap;}'), 'the phone rule lets the row wrap');
ok(html.includes('.cr-est-head{overflow-x:auto;overscroll-behavior-x:contain}'),
   'the pre-existing overflow-x rule is left alone — wrapped content never overflows');

const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');

if (!(existsSync(setupPath) && existsSync(mockPath))) {
  ok(false, 'sections B-D RAN — a skipped browser section is not a pass',
     `setup:${existsSync(setupPath)} mock:${existsSync(mockPath)}`);
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8'); const MOCK = readFileSync(mockPath, 'utf8');
  let browser = null;
  try {
    browser = await launchChromium(chromium);
    BROWSER = browser;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
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

    /* The builder behind "+ New estimate" on a real job — #cr-est-view, NOT the
       menu's #cr-estimates-mount. Three modules inject into its header on open,
       so the wait matters: measure too early and the row is short by three. */
    const openBuilder = async () => page.evaluate(async () => {
      try {
        const s = (window.__sentinelStates || []).find(x => x.name === 'client');
        if (s) await s.run();
        const E = window.CardinalEstimates;
        if (!E || !E.openEditor) return { err: 'CardinalEstimates.openEditor missing' };
        await E.openEditor('p1');
        return { ok: true };
      } catch (e) { return { err: String(e && e.message || e) }; }
    });
    const probe = () => page.evaluate((FLOOR) => {
      const v = document.getElementById('cr-est-view');
      const head = v && v.querySelector('.cr-est-head');
      if (!head) return { err: '#cr-est-view .cr-est-head not on the page' };
      const hb = head.getBoundingClientRect();
      const btn = (el) => {
        const r = el.getBoundingClientRect();
        return { label: (el.textContent || '').trim().slice(0, 18),
                 w: Math.round(r.width), h: Math.round(r.height),
                 right: Math.round(r.right), top: Math.round(r.top) };
      };
      const heads = [...head.querySelectorAll('button')].map(btn);
      const adds = [...v.querySelectorAll('.cr-est-items-head button')].map(btn);
      const h2 = head.querySelector('h2');
      const bar = v.querySelector('.cr-est-phonebar');
      return {
        heads, adds,
        headScrollW: head.scrollWidth, headClientW: head.clientWidth,
        headH: Math.round(hb.height), wrap: getComputedStyle(head).flexWrap,
        h2Bottom: h2 ? Math.round(h2.getBoundingClientRect().bottom) : -1,
        h2Width: h2 ? Math.round(h2.getBoundingClientRect().width) : -1,
        firstBtnTop: heads.length ? Math.min(...heads.map(b => b.top)) : -1,
        barDisplay: bar ? getComputedStyle(bar).display : 'none',
        barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
        innerW: innerWidth, docScrollW: document.documentElement.scrollWidth
      };
    }, FLOOR);

    const o1 = await openBuilder();
    await page.waitForTimeout(1500);
    const p = await probe();
    if (!ok(!o1.err && !p.err, 'the estimate builder opens on a real job', o1.err || p.err || 'open')) {
      ok(false, 'sections B-D RAN — the builder never opened, so nothing was measured');
    } else {
      console.log('\nB  phone 390 — the toolbar clears the floor and stays on screen');
      ok(p.heads.length >= 4, 'the header rendered its buttons',
         p.heads.length + ': ' + p.heads.map(b => b.label).join(' · '));
      const shortH = p.heads.filter(b => b.h < FLOOR);
      ok(shortH.length === 0, `every header button is at least ${FLOOR}px tall`,
         shortH.length ? shortH.map(b => b.label + ' ' + b.w + 'x' + b.h).join(', ')
                       : p.heads.map(b => b.h).join('/') + 'px');
      const offscreen = p.heads.filter(b => b.right > p.innerW + 1);
      ok(offscreen.length === 0, 'no header button sits past the right edge',
         offscreen.length ? offscreen.map(b => b.label + '@' + b.right).join(', ') : 'all on screen');
      ok(p.headScrollW <= p.headClientW + 1, 'the header row does not scroll sideways',
         p.headScrollW + ' vs ' + p.headClientW);
      ok(p.wrap === 'wrap', 'the row is allowed to wrap on a phone', String(p.wrap));
      ok(p.h2Bottom > 0 && p.firstBtnTop >= 0 && p.h2Bottom <= p.firstBtnTop + 1,
         'the title takes its own line, above the buttons',
         'h2 bottom ' + p.h2Bottom + ' · first button top ' + p.firstBtnTop);
      ok(p.docScrollW <= p.innerW, 'and the page does not scroll sideways',
         p.docScrollW + ' vs ' + p.innerW);
      console.log('        header ' + p.headH + 'px tall · thumb bar ' + p.barH +
                  'px (' + p.barDisplay + ')');

      console.log('\nC  the line-item Add buttons (A11\u2019s parenthetical)');
      ok(p.adds.length >= 2, 'the Add row rendered',
         p.adds.length + ': ' + p.adds.map(b => b.label).join(' · '));
      const shortA = p.adds.filter(b => b.h < FLOOR);
      ok(shortA.length === 0, `every Add button is at least ${FLOOR}px tall`,
         shortA.length ? shortA.map(b => b.label + ' ' + b.w + 'x' + b.h).join(', ')
                       : p.adds.map(b => b.h).join('/') + 'px');
      ok(p.barDisplay === 'flex' && p.barH >= FLOOR,
         'the 1029 thumb bar is untouched and still under the thumb',
         p.barDisplay + ' ' + p.barH + 'px');

      console.log('\nD  iPad 1194 — the same floor, and the thumb bar stays off');
      await page.setViewportSize({ width: 1194, height: 834 });
      await page.waitForTimeout(600);
      const w = await probe();
      ok(!w.err, 'the builder is still open at 1194', w.err || 'open');
      const shortW = (w.heads || []).filter(b => b.h < FLOOR);
      ok(shortW.length === 0, `every header button clears ${FLOOR}px at 1194`,
         shortW.length ? shortW.map(b => b.label + ' ' + b.h).join(', ')
                       : (w.heads || []).map(b => b.h).join('/') + 'px');
      ok(w.headScrollW <= w.headClientW + 1, 'the header does not scroll sideways at 1194',
         w.headScrollW + ' vs ' + w.headClientW);
      ok(w.barDisplay === 'none', 'the thumb bar is still desktop-hidden', String(w.barDisplay));
      ok(w.docScrollW <= w.innerW, 'and 1194 does not scroll sideways',
         w.docScrollW + ' vs ' + w.innerW);
    }
  } catch (e) {
    ok(false, 'the browser sections ran without throwing', String(e && e.message || e));
  } finally {
    if (browser) await browser.close();
  }
}

console.log(`\n${fail ? 'GATE 1205 RED' : 'GATE 1205 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
