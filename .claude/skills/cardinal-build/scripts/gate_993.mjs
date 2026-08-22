/* gate_993.mjs — the hidden-scrollbar strips: REACHED, and not clipping.

   Build 984 fixed one silently-clipping strip (.cr-cth-tabs) and added the
   CLIPPED check to catch the next one. It could not, and the reason is the
   whole point of this gate: a sweep of the walk as it stood at 991 PAINTED
   exactly ONE of the app's eleven hidden-scrollbar scrollers. The other ten
   were never in the DOM, or were in it at 0x0 — and in the report an
   unmeasured scroller is indistinguishable from a clean one. Silence from a
   surface nobody rendered is not evidence.

   Measured at 991, at 390px, once the walk could reach them:

     .cr-lil-tabs          915 / 390   525px hidden — 5 of 8 categories
     .cr-ic-chips          839 / 358   481px hidden — 4 of 7 stages
     #cr-pae-tabs          732 / 318   414px hidden — 4 of 6 sections
     .cr-ped-row           627 / 366   261px hidden — Undo and Clear
     .cr-c-tabs.detail     591 / 346   245px hidden — Documents, iTel, Record
     .ljchips              405 / 318    87px hidden — and 94px at 1194px
     .cr-sh-tabs           413 / 358    55px hidden — the way OUT

   TWO assertions, and they are deliberately different in kind:

     REACH   is derived from the ARTIFACT'S OWN stylesheets, so a scroller
             added tomorrow is covered without anyone remembering this file.
     FLOOR   is a hardcoded list of names that must be among them. Derivation
             alone is the trap CLAUDE.md names: a test that computes its own
             check count silently loses checks and stays green — test_stale_worker
             went 15 -> 14 and nothing went red. A smaller number nobody reads.

   Usage: node gate_993.mjs [path]
   The previous build is the negative control and MUST go red with NAMED
   failures rather than crash (BUG_CLASSES 37). At 991 it reports 7 clippers
   plus .cr-sf-tabs unreached. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_993: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
const VPS = [{ w: 390, h: 844 }, { w: 430, h: 932 }, { w: 1194, h: 834 }];

/* THE FLOOR. Every name here must be painted somewhere in the walk. Shrinking
   this list is a decision, not a side effect — if a surface is retired, delete
   its row here AND say so in the build log, the way .cr-sf-tabs was at 993. */
const MUST_REACH = [
  '#cr-claims-mount .cr-c-tabs.detail',
  '#cr-pae-tabs',
  '.cd-crmbar',
  '.cr-cth-tabs',
  '.cr-ic-chips',
  '.cr-lil-tabs',
  '.cr-ped-row',
  '.cr-sh-tabs',
  '.ljchips',
  '.pu-tabs',
];

let fails = [], passes = 0;
const need = (name, ok, detail) => { if (ok) passes++; else fails.push(name + (detail ? ' — ' + detail : '')); };

/* ⚠ Collected from document.styleSheets, never from a regex over the file.
   Several of the 145 <style> blocks are print stylesheets living inside
   template strings; a text scan reads those as page CSS. And in modern
   Chromium every CSSStyleRule exposes an EMPTY .cssRules for CSS nesting, so
   the obvious `if (r.cssRules) { descend; continue; }` skips every style rule
   without examining it and returns a clean zero. Examine, THEN descend. */
const DERIVE = `(() => {
  const hidden = new Set();
  const walk = list => {
    for (const r of list) {
      const sel = r.selectorText;
      if (sel && /::-webkit-scrollbar\\b/.test(sel) && r.style && /none/.test(r.style.display || '')) {
        for (const part of sel.split(',')) {
          const base = part.replace(/::-webkit-scrollbar.*$/, '').trim();
          if (base) hidden.add(base);
        }
      }
      if (sel && r.style && r.style.getPropertyValue('scrollbar-width') === 'none') {
        for (const part of sel.split(',')) { const b = part.trim(); if (b) hidden.add(b); }
      }
      if (r.cssRules && r.cssRules.length) walk(Array.prototype.slice.call(r.cssRules));
    }
  };
  for (const sheet of Array.prototype.slice.call(document.styleSheets)) {
    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
    if (rules) walk(Array.prototype.slice.call(rules));
  }
  return [...hidden];
})()`;

