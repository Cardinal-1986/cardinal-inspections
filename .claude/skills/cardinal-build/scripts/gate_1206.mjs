#!/usr/bin/env node
/* gate_1206 — the 44px tap-target floor, RATCHETED, measured in a real engine.
 *
 *   node gate_1206.mjs [index.html]        the build must be GREEN
 *   node gate_1206.mjs <1205 index.html>   the control: RED
 *   node gate_1206.mjs --selftest          prove the instrument can fail
 *   node gate_1206.mjs --rebaseline        accept current counts (WITH A REASON)
 *   node gate_1206.mjs --list              print every under-floor target
 *
 * It walks EVERY sentinel state at 390px and measures each interactive element.
 * Like gate_types and gate_dupes, the existing debt is baselined so it blocks
 * nothing, and a target that gets SMALLER — or a new under-floor one — is red the
 * build it lands.
 *
 * ⚠ THE BOX IS NOT THE TARGET, and getting that wrong invents findings. The
 * September audit recorded "Dispatch's 'Move this job' control 15x15" as the
 * worst target in the app. Its box is 15x15 and its hit area is 45x45 —
 * `#cr-disp .job .mv::after{position:absolute;inset:-15px}`, which build 1040
 * did deliberately and wrote the arithmetic down beside. So this gate measures
 * the EFFECTIVE area: step outward from the centre until elementFromPoint stops
 * resolving to the element or something inside it.
 *
 * ⚠ A skipped browser section is a FAILURE here, not a pass (BUG_CLASSES 87).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const argv = process.argv.slice(2);
const REBASE = argv.includes('--rebaseline');
const LIST = argv.includes('--list');
const SELFTEST = argv.includes('--selftest');
const artifact = resolve(argv.find(a => !a.startsWith('--')) || resolve(root, 'index.html'));
const BASEPATH = resolve(here, 'gate_1206_baseline.json');
const FLOOR = 44;

/* The five this build fixed. They are asserted POSITIVELY — the selector is
   queried in the state it lives in, the count must be > 0, and every instance
   must clear the floor.
   ⚠ The first version of this section asserted `!(key in underFloorMap)` using
   keys I had typed from memory, and FOUR of the five keys did not exist in the
   sweep's own format (`#navMenu div.cr-ts button`, not `#navMenu .cr-ts
   button`; `div.pbwrap … button.pbday`, not `#cr-pb …`). Every one of those
   checks passed by matching nothing — a check that cannot fail, which this
   project has shipped more than once. Measuring the element is the fix. */
const FIXED = [
  { state: 'nav',        sel: '#navMenu .cr-ts button',        what: 'the drawer A / A / A text-size control' },
  { state: 'album',      sel: '#cr-pae-tabs button',           what: "the photo album's section chips" },
  { state: 'production', sel: '#cr-pb .pbmonth .pbday',        what: 'the Production mini-month day cells' },
  { state: 'newproject', sel: '#pfSourceChips .pf-chip',       what: 'the lead-source chips (A3)' },
  { state: 'doceditor',  sel: '#editorView .edbtns .btn',      what: "the document editor's phone buttons (1204's own residue)" },
];

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return !!c; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 900000).unref();

