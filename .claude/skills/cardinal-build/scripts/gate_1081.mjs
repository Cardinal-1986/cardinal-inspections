#!/usr/bin/env node
/* gate_1081 — the type floor.
 *
 * Build 1081 lifted every screen font below 11px to 11px, across BOTH
 * declaration forms (`font-size:` and the `font:` shorthand).
 *
 * ⚠ THE INSTRUMENT IS CHROMIUM'S OWN PARSED CSSOM, not a regex over the file,
 *   and that is deliberate. A text sweep on this project has been fooled eight
 *   times by prose inside a comment, and it cannot tell a screen stylesheet
 *   from a print stylesheet that lives inside a template string. document.
 *   styleSheets contains exactly the rules the browser will actually apply:
 *   comments are gone, and a contract's print CSS is not there because no
 *   contract has been generated.
 *
 * ⚠ TWO TRAPS INSIDE THE WALK, both of which this repo has already paid for:
 *   1. In modern Chromium every CSSStyleRule exposes an EMPTY .cssRules (CSS
 *      nesting). `if (r.cssRules) { descend; continue; }` therefore skips
 *      every style rule without ever examining it and reports a clean zero.
 *      Examine the rule, THEN descend.
 *   2. `pt` sizes are print documents. They must be counted and asserted
 *      UNCHANGED, not swept up with the rest.
 *
 * Run it against 1080 as the negative control. It must go RED there — a gate
 * never seen to fail proves nothing.
 *
 *   node gate_1081.mjs [path/to/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve(process.argv[2] || 'index.html');
if (!existsSync(TARGET)) { console.error('gate_1081: no such file: ' + TARGET); process.exit(2); }

const FLOOR = 11;
let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; console.log(`  ✓ ${n}${m ? ' → ' + m : ''}`); };
const bad = (n, m) => { fail++; console.log(`  ✗ ${n}${m ? ' → ' + m : ''}`); };
const is  = (c, n, m) => c ? ok(n, m) : bad(n, m);

const src = readFileSync(TARGET, 'utf8');

/* ── A. the file, both declaration forms ───────────────────────────────── */
const SHORT = /font:\s*(?:(?:normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)\s+){0,3}([0-9]+(?:\.[0-9]+)?)px/g;
const LONG  = /font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g;

/* comment mask, so prose can neither create nor hide a finding */
const mask = new Uint8Array(src.length);
for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g))
  mask.fill(1, m.index, m.index + m[0].length);

function sweep(re) {
  const under = [], at = [];
  for (const m of src.matchAll(re)) {
    const off = m.index + m[0].lastIndexOf(m[1]);
    if (mask[off]) continue;
    const v = parseFloat(m[1]);
    (v < FLOOR ? under : at).push(v);
  }
  return { under, at };
}
const sLong = sweep(LONG), sShort = sweep(SHORT);
const under = sLong.under.length + sShort.under.length;

console.log('gate_1081 — the type floor');
console.log('  file: ' + TARGET + '\n');
console.log('A. every px size in the file, both forms');
is(under === 0, 'A1 nothing below the ' + FLOOR + 'px floor',
   `font-size: ${sLong.under.length} · font: ${sShort.under.length} · total ${under}` +
   (under ? ' — smallest ' + Math.min(...sLong.under, ...sShort.under) + 'px' : ''));

/* FLOOR on coverage: this gate must be looking at a real, populated file.
   A regex that silently stops matching would otherwise report a clean zero.
   ⚠ Count EVERY match, under + at — a floor computed from `at` alone shrinks
   by exactly the number of findings, so it fails the negative control for a
   reason that has nothing to do with coverage and reads as a broken gate. */
const nShort = sShort.at.length + sShort.under.length;
const nLong  = sLong.at.length  + sLong.under.length;
is(nShort + nLong >= 1400, 'A2 the sweep actually found declarations (coverage floor)', `${nShort + nLong} sized declarations`);
is(nShort >= 1200, 'A3 the shorthand form is still being read', `${nShort} shorthand`);
is(nLong  >= 150,  'A4 the long form is still being read',       `${nLong} long-form`);

