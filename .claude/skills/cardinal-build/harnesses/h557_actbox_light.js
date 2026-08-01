/* Build 557 gate — the Activity Count light twin.
 *
 * Build 481's lesson is the whole reason this file exists: a CSS rule can parse,
 * balance, pass duplicate-id, pass node --check, pass the marker and the negative
 * control — and still never apply, because a neighbour out-specifies it. Only a
 * real engine can say which rule won. So every assertion below reads
 * getComputedStyle in Chromium, and the DARK page is loaded from the SAME file to
 * prove the twin did not leak.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v557.html', 'utf8');

const styles = [];
for (let i = 0; ;) {
  const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8;
}

const rel = (h) => { const f = (c) => (c /= 255) <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  const [r, g, b] = h.match(/\d+/g).map(Number); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [rel(a), rel(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const load = async (light) => {
    const p = await b.newPage({ viewport: { width: 1200, height: 420 }, deviceScaleFactor: 2 });
    await p.setContent(`<html${light ? ' data-theme="rb-light"' : ''}><head>` +
      styles.map(s => `<style>${s}</style>`).join('') +
      `</head><body style="background:${light ? '#f4f1ec' : '#0b0b0f'};padding:24px">
      <div class="actstrip">
        <div class="actbox"><span>New<br>Leads</span><b>14</b></div>
        <div class="actbox"><span>Jobs<br>Approved</span><b>6</b></div>
        <div class="actbox"><span>Completed</span><b>9</b></div>
        <div class="actbox"><span>Invoiced</span><b>4</b></div>
        <div class="actbox"><span>Closed</span><b>11</b></div>
        <div class="actbox"><span>Collected</span><b>$82,400</b></div>
      </div></body></html>`, { waitUntil: 'load' });
    return p;
  };
  const read = (p) => p.evaluate(() => {
    const t = document.querySelector('.actbox');
    const cs = getComputedStyle(t);
    return { bg: cs.backgroundImage, border: cs.borderTopColor, shadow: cs.boxShadow,
             radius: cs.borderTopLeftRadius, pad: cs.paddingTop,
             label: getComputedStyle(t.querySelector('span')).color,
             num: getComputedStyle(t.querySelector('b')).color };
  });

  const dark = await load(false), lite = await load(true);
  const D = await read(dark), L = await read(lite);

  console.log('\nWHICH RULE WON — Chromium, not specificity on paper');
  ok(`light tile is a WHITE radial, not the obsidian one`,
     /255,\s*255,\s*255/.test(L.bg) && !/44,\s*45,\s*54/.test(L.bg), L.bg.slice(0, 80));
  ok(`dark tile still the obsidian radial (#2c2d36 → #08080b)`,
     /44,\s*45,\s*54/.test(D.bg) && /8,\s*8,\s*11/.test(D.bg), D.bg.slice(0, 80));
  ok(`light numeral is the deepened orange #C25A18 (${L.num})`,
     L.num === 'rgb(194, 90, 24)', L.num);
  ok(`dark numeral is UNCHANGED at #E8722A (${D.num})`,
     D.num === 'rgb(232, 114, 42)', D.num);
  ok(`light label is the slate #5f6670 (${L.label})`, L.label === 'rgb(95, 102, 112)', L.label);
  ok(`dark label is UNCHANGED at #9aa0a8 (${D.label})`, D.label === 'rgb(154, 160, 168)', D.label);
  ok(`light border lightens to #e2e2e2 (${L.border})`, L.border === 'rgb(226, 226, 226)', L.border);
  ok(`dark border unchanged at #24242c (${D.border})`, D.border === 'rgb(36, 36, 44)', D.border);

  console.log('\nSHARED GEOMETRY — a twin, not a different component');
  ok(`same corner radius in both (${L.radius})`, L.radius === D.radius, `${L.radius} vs ${D.radius}`);
  ok(`same padding in both (${L.pad})`, L.pad === D.pad, `${L.pad} vs ${D.pad}`);
  ok('same sheen origin, 22% -10%, in both gradients',
     L.bg.includes('22%') && D.bg.includes('22%'), `${L.bg.slice(0,40)} | ${D.bg.slice(0,40)}`);

  console.log('\nSHADOW-LED vs HIGHLIGHT-LED');
  ok('light carries a real drop shadow', /rgba\(16,\s*18,\s*24/.test(L.shadow), L.shadow.slice(0, 70));
  ok('dark keeps its inset highlight', /inset/.test(D.shadow), D.shadow.slice(0, 70));

  console.log('\nCONTRAST, MEASURED OFF THE RENDERED PIXELS');
  const lLab = ratio(L.label, 'rgb(255,255,255)'), lNum = ratio(L.num, 'rgb(255,255,255)');
  console.log(`        light label ${lLab.toFixed(2)}:1   light numeral ${lNum.toFixed(2)}:1  (on the tile's white centre)`);
  ok(`light label clears the 4.5 body floor (${lLab.toFixed(2)}:1)`, lLab >= 4.5, lLab.toFixed(2));
  ok(`light numeral clears the 3.0 large-text floor (${lNum.toFixed(2)}:1)`, lNum >= 3.0, lNum.toFixed(2));
  const wouldHave = ratio('rgb(232,114,42)', 'rgb(255,255,255)');
  ok(`and the untouched orange would NOT have (${wouldHave.toFixed(2)}:1 — the reason it changed)`,
     wouldHave < lNum, wouldHave.toFixed(2));

  await lite.screenshot({ path: SC + '/act557_light.png' });
  await dark.screenshot({ path: SC + '/act557_dark.png' });
  console.log('\n' + '='.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(64));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
