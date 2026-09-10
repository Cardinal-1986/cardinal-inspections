#!/usr/bin/env node
/* gate_1202 — a review request is recorded when it goes out, and the card
 * waits for a finished job.
 *
 *   node gate_1202.mjs [index.html]        the build must be GREEN
 *   node gate_1202.mjs <1201 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, one list of stages, and the writer guarded by
 *      the same list the card reads.
 *   B  THE STAGE LIST, executed from the shipped file across all nine STAGES.
 *   C  IN CHROMIUM, on a real profile:
 *        · an APPROVED job shows the card with no request buttons and says
 *          when it opens (1201 put a red Text request button there);
 *        · a COMPLETED job shows them;
 *        · tapping one and answering "Not yet" writes NOTHING (1201 wrote on
 *          the tap, before anything had been sent);
 *        · answering "Yes, it went" writes it once.
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
function brace(start) {
  const i = html.indexOf(start); if (i === -1) return null;
  let d = 0, on = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (c === '{') { d++; on = true; } else if (c === '}') { d--; if (on && d === 0) return html.slice(i, j + 1); }
  }
  return null;
}

console.log('\nA  static');
const stampM = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!stampM && Number(stampM[1]) >= 1202, 'app stamp is 1202 or above', stampM ? 'build ' + stampM[1] : 'none');
ok(/\{\s*b:\s*1202\s*,/.test(html), 'CHANGELOG carries a build-1202 entry');
ok((html.match(/var REVIEW_STAGES =/g) || []).length === 1, 'one list of review stages, not two');
ok((html.match(/reviewStageOk\(pr\)/g) || []).length === 3,
   'the writer and the card both read that list', 'sites: ' + (html.match(/reviewStageOk\(pr\)/g) || []).length);
const send = brace('async function sendReviewRequest(pr, via){');
ok(!!send, 'sendReviewRequest extracted', send ? send.length + ' chars' : 'NOT FOUND');
ok(!!send && /if\(!reviewStageOk\(pr\)\)\{/.test(send), 'the writer refuses before Completed');
ok(!!send && send.indexOf("crAsk('Did the review request go out to ") !== -1,
   'the writer ASKS whether it went out');
if (send) {
  const askAt = send.indexOf("crAsk('Did the review request go out to ");
  const writeAt = send.indexOf('review_requested_at: new Date().toISOString()');
  ok(askAt !== -1 && writeAt !== -1 && writeAt > askAt,
     'and the write comes AFTER the question, not before it',
     'ask@' + askAt + ' write@' + writeAt);
}

console.log('\nB  the stage list, executed');
const listSrc = (html.match(/var REVIEW_STAGES = \[[^\]]*\];/) || [])[0];
const fnSrc = brace('function reviewStageOk(pr){');
ok(!!listSrc && !!fnSrc, 'the list and its reader extracted', listSrc || '');
if (listSrc && fnSrc) {
  const f = new Function('normStage', listSrc + '\n' + fnSrc + '\nreturn reviewStageOk;')(s => s);
  const want = { Lead: false, Prospect: false, OnHold: false, Approved: false, Scheduled: false,
                 Completed: true, Invoiced: true, Closed: true, Lost: false };
  const wrong = Object.keys(want).filter(s => !!f({ stage: s }) !== want[s]);
  ok(wrong.length === 0, 'all nine stages route correctly',
     wrong.map(s => s + '=' + !!f({ stage: s })).join(', '));
  ok(f({ stage: 'Approved' }) === false, 'an Approved job is NOT asked for a review');
  ok(f({ stage: 'Completed' }) === true, 'a Completed job is');
}

console.log('\nC  the card, in Chromium');
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');
if (!(existsSync(PW) && existsSync(setupPath) && existsSync(mockPath))) {
  console.log('  SKIP  rig unavailable; sections A-B carry the verdict, CI runs C.');
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8');
  const MOCK = readFileSync(mockPath, 'utf8');
  let browser = null;
  try {
    browser = await chromium.launch(existsSync(CHROME)
      ? { executablePath: CHROME, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] });
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

    const openAt = (stage) => page.evaluate(async (st) => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'client');
      if (s) await s.run();
      const p = (window.cacheProjects || []).find(x => x.id === 'p1');
      if (!p) return false;
      p.stage = st;
      if (typeof window.openProject === 'function') window.openProject(p.id);
      return true;
    }, stage);
    const cardShot = () => page.evaluate(() => {
      const c = document.querySelector('.rvcard');
      if (!c) return { card: false };
      return { card: true,
               btns: [...c.querySelectorAll('[data-rv]')].map(b => b.getAttribute('data-rv')),
               hint: (c.querySelector('.rvhint') || {}).textContent || '',
               flip: !!c.querySelector('#rvLeftSwitch') };
    });

    await openAt('Approved'); await page.waitForTimeout(1200);
    const approved = await cardShot();
    ok(approved.card, 'the card still renders on an Approved job — it does not vanish');
    ok(approved.btns.length === 0, 'with NO request buttons', approved.btns.join(',') || '(none)');
    ok(/opens once the job is Completed/i.test(approved.hint), 'and a line saying when it opens', approved.hint);

    await openAt('Completed'); await page.waitForTimeout(1200);
    const done = await cardShot();
    ok(done.btns.indexOf('copy') !== -1, 'a Completed job gets the request buttons', done.btns.join(','));
    ok(done.flip, 'and the Google-review switch');

    const ckWrites = () => page.evaluate(() => (window.__WRITES__ || []).filter(
      w => JSON.stringify(w.payload || {}).indexOf('review_requested_at') !== -1).length);
    const before = await ckWrites();

    /* tap, then say Not yet — nothing may be recorded */
    /* BUG_CLASSES 37: on the control tree the button may be absent and the
       sheet never opens. Guard every step so each check below reports red on
       its own instead of the section dying and proving nothing. */
    const tapRequest = () => page.evaluate(() => {
      const b = document.querySelector('.rvcard [data-rv="copy"]');
      if (b) { b.click(); return true; }
      return false;
    });
    await tapRequest();
    await page.waitForTimeout(1400);
    const asked = await page.evaluate(() => {
      const n = document.getElementById('crAsk');
      return { open: !!(n && n.classList.contains('open')),
               q: n ? n.querySelector('.askq').textContent.trim() : '',
               no: n ? n.querySelector('.askno').textContent.trim() : '' };
    });
    ok(asked.open && /did the review request go out/i.test(asked.q),
       'tapping asks whether it actually went out', asked.q);
    ok(asked.no === 'Not yet', 'and offers Not yet', asked.no);
    await page.evaluate(() => { const b = document.querySelector('#crAsk .askno'); if (b) b.click(); });
    await page.waitForTimeout(900);
    ok(await ckWrites() === before, 'answering Not yet records NOTHING',
       'writes ' + before + ' -> ' + (await ckWrites()));

    /* tap again, say yes — recorded once */
    await tapRequest();
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const g = document.querySelector('#crAsk .askgo'); if (g) g.click(); });
    await page.waitForTimeout(1200);
    ok(await ckWrites() === before + 1, 'answering yes records it once',
       'writes ' + before + ' -> ' + (await ckWrites()));
  } catch (e) {
    ok(false, 'the Chromium section ran', String(e && e.message || e).slice(0, 150));
  } finally { if (browser) try { await browser.close(); } catch (_) {} }
}

console.log('\n' + (fail === 0 ? `GATE 1202 GREEN — ${pass} checks passed`
                                : `GATE 1202 RED — ${fail} failed, ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
