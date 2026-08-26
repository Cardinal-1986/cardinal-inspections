#!/usr/bin/env node
/* gate_1082 — the Job Menu, readable and told apart.
 *
 * Build 1082 did two things and this gate checks both AS RENDERED, because
 * neither can be settled from the file:
 *
 *   A. the ink — every glyph computed 1.52:1 on the dark tile. Both classes
 *      carried color:#23507e, a steel blue chosen for a WHITE tile.
 *      ⚠ TWO classes, two DIFFERENT floors:
 *          .dbic2  drawn SVG icons     → 3.0:1 (graphical object)
 *          .dbic1  the "$" and "%"     → 4.5:1 (it is TEXT)
 *        A sweep of `.jabox svg` alone misses .dbic1 entirely — that is how
 *        this build nearly shipped as a half-fix.
 *
 *   B. distinctness — seven tiles shared three glyphs. The honest test is not
 *      "is each glyph nice" but "does any tile still draw the same path as
 *      another", so D2 compares the actual path data across the whole menu.
 *
 * ⚠ The ground is COMPOSITED. The tiles paint a linear-gradient, so reading
 *   backgroundColor alone sails past the tile and scores against the page.
 *   Every ancestor's colour AND every gradient stop is collected, worst wins.
 *
 * Run against 1081 as the negative control. It must go RED there.
 *
 *   node gate_1082.mjs [path/to/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

const HERE   = dirname(new URL(import.meta.url).pathname);
const TARGET = resolve(process.argv[2] || 'index.html');
if (!existsSync(TARGET)) { console.error('gate_1082: no such file: ' + TARGET); process.exit(2); }

let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; console.log(`  ✓ ${n}${m ? ' → ' + m : ''}`); };
const bad = (n, m) => { fail++; console.log(`  ✗ ${n}${m ? ' → ' + m : ''}`); };
const is  = (c, n, m) => c ? ok(n, m) : bad(n, m);

const src = readFileSync(TARGET, 'utf8');
console.log('gate_1082 — the Job Menu, readable and told apart');
console.log('  file: ' + TARGET + '\n');

/* ── A. the file ───────────────────────────────────────────────────────── */
console.log('A. source');
/* ⚠ the message must state the DEFECT when it fails, not echo the success
   text — a failure line that reads like a pass is how a red run gets missed. */
