/* Do the diagrams actually PAINT? - the only gate that counts for rendering.
 *
 * jsdom cannot answer this (BUG_CLASSES §9), and the .lb-d-* rules are
 * UNPREFIXED while every neighbour in that stylesheet is scoped to
 * #rlLibPanel - which is the exact shape of the build-481 bug, where a rule
 * parsed, balanced, passed every mechanical gate and still lost to a more
 * specific neighbour. So: real Chromium, real computed styles, both themes,
 * plus a screenshot Theo can look at.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = '/home/user/cardinal-inspections';
const SCRATCH = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lines = html.split('\n');

// The real stylesheet text, lifted verbatim by line range: the two token
// blocks (49210-49217) and the diagram rules (49174-49190).
const tokenCss = lines.slice(49209, 49217).join('\n');
const diagCss  = lines.slice(49173, 49190).join('\n');

// The real renderer.
const body = fs.readFileSync(path.join(SCRATCH, 'lib_extract.js'), 'utf8');
const PRELUDE = `
  var VIEW='resourceLibraryView';
  var document={getElementById:function(){return null;}};
  function ccIsAdmin(){return false;}
  var window={currentUser:{email:'t@e.st'}};
`;
const { lbRich } = new Function(PRELUDE + body + '\n; return {lbRich:lbRich};')();

const SAMPLES = [
  ['A roof assembly, top layer down',
   '~~stack\nAsphalt shingles\nSynthetic underlayment\nIce barrier at the eave\nRoof deck'],
  ['Install order',
   '~~flow\nDry in the deck\nSet the eave metal\nRun the field course\nCap the ridge'],
  ['Waste factor by roof complexity',
   '~~bars %\nSimple gable | 6\nStandard cut-up | 12\nComplex cut-up | 15'],
  ['A 6/12 slope and its area multiplier', '~~pitch 6/12'],
];

function page(theme) {
  const figs = SAMPLES.map(([cap, src]) =>
    `<div class="demo"><div class="cap">${cap}</div>${lbRich(src)}</div>`).join('');
  return `<style>
  ${tokenCss}
  ${diagCss}
  body{margin:0;font:14px system-ui,sans-serif;
       background:${theme === 'siren' ? '#0A0A0D' : '#F7F5F4'};}
  #rlLibPanel{padding:20px;max-width:760px;margin:0 auto;
       color:var(--lb-ink);}
  .demo{background:var(--lb-surface);border:1px solid var(--lb-line);
        border-radius:10px;padding:14px 16px;margin-bottom:16px;}
  .cap{font:700 11px ui-monospace,monospace;text-transform:uppercase;
       letter-spacing:.06em;color:var(--lb-ink2);margin-bottom:4px;}
  </style>
  <div id="rlLibPanel">${figs}</div>`;
}

(async () => {
  const browser = await chromium.launch();
  let pass = 0, fail = 0;
  const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                              : (fail++, console.log('  FAIL  ' + n + (d ? '\n          ' + d : ''))); };

  for (const theme of ['docket', 'siren']) {
    console.log('\n' + theme.toUpperCase() + (theme === 'docket' ? '  (light)' : '  (dark)'));
    const p = await browser.newPage({ viewport: { width: 820, height: 1250 } });
    await p.setContent(page(theme), { waitUntil: 'load' });
    await p.evaluate(t => document.body.setAttribute('data-rltheme', t), theme);
    await p.waitForTimeout(120);

    const m = await p.evaluate(() => {
      const g = (sel, prop) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).getPropertyValue(prop).trim() : null;
      };
      return {
        svgs:   document.querySelectorAll('svg.lb-d').length,
        bands:  document.querySelectorAll('.lb-d-band').length,
        bars:   document.querySelectorAll('.lb-d-bar').length,
        bandFill: g('.lb-d-band', 'fill'),
        topStroke: g('.lb-d-band.lb-d-top', 'stroke'),
        textFill: g('.lb-d-t', 'fill'),
        barFill: g('.lb-d-bar', 'fill'),
        hypStroke: g('.lb-d-hyp', 'stroke'),
        // the thing a mechanical gate cannot see: does the <svg> occupy space?
        svgBox: (() => { const r = document.querySelector('svg.lb-d').getBoundingClientRect();
                         return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
        // and is the first band actually inside the drawn area?
        bandBox: (() => { const r = document.querySelector('.lb-d-band').getBoundingClientRect();
                          return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      };
    });

    ok('4 diagrams rendered as <svg>', m.svgs === 4, 'got ' + m.svgs);
    ok('8 bands drawn (4 stack + 4 flow)', m.bands === 8, 'got ' + m.bands);
    ok('3 bars drawn', m.bars === 3, 'got ' + m.bars);
    ok('svg occupies real space', m.svgBox.w > 300 && m.svgBox.h > 60,
       JSON.stringify(m.svgBox));
    ok('band occupies real space', m.bandBox.w > 300 && m.bandBox.h > 10,
       JSON.stringify(m.bandBox));
    ok('band fill resolved from the token (not transparent)',
       m.bandFill && m.bandFill !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(m.bandFill), m.bandFill);
    ok('text fill resolved', !!m.textFill && !/rgba\(0, 0, 0, 0\)/.test(m.textFill), m.textFill);
    ok('bar uses the accent', !!m.barFill && !/rgba\(0, 0, 0, 0\)/.test(m.barFill), m.barFill);
    ok('top layer stroked in the accent', !!m.topStroke, m.topStroke);
    ok('pitch hypotenuse stroked', !!m.hypStroke, m.hypStroke);
    console.log('        band ' + m.bandFill + '  ·  ink ' + m.textFill + '  ·  accent ' + m.barFill);

    const shot = path.join(SCRATCH, 'diagrams-' + theme + '.png');
    await p.screenshot({ path: shot, fullPage: true });
    console.log('        screenshot -> ' + shot);
    await p.close();
  }

  await browser.close();
  console.log('\n' + '='.repeat(58));
  console.log('  ' + pass + ' passed, ' + fail + ' failed');
  console.log('='.repeat(58));
  process.exit(fail ? 1 : 0);
})();
