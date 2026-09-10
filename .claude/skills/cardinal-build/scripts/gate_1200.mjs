#!/usr/bin/env node
/* gate_1200 — the punch count stops waking the page, and the team emails go
 * out only on a real forward move.
 *
 *   node gate_1200.mjs [index.html]        the build must be GREEN
 *   node gate_1200.mjs <1199 index.html>   the control: RED
 *
 *   A  STATIC: the stamp floor, the changelog entry, and the old unguarded
 *      forms gone.
 *   B  THE TRUTH TABLE, executed. acxRank + crStageIsForward are extracted
 *      from the SHIPPED file and run against all nine STAGES for both
 *      targets. This is the contract, not the spelling: OnHold and Lost rank
 *      -1 and must count as BEFORE every stage, so a held job that gets
 *      approved and a lost job revived still tell Curtis, while Scheduled,
 *      Completed, Invoiced and Closed must be silent on a move back to
 *      Approved. A later edit to acxRank's order array goes red here.
 *   C  THE ROUTING: both notify sites in setStage ask crStageIsForward, and
 *      neither still asks `prev !== ...`.
 *   D  THE LOOP, in Chromium: a real profile is opened on the mock rig and
 *      every DOM mutation is counted for six seconds. The punch count must
 *      settle. On 1199 it does not — that is the whole point of this gate.
 *
 * D degrades honestly: if Playwright or the rig files are missing it says so
 * and skips, rather than crashing and reading as "not green" (BUG_CLASSES 37).
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const html = readFileSync(artifact, 'utf8');

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
let pass = 0, fail = 0;
const ok = (c, m, detail = '') => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + m + (detail ? '  → ' + detail : ''));
  c ? pass++ : fail++;
  return c;
};

function brace(startNeedle) {
  const i = html.indexOf(startNeedle);
  if (i === -1) return null;
  let d = 0, started = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (c === '{') { d++; started = true; }
    else if (c === '}') { d--; if (started && d === 0) return html.slice(i, j + 1); }
  }
  return null;
}

/* ---------------------------------------------------------------- A static */
console.log('\nA  static');
const stampM = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!stampM && Number(stampM[1]) >= 1200, 'app stamp is 1200 or above',
   stampM ? 'build ' + stampM[1] : 'no stamp found');
