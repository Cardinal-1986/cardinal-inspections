#!/usr/bin/env node
/* gate_1207 — the header search answers while you type, and it answers with the
 * SAME matcher the directory uses.
 *
 *   node gate_1207.mjs [index.html]        the build must be GREEN
 *   node gate_1207.mjs <1206 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, one crClientHay with three callers, and no
 *      inline haystack left carrying created_by.
 *   B  iPad 1194: type "Diamond" — five-or-fewer rows appear naming the client,
 *      one character shows nothing, Escape closes, and every row clears the 44px
 *      floor build 1206 put a ratchet on.
 *   C  Tapping a row opens that client. Return still opens the Clients directory
 *      filtered, exactly as before — the path this build did not change.
 *   D  Phone 390 behind the lens, and the ink is COMPUTED in both themes against
 *      the panel's own ground, not eyeballed (the app's most repeated defect).
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
   inherited, and gate_chromium's execFileSync would then block reading that
   pipe. Precautionary, not a fix for anything observed — the "85 minute hang"
   this comment used to cite was me misreading GitHub's jobs API, and the run I
   cancelled over it had been going four minutes (BUG_CLASSES 90). The hazard is
   still real; gate_chromium closes it from the other side by writing child
   output to a file. */
let BROWSER = null;
setTimeout(async () => {
  console.log('GATE TIMEOUT');
  try { if (BROWSER) await BROWSER.close(); } catch (_) {}
  process.exit(3);
}, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return !!c; };

