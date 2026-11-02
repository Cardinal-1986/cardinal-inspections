/* gate_1438 — the Production boxes go four across only where their labels fit.
 *
 * Before 1438 two desktop twins forced the board's four boxes (Needs ordered / Ordered /
 * Scheduled / Punch-outs) 4-up from 1100px. Measured as Curtis on 1437, a label was cut
 * (scrollWidth > clientWidth) at Normal 1100-1280, at Large up to 1440 and at Larger up to
 * 1600. 1438 keeps them 2-up until four fit: Normal >= 1366, Large >= 1600, Larger >= 1800.
 *
 *   A  no box label is cut, at 1100 / 1194 / 1280 / 1365 / 1366 / 1440 / 1599 / 1600 /
 *      1799 / 1800 / 1920, at Normal, Large and Larger, dark (plus Normal light)
 *   B  the column count is the one the thresholds promise at each of those widths
 *   C  Sun is untouched: its column count at every width equals the reference tree's
 *   D  the phone (390) is 2-up, as before
 *
 *   node gate_1438.mjs [artifact] [--ref reference.html]
 * Default artifact: the repo index.html. Default reference: build 1437 (git show 5182649).
 * On 1437 this gate must go RED.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ri = args.indexOf('--ref');
let REF = ri !== -1 ? args[ri + 1] : null;
const FILE = resolve(args.find((a, i) => !a.startsWith('--') && (ri === -1 || i !== ri + 1)) || join(HERE, '../../../../index.html'));
if (!REF) {
  REF = join(os.tmpdir(), 'gate_1438_ref1437.html');
  if (!existsSync(REF)) writeFileSync(REF, execSync('git show 5182649:index.html', { cwd: join(HERE, '../../../..'), maxBuffer: 64 << 20 }));
}
const WIDTHS = [1100, 1194, 1280, 1365, 1366, 1440, 1599, 1600, 1799, 1800, 1920];
const FOUR_FROM = { normal: 1366, lg: 1600, xl: 1800 };
const seedFor = (mode, theme) => (theme === 'light' ? "try{localStorage.setItem('cardinal.theme.rb','1');}catch(e){}" : "try{localStorage.setItem('cardinal.theme.rb','0');}catch(e){}")
  + (mode === 'lg' ? "try{localStorage.setItem('cr-textsize','lg');}catch(e){}" : mode === 'xl' ? "try{localStorage.setItem('cr-textsize','xl');}catch(e){}" : '')
  + (mode === 'sun' ? "try{localStorage.setItem('cardinal.theme.rb','sun');}catch(e){}" : '');

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 240) : '')); }

/* gate_1403_lib reads APPFILE at import time, so each tree is measured in its own child process */
async function measure(file, mode, theme, widths) {
  const js = `process.env.APPFILE = ${JSON.stringify(file)};
const L3 = await import(${JSON.stringify(join(HERE, 'gate_1403_lib.mjs'))});
const { browser, page } = await L3.boot('curtis', { instr: false, desktop: true, seed: ${JSON.stringify(seedFor(mode, theme))} });
await page.waitForFunction(() => { const m = document.getElementById('mainView'); return !!(m && m.style.display === 'block' && window.CardinalProduction); }, null, { timeout: 60000, polling: 200 }).catch(() => {});
await page.waitForTimeout(1500);
await page.evaluate(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } }); try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {} });
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForFunction(() => { const v = document.getElementById('cr-pb'); return !!(v && v.classList.contains('open') && v.querySelector('[data-day]')); }, null, { timeout: 12000, polling: 150 }).catch(() => {});
await page.waitForTimeout(700);
const out = [];
for (const w of ${JSON.stringify(widths)}) {
  await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(600);
  out.push(await page.evaluate(w => {
    const t = document.querySelector('#cr-pb .pbtiles');
    if (!t || !t.getClientRects().length) return { w, err: 'no visible .pbtiles' };
    const cols = getComputedStyle(t).gridTemplateColumns.split(' ').length;
    const clipped = [];
    [...t.children].forEach(tile => tile.querySelectorAll('*').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (el.scrollWidth > el.clientWidth + 1) clipped.push(el.textContent.trim().slice(0, 18) + ' ' + el.scrollWidth + '>' + el.clientWidth);
    }));
    return { w, cols, tiles: t.children.length, clipped, sun: document.documentElement.getAttribute('data-cr-sun'), text: document.documentElement.getAttribute('data-cr-text'), theme: document.documentElement.getAttribute('data-theme') };
  }, w));
}
console.log('@@' + JSON.stringify(out));
await browser.close();`;
  const tmp = join(os.tmpdir(), `gate_1438_m_${process.pid}_${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(tmp, js);
  const res = execSync(`node ${tmp}`, { encoding: 'utf8', maxBuffer: 16 << 20, timeout: 300000 });
  const line = res.split('\n').find(l => l.startsWith('@@'));
  if (!line) throw new Error('measure produced no result: ' + res.slice(-300));
  return JSON.parse(line.slice(2));
}

console.log('gate_1438 on ' + FILE + '  (reference ' + REF + ')');
try {
  console.log('\nA/B  no label cut, and the promised column count');
  for (const [mode, theme] of [['normal', 'dark'], ['normal', 'light'], ['lg', 'dark'], ['xl', 'dark']]) {
    const rows = await measure(FILE, mode, theme, WIDTHS);
    const want = FOUR_FROM[mode];
    if (mode !== 'normal') ok(rows[0].text === mode, `${mode} ${theme}: the text size is actually set`, rows[0].text);
    ok(rows[0].theme === (theme === 'light' ? 'rb-light' : null), `${mode} ${theme}: the theme is actually ${theme}`, rows[0].theme);
    for (const r of rows) {
      if (r.err) { ok(false, `${mode} ${theme} ${r.w}: board drawn`, r.err); continue; }
      ok(r.clipped.length === 0, `A ${mode} ${theme} ${r.w}: no box label cut`, r.clipped.join(' | ') || 'none');
      ok(r.cols === (r.w >= want ? 4 : 2) && r.tiles === 4, `B ${mode} ${theme} ${r.w}: ${r.w >= want ? 'four across' : 'two by two'}`, { cols: r.cols, tiles: r.tiles });
    }
  }
  console.log('\nC  Sun is untouched (column count equals the reference at every width)');
  {
    const a = await measure(FILE, 'sun', 'light', WIDTHS), b = await measure(REF, 'sun', 'light', WIDTHS);
    ok(a[0].sun === '1' && b[0].sun === '1', 'C Sun is actually on, on both trees', [a[0].sun, b[0].sun]);
    ok(JSON.stringify(a.map(r => r.cols)) === JSON.stringify(b.map(r => r.cols)), 'C Sun: the same columns at every width as the reference', { now: a.map(r => r.cols), ref: b.map(r => r.cols) });
    ok(a.every(r => r.clipped && r.clipped.length === 0), 'C Sun: no box label cut at any width', a.filter(r => r.clipped && r.clipped.length).map(r => r.w));
  }
  console.log('\nD  the phone');
  {
    const r = (await measure(FILE, 'normal', 'dark', [390]))[0];
    ok(r.cols === 2 && r.clipped.length === 0, 'D 390: two by two, nothing cut', r);
  }
} catch (e) { ok(false, 'gate threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
const total = passes + fails.length;
if (total < 90) { fails.push(`only ${total} checks ran (floor 90)`); console.log(`  ✗ FAIL only ${total} checks ran (floor 90)`); }
console.log(`\n${fails.length ? 'GATE 1438 RED' : 'GATE 1438 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
