/* Build 537 gate + preview.
 *
 * The SOURCE rules and the new block are both in the page, so every assertion
 * answers "which rule won" rather than "is my CSS in the file" — the 481
 * lesson. The .acthead and .pu-strip .sh b clips are deliberately NOT released
 * by this build, so they are loaded too: the icons have to survive them.
 *
 * The clip-release claim is tested by PIXELS, not by computed style. A
 * background-clip:text element reports color:var(--rbe-acc) while painting the
 * gradient, so getComputedStyle cannot answer it. Two element screenshots and
 * a byte compare can.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const now = fs.readFileSync(SC + '/app/index_v537.html', 'utf8');
const prev = fs.readFileSync(SC + '/app/index_v536.html', 'utf8');

/* ---- extract, then PRINT WHAT THE EXTRACTOR CAUGHT before asserting on it -- */
const rule = (src, sel) => {
  const a = src.indexOf(sel + '{');
  if (a < 0) throw new Error('no rule for ' + sel);
  return src.slice(a, src.indexOf('}', a) + 1);
};
const styleBody = (src, id) => {
  const a = src.indexOf('<style id="' + id + '">');
  return src.slice(src.indexOf('>', a) + 1, src.indexOf('</style>', a));
};

/* Anchor on a DECLARATION, not on a selector: `.hero-hi,.hero-hi *,.acthead{`
   is a substring of the print stylesheet's much longer selector list, which
   comes first in the file — so selector-matching silently captured the
   @media print rule and this harness reported a #1b1b1b text-fill. */
const ruleAt = (src, decl) => {
  const d = src.indexOf(decl);
  if (d < 0) throw new Error('no rule containing ' + decl);
  const a = Math.max(src.lastIndexOf('}', d), src.lastIndexOf('{', d),
                     src.lastIndexOf('>', d)) + 1;
  return src.slice(a, src.indexOf('}', d) + 1);
};

const NEWTITLE = rule(now, '.pipetitle');                       // clip released
const OLDTITLE = rule(prev, '.pipetitle');                      // clip in place
const ACTHEAD = [rule(now, '.acthead'),
                 ruleAt(now, '.acthead{background:linear-gradient')].join('\n');
const SH = [rule(now, '.pu-strip .sh'), rule(now, '.pu-strip .sh b')].join('\n');
const BLOCK = styleBody(now, 'cr-titleicon-styles');
console.log('  captured ACTHEAD clip rule: ' + ACTHEAD.split('\n')[1].slice(0, 96) + '…');
if (!ACTHEAD.includes('-webkit-text-fill-color:transparent')
    || ACTHEAD.includes('!important')) throw new Error('grabbed the print rule again');
for (const [n, t] of [['NEWTITLE', NEWTITLE], ['OLDTITLE', OLDTITLE], ['BLOCK', BLOCK],
                      ['ACTHEAD', ACTHEAD], ['SH', SH]]) {
  const o = (t.match(/{/g) || []).length, c = (t.match(/}/g) || []).length;
  console.log(`  captured ${n}: ${t.length} chars, ${o} open / ${c} close braces`);
  if (o !== c) throw new Error(n + ' extraction is unbalanced');
}
if (!OLDTITLE.includes('-webkit-text-fill-color:transparent')) throw new Error('bad OLDTITLE');
if (NEWTITLE.includes('background-clip')) throw new Error('537 did not release the clip');