console.log('\nA  static — one matcher, three callers');
const st = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!st && Number(st[1]) >= 1207, 'app stamp is 1207 or above', st ? 'build ' + st[1] : 'none');
ok(/\{\s*b:\s*1207\s*,/.test(html), 'CHANGELOG carries a build-1207 entry');
ok(html.split('function crClientHay(').length - 1 === 1, 'crClientHay is defined exactly once');
ok(html.split('crClientHay(pr)').length - 1 === 4,
   'and is used by three callers — the directory, Insurance Clients, the live search',
   (html.split('crClientHay(pr)').length - 1) + ' occurrence(s) incl. the definition');
ok(html.split('pr.email, pr.created_by,').length - 1 === 1,
   'no inline haystack carrying created_by survives outside it');
ok(html.includes('#cr-hsres{position:fixed;'), 'the results panel is positioned from the input, not parented to it');

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
    await page.goto('https://app.cardinalroster.com/?as=theo', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    /* ⚠ LEAVE THE LANDING FIRST. The header search does not exist on the sign-in
       screen, and the first version of this gate typed straight after boot: the
       rows rendered into a display:none panel, every rect came back 0, and
       "the panel sits directly under the input" PASSED because |0 - 0| < 20.
       Section C passed too — a programmatic .click() works fine on a hidden
       element, which is the trap CLAUDE.md names in as many words. */
    const openLens = async () => page.evaluate(async () => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'home');
      if (s) { try { await s.run(); } catch (e) { return { err: String(e && e.message || e) }; } }
      await new Promise(r => setTimeout(r, 700));
      /* ⚠ THE SEARCH IS BEHIND THE LENS AT EVERY WIDTH, not just on a phone.
         #cr-hd2-srch is display:none until #cr-hd2-lens is tapped — measured,
         after the first version of this gate typed into a 0x0 input at 1194 and
         called it a desktop. (#cr-search-btn and .cr-ib.searchbtn are the older
         controls and are both display:none; grep found them first.) */
      const lens = document.getElementById('cr-hd2-lens');
      if (!lens) return { err: 'no #cr-hd2-lens' };
      if (getComputedStyle(document.getElementById('cr-hd2-srch') || document.body).display === 'none') lens.click();
      await new Promise(r => setTimeout(r, 450));
      const i = document.getElementById('headSearch');
      const r = i ? i.getBoundingClientRect() : null;
      return { w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
               where: i && i.parentElement ? (i.parentElement.id || i.parentElement.className) : 'nowhere' };
    });
    const landed = await openLens();
    if (!ok(!landed.err && landed.w > 2 && landed.h > 2,
            'the header search is really on screen before anything is typed',
            landed.err || `${landed.w}x${landed.h} in ${landed.where}`)) {
      ok(false, 'sections B-D RAN — nothing below was measured against a visible input');
    }

    /* type into the SHIPPED input the way a rep does, then read what rendered */
    const type = (q) => page.evaluate(async (q) => {
      const i = document.getElementById('headSearch');
      if (!i) return { err: 'no #headSearch' };
      i.focus(); i.value = q;
      i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const p = document.getElementById('cr-hsres');
      const open = !!p && p.classList.contains('open');
      const rows = p ? [...p.querySelectorAll('.hsrow')] : [];
      const ir = i.getBoundingClientRect(), pr = p ? p.getBoundingClientRect() : null;
      return {
        open, n: rows.length,
        labels: rows.map(r => (r.textContent || '').trim().slice(0, 40)),
        minH: rows.length ? Math.min(...rows.map(r => Math.round(r.getBoundingClientRect().height))) : -1,
        foot: p ? !!p.querySelector('.hsfoot') : false,
        none: p ? !!p.querySelector('.hsnone') : false,
        /* both require a REAL box on both elements — a zero rect must not pass */
        underInput: !!(pr && pr.height > 2 && ir.height > 2 && Math.abs(pr.top - ir.bottom) < 20),
        onScreen: !!(pr && pr.width > 2 && pr.left >= 0 && pr.right <= innerWidth + 1)
      };
    }, q);

    console.log('\nB  iPad 1194 — it answers while you type');
    const one = await type('D');
    ok(!one.err && one.open === false, 'one character shows nothing', one.err || ('open: ' + one.open));
    const many = await type('Diamond');
    ok(many.open === true, 'typing a name opens the panel', 'rows: ' + many.n);
    ok(many.n > 0 && many.n <= 5, 'it shows at most five matches', String(many.n));
    ok(many.labels.some(l => /Mark Diamond/.test(l)), 'and the right client is in them',
       many.labels.join(' | ') || 'none');
    ok(many.minH >= 44, 'every row clears the 44px floor (1206)', many.minH + 'px');
    ok(many.underInput, 'the panel sits directly under the input', String(many.underInput));
    ok(many.onScreen, 'and inside the viewport');
    const miss = await type('zzzznotaclient');
    ok(miss.open === true && miss.none === true, 'a query with no matches says so rather than vanishing',
       'open:' + miss.open + ' none:' + miss.none);
    const esc = await page.evaluate(async () => {
      const i = document.getElementById('headSearch');
      i.value = 'Diamond'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const p = document.getElementById('cr-hsres');
      return { open: !!p && p.classList.contains('open') };
    });
    ok(esc.open === false, 'Escape closes it', 'open: ' + esc.open);

    console.log('\nC  tapping opens the client — and Return still does what it did');
    const tapped = await page.evaluate(async () => {
      const i = document.getElementById('headSearch');
      i.focus(); i.value = 'Diamond'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const row = document.querySelector('#cr-hsres .hsrow');
      if (!row) return { err: 'no row to tap' };
      const pid = row.getAttribute('data-hspid');
      row.click();
      await new Promise(r => setTimeout(r, 900));
      const v = document.getElementById('projectView');
      const p = document.getElementById('cr-hsres');
      return { pid, shown: !!v && getComputedStyle(v).display !== 'none',
               name: (document.querySelector('#projectView .heroNm') || {}).textContent || '',
               stillOpen: !!p && p.classList.contains('open') };
    });
    ok(!tapped.err, 'a row is there to tap', tapped.err || ('pid ' + tapped.pid));
    ok(tapped.shown === true, 'tapping it opens that client', 'projectView shown: ' + tapped.shown);
    ok(tapped.stillOpen === false, 'and the panel closes behind it');
    const ret = await page.evaluate(async () => {
      const i = document.getElementById('headSearch');
      i.focus(); i.value = 'Diamond'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(r => setTimeout(r, 900));
      const cf = document.getElementById('cliFilter');
      const dir = document.getElementById('clientsView') || document.getElementById('cdView');
      const p = document.getElementById('cr-hsres');
      return { filter: cf ? cf.value : null, panel: !!p && p.classList.contains('open'),
               sub: (document.getElementById('cdSub') || {}).textContent || '' };
    });
    ok(ret.filter === 'Diamond', 'Return still fills the directory filter', JSON.stringify(ret.filter));
    ok(/1 of 3 clients/.test(ret.sub), 'and the directory really filtered', ret.sub.slice(0, 40));
    ok(ret.panel === false, 'the panel does not linger over the directory');

    /* the "all N matches" row exists only above five hits, and the seed has
       three clients — so give it six. It must PRESS Return, not re-implement it. */
    const foot = await page.evaluate(async () => {
      if (typeof cacheProjects === 'undefined') return { err: 'no cacheProjects' };
      for (var k = 0; k < 6; k++)
        cacheProjects.push({ id: 'zz' + k, name: 'Zebulon Test ' + k, address: '1 Test St',
                             stage: 'Lead', checklist: {}, created_at: new Date().toISOString() });
      const i = document.getElementById('headSearch');
      i.focus(); i.value = 'Zebulon'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const p = document.getElementById('cr-hsres');
      const rows = p ? p.querySelectorAll('.hsrow').length : 0;
      const f = p ? p.querySelector('.hsfoot') : null;
      const label = f ? (f.textContent || '').trim() : '';
      const cf0 = document.getElementById('cliFilter');
      if (cf0) cf0.value = '';
      if (f) f.click();
      await new Promise(r => setTimeout(r, 900));
      const cf = document.getElementById('cliFilter');
      return { rows, label, filter: cf ? cf.value : null,
               open: !!p && p.classList.contains('open') };
    });
    ok(!foot.err && foot.rows === 5, 'six matches show five rows', foot.err || String(foot.rows));
    ok(/all 6 matches/i.test(foot.label), 'and a row that says how many there are', foot.label);
    ok(foot.filter === 'Zebulon', 'tapping it goes through the SAME Return path', JSON.stringify(foot.filter));
    ok(foot.open === false, 'and closes the panel');

    console.log('\nD  phone 390 behind the lens, and the ink is COMPUTED in both themes');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await openLens();
    const phone = await page.evaluate(async () => {
      const i = document.getElementById('headSearch');
      if (!i || i.getBoundingClientRect().width < 2) return { err: 'the search input is not on screen behind the lens' };
      i.focus(); i.value = 'Diamond'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const p = document.getElementById('cr-hsres');
      const pr = p ? p.getBoundingClientRect() : null;
      return { open: !!p && p.classList.contains('open'),
               onScreen: !!(pr && pr.left >= 0 && pr.right <= innerWidth + 1),
               w: pr ? Math.round(pr.width) : 0 };
    });
    ok(!phone.err, 'the lens opens the search row on a phone', phone.err || 'open');
    ok(phone.open === true, 'and the panel answers there too');
    ok(phone.onScreen === true, 'inside a 390px viewport', phone.w + 'px wide');

    const ink = async (theme) => page.evaluate(async (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      const i = document.getElementById('headSearch');
      i.focus(); i.value = 'Diamond'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const p = document.getElementById('cr-hsres');
      if (!p) return { err: 'no panel' };
      const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
      const lum = (c) => { const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
                           return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const ratio = (a, b) => { const la = lum(a), lb = lum(b); const hi = Math.max(la, lb), lo = Math.min(la, lb);
                                return (hi + 0.05) / (lo + 0.05); };
      const ground = rgb(getComputedStyle(p).backgroundColor);
      const nm = p.querySelector('.hsnm'), mt = p.querySelector('.hsmeta');
      return { ground: getComputedStyle(p).backgroundColor,
               nm: nm ? Number(ratio(rgb(getComputedStyle(nm).color), ground).toFixed(2)) : -1,
               meta: mt ? Number(ratio(rgb(getComputedStyle(mt).color), ground).toFixed(2)) : -1 };
    }, theme);
    for (const t of ['rb-light', 'dark']) {
      const r = await ink(t === 'dark' ? '' : t);
      if (!ok(!r.err, `the panel renders in ${t}`, r.err || r.ground)) continue;
      ok(r.nm >= 4.5, `the client name clears 4.5:1 in ${t}`, r.nm + ':1 on ' + r.ground);
      ok(r.meta >= 4.5, `the PO / stage / address line clears 4.5:1 in ${t}`, r.meta + ':1 on ' + r.ground);
    }
  } catch (e) {
    ok(false, 'the browser sections ran without throwing', String(e && e.message || e));
  } finally {
    if (browser) await browser.close();
  }
}

console.log(`\n${fail ? 'GATE 1207 RED' : 'GATE 1207 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