const html = readFileSync(artifact, 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');

/* ---- the probe, injected into the page once per state ------------------- */
const PROBE = `(function(FLOOR){
  var SEL = 'button,a[href],[role="button"],input[type=checkbox],input[type=radio],select,[onclick],[data-act],[tabindex]:not([tabindex="-1"])';
  function key(el){
    var bits = [];
    for (var e = el, i = 0; e && i < 4; e = e.parentElement, i++){
      if (e.id){ bits.unshift('#' + e.id); break; }
      var t = e.tagName.toLowerCase();
      var c = (typeof e.className === 'string' ? e.className : '').trim().split(/\\s+/)[0];
      /* first class only: .active / .today / .ghost are STATES, and keying on
         them would make every variant a new key and the ratchet unreadable. */
      if (c) t += '.' + c;
      bits.unshift(t);
    }
    return bits.join(' ');
  }
  var out = {}, skipped = 0;
  Array.prototype.forEach.call(document.querySelectorAll(SEL), function(el){
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
    var b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;
    if (b.height >= FLOOR && b.width >= FLOOR) return;
    /* ⚠ elementFromPoint only answers for the VIEWPORT, so an under-floor
       control far outside it cannot have its hit pad measured and is counted
       rather than scored. This is a real hole in the ratchet in ONE direction:
       a layout change that pushes a small control off-screen makes it leave the
       sweep, which reads as an improvement. The count is printed every run so
       that shows up as a number instead of as silence. */
    if (b.top > innerHeight + 400 || b.bottom < -400) { skipped++; return; }
    var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    function owns(x, y){
      var h = document.elementFromPoint(Math.round(x), Math.round(y));
      return !!h && (h === el || el.contains(h));
    }
    if (!owns(cx, cy)) return;               /* something is covering it */
    function reach(dx, dy){ var d = 0; while (d < 30 && owns(cx + dx * (d + 1), cy + dy * (d + 1))) d++; return d; }
    var w = reach(1, 0) + reach(-1, 0) + 1, h = reach(0, 1) + reach(0, -1) + 1;
    if (w >= FLOOR && h >= FLOOR) return;    /* a hit pad already carries it */
    var k = key(el), worst = Math.min(w, h);
    if (!(k in out) || worst < out[k].worst)
      out[k] = { worst: worst, w: w, h: h, box: Math.round(b.width) + 'x' + Math.round(b.height),
                 label: (el.textContent || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 24) };
  });
  return { out: out, skipped: skipped };
})(${FLOOR})`;

if (!(existsSync(setupPath) && existsSync(mockPath))) {
  ok(false, 'the sweep RAN — a skipped browser section is not a pass',
     `setup:${existsSync(setupPath)} mock:${existsSync(mockPath)}`);
  console.log(`\nGATE 1206 RED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}

const { chromium } = require_(PW);
const SETUP = readFileSync(setupPath, 'utf8'); const MOCK = readFileSync(mockPath, 'utf8');

async function sweep(sourceHtml) {
  const browser = await launchChromium(chromium);
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.addInitScript(SETUP);
    await page.route('**/*', async (route) => {
      const u = route.request().url(); const url = new URL(u);
      if (url.hostname === 'app.cardinalroster.com') {
        if (url.pathname === '/' || url.pathname === '/index.html')
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: sourceHtml });
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
    const names = await page.evaluate(() => (window.__sentinelStates || []).map(s => s.name));
    if (!names.length) throw new Error('no sentinel states — the setup file did not load');
    const found = {}; const measured = {}; const broken = []; let skipped = 0;
    for (const n of names) {
      const r = await page.evaluate(async ({ n, PROBE }) => {
        try {
          const s = (window.__sentinelStates || []).find(x => x.name === n);
          if (!s) return { err: 'missing' };
          await s.run();
        } catch (e) { return { err: String(e && e.message || e) }; }
        await new Promise(r => setTimeout(r, 350));
        // eslint-disable-next-line no-eval
        return { out: eval(PROBE) };
      }, { n, PROBE });
      if (r.err) { broken.push(n + ': ' + r.err); continue; }
      skipped += r.out.skipped || 0;
      for (const [k, v] of Object.entries(r.out.out))
        if (!(k in found) || v.worst < found[k].worst) found[k] = { ...v, state: n };
      /* the positive half: measure the five by CSS selector, in their own state */
      for (const f of FIXED.filter(x => x.state === n)) {
        measured[f.sel] = await page.evaluate((sel) => {
          /* ⚠ VISIBLE means a real box, not "display is not none". Six of the
             eleven .edbtns buttons are inside #edSecondary, whose WRAPPER is
             display:none on a phone — each child still computes display:flex
             and measures 0x0. Filtering on the computed display alone reported
             "shortest 0px" and failed a correct build. */
          const els = [...document.querySelectorAll(sel)].filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const b = el.getBoundingClientRect();
            return b.width > 1 && b.height > 1;
          });
          return { n: els.length,
                   minH: els.length ? Math.min(...els.map(e => Math.round(e.getBoundingClientRect().height))) : -1,
                   minW: els.length ? Math.min(...els.map(e => Math.round(e.getBoundingClientRect().width))) : -1 };
        }, f.sel);
      }
    }
    return { found, measured, states: names.length, broken, skipped };
  } finally { await browser.close(); }
}

console.log(`gate_1206 — 44px tap-target floor · ${resolve(artifact) === resolve(root, 'index.html') ? 'index.html' : artifact}`);
const cur = await sweep(html);
console.log(`  swept ${cur.states} states · ${cur.skipped} small control(s) outside the probe window (counted, not scored)${cur.broken.length ? ' · ' + cur.broken.length + ' state error(s): ' + cur.broken.join(' | ') : ''}`);
const keys = Object.keys(cur.found).sort();

if (LIST) {
  keys.map(k => [k, cur.found[k]]).sort((a, b) => a[1].worst - b[1].worst)
    .forEach(([k, v]) => console.log(`  ${String(v.w + 'x' + v.h).padEnd(9)} (box ${v.box.padEnd(9)}) ${k}   "${v.label}"   [${v.state}]`));
  process.exit(0);
}

if (REBASE) {
  const out = {};
  keys.forEach(k => { out[k] = cur.found[k].worst; });
  writeFileSync(BASEPATH, JSON.stringify(out, null, 1) + '\n');
  console.log(`  rebaselined ${keys.length} under-floor target(s) -> ${BASEPATH}`);
  process.exit(0);
}

/* --- 1. the five this build fixed must clear the floor outright ---------- */
console.log('\nA  the five from audit option 14 / A13 + A3');
for (const f of FIXED) {
  const m = cur.measured[f.sel];
  if (!ok(!!m && m.n > 0, `${f.what} renders at all`, m ? m.n + ' element(s)' : 'state never ran')) continue;
  ok(m.minH >= FLOOR, `${f.what} clears ${FLOOR}px`,
     `${f.sel} — ${m.n} element(s), shortest ${m.minH}px, narrowest ${m.minW}px`);
}
/* The audit's fifth entry was a false positive, and the gate says so out loud
   rather than leaving a reader to wonder why it is not in the list above. */
ok(html.includes('#cr-disp .job .mv::after{ content:""; position:absolute; inset:-15px; }'),
   'Dispatch’s grip keeps its 1040 hit pad — A13’s "15x15" is its BOX, not its target');

/* --- 2. the ratchet ------------------------------------------------------ */
console.log('\nB  the ratchet — existing debt may fall, never grow');
const base = existsSync(BASEPATH) ? JSON.parse(readFileSync(BASEPATH, 'utf8')) : null;
if (!base) {
  ok(false, 'a baseline exists', 'run --rebaseline once, with a written reason');
} else {
  const added = keys.filter(k => !(k in base));
  const worse = keys.filter(k => k in base && cur.found[k].worst < base[k]);
  const better = keys.filter(k => k in base && cur.found[k].worst > base[k]);
  const gone = Object.keys(base).filter(k => !(k in cur.found));
  ok(added.length === 0, 'no NEW under-floor tap target',
     added.length ? added.map(k => k + ' ' + cur.found[k].w + 'x' + cur.found[k].h).join(' · ')
                  : keys.length + ' carried, unchanged');
  ok(worse.length === 0, 'no baselined target got smaller',
     worse.length ? worse.map(k => `${k} ${base[k]} -> ${cur.found[k].worst}`).join(' · ') : 'none');
  if (better.length || gone.length)
    console.log(`        improved: ${gone.length} target(s) now clear the floor` +
                (better.length ? `, ${better.length} grew` : '') + ' (--rebaseline to lock in)');
  console.log(`        carried debt: ${keys.length} under-floor target(s) across ${cur.states} states`);
}

/* --- 3. selftest: the instrument must be able to fail -------------------- */
if (SELFTEST) {
  console.log('\nC  selftest — the sweep must go red on a floor it cannot meet');
  const poisoned = html.replace('#navMenu .cr-ts button{min-width:44px;min-height:44px;',
                                '#navMenu .cr-ts button{min-width:22px;min-height:22px;');
  ok(poisoned !== html, 'the poison anchor matched');
  const bad = await sweep(poisoned);
  /* ⚠ Look the key up by SHAPE, not by a key typed from memory. The sweep's
     format is `#navMenu div.cr-ts button` — the tag is part of it — and the
     first version of this selftest asked for `#navMenu .cr-ts button`, matched
     nothing, and reported "the sweep cannot fail" about a sweep that could. */
  const k = Object.keys(bad.found).find(x => x.endsWith('.cr-ts button'));
  const hit = k ? bad.found[k] : null;
  ok(!!hit && hit.worst < FLOOR, 'a 22px size control is SEEN as under-floor',
     hit ? k + ' ' + hit.w + 'x' + hit.h : 'NOT SEEN — the sweep cannot fail');
}

console.log(`\n${fail ? 'GATE 1206 RED' : 'GATE 1206 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