const flat = src.replace(/\s+/g, '');
const stillHard = [/\.dbic1\{[^}]*#23507e/, /\.dbic2\{[^}]*#23507e/]
  .map((re, i) => re.test(flat) ? '.dbic' + (i + 1) : null).filter(Boolean);
is(stillHard.length === 0, 'A1 neither glyph class still hardcodes the light-era steel',
   stillHard.length ? `${stillHard.join(' and ')} still set #23507e` : '#23507e is out of both');
is(/body\.claim-insurance \.dbrow \.dbic1\{color:var\(--ct-red-deep\)/.test(src),
   'A2 insurance keeps its OWN ink (more specific, untouched)');
const stamp = /v\d{4}-\d\d-\d\d build (\d+)/.exec(src);
is(stamp && +stamp[1] >= 1082, 'A3 app stamp is 1082 or later', stamp ? 'build ' + stamp[1] : 'none');

/* ── B/C/D. the render ─────────────────────────────────────────────────── */
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']   /* seed FIRST */
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', () => {});
await page.addInitScript({ content: SETUP });
await page.goto('file://' + TARGET, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(3000);

const names = await page.evaluate(`(window.__sentinelStates||[]).map(s=>s.name)`).catch(() => []);
const ci = names.indexOf('client');
if (ci < 0) { console.log('  ✗ could not reach the client profile — UNKNOWN, not clean'); await browser.close(); process.exit(2); }
await page.evaluate(`Promise.resolve(window.__sentinelStates[${ci}].run())`);
await page.waitForTimeout(1500);

const R = await page.evaluate(() => {
  const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  const L = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null;
    const q = m[1].split(',').map(parseFloat); return q[3] === 0 ? null : [q[0], q[1], q[2]]; };
  function grounds(el) {
    const o = []; let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor); if (c) o.push(c);
      for (const h of (cs.backgroundImage || '').matchAll(/rgba?\([^)]+\)/g)) { const g = parse(h[0]); if (g) o.push(g); }
      n = n.parentElement;
    }
    return o.length ? o : [[0, 0, 0]];
  }
  function ratio(el) {
    const ink = parse(getComputedStyle(el).color); if (!ink) return null;
    const li = L(ink); let worst = 99;
    for (const g of grounds(el)) { const lg = L(g);
      const r = (Math.max(li, lg) + .05) / (Math.min(li, lg) + .05); if (r < worst) worst = r; }
    return { ratio: +worst.toFixed(2), ink: getComputedStyle(el).color };
  }
  const icons = [], texts = [], paths = [];
  /* ⚠ SCOPE TO THE JOB MENU, not to .jabox document-wide. #inspGalBox in
     #tab-inspections is also a .jabox with a .dbic2 camera — a 0x0 gallery
     box on an inactive tab, where sharing the camera glyph is CORRECT. A
     document-wide sweep reported it as a 16th tile and as a duplicate of
     Photos, failing a correct build. jt() stamps data-jm on every real menu
     tile, so that attribute IS the boundary. */
  document.querySelectorAll('.jabox[data-jm]').forEach(box => {
    const label = (box.querySelector('.jbl') || {}).textContent || '?';
    const svg = box.querySelector('svg'); if (!svg) return;
    const r = ratio(svg); if (r) icons.push({ label: label.trim().slice(0, 16), ...r });
    const p = svg.querySelector('path');
    if (p) paths.push({ label: label.trim().slice(0, 16), d: (p.getAttribute('d') || '').slice(0, 400) });
  });
  document.querySelectorAll('.dbic1').forEach(el => {
    const r = ratio(el); if (r) texts.push({ label: (el.parentElement.textContent || '').trim().slice(0, 22), ...r });
  });
  return { icons, texts, paths };
});

console.log('\nB. the ink, computed against the COMPOSITED ground');
is(R.icons.length === 15, 'B1 icon coverage — exactly the 15 job-menu tiles',
   `${R.icons.length} found (15 is the tile count in source; a 16th means the scope leaked)`);
is(R.texts.length >= 2,  'B2 TEXT-glyph coverage floor — .dbic1 must not be missed', `${R.texts.length} found`);
const iBad = R.icons.filter(r => r.ratio < 3.0);
const tBad = R.texts.filter(r => r.ratio < 4.5);
is(iBad.length === 0, 'B3 every drawn icon clears the 3.0:1 graphical floor',
   iBad.length ? `${iBad.length} under — worst ${Math.min(...R.icons.map(r=>r.ratio))}:1` : `worst ${Math.min(...R.icons.map(r=>r.ratio))}:1`);
is(tBad.length === 0, 'B4 every TEXT glyph clears the 4.5:1 body floor',
   tBad.length ? `${tBad.length} under — ${tBad.map(t=>t.label+' '+t.ratio+':1').join(', ')}`
               : `worst ${Math.min(...R.texts.map(r=>r.ratio))}:1`);

console.log('\nC. distinctness — no two tiles draw the same path');
const seen = new Map(), dupes = [];
for (const p of R.paths) {
  if (seen.has(p.d)) dupes.push(`${seen.get(p.d)} = ${p.label}`);
  else seen.set(p.d, p.label);
}
is(R.paths.length === 15, 'C1 path coverage — one per job-menu tile', `${R.paths.length} paths read`);
is(dupes.length === 0, 'C2 no two Job Menu tiles share a glyph',
   dupes.length ? `${dupes.length} pair(s): ${dupes.join(' · ')}` : `${seen.size} distinct glyphs across ${R.paths.length} tiles`);

/* the four that were re-pointed must each be present and unique */
const want = ['Punch Outs', 'Checklists', 'The Walk', 'Contracts'];
const got = want.filter(w => R.paths.some(p => p.label.startsWith(w)));
is(got.length === want.length, 'C3 all four re-pointed tiles are on screen', got.join(', ') || 'none');

await browser.close();
console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
