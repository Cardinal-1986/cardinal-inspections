/* gate_1437 — the Clients bar's portal chips never run off the screen.
 *
 * #cdCrmBar is the phone's only way to filter Clients by portal. Before 1437 it was a
 * centred, nowrap strip with a hidden scrollbar: an overflowing row spilled off BOTH
 * edges and the left spill could not be scrolled to. On 1436 at 390 "All" started
 * 7px off the left at Normal with three-digit counts, 14 at Large and in Sun, 41 at
 * Larger (66 with three-digit counts). The fixture's single-digit counts fit at
 * Normal, which is why gate_993 saw it clean.
 *
 *   A  every chip lies inside the viewport — Normal / Large / Larger / Sun ×
 *      fixture counts and three-digit counts (8 boots)
 *   B  nothing is hidden past the edge: scrollWidth <= clientWidth
 *   C  where it already fitted (Normal, fixture counts) the chips sit exactly
 *      where they sat on the reference tree — one row, same x positions.
 *      Since 1444 (the Claims chip is "Insurance") the labels differ from the
 *      reference and do not fit one row at Normal, so C checks instead that the
 *      bar wraps only where a chip cannot fit on the row before it
 *   D  with a long list scrolled to the end, the last client ends above the bar —
 *      with the footer showing (Retail) and hidden (the portals that hide it)
 *
 * Signed in through sentinel_setup_cardinal.js + e2e_mock_supa.js, opened with
 * that file's own 'clientdir' state. Theme is Light, the way the sentinel sets it.
 *   node gate_1437.mjs [artifact] [--ref reference.html]
 * Default artifact: the repo index.html. Default reference: main's index.html at
 * build 1436 (git show 002d521:index.html). On 1436 itself this gate must go RED.
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('gate_1437: playwright not found'); process.exit(2); }

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ri = args.indexOf('--ref');
let REF = ri !== -1 ? args[ri + 1] : null;
const FILE = resolve(args.find((a, i) => !a.startsWith('--') && (ri === -1 || i !== ri + 1)) || join(HERE, '../../../../index.html'));
if (!REF) {
  REF = join(os.tmpdir(), 'gate_1437_ref1436.html');
  if (!existsSync(REF)) writeFileSync(REF, execSync('git show 002d521:index.html', { cwd: join(HERE, '../../../..'), maxBuffer: 64 << 20 }));
}
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
const THEME = `window.__sentinelTheme='rb-light';(function put(){var r=document.documentElement;if(r){r.setAttribute('data-theme','rb-light');return;}new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}}).observe(document,{childList:true});})();`;
const MODES = {
  normal: '',
  large: `try{localStorage.setItem('cr-textsize','lg');}catch(e){}`,
  larger: `try{localStorage.setItem('cr-textsize','xl');}catch(e){}`,
  sun: `try{localStorage.setItem('cardinal.theme.rb','sun');}catch(e){}`,
};
const BIG = ['312', '240', '58', '14'];

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 240) : '')); }

const browser = await chromium.launch();
async function open(file, mode, big) {
  const HTML = readFileSync(file, 'utf8');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, body: '' }));
  await page.addInitScript(THEME);
  /* the mode AFTER the setup: sentinel_setup_cardinal.js writes '1' to the theme key for
     rb-light, so a Sun seed placed before it was silently overwritten (caught by the
     "Sun is actually on" check on the first run) */
  await page.addInitScript(SETUP + '\n;\n' + MODES[mode]);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const i = await page.evaluate(() => window.__sentinelStates.findIndex(s => s.name === 'clientdir'));
  if (i < 0) throw new Error('no clientdir state in sentinel_setup_cardinal.js');
  await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`);
  await page.waitForTimeout(500);
  if (big) await page.evaluate(v => { [...document.querySelectorAll('#cdCrmBar .cd-crmchip b')].forEach((b, k) => { b.textContent = v[k] || '99'; }); }, BIG);
  await page.waitForTimeout(150);
  return { ctx, page };
}
const measure = page => page.evaluate(() => {
  const bar = document.getElementById('cdCrmBar');
  const chips = [...bar.children].map(c => { const q = c.getBoundingClientRect(); return { t: c.textContent.trim(), l: Math.round(q.left), r: Math.round(q.right), top: Math.round(q.top) }; });
  const bs = getComputedStyle(bar);
  const inner = bar.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
  const gap = parseFloat(bs.columnGap) || 0;
  return { iw: window.innerWidth, sw: bar.scrollWidth, cw: bar.clientWidth, inner, gap, chips, rows: new Set(chips.map(c => c.top)).size,
           sun: document.documentElement.getAttribute('data-cr-sun'), text: document.documentElement.getAttribute('data-cr-text') };
});
const tail = (page, hideFooter) => page.evaluate(async hide => {
  if (hide) { const f = document.querySelector('footer.site'); if (f) f.style.display = 'none'; }
  const cs = [...document.querySelectorAll('#clientsView .cd-card')]; const l = cs[cs.length - 1];
  for (let k = 0; k < 20; k++) l.parentNode.appendChild(l.cloneNode(true));
  await new Promise(r => setTimeout(r, 120));
  window.scrollTo(0, 1e7); if (document.scrollingElement) document.scrollingElement.scrollTop = 1e7;
  await new Promise(r => setTimeout(r, 250));
  const all = [...document.querySelectorAll('#clientsView .cd-card')];
  return { last: Math.round(all[all.length - 1].getBoundingClientRect().bottom), barTop: Math.round(document.getElementById('cdCrmBar').getBoundingClientRect().top) };
}, hideFooter);

console.log('gate_1437 on ' + FILE + '  (reference ' + REF + ')');
try {
  console.log('\nA/B  every chip inside the viewport, nothing hidden past the edge');
  for (const mode of Object.keys(MODES)) for (const big of [false, true]) {
    const { ctx, page } = await open(FILE, mode, big);
    const m = await measure(page);
    const lab = `${mode}${big ? ', three-digit counts' : ', fixture counts'}`;
    if (mode === 'sun') ok(m.sun === '1', `A ${lab}: Sun is actually on`, m.sun);
    if (mode === 'large' || mode === 'larger') ok(m.text === (mode === 'large' ? 'lg' : 'xl'), `A ${lab}: the text size is actually set`, m.text);
    const lo = Math.min(...m.chips.map(c => c.l)), hi = Math.max(...m.chips.map(c => c.r));
    ok(m.chips.length === 4 && lo >= 0 && hi <= m.iw, `A ${lab}: all four chips inside 0..${m.iw}`, { left: lo, right: hi, rows: m.rows });
    ok(m.sw <= m.cw, `B ${lab}: nothing hidden past the edge (scrollWidth <= clientWidth)`, { sw: m.sw, cw: m.cw });
    await ctx.close();
  }

  console.log('\nC  where it already fitted, nothing moved');
  {
    const a = await open(FILE, 'normal', false), b = await open(REF, 'normal', false);
    const ma = await measure(a.page), mb = await measure(b.page);
    const lbl = m => m.chips.map(c => c.t.replace(/[\d\s]+$/, '')).join('|');
    if (lbl(ma) === lbl(mb)) {
      ok(ma.rows === 1, 'C Normal, fixture counts: still one row', ma.rows);
      ok(JSON.stringify(ma.chips.map(c => [c.l, c.r])) === JSON.stringify(mb.chips.map(c => [c.l, c.r])), 'C Normal, fixture counts: chips at the same x as the reference', { now: ma.chips.map(c => [c.l, c.r]), ref: mb.chips.map(c => [c.l, c.r]) });
    } else {
      /* 1444 renamed the Claims chip "Insurance" (Theo's pick), and the four chips no longer
         fit one row at Normal on a 390 phone. Matching the 1436 reference's x positions is
         then impossible by construction, so C asserts what 1437 actually promised instead:
         the bar wraps only when it must. Each row break is checked: the chip that starts a
         row could not have fitted at the end of the row before it. */
      const rows = [...new Set(ma.chips.map(c => c.top))].sort((x, y) => x - y).map(t => ma.chips.filter(c => c.top === t));
      const needless = [];
      for (let k = 1; k < rows.length; k++) {
        const prev = rows[k - 1], first = rows[k][0];
        const used = Math.max(...prev.map(c => c.r)) - Math.min(...prev.map(c => c.l));
        if (used + ma.gap + (first.r - first.l) <= ma.inner) needless.push(first.t);
      }
      ok(rows.length >= 1 && needless.length === 0, 'C Normal, fixture counts: the labels changed since the reference (' + lbl(mb) + ' -> ' + lbl(ma) + '), so the bar wraps only where a chip cannot fit', { rows: rows.map(r => r.map(c => c.t)), inner: ma.inner, gap: ma.gap, needless });
      ok(ma.chips.length === 4, 'C Normal, fixture counts: still four chips', ma.chips.length);
    }
    await a.ctx.close(); await b.ctx.close();
  }

  console.log('\nD  the last client clears the bar at the end of a long list');
  for (const mode of ['normal', 'larger', 'sun']) for (const hide of [false, true]) {
    const { ctx, page } = await open(FILE, mode, true);
    const t = await tail(page, hide);
    ok(t.last < t.barTop, `D ${mode}, three-digit counts, footer ${hide ? 'hidden' : 'showing'}: last client ends above the bar`, t);
    await ctx.close();
  }
} catch (e) { ok(false, 'gate threw: ' + String(e && e.message || e).split('\n')[0]); }
await browser.close();
const total = passes + fails.length;
if (total < 30) { fails.push(`only ${total} checks ran (floor 30)`); console.log(`  ✗ FAIL only ${total} checks ran (floor 30)`); }
console.log(`\n${fails.length ? 'GATE 1437 RED' : 'GATE 1437 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
