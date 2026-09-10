#!/usr/bin/env node
/* gate_1204 — the document editor's send is one tap, and the way out says Back.
 *
 *   node gate_1204.mjs [index.html]        the build must be GREEN
 *   node gate_1204.mjs <1203 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, and where the three sends sit in the markup —
 *      ahead of #edMoreBtn and OUTSIDE #edSecondary, each still exactly once.
 *   B  Phone 390x844, a published document open: Email / Text / Share each have
 *      a real box, each is the top element at its own centre (one tap, no
 *      drawer), and all three sit ABOVE "Mark sent". 1203 gives them no box at
 *      all — they are inside a display:none wrapper.
 *   C  The drawer does not offer them twice. They were MOVED, so ⋯ More must no
 *      longer list a single one of them, and must still list Download.
 *   D  The client chip says "‹ Back", is not truncated at 390px, and still
 *      leaves the editor when tapped.
 *   E  iPad 1194: the desktop arrangement is unchanged in kind — #edSecondary is
 *      still display:contents and the status row is still to the LEFT of the
 *      buttons, not under them.
 *
 * ⚠ A skipped browser section is a FAILURE here, not a pass (BUG_CLASSES 87):
 * gate_1201 and gate_1202 both reported GREEN in CI on an artifact carrying
 * their own break, because a hard-coded Playwright path made every browser
 * section skip quietly.
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
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return !!c; };

console.log('\nA  static — where the sends live in the markup');
const st = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!st && Number(st[1]) >= 1204, 'app stamp is 1204 or above', st ? 'build ' + st[1] : 'none');
ok(/\{\s*b:\s*1204\s*,/.test(html), 'CHANGELOG carries a build-1204 entry');

const SENDS = ['id="emailDocBtn"', 'id="textSignBtn"', 'id="shareBtn"'];
for (const s of SENDS) {
  const n = html.split(s).length - 1;
  ok(n === 1, `${s} exists exactly once — moved, never copied`, n + 'x');
}
const iMore = html.indexOf('id="edMoreBtn"');
const iSec = html.indexOf('id="edSecondary"');
ok(iMore > 0 && iSec > iMore, 'the drawer span still comes after the More button');
for (const s of SENDS) {
  const i = html.indexOf(s);
  ok(i > 0 && i < iMore, `${s} is a PRIMARY — ahead of ⋯ More`,
     i < iMore ? 'primary' : 'still inside the drawer set');
}
/* The secondary set shrank by exactly the three that moved. */
{
  const j = html.indexOf('<span id="edSecondary">');
  const k = html.indexOf('</span>\n      <div id="edDrawer"', j);
  const n = j > 0 && k > j ? html.slice(j, k).split('<button ').length - 1 : -1;
  ok(n === 8, 'the drawer set holds 8 buttons (11 minus the three sends)', String(n));
}
ok(html.includes('#edClientChip{max-width:210px;}'), 'the client chip has room for its own label');
ok(html.includes('.toolbar .statuswrap{order:3;}'), 'the phone status row is ordered after the buttons');
ok(!html.includes('.toolbar .statuswrap{font-size:11px;}'),
   'the dead phone statuswrap rule is gone, not out-specified');
{
  const iLive = html.indexOf('.toolbar .statuswrap{order:3;}');
  const iUncond = html.indexOf('.toolbar .statuswrap{display:flex;');
  ok(iUncond > 0 && iLive > iUncond,
     'and the live rule sits AFTER the unconditional one, so it wins',
     'uncond@' + iUncond + ' order@' + iLive);
}
ok(html.includes("'<b class=\"edbk\">\\u2039 Back</b>'"), 'the chip renders a Back label');

const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');