const MEASURE = sels => `(() => {
  const out = {};
  for (const sel of ${JSON.stringify(sels)}) {
    let els = []; try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { continue; }
    for (const el of els) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      if (!/auto|scroll/.test(cs.overflowX)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const over = el.scrollWidth - el.clientWidth;
      const off = [];
      for (const kid of el.children)
        if (kid.getBoundingClientRect().right > r.left + el.clientWidth + 0.5)
          off.push((kid.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 26));
      const cur = out[sel];
      if (!cur || over > cur.over)
        out[sel] = { over, w: Math.round(r.width), scrollW: el.scrollWidth,
                     clientW: el.clientWidth, kids: el.children.length, off: off.slice(0, 5) };
    }
  }
  return out;
})()`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());

let derived = null;
const painted = new Map();  /* selector -> worst observation across the walk */
const threw = [];

for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  if (!derived) derived = await page.evaluate(DERIVE);

  const names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
  for (let i = 0; i < names.length; i++) {
    try { await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`); await page.waitForTimeout(320); }
    catch (e) { threw.push(`${names[i]}@${vp.w}: ` + String(e.message).split('\n')[0]); continue; }
    const res = await page.evaluate(MEASURE(derived));
    for (const [sel, obs] of Object.entries(res)) {
      const cur = painted.get(sel);
      if (!cur || obs.over > cur.over) painted.set(sel, { ...obs, at: `${names[i]}@${vp.w}px` });
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`gate_993 — ${FILE}`);
console.log(`  derived ${derived.length} hidden-scrollbar selector(s) from the page's own stylesheets`);

/* 1 — no state may throw. A state that dies opens nothing, and a walk that
   quietly skipped a screen reports CLEAN about a screen it never saw. */
need('no sentinel state threw', threw.length === 0, threw.slice(0, 6).join(' · '));

/* 2 — THE FLOOR. Hardcoded, so it cannot shrink by accident. */
for (const sel of MUST_REACH)
  need(`reached ${sel}`, painted.has(sel),
       'never painted at 390/430/1194 in any state — the surface is unopened, not clean');

/* 3 — the derived set, so tomorrow's scroller is covered without an edit here.
   A derived selector nobody reaches is reported, not silently dropped. */
const unreached = derived.filter(s => !painted.has(s));
need('every hidden-scrollbar selector in the CSS is reached by the walk',
     unreached.length === 0,
     unreached.join(', ') + ' — either add a state that opens it, or delete the rule if the strip is gone');

/* 4 — none of them clips. This is the defect itself. */
for (const [sel, o] of [...painted].sort((a, b) => b[1].over - a[1].over))
  need(`${sel} does not clip`, o.over <= 1,
       `${o.scrollW} in ${o.clientW} at ${o.at} — ${o.over}px hidden behind a scrollbar that is not drawn` +
       (o.off.length ? `; off the edge: ${o.off.join(' | ')}` : ''));

/* 5 — the floor must not be vacuous. If MUST_REACH were emptied, checks 2 and
   4 would both pass on a page that renders nothing at all. */
need('the reach floor is non-trivial', MUST_REACH.length >= 10,
     `MUST_REACH holds ${MUST_REACH.length} names`);

console.log(`\n  painted ${painted.size}/${derived.length}:`);
for (const [sel, o] of [...painted].sort((a, b) => b[1].over - a[1].over))
  console.log(`    ${o.over > 1 ? 'CLIPS' : 'fits '} ${sel.padEnd(36)} ${o.scrollW}/${o.clientW} over=${o.over}  [${o.at}]`);

console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