/* ── B. print documents untouched ─────────────────────────────────────── */
const pt = [...src.matchAll(/font(?:-size)?:[^;}"']*?([0-9.]+)pt/g)].map(m => m[1]);
is(pt.length >= 160, 'B1 print (pt) sizes still present and unread by this pass', `${pt.length} pt sizes`);
is(pt.some(v => parseFloat(v) < FLOOR), 'B2 print keeps sizes below 11 — proof pt was NOT swept',
   `smallest ${Math.min(...pt.map(parseFloat))}pt`);

/* ── C. the stamp ─────────────────────────────────────────────────────── */
const stamp = /v\d{4}-\d\d-\d\d build (\d+)/.exec(src);
is(stamp && +stamp[1] >= 1081, 'C1 app stamp is 1081 or later', stamp ? 'build ' + stamp[1] : 'no stamp');

/* ── D. Chromium's own parsed rules ───────────────────────────────────── */
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', () => {});
await page.goto('file://' + TARGET, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2500);

const cssom = await page.evaluate((FLOOR) => {
  const out = { rules: 0, sized: 0, under: [], zero: [], sheets: 0, unreadable: 0 };
  function walk(list) {
    for (const r of list) {
      out.rules++;
      /* examine FIRST, then descend — a CSSStyleRule exposes an empty
         .cssRules under CSS nesting, and `continue`ing on it skips it */
      if (r.style && r.style.fontSize) {
        const fs = r.style.fontSize.trim();
        const m = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(fs);
        if (m) {
          const v = parseFloat(m[1]);
          /* ⚠ font-size:0 is NOT small type — it is the idiom for "there is no
             text here": a control that collapses to a pure ::after icon, or a
             pipeline sphere flattened to a 3px bar with color:transparent.
             Counted separately and pinned below, so it can neither be swept up
             as a false finding nor grow silently. 0.5px would still trip. */
          if (v === 0) out.zero.push((r.selectorText || '?').slice(0, 90));
          else {
            out.sized++;
            if (v < FLOOR) out.under.push({ sel: (r.selectorText || '?').slice(0, 90), size: fs });
          }
        }
      }
      if (r.cssRules && r.cssRules.length) { try { walk(r.cssRules); } catch (_) {} }
    }
  }
  for (const sh of document.styleSheets) {
    out.sheets++;
    try { walk(sh.cssRules); } catch (_) { out.unreadable++; }
  }
  return out;
}, FLOOR);

console.log('\nD. Chromium’s own parsed rules (the instrument a comment cannot fool)');
is(cssom.unreadable === 0, 'D1 every stylesheet was readable', `${cssom.sheets} sheets, ${cssom.unreadable} unreadable`);
is(cssom.rules >= 5000, 'D2 the walk reached a real rule set (coverage floor)', `${cssom.rules} rules`);
is(cssom.sized >= 700, 'D3 sized rules found (coverage floor)', `${cssom.sized} rules carry a px font-size`);
is(cssom.under.length === 0, 'D4 no PARSED rule sets type below ' + FLOOR + 'px',
   cssom.under.length ? `${cssom.under.length} under — e.g. ${cssom.under.slice(0,4).map(u=>u.sel+' @'+u.size).join(' | ')}` : 'clean');
is(cssom.zero.length === 2, 'D5 the two deliberate font-size:0 hide-idioms are still exactly two',
   `${cssom.zero.length}: ${cssom.zero.map(z => z.split(',')[0].trim()).join(' | ').slice(0,120)}`);

/* ── E. it actually applies — a real element, really measured ─────────── */
const applied = await page.evaluate((FLOOR) => {
  /* Build one probe per lifted selector family that exists in static markup,
     read its COMPUTED size. This is the half a text gate cannot do: a rule
     can parse, balance and never win. */
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(host);
  const probes = [
    ['calgrid-dow',  '<div id="calCard"><div class="calgrid"><span class="dow">M</span></div></div>'],
    ['edchip',       '<span class="edchip">chip</span>'],
    ['arrow2',       '<span class="arrow2">&rarr;</span>'],
  ];
  const res = [];
  for (const [name, html] of probes) {
    host.innerHTML = html;
    const el = host.querySelector('.dow, .edchip, .arrow2');
    if (!el) { res.push({ name, size: null }); continue; }
    res.push({ name, size: parseFloat(getComputedStyle(el).fontSize) });
  }
  host.remove();
  return res;
}, FLOOR);

console.log('\nE. computed size on a real element (a rule can parse and still lose)');
const measured = applied.filter(a => a.size != null);
is(measured.length >= 2, 'E1 at least two probes resolved to a real element',
   applied.map(a => a.name + '=' + (a.size == null ? 'MISSING' : a.size + 'px')).join(' · '));
is(measured.length >= 2 && measured.every(a => a.size >= FLOOR),
   'E2 every resolved probe computes at or above the floor',
   measured.map(a => a.name + '=' + a.size + 'px').join(' · '));

await browser.close();

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
