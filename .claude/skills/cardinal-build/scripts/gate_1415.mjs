/* gate_1415 — calmer cards, spelled stages, one typeface.
 *   A  Home pipeline: seven cards spell "Leads Prospects Approved Completed Invoiced Closed On Hold"; no label clipped;
 *      phone scrolls one row; with the rail open rows are 7 or 4+3 — never a stranded single card (390 → 1920)
 *   B  no Home card / Activity panel carries a red left edge, no Reports tile a red top cap (dark + light)
 *   C  the computed type stack names -apple-system on body and on module text (Apple devices stop drawing Arial)
 *   D  static: no 'Segoe UI' -> Arial stack is left without the system faces
 * Arg: [index.html] -> negative control (1414 must go RED). */
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
process.env.APPFILE = FILE;
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 280000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const WANT = 'Leads Prospects Approved Completed Invoiced Closed On Hold';
const src = readFileSync(FILE, 'utf8');
const stale = [...src.matchAll(/['"]Segoe UI\\?['"],\s?Arial/g)].filter(m => !src.slice(Math.max(0, m.index - 30), m.index).includes('BlinkMacSystemFont')).length;
ok(stale === 0, 'D  every Segoe UI -> Arial stack carries the Apple/Android system faces', stale + ' left');
const isRed = c => { const m = (c.match(/[\d.]+/g) || []).map(Number); return m.length >= 3 && m[0] > 150 && m[1] < 70 && m[2] < 80; };
for (const [w, h, desk] of [[390, 844, false], [1194, 834, true], [1366, 768, true], [1536, 864, true], [1920, 1080, true]]) {
  const { browser, page } = await boot('theo', { instr: false, desktop: desk });
  try {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const row = document.getElementById('pipeRow'); if (!row) return null;
      const cells = [...row.querySelectorAll('.pipebtn')];
      const tops = cells.map(c => Math.round(c.getBoundingClientRect().top));
      const per = [...new Set(tops)].map(t => tops.filter(x => x === t).length);
      const clipped = cells.filter(c => { const l = c.querySelector('.plabel'); return l.scrollWidth > l.clientWidth + 1 || l.getBoundingClientRect().right > c.getBoundingClientRect().right + 1; }).map(c => c.textContent.trim());
      return { labels: cells.map(c => c.querySelector('.plabel').textContent.trim()).join(' '), per, clipped, font: getComputedStyle(document.body).fontFamily, mod: getComputedStyle(document.querySelector('.pipetitle') || document.body).fontFamily };
    });
    ok(r && r.labels === WANT, `A  @${w} the stages are spelled`, r && r.labels);
    ok(r && !r.clipped.length, `A  @${w} no stage label is clipped`, r && r.clipped.join(','));
    ok(r && (r.per.length === 1 || (r.per.length === 2 && Math.min(...r.per) >= 3)), `A  @${w} 7 on one row, or 4 + 3 — never a stranded card`, r && JSON.stringify(r.per));
    if (w === 390 || w === 1920) ok(r && /-apple-system/.test(r.font) && /-apple-system/.test(r.mod), `C  @${w} body and card titles name -apple-system`, r && r.mod);
    if (w === 1366) {
      for (const theme of ['dark', 'light']) {
        if (theme === 'light') { await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light')); await page.waitForTimeout(300); }
        const reds = await page.evaluate(() => [...document.querySelectorAll('#mainView .pipecard, #mainView .actcard')].filter(e => e.getClientRects().length).map(e => getComputedStyle(e)).filter(cs => parseFloat(cs.borderLeftWidth) >= 2).map(cs => cs.borderLeftColor));
        ok(!reds.filter(isRed).length, `B  ${theme}: no red left edge on the Home cards`, reds.join(','));
      }
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
      await page.evaluate(() => openReportsView()); await page.waitForTimeout(1500);
      const caps = await page.evaluate(() => [...document.querySelectorAll('#reportsView .rptkpi')].filter(e => e.getClientRects().length).map(e => { const cs = getComputedStyle(e); return cs.borderTopWidth + ' ' + cs.borderTopColor; }));
      ok(caps.length && !caps.filter(c => parseFloat(c) >= 2 && isRed(c)).length, 'B  no red cap on the Reports tiles', caps.slice(0, 2).join(' | '));
    }
  } catch (e) { ok(false, `@${w} crashed`, e.message.split('\n')[0].slice(0, 140)); }
  finally { await browser.close(); }
}
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