/* ---- the 20 icons, pulled out of the shipped markup with their titles ------ */
const ICONS = [];
const re = /<svg class=\\?"pti\\?"[\s\S]*?<\/svg>/g;
let m;
while ((m = re.exec(now))) {
  const after = now.slice(m.index + m[0].length, m.index + m[0].length + 70);
  const label = after.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
    .split(/[<\n]/)[0].trim().slice(0, 34) || '(punch strip)';
  ICONS.push({ svg: m[0].replace(/\\"/g, '"'), label });
}
console.log(`  captured ${ICONS.length} icons from the markup`);

const grid = ICONS.map(i => `<div class="cell">${i.svg}<span>${i.label}</span></div>`).join('');
/* by LABEL, not by index — an index lookup put the bar chart on Punch & Repairs */
const byLabel = (t) => {
  const hit = ICONS.find(i => i.label.startsWith(t));
  if (!hit) throw new Error('no icon labelled ' + t);
  return hit.svg;
};

const page = `<style>
:root{--rbe-head:#ffffff;--rbe-mute:#8b9199;--rbe-acc:#8fb4d8;--rbe-ink:#cfd6df}
:root[data-theme="rb-light"]{--rbe-head:#161616;--rbe-mute:#6d747e;--rbe-acc:#3d6485;--rbe-ink:#161616}
body{margin:0;background:#09090C;font:14px 'Segoe UI',Arial,sans-serif}
:root[data-theme="rb-light"] body{background:#eceef0}
.card{background:linear-gradient(180deg,#1A2434,#141C29);border:1px solid #223047;
  border-top:2px solid #33496A;border-radius:11px;padding:14px 16px;margin:14px}
:root[data-theme="rb-light"] .card{background:#fff;border:1px solid #e2e4e7;
  border-top:2px solid #c8202e;box-shadow:0 2px 8px rgba(0,0,0,.07)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 10px}
.cell{display:flex;align-items:center;font:800 13px Georgia,'Times New Roman',serif;
  color:var(--rbe-head);padding:5px 0}
.cell span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pu-strip{margin:0}
#probeA,#probeB,#probeC,#probeD{font:800 15px Georgia,'Times New Roman',serif;
  margin:0;padding:2px 4px;display:inline-block}
.hd{font:800 10px ui-monospace;letter-spacing:.13em;color:#8d97a6;margin:0 16px}
</style>
<style>${NEWTITLE}
${ACTHEAD}
${SH}
${BLOCK}
/* the OLD rule, renamed, so the two can be photographed side by side */
${OLDTITLE.replace('.pipetitle{', '.oldclip{')}
</style>
<div class="hd">ALL 20, ON 535's CARD</div>
<div class="card"><div class="grid">${grid}</div></div>
<div class="card">
  <div class="pipetitle">${byLabel('Revenue over time')}Revenue over time <small style="font-weight:400;">(signed value &#183; dashed = previous period)</small></div>
  <div class="acthead">${byLabel('Activity Count')}Activity Count: Last 30 Days</div>
  <div class="pu-strip"><div class="sh"><b>${byLabel('Punch')}Punch &amp; Repairs</b></div></div>
</div>
<div class="hd">CLIP PROBES</div>
<div class="card" style="display:flex;gap:10px;align-items:center">
  <span class="oldclip" id="probeA">Cardinal Pipeline</span>
  <span class="pipetitle" id="probeB">Cardinal Pipeline</span>
  <span class="oldclip" id="probeC">&#128202;</span>
  <span class="pipetitle" id="probeD">&#128202;</span>
</div>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 620 }, deviceScaleFactor: 2 });
  let pass = 0, fail = 0;
  const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                              : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
  await p.setContent(page, { waitUntil: 'load' });

  console.log('\nSTRUCTURE');
  ok('20 icons in the markup', ICONS.length === 20, String(ICONS.length));
  const shape = await p.evaluate(() => {
    const s = [...document.querySelectorAll('.grid svg.pti')];
    return {
      n: s.length,
      empty: s.filter(x => !x.querySelector('.i2').innerHTML.trim()
                        || !x.querySelector('.i5').innerHTML.trim()).length,
      unsized: s.filter(x => x.getBoundingClientRect().width < 16).length,
      // every path must actually enclose area — a typo'd `d` renders nothing
      zeroArea: s.filter(x => [...x.querySelectorAll('.i2 > *')]
        .some(e => { const bb = e.getBBox(); return bb.width < 1 || bb.height < 1; })).length,
    };
  });
  ok('  every icon carries both weights, both non-empty', shape.empty === 0, String(shape.empty));
  ok('  every icon occupies 18px', shape.unsized === 0, String(shape.unsized));
  ok('  every solid subpath draws real area (no typo\'d d=)', shape.zeroArea === 0,
     String(shape.zeroArea));

  const weights = async () => p.evaluate(() => {
    const s = [...document.querySelectorAll('.grid svg.pti')];
    const vis = e => getComputedStyle(e).display !== 'none';
    return {
      solid: s.filter(x => vis(x.querySelector('.i2'))).length,
      line: s.filter(x => vis(x.querySelector('.i5'))).length,
      i2fill: getComputedStyle(document.querySelector('.pti .i2')).fill,
      i5stroke: getComputedStyle(document.querySelector('.pti .i5')).stroke,
      mstroke: getComputedStyle(document.querySelector('.pti .i5 .m')
        || document.querySelector('.pti .i5')).stroke,
    };
  });

  console.log('\nDARK — solid, the nav\'s muted grey');
  let w = await weights();
  ok('all 20 show the solid weight', w.solid === 20, String(w.solid));
  ok('  and none shows the keyline', w.line === 0, String(w.line));
  ok('  fill is the nav\'s --rbe-mute, not an invented colour',
     w.i2fill === 'rgb(139, 145, 153)', w.i2fill);
  await p.screenshot({ path: SC + '/icons537-dark.png', fullPage: true });

  console.log('\nLIGHT — keyline, #a3121e with #9a9a9a secondaries');
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
  await p.waitForTimeout(120);
  w = await weights();
  ok('the weights swap — keyline on, solid off', w.line === 20 && w.solid === 0,
     w.line + '/' + w.solid);
  ok('  stroke matches the nav\'s light icon colour', w.i5stroke === 'rgb(163, 18, 30)', w.i5stroke);
  ok('  secondary strokes are the nav\'s #9a9a9a', w.mstroke === 'rgb(154, 154, 154)', w.mstroke);
  await p.screenshot({ path: SC + '/icons537-light.png', fullPage: true });
  await p.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await p.waitForTimeout(120);

  console.log('\nTHE ICONS SURVIVE THE TWO CLIPS THIS BUILD LEAVES IN PLACE');
  const clipped = await p.evaluate(() => {
    const a = document.querySelector('.acthead svg.pti');
    const s = document.querySelector('.pu-strip .sh b svg.pti');
    const g = e => ({ w: e.getBoundingClientRect().width,
                      fill: getComputedStyle(e.querySelector('.i2')).fill });
    return { acthead: g(a), sh: g(s),
             actheadClipped: getComputedStyle(a.parentElement).webkitTextFillColor };
  });
  ok('.acthead still carries the flat-gradient clip (unchanged by 537)',
     clipped.actheadClipped === 'rgba(0, 0, 0, 0)', clipped.actheadClipped);
  ok('  its icon still renders at 18px through the clip', clipped.acthead.w > 17,
     String(clipped.acthead.w));
  ok('  and keeps its fill — text-fill-color does not reach an SVG child',
     clipped.acthead.fill === 'rgb(139, 145, 153)', clipped.acthead.fill);
  ok('the punch strip icon renders through its clip too',
     clipped.sh.w > 17 && clipped.sh.fill === 'rgb(139, 145, 153)',
     clipped.sh.w + ' ' + clipped.sh.fill);

  console.log('\nLAYOUT — no flex, so <small> still shares the line');
  const flow = await p.evaluate(() => {
    const t = document.querySelector('.card .pipetitle');
    const sm = t.querySelector('small'), sv = t.querySelector('svg');
    return { display: getComputedStyle(t).display,
             sameLine: Math.abs(sm.getBoundingClientRect().top - sv.getBoundingClientRect().top) < 14,
             smTop: sm.getBoundingClientRect().top, svTop: sv.getBoundingClientRect().top };
  });
  ok('.pipetitle is still a block, not a flex container', flow.display === 'block', flow.display);
  ok('  the <small> stays on the icon\'s line', flow.sameLine,
     flow.smTop.toFixed(1) + ' vs ' + flow.svTop.toFixed(1));

  console.log('\nCLIP RELEASE — proved by pixels, because computed style cannot see it');
  /* Compare MEAN COLOUR, not PNG bytes. background-clip:text paints glyphs
     through a mask and antialiases differently, so byte-identical is a
     stronger claim than "the colour did not move" and fails on correct code. */
  const shot = async (id) => (await p.locator('#' + id).screenshot()).toString('base64');
  const mean = async (b64) => p.evaluate(s => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let r = 0, g = 0, bl = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; }
      const n = d.length / 4;
      res([r / n, g / n, bl / n]);
    };
    img.src = 'data:image/png;base64,' + s;
  }), b64);
  const dist = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const [A, B, C, D] = await Promise.all(
    ['probeA', 'probeB', 'probeC', 'probeD'].map(async id => mean(await shot(id))));
  const dText = dist(A, B), dEmoji = dist(C, D);
  ok('plain TEXT renders the same colour clipped and unclipped — nothing moved',
     dText < 3, 'mean channel delta ' + dText.toFixed(2));
  ok('  negative control: the EMOJI does not — that was the whole bug', dEmoji > 12,
     'mean channel delta ' + dEmoji.toFixed(2));
  console.log('     text Δ ' + dText.toFixed(2) + '   emoji Δ ' + dEmoji.toFixed(2));

  console.log('\n' + '='.repeat(56) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(56));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
