#!/usr/bin/env node
/* gate_1201 — publishing offers the three real sends, and NOTHING is called
 * Sent until the document really goes out.
 *
 *   node gate_1201.mjs [index.html]        the build must be GREEN
 *   node gate_1201.mjs <1200 index.html>   the control: RED
 *
 *   A  STATIC: the stamp floor, the changelog, the false question gone (the
 *      CALL form — a comment in the new code quotes the old wording, and a
 *      bare phrase count finds its own prose).
 *   B  crAsk IS STILL THE OLD SHEET when nothing asks for choices. Driven in
 *      Chromium: a plain crAsk resolves true on the go button and false on
 *      cancel, Escape and the scrim, exactly as every existing caller needs.
 *   C  crAsk WITH choices: one button per choice, the single go verb hidden,
 *      the cancel label honoured, and the promise resolves the chosen id.
 *      Contrast is computed on the rendered buttons in BOTH themes — this is
 *      a new colour-bearing element and the floor is arithmetic, not opinion.
 *   D  THE PUBLISH FLOW, end to end on the mock rig: publish a real estimate,
 *      and the sheet that appears must offer Email / Text to sign / Copy share
 *      link / Not now. "Not now" must write NOTHING. Choosing a send must
 *      still write nothing until cr-doc-sent fires FOR THAT DOCUMENT — a wrong
 *      docId must not count. Only then is the estimate marked sent.
 *
 * On the 1200 tree the sheet asks "Mark it as Sent?" with Continue/Cancel and
 * Continue writes status:'sent' with nothing sent — C and D must fail there.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const html = readFileSync(artifact, 'utf8');

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return c; };

/* ------------------------------------------------------------------ A */
console.log('\nA  static');
const stampM = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!stampM && Number(stampM[1]) >= 1201, 'app stamp is 1201 or above', stampM ? 'build ' + stampM[1] : 'none');
ok(/\{\s*b:\s*1201\s*,/.test(html), 'CHANGELOG carries a build-1201 entry');
ok(html.indexOf("crAsk('Estimate published.\\n\\nMark it as Sent?") === -1,
   'the "Mark it as Sent?" question is no longer ASKED');
ok(html.includes("function crDocSent(docId){"), 'crDocSent is defined');
ok((html.match(/crDocSent\(/g) || []).length === 3,
   'crDocSent: one definition and exactly two write sites',
   'found ' + (html.match(/crDocSent\(/g) || []).length);
ok(html.includes("function crAwaitDocSent(docId, ms){"), 'crAwaitDocSent is defined');
ok(html.includes('crAwaitDocSent(d.docId)'), 'the publish sheet waits on the published document');
ok(html.includes("#crAsk .askpick{"), 'the choice button has its own style');
ok(html.includes(':root[data-theme="rb-light"] #crAsk .askpick{'), 'and a light twin');

/* ------------------------------------------------------- the browser rig */
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
  const SETUP = readFileSync(setupPath, 'utf8');
  const MOCK = readFileSync(mockPath, 'utf8');

  let browser = null;
  try {
    browser = await launchChromium(chromium);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept('gate@cardinalrenovations.net').catch(() => {}));
    await page.addInitScript(SETUP);
    await page.route('**/*', async (route) => {
      const u = route.request().url(); const url = new URL(u);
      if (url.hostname === 'app.cardinalroster.com') {
        if (url.pathname === '/' || url.pathname === '/index.html')
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        if (url.pathname.startsWith('/api/'))
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"sent":1,"rows":[],"items":[]}' });
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

    /* ---------------------------------------------------------------- B */
    console.log('\nB  crAsk is unchanged for every existing caller');
    const plain = await page.evaluate(async () => {
      const out = {};
      const shape = () => {
        const n = document.getElementById('crAsk');
        return { picks: n.querySelectorAll('.askpick').length,
                 goShown: getComputedStyle(n.querySelector('.askgo')).display !== 'none' };
      };
      let p = window.crAsk('Delete this?');
      await new Promise(r => setTimeout(r, 60));
      out.shape = shape();
      document.querySelector('#crAsk .askgo').click();
      out.go = await p;
      p = window.crAsk('Delete this?');
      await new Promise(r => setTimeout(r, 60));
      document.querySelector('#crAsk .askno').click();
      out.no = await p;
      p = window.crAsk('Delete this?');
      await new Promise(r => setTimeout(r, 60));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      out.esc = await p;
      return out;
    });
    ok(plain.go === true, 'a plain crAsk still resolves TRUE on the go button', JSON.stringify(plain.go));
    ok(plain.no === false, 'and FALSE on cancel', JSON.stringify(plain.no));
    ok(plain.esc === false, 'and FALSE on Escape', JSON.stringify(plain.esc));
    ok(plain.shape.picks === 0 && plain.shape.goShown,
       'with no choices the sheet shows the go button and no choice buttons', JSON.stringify(plain.shape));

    /* ---------------------------------------------------------------- C */
    console.log('\nC  crAsk with choices');
    const ch = await page.evaluate(async () => {
      const ratio = (fg, bg) => {
        const lum = (c) => {
          const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
            v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const a = lum(fg), b2 = lum(bg);
        return Math.round(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)) * 100) / 100;
      };
      const p = window.crAsk('Send it to Mark Diamond?', {
        choices: [{ id: 'email', label: 'Email to client', hint: 'Opens the send-for-signature email' },
                  { id: 'text', label: 'Text to sign', hint: 'Opens Messages with the signing link' },
                  { id: 'share', label: 'Copy share link', hint: 'A link the client can review and sign' }],
        cancel: 'Not now'
      });
      await new Promise(r => setTimeout(r, 80));
      const n = document.getElementById('crAsk');
      const picks = [...n.querySelectorAll('.askpick')];
      const first = picks[0], small = first && first.querySelector('small');
      const cs = first && getComputedStyle(first);
      const shot = {
        count: picks.length,
        labels: picks.map(b => b.childNodes[0].textContent.trim()),
        ids: picks.map(b => b.getAttribute('data-pick')),
        goHidden: getComputedStyle(n.querySelector('.askgo')).display === 'none',
        cancel: n.querySelector('.askno').textContent.trim(),
        minH: picks.map(b => Math.round(b.getBoundingClientRect().height)),
        label: cs ? ratio(cs.color, cs.backgroundColor) : 0,
        hint: small ? ratio(getComputedStyle(small).color, cs.backgroundColor) : 0
      };
      /* BUG_CLASSES 37: on a tree with no choices this used to throw, and a
         crashed control reports nothing at all. Close the sheet the honest way
         instead and let each assertion below fail on its own. */
      if(picks[2]) picks[2].click();
      else { const no = n.querySelector('.askno'); if(no) no.click(); }
      shot.resolved = await p;
      return shot;
    });
    ok(ch.count === 3, 'three choices render as three buttons', 'got ' + ch.count);
    ok(ch.ids.join(',') === 'email,text,share', 'each carries its id', ch.ids.join(','));
    ok(ch.goHidden, 'the single go verb is hidden — the choices are the actions');
    ok(ch.cancel === 'Not now', 'the cancel label is honoured', ch.cancel);
    ok(ch.resolved === 'share', 'the promise resolves the CHOSEN id', JSON.stringify(ch.resolved));
    ok(ch.minH.every(h => h >= 44), 'every choice clears the 44px tap floor', ch.minH.join(','));
    ok(ch.label >= 4.5, 'the choice label clears 4.5:1 (dark)', ch.label + ':1');
    ok(ch.hint >= 4.5, 'the hint line clears 4.5:1 (dark)', ch.hint + ':1');

    const chLight = await page.evaluate(async () => {
      document.documentElement.setAttribute('data-theme', 'rb-light');
      const ratio = (fg, bg) => {
        const lum = (c) => {
          const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
            v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const a = lum(fg), b2 = lum(bg);
        return Math.round(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)) * 100) / 100;
      };
      const p = window.crAsk('Q', { choices: [{ id: 'a', label: 'A', hint: 'h' }], cancel: 'No' });
      await new Promise(r => setTimeout(r, 80));
      const b = document.querySelector('#crAsk .askpick');
      const cs = b ? getComputedStyle(b) : null;
      const sm = b ? b.querySelector('small') : null;
      const out = { label: cs ? ratio(cs.color, cs.backgroundColor) : 0,
                    hint: (cs && sm) ? ratio(getComputedStyle(sm).color, cs.backgroundColor) : 0 };
      const _no = document.querySelector('#crAsk .askno'); if(_no) _no.click();
      await p;
      document.documentElement.removeAttribute('data-theme');
      return out;
    });
    ok(chLight.label >= 4.5, 'the choice label clears 4.5:1 (light)', chLight.label + ':1');
    ok(chLight.hint >= 4.5, 'the hint line clears 4.5:1 (light)', chLight.hint + ':1');

    /* ---------------------------------------------------------------- D */
    console.log('\nD  the publish flow, end to end');
    await page.evaluate(async () => {
      window.__docId = null;
      document.addEventListener('cr-est-published', (e) => { window.__docId = (e.detail || {}).docId; });
      window.__clicked = [];
      const s = (window.__sentinelStates || []).find(x => x.name === 'client');
      if (s) await s.run();
    });
    await page.waitForTimeout(900);
    await page.evaluate(async () => {
      const p = (window.cacheProjects || []).find(x => x.id === 'p1') || window.currentProject;
      await window.CardinalEstimates.openEditor(p);
    });
    await page.waitForTimeout(900);
    await page.locator('#cr-est-view button').filter({ hasText: /custom/i }).first().click({ timeout: 5000 });
    await page.waitForTimeout(400);
    await page.locator('#cr-est-view input[placeholder="Item name"]').last().fill('Full roof replacement');
    const price = page.locator('#cr-est-view input[data-lf="unit_price"]').last();
    await price.fill('12500'); await price.dispatchEvent('input');
    await page.locator('#cr-est-view button').filter({ hasText: /save draft/i }).last().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    /* neutralise the real send handlers: this gate proves the CHOREOGRAPHY,
       not the email rail, and a live prompt/fetch would test the rig. */
    await page.evaluate(() => {
      ['emailDocBtn', 'textSignBtn', 'shareBtn'].forEach((id) => {
        const b = document.getElementById(id);
        if (b) b.click = function () { window.__clicked.push(id); };
      });
    });
    await page.locator('#cr-est-view button').filter({ hasText: /^publish$/i }).last().click({ timeout: 5000 });
    await page.waitForTimeout(2600);

    const sheet = await page.evaluate(() => {
      const n = document.getElementById('crAsk');
      const open = n && n.classList.contains('open');
      const picks = n ? [...n.querySelectorAll('.askpick')] : [];
      return { open, labels: picks.map(b => b.childNodes[0].textContent.trim()),
               ids: picks.map(b => b.getAttribute('data-pick')),
               cancel: n ? n.querySelector('.askno').textContent.trim() : '',
               q: n ? n.querySelector('.askq').textContent.trim() : '',
               docId: window.__docId };
    });
    ok(sheet.open, 'publishing opens the sheet');
    ok(sheet.ids.join(',') === 'email,text,share',
       'it offers the three real sends', sheet.ids.join(',') || '(none)');
    ok(sheet.cancel === 'Not now', 'and Not now', sheet.cancel);
    ok(/send it to/i.test(sheet.q) && !/mark it as sent/i.test(sheet.q),
       'the headline ASKS about sending, and never about marking sent', sheet.q);
    ok(!!sheet.docId, 'the published document id reached the sheet', String(sheet.docId).slice(0, 12));

    const sentWrites = () => page.evaluate(() => (window.__WRITES__ || []).filter(
      w => w.table === 'estimates' && w.op === 'update' &&
           JSON.stringify(w.payload || {}).indexOf('"status":"sent"') !== -1).length);

    /* pick a send — nothing may be claimed yet */
    await page.evaluate(() => {
      const b = document.querySelector('#crAsk .askpick[data-pick="email"]');
      if (b) { b.click(); return; }
      /* control tree: no choices exist. Take the sheet's own go button so the
         flow continues and the writes below are measured, not skipped. */
      const go = document.querySelector('#crAsk .askgo');
      if (go && getComputedStyle(go).display !== 'none') go.click();
    });
    await page.waitForTimeout(900);
    const clicked = await page.evaluate(() => window.__clicked.slice());
    ok(clicked.indexOf('emailDocBtn') !== -1, 'choosing Email presses the shipped Email button', clicked.join(','));
    ok(await sentWrites() === 0, 'nothing is marked Sent on the TAP', String(await sentWrites()));

    /* a DIFFERENT document being sent must not count */
    await page.evaluate(() => document.dispatchEvent(
      new CustomEvent('cr-doc-sent', { detail: { docId: 'some-other-doc' } })));
    await page.waitForTimeout(700);
    ok(await sentWrites() === 0, 'another document going out does not mark this estimate Sent', String(await sentWrites()));

    /* the real one */
    await page.evaluate(() => document.dispatchEvent(
      new CustomEvent('cr-doc-sent', { detail: { docId: window.__docId } })));
    await page.waitForTimeout(1400);
    ok(await sentWrites() >= 1, 'once THAT document is really sent, the estimate is marked Sent', String(await sentWrites()));
  } catch (e) {
    ok(false, 'the Chromium sections ran', String(e && e.message || e).slice(0, 160));
  } finally {
    if (browser) try { await browser.close(); } catch (_) {}
  }
}

console.log('\n' + (fail === 0 ? `GATE 1201 GREEN — ${pass} checks passed`
                                : `GATE 1201 RED — ${fail} failed, ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