if (!(existsSync(setupPath) && existsSync(mockPath))) {
  ok(false, 'sections B-E RAN — a skipped browser section is not a pass',
     `setup:${existsSync(setupPath)} mock:${existsSync(mockPath)}`);
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8'); const MOCK = readFileSync(mockPath, 'utf8');
  let browser = null;
  try {
    browser = await launchChromium(chromium);
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

    /* The rep's own landing place: a published estimate document, opened from
       the job. Seeded into the same store the mock reads, then opened through
       the SHIPPED window.openEditor — the call the Documents tile makes. */
    const opened = await page.evaluate(async () => {
      try {
        const s = (window.__sentinelStates || []).find(x => x.name === 'client');
        if (s) await s.run();
        window.__SEED__.inspection_reports.push({
          id: 'r1', title: 'Estimate EST-2026-0001 \u2014 7990 Germantown Pike',
          project: 'Mark Diamond', project_id: 'p1', status: 'unsent',
          sent_at: null, signed_at: null, share_token: 'tok1', total: 12500,
          html: '<html><body><h1>Estimate</h1></body></html>',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: 'nick@cardinalrenovations.net'
        });
        await window.openEditor('r1');
        return { ok: true };
      } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    });
    await page.waitForTimeout(900);
    const isOpen = await page.evaluate(() => {
      const v = document.getElementById('editorView');
      return !!v && v.classList.contains('open') && getComputedStyle(v).display !== 'none';
    });
    if (!ok(opened.ok && isOpen, 'the published document opens in the editor',
            opened.err || (isOpen ? 'open' : 'not open'))) {
      /* Everything below reads this screen; say so rather than reporting
         silence as agreement (BUG_CLASSES 37). */
      ok(false, 'sections B-D RAN — the editor never opened, so nothing was measured');
    } else {
      console.log('\nB  phone 390 — the send is one tap, and it is above "Mark sent"');
      const bar = await page.evaluate(() => {
        const box = (id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const hit = (r.width > 0 && r.height > 0)
            ? document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))
            : null;
          return {
            id, w: Math.round(r.width), h: Math.round(r.height),
            top: Math.round(r.top), bottom: Math.round(r.bottom),
            display: cs.display,
            reachable: !!(hit && (hit === el || el.contains(hit))),
            label: (el.textContent || '').trim()
          };
        };
        return {
          sends: ['emailDocBtn', 'textSignBtn', 'shareBtn'].map(box),
          mark: box('toggleStatusBtn'),
          more: box('edMoreBtn'),
          secondaryDisplay: getComputedStyle(document.getElementById('edSecondary')).display,
          toolbarH: Math.round(document.querySelector('#editorView .toolbar').getBoundingClientRect().height),
          scrollW: document.documentElement.scrollWidth, innerW: innerWidth
        };
      });
      for (const s of bar.sends) {
        ok(!!s && s.w > 0 && s.h > 0, `${s ? s.id : '?'} has a box on the phone`,
           s ? `${s.w}x${s.h} display:${s.display}` : 'missing');
        ok(!!s && s.reachable, `${s ? s.id : '?'} is the top element at its own centre — one tap`,
           s ? String(s.reachable) : 'missing');
      }
      const markTop = bar.mark ? bar.mark.top : -1;
      ok(bar.mark && bar.mark.h > 0, '"Mark sent" is still there', bar.mark ? bar.mark.label : 'missing');
      ok(bar.sends.every(s => s && s.h > 0 && s.bottom <= markTop + 1),
         'every send sits ABOVE "Mark sent"',
         bar.sends.map(s => s ? s.id + '@' + s.bottom : '?').join(' ') + ' vs mark@' + markTop);
      ok(bar.scrollW <= bar.innerW, 'the phone does not scroll sideways',
         bar.scrollW + ' vs ' + bar.innerW);
      console.log('        toolbar ' + bar.toolbarH + 'px tall · send targets ' +
                  bar.sends.map(s => s ? s.h + 'px' : '-').join('/') +
                  ' · #edSecondary display:' + bar.secondaryDisplay);

      console.log('\nC  ⋯ More does not offer the same send twice');
      const drawer = await page.evaluate(async () => {
        const b = document.getElementById('edMoreBtn');
        if (!b) return { err: 'no More button' };
        b.click();
        await new Promise(r => setTimeout(r, 250));
        const d = document.getElementById('edDrawer');
        const rows = [...(d ? d.querySelectorAll('.edrow') : [])].map(r => (r.textContent || '').trim());
        const openNow = !!d && d.classList.contains('open');
        document.body.click();
        return { rows, openNow };
      });
      ok(!drawer.err && drawer.openNow, 'the drawer still opens', drawer.err || 'open');
      ok(Array.isArray(drawer.rows) && drawer.rows.length > 0, 'and still has rows',
         (drawer.rows || []).join(' · '));
      for (const dupe of ['Email to client', 'Text to sign', 'Share link']) {
        ok((drawer.rows || []).every(r => r !== dupe), `the drawer no longer lists "${dupe}"`,
           (drawer.rows || []).includes(dupe) ? 'listed twice' : 'not listed');
      }
      ok((drawer.rows || []).includes('Download'), 'Download is still one tap away in the drawer');

      console.log('\nD  the way out says Back');
      const chip = await page.evaluate(() => {
        const c = document.getElementById('edClientChip');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return {
          text: (c.textContent || '').trim(), title: c.getAttribute('title') || '',
          shown: getComputedStyle(c).display !== 'none' && r.width > 0,
          truncated: c.scrollWidth > c.clientWidth + 1,
          w: Math.round(r.width), h: Math.round(r.height),
          /* textContent runs the label straight into the name; the gap is a flex
             gap, so it has to be measured rather than read out of a string. */
          gap: (function(){
            const b = c.querySelector('.edbk'); if (!b) return -1;
            const br = b.getBoundingClientRect();
            const next = [...c.childNodes].map(function(n){
              if (n.nodeType === 1) return n.getBoundingClientRect();
              if (n.nodeType === 3 && n.textContent.trim()) {
                const rg = document.createRange(); rg.selectNodeContents(n);
                return rg.getBoundingClientRect();
              }
              return null;
            }).filter(function(x){ return x && x.left >= br.right - 0.5; })
              .sort(function(a, b2){ return a.left - b2.left; })[0];
            return next ? Math.round(next.left - br.right) : -1;
          })()
        };
      });
      ok(!!chip && chip.shown, 'the client chip is on the bar', chip ? chip.w + 'x' + chip.h : 'missing');
      ok(!!chip && chip.text.indexOf('\u2039 Back') === 0, 'and it reads "‹ Back" first',
         chip ? JSON.stringify(chip.text) : 'missing');
      ok(!!chip && /Mark Diamond/.test(chip.text), 'the client name is still on it',
         chip ? JSON.stringify(chip.text) : 'missing');
      ok(!!chip && !chip.truncated, 'nothing on the chip is cut off at 390px',
         chip ? (chip.truncated ? 'truncated' : 'fits') : 'missing');
      ok(!!chip && /Back to/.test(chip.title), 'its title names the client too',
         chip ? JSON.stringify(chip.title) : 'missing');
      ok(!!chip && chip.gap >= 3, 'the Back label does not run into the client name',
         chip ? chip.gap + 'px flex gap' : 'missing');

      const left = await page.evaluate(async () => {
        const c = document.getElementById('edClientChip');
        if (!c) return { err: 'no chip' };
        c.click();
        await new Promise(r => setTimeout(r, 1200));
        const v = document.getElementById('editorView');
        return { stillOpen: !!v && v.classList.contains('open') };
      });
      ok(!left.err && left.stillOpen === false, 'tapping it really leaves the editor',
         left.err || ('editor open: ' + left.stillOpen));

      console.log('\nE  iPad 1194 — the desktop arrangement is unchanged in kind');
      await page.setViewportSize({ width: 1194, height: 834 });
      const wide = await page.evaluate(async () => {
        try { await window.openEditor('r1'); } catch (e) { return { err: String(e && e.message || e) }; }
        await new Promise(r => setTimeout(r, 700));
        const b = (id) => {
          const el = document.getElementById(id); if (!el) return null;
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
        };
        const sw = document.querySelector('#editorView .statuswrap');
        const eb = document.querySelector('#editorView .edbtns');
        return {
          secondaryDisplay: getComputedStyle(document.getElementById('edSecondary')).display,
          sends: ['emailDocBtn', 'textSignBtn', 'shareBtn'].map(b),
          statusLeft: sw ? Math.round(sw.getBoundingClientRect().left) : -1,
          statusTop: sw ? Math.round(sw.getBoundingClientRect().top) : -1,
          btnsLeft: eb ? Math.round(eb.getBoundingClientRect().left) : -1,
          btnsTop: eb ? Math.round(eb.getBoundingClientRect().top) : -1,
          scrollW: document.documentElement.scrollWidth, innerW: innerWidth
        };
      });
      ok(!wide.err, 'the document reopens at 1194', wide.err || 'open');
      ok(wide.secondaryDisplay === 'contents', '#edSecondary is still display:contents on desktop',
         String(wide.secondaryDisplay));
      ok((wide.sends || []).every(s => s && s.w > 0 && s.h > 0), 'all three sends render at 1194',
         (wide.sends || []).map(s => s ? s.w + 'x' + s.h : 'missing').join(' '));
      /* NOT "to the left of": the desktop toolbar has always wrapped its button
         set onto its own line (measured identically on 1203 — status at top 10,
         buttons at top 68), so left-of is not the relationship to assert. What
         must hold is that the status row still comes FIRST on desktop; only the
         phone reorders it. The first version of this check asserted left-of and
         went red on correct code, on both artifacts. */
      ok(wide.statusTop >= 0 && wide.statusTop <= wide.btnsTop,
         'the status row still comes first on desktop — only the phone reorders it',
         `status ${wide.statusLeft},${wide.statusTop} · buttons ${wide.btnsLeft},${wide.btnsTop}`);
      ok(wide.scrollW <= wide.innerW, 'and 1194 does not scroll sideways',
         wide.scrollW + ' vs ' + wide.innerW);
    }
  } catch (e) {
    ok(false, 'the browser sections ran without throwing', String(e && e.message || e));
  } finally {
    if (browser) await browser.close();
  }
}

console.log(`\n${fail ? 'GATE 1204 RED' : 'GATE 1204 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
