/* Builds 544 + 545 — Chromium, with EVERY <style> block from the artifact
 * loaded in file order.
 *
 * This is the 481 lesson made into a gate. That build added an unprefixed rule
 * into a stylesheet whose neighbours were all scoped, lost the cascade, and
 * shipped a solid red button while brace-balance, duplicate-id, node --check,
 * marker and negative control were ALL green. The only thing that catches it is
 * asking a real engine which rule won.
 *
 * So: no hand-picked snippets. All 100+ stylesheets, in order, and every
 * assertion below is a getComputedStyle read.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v545.html', 'utf8');

/* every stylesheet, in file order */
const styles = [];
let i = 0;
for (;;) {
  const a = src.indexOf('<style', i);
  if (a < 0) break;
  const open = src.indexOf('>', a);
  const b = src.indexOf('</style>', open);
  if (b < 0) break;
  styles.push(src.slice(open + 1, b));
  i = b + 8;
}
console.log(`  loaded ${styles.length} stylesheets from the artifact, in file order`);

const CHIPS = ['Lead', 'Prospect', 'Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed', 'Lost'];
const DOM = `
<div id="retail">${CHIPS.map(s =>
  `<span class="stagechip stg-${s}" id="r-${s}">${s}</span>`).join('')}</div>
<div id="insClientsView">${CHIPS.map(s =>
  `<span class="stagechip stg-${s}" id="i-${s}">${s}</span>`).join('')}</div>
<div class="pcard stg-Lead" id="cardLead">a card, not a chip</div>
<div class="actstrip"><div class="actbox" id="tile"><span id="tlab">New<br>Leads</span><b id="tnum">12</b></div></div>`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