ok(/\{\s*b:\s*1200\s*,/.test(html), 'CHANGELOG carries a build-1200 entry');
/* SCOPED, not file-wide. cr-portal-script's refreshCounts() has carried the
   byte-identical line since it was written ("avoid needless mutations") — the
   convention existed, the punch module just never got it. A file-wide
   includes() therefore PASSES on 1199 and is a check that cannot fail. */
const syncSrc = brace('function syncMenuCount(){');
ok(!!syncSrc, 'syncMenuCount extracted from the artifact',
   syncSrc ? syncSrc.length + ' chars' : 'NOT FOUND');
ok(!!syncSrc && syncSrc.includes('if(el.textContent !== txt) el.textContent = txt;'),
   'syncMenuCount itself writes the count only when it changed');
ok(!!syncSrc && !/el\.textContent = open;/.test(syncSrc),
   'the unguarded `el.textContent = open;` write is gone from syncMenuCount');
ok(!!syncSrc && syncSrc.includes("el.classList.contains('zero') !== zero"),
   'the zero class is toggled only when it changes');
ok(html.includes('function crStageIsForward(prev, to){'),
   'crStageIsForward is defined');
ok((html.match(/crStageIsForward/g) || []).length === 3,
   'crStageIsForward: one definition and exactly two call sites',
   'found ' + (html.match(/crStageIsForward/g) || []).length);
ok((html.match(/function acxRank\s*\(/g) || []).length === 1,
   'acxRank is still defined exactly once — no second pipeline order');

/* ------------------------------------------------------- B the truth table */
console.log('\nB  the forward truth table, executed from the shipped file');
const rankSrc = brace('function acxRank(stg){');
const fwdSrc = brace('function crStageIsForward(prev, to){');
ok(!!rankSrc, 'acxRank extracted from the artifact', rankSrc ? rankSrc.length + ' chars' : 'NOT FOUND');
ok(!!fwdSrc, 'crStageIsForward extracted from the artifact', fwdSrc ? fwdSrc.length + ' chars' : 'NOT FOUND');

const STAGES = ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'];
/* What each move MUST do. Approved: fire from everything not already at or
   past Approved. Completed: the same, one stage further along. */
const WANT_APPROVED = { Lead:true, Prospect:true, OnHold:true, Approved:false,
                        Scheduled:false, Completed:false, Invoiced:false, Closed:false, Lost:true };
const WANT_COMPLETED = { Lead:true, Prospect:true, OnHold:true, Approved:true,
                         Scheduled:true, Completed:false, Invoiced:false, Closed:false, Lost:true };

if (rankSrc && fwdSrc) {
  let fwd = null;
  try {
    fwd = new Function(rankSrc + '\n' + fwdSrc + '\nreturn crStageIsForward;')();
  } catch (e) {
    ok(false, 'the extracted helpers evaluate', String(e.message).slice(0, 90));
  }
  if (fwd) {
    for (const [target, want] of [['Approved', WANT_APPROVED], ['Completed', WANT_COMPLETED]]) {
      const wrong = STAGES.filter(s => !!fwd(s, target) !== want[s]);
      ok(wrong.length === 0, `${target}: all nine stages route correctly`,
         wrong.length ? 'wrong for ' + wrong.map(s => `${s}=${!!fwd(s, target)} want ${want[s]}`).join(', ') : '');
    }
    /* the two that cost the build, stated on their own so a failure names itself */
    ok(fwd('Scheduled', 'Approved') === false,
       'Scheduled -> Approved is SILENT (the back chevron, the reported bug)');
    ok(fwd('Invoiced', 'Completed') === false, 'Invoiced -> Completed is SILENT');
    ok(fwd('OnHold', 'Approved') === true, 'OnHold -> Approved still notifies Curtis');
    ok(fwd('Lost', 'Approved') === true, 'a revived Lost job still notifies Curtis');
    ok(fwd('Prospect', 'Approved') === true, 'the ordinary sale still notifies Curtis');
  }
}

/* ------------------------------------------------------------- C the wiring */
console.log('\nC  the notify sites ask the helper');
ok(html.includes("if(v === 'Approved' && crStageIsForward(prev, 'Approved')){"),
   'the Approved notify is gated by crStageIsForward');
ok(html.includes("if(v === 'Completed' && crStageIsForward(prev, 'Completed')){"),
   'the Completed notify is gated by crStageIsForward');
ok(!html.includes("if(v === 'Approved' && prev !== 'Approved'){"),
   "the old `prev !== 'Approved'` condition is gone");
ok(!html.includes("if(v === 'Completed' && prev !== 'Completed'){"),
   "the old `prev !== 'Completed'` condition is gone");

/* ------------------------------------------- D the loop, in a real browser */
console.log('\nD  the profile settles (Chromium)');
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');
const haveRig = existsSync(PW) && existsSync(setupPath) && existsSync(mockPath);

if (!haveRig) {
  console.log('  SKIP  the Chromium probe — rig unavailable ' +
              `(playwright:${existsSync(PW)} setup:${existsSync(setupPath)} mock:${existsSync(mockPath)})`);
  console.log('        Sections A-C carry the verdict; CI runs D.');
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8');
  const MOCK = readFileSync(mockPath, 'utf8');
  const launch = existsSync(CHROME) ? { executablePath: CHROME, args: ['--no-sandbox'] }
                                    : { args: ['--no-sandbox'] };
  let browser = null;
  try {
    browser = await chromium.launch(launch);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.addInitScript(SETUP);
    await page.route('**/*', async (route) => {
      const u = route.request().url();
      const url = new URL(u);
      if (url.hostname === 'app.cardinalroster.com') {
        if (url.pathname === '/' || url.pathname === '/index.html')
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        if (url.pathname.startsWith('/api/'))
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[],"items":[]}' });
        const f = resolve(root, '.' + url.pathname);
        if (existsSync(f) && !url.pathname.endsWith('.html'))
          return route.fulfill({ status: 200, body: readFileSync(f) });
        return route.fulfill({ status: 404, body: '' });
      }
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
      if (u.includes('chart.js') || u.includes('papaparse'))
        return route.fulfill({ status: 200, contentType: 'application/javascript',
          body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
      return route.abort();
    });
    await page.goto('https://app.cardinalroster.com/?as=nick', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    /* open a real client profile through the app's own state runner */
    const opened = await page.evaluate(async () => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'client');
      if (!s) return false;
      await s.run();
      return true;
    }).catch(() => false);
    ok(opened, 'the mock rig opened a client profile');

    if (opened) {
      await page.waitForTimeout(1200);
      const probe = await page.evaluate(() => new Promise((res) => {
        const counts = new Map();
        let total = 0;
        const label = (n) => {
          const el = n.nodeType === 1 ? n : n.parentElement;
          if (!el) return 'text';
          return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                 (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
        };
        const mo = new MutationObserver((recs) => {
          for (const r of recs) { total++; const k = label(r.target); counts.set(k, (counts.get(k) || 0) + 1); }
        });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
        setTimeout(() => {
          mo.disconnect();
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
          res({ total, perSec: Math.round(total / 6), top,
                punch: [...counts.entries()].filter(([k]) => k.includes('dbPunchN'))
                                            .reduce((n, [, v]) => n + v, 0) });
        }, 6000);
      }));
      console.log('        6s on an open profile: ' + probe.total + ' records (' + probe.perSec + '/sec), ' +
                  'top: ' + probe.top.map(([k, v]) => k + '=' + v).join(', '));
      ok(probe.punch <= 12, 'the punch count settles (<=2/sec over six seconds)',
         probe.punch + ' records on #dbPunchN');
      ok(probe.perSec < 20, 'the open profile is quiet overall (<20 records/sec)',
         probe.perSec + '/sec');
    }
  } catch (e) {
    ok(false, 'the Chromium probe ran', String(e && e.message || e).slice(0, 140));
  } finally {
    if (browser) try { await browser.close(); } catch (_) {}
  }
}

console.log('\n' + (fail === 0
  ? `GATE 1200 GREEN — ${pass} checks passed`
  : `GATE 1200 RED — ${fail} failed, ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