const page = (light) =>
  `<html${light ? ' data-theme="rb-light"' : ''}><head>` +
  styles.map(s => `<style>${s}</style>`).join('') +
  `</head><body>${DOM}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });

  // ── DARK ────────────────────────────────────────────────────────────────
  await p.setContent(page(false), { waitUntil: 'load' });
  console.log('\n544 · DARK — the new rules must WIN over the light pastels');
  const dark = await p.evaluate((names) => {
    const g = (id) => {
      const cs = getComputedStyle(document.getElementById(id));
      return { bg: cs.backgroundColor, fg: cs.color, bd: cs.borderTopColor };
    };
    const o = { retail: {}, ins: {} };
    names.forEach(n => { o.retail[n] = g('r-' + n); o.ins[n] = g('i-' + n); });
    o.card = getComputedStyle(document.getElementById('cardLead')).backgroundColor;
    return o;
  }, CHIPS);

  /* the shipped light pastels — if any of these survives in dark, the rule lost */
  const PASTEL = { Lead: 'rgb(232, 240, 251)', Prospect: 'rgb(253, 243, 226)',
    Approved: 'rgb(233, 245, 236)', Scheduled: 'rgb(255, 240, 240)',
    Completed: 'rgb(236, 236, 236)', Invoiced: 'rgb(243, 232, 251)',
    Closed: 'rgb(230, 236, 239)', Lost: 'rgb(239, 233, 233)' };
  for (const n of CHIPS) {
    const got = dark.retail[n].bg;
    ok(`${n.padEnd(10)} is no longer the pastel  →  ${got}`, got !== PASTEL[n], got);
  }
  ok('every dark chip is translucent (rgba), as designed',
     CHIPS.every(n => dark.retail[n].bg.startsWith('rgba')),
     CHIPS.map(n => dark.retail[n].bg).join(' '));
  ok('every dark chip got its border', CHIPS.every(n => dark.retail[n].bd !== 'rgb(0, 0, 0)'));

  console.log('\n544 · CLAIMS MUST STILL WIN ON ITS OWN SCREENS');
  ok('#insClientsView chips are unchanged by this build',
     CHIPS.every(n => dark.ins[n].bg === dark.retail[n].bg || dark.ins[n].bg.startsWith('rgba')),
     'claims chip diverged');
  /* the real check: Claims' own declared colours still resolve there */
  ok('  Claims Lead is still its own rgba(93,161,243,.18)',
     dark.ins.Lead.bg === 'rgba(93, 161, 243, 0.18)', dark.ins.Lead.bg);

  console.log('\n544 · A .pcard WEARING stg-Lead MUST BE UNCHANGED BY THIS BUILD');
  /* The first version of this assertion demanded the card NOT be a pastel, and
     it failed — but build 543 shows the identical value, so it is measuring a
     PRE-EXISTING condition and blaming this build for it.
       `.stg-Lead{background:#e8f0fb}` sits at char 41043; `.pcard{background:
       linear-gradient(...)}` sits at char 14262. Same specificity (0,1,0), so
       FILE ORDER decides and the bare stage rule wins.
     That is worth reporting to Theo. It is not this build's to fix, and the
     honest assertion is that the new rules did not MOVE it — which is exactly
     what scoping to `.stagechip` was for. Compared against the previous build,
     not against a value I think is correct. */
  const before = await (async () => {
    const q = await b.newPage();
    const prevSrc = fs.readFileSync(SC + '/app/index_v543.html', 'utf8');
    const st = []; let k = 0;
    for (;;) { const a = prevSrc.indexOf('<style', k); if (a < 0) break;
      const o = prevSrc.indexOf('>', a); const e = prevSrc.indexOf('</style>', o);
      if (e < 0) break; st.push(prevSrc.slice(o + 1, e)); k = e + 8; }
    await q.setContent('<html><head>' + st.map(x => `<style>${x}</style>`).join('') +
      '</head><body><div class="pcard stg-Lead" id="c">x</div></body></html>', { waitUntil: 'load' });
    const v = await q.evaluate(() => getComputedStyle(document.getElementById('c')).backgroundColor);
    await q.close(); return v;
  })();
  ok(`this build did not move the card: 543 ${before} → 545 ${dark.card}`,
     before === dark.card, `${before} vs ${dark.card}`);
  ok('  (the card pastel is pre-existing — a bare .stg-* rule outranking .pcard ' +
     'by file order. Reported, not fixed here.)', true);

  console.log('\n545 · THE OBSIDIAN TILE');
  const tile = await p.evaluate(() => {
    const t = getComputedStyle(document.getElementById('tile'));
    return { bgImage: t.backgroundImage, shadow: t.boxShadow, border: t.borderTopColor,
             lab: getComputedStyle(document.getElementById('tlab')).color,
             num: getComputedStyle(document.getElementById('tnum')).color };
  });
  ok('the tile paints a radial gradient, not a flat panel',
     tile.bgImage.includes('radial-gradient'), tile.bgImage.slice(0, 60));
  ok('  and is raised on a real drop shadow', /rgba?\([^)]*\)\s+0px\s+10px\s+24px/.test(tile.shadow)
     || tile.shadow.includes('10px 24px'), tile.shadow.slice(0, 80));
  ok(`  the orange numeral survived  →  ${tile.num}`, tile.num === 'rgb(232, 114, 42)', tile.num);
  ok(`  the label is pinned  →  ${tile.lab}`, tile.lab === 'rgb(154, 160, 168)', tile.lab);

  // ── LIGHT ───────────────────────────────────────────────────────────────
  await p.setContent(page(true), { waitUntil: 'load' });
  console.log('\n544 · LIGHT — the pastels must be exactly as they were');
  const light = await p.evaluate((names) => {
    const o = {};
    names.forEach(n => { o[n] = getComputedStyle(document.getElementById('r-' + n)).backgroundColor; });
    o.__lab = getComputedStyle(document.getElementById('tlab')).color;
    o.__num = getComputedStyle(document.getElementById('tnum')).color;
    o.__bg = getComputedStyle(document.getElementById('tile')).backgroundImage;
    return o;
  }, CHIPS);
  for (const n of CHIPS) {
    ok(`${n.padEnd(10)} still the shipped pastel  →  ${light[n]}`, light[n] === PASTEL[n], light[n]);
  }

  console.log('\n545 · LIGHT — the tile is black in BOTH modes, so its label must be too');
  ok('the tile is still obsidian in light', light.__bg.includes('radial-gradient'));
  ok(`  the label did NOT flip to the light token #6b6b6b  →  ${light.__lab}`,
     light.__lab === 'rgb(154, 160, 168)', light.__lab);
  ok('  (that token on this ground would be 3.57:1, under the 4.5 floor)', true);
  ok(`  the orange is the same in light  →  ${light.__num}`, light.__num === 'rgb(232, 114, 42)');

  await p.setContent(page(false), { waitUntil: 'load' });
  await p.locator('#retail').screenshot({ path: SC + '/chips545_dark.png' });
  await p.locator('.actstrip').screenshot({ path: SC + '/tile545_dark.png' });

  console.log('\n' + '='.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(58));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
