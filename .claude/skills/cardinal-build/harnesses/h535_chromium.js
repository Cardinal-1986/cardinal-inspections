/* Build 535 gate. jsdom cannot resolve var() inside background/box-shadow
 * shorthands, and 481 proved a rule can parse, balance and still LOSE. So:
 * real Chromium, the SOURCE rules and the NEW block both present, and the
 * question asked is "which one won", not "does the file contain my CSS".
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v535.html', 'utf8');

// the new block, verbatim out of the artifact
const nav = src.slice(src.indexOf('<style id="cr-navy-styles">'),
                      src.indexOf('</style>', src.indexOf('<style id="cr-navy-styles">')) + 8);
if (!nav.includes('.pipecard')) throw new Error('did not capture the new block');

// the SOURCE rules it has to beat, pulled by their real text
const grab = (needle, n) => {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error('missing source rule: ' + needle);
  const raw = src.slice(i, i + n);
  let d = 0, cut = 0;
  for (let k = 0; k < raw.length; k++) {
    if (raw[k] === '{') d++; else if (raw[k] === '}') { d--; if (!d) cut = k + 1; }
  }
  return raw.slice(0, cut);
};
const source = [
  grab('.pipecard{border:1px solid var(--rbe-line2)', 700),
  grab('.pipecard.teamcal{', 500),
  grab('.teamcal .minical .calgrid .day{\n  aspect-ratio', 400),
  grab('.teamcal .minical .calhead{border-bottom', 200),
  grab('.teamcal .minical .calhead b{', 400),
  grab('.teamcal .minical .calgrid .dow{\n  border', 200),
  grab('.pcirc', 400),
].join('\n');

const page = `<style>
:root{--red:#c8202e;--rbe-line2:#2b2b33;--rbe-ridge-t:#454552;--rbe-ridge-b:#050507;
      --rbe-ridge-sh:0 14px 30px rgba(0,0,0,.8);--rbe-ridge-hl:rgba(255,255,255,.09);
      --rbe-bg1:#2e333b;--rbe-bg2:#262a31;--rbe-ink:#cfd6df;--rbe-head:#fff;--rbe-acc:#8fb4d8}
body{margin:0;background:#09090C}
${source}
${nav}
</style>
<div class="pipecard" id="c1"><div class="piperow">
  <button class="pipebtn"><span class="pcirc st-lead">L</span><span class="plabel">Leads</span>
    <span class="pcount">13</span><span class="pmoney">$0</span></button>
  <button class="pipebtn"><span class="pcirc st-appr">A</span><span class="plabel">Approved</span>
    <span class="pcount">1</span><span class="pmoney">$0</span></button>
</div></div>
<div class="pipecard"><div class="kplrow" id="r1"><span class="nm">Kim Guy</span></div></div>
<div class="pipecard teamcal" id="cal"><div class="minical">
  <div class="calhead"><b id="mon">August 2026</b></div>
  <div class="calgrid"><span class="dow" id="dow">S</span>
    <span class="day" id="d1">4</span><span class="day other" id="d2">31</span>
    <span class="day today" id="d3">1</span></div>
  <div class="callegend" id="leg">team events</div>
</div><span id="prodCalWho">all jobs</span></div>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 420, height: 700 } });
  await p.setContent(page, { waitUntil: 'load' });
  // dark + retail is the DEFAULT state: no data-theme, no claim-* class
  await p.waitForTimeout(120);

  let pass = 0, fail = 0;
  const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                              : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
  const g = (id, k) => p.evaluate(([i, kk]) => {
    const e = document.getElementById(i); return e ? getComputedStyle(e)[kk] : null; }, [id, k]);

  console.log('\nDARK + RETAIL — the override must WIN over the source rule');
  ok('card top edge is navy #33496A, not ridge #454552',
     await g('c1', 'borderTopColor') === 'rgb(51, 73, 106)', await g('c1', 'borderTopColor'));
  ok('card is no longer iron grey', !(await g('c1', 'backgroundColor')).includes('46, 51, 59'));
  ok('client row is sunk (inset shadow present)',
     (await g('r1', 'boxShadow')).includes('inset'), await g('r1', 'boxShadow'));
  ok('sunk depth is SLIGHT (1px 2px), not the rejected 2px 5px',
     /1px 2px/.test(await g('r1', 'boxShadow')), await g('r1', 'boxShadow'));

  console.log('\nCALENDAR — Theo\'s list, item by item');
  const calTop = await g('cal', 'borderTopColor');
  ok('no red on top — was 5px solid var(--red)', calTop !== 'rgb(200, 32, 46)', calTop);
  ok('  and it is the navy edge instead', calTop === 'rgb(51, 73, 106)', calTop);
  ok('cap width dropped from 5px to 2px', await g('cal', 'borderTopWidth') === '2px');
  ok('month is WHITE', await g('mon', 'color') === 'rgb(255, 255, 255)', await g('mon', 'color'));
  ok('  and the gradient clip is released (not transparent)',
     await g('mon', 'webkitTextFillColor') === 'rgb(255, 255, 255)',
     await g('mon', 'webkitTextFillColor'));
  ok('day numbers are WHITE', await g('d1', 'color') === 'rgb(255, 255, 255)', await g('d1', 'color'));
  ok('each small square is sunk',
     (await g('d1', 'boxShadow')).includes('inset'), await g('d1', 'boxShadow'));
  ok('day cell is no longer white paper',
     await g('d1', 'backgroundColor') !== 'rgb(255, 255, 255)', await g('d1', 'backgroundColor'));
  ok('other-month days readable (was #cfc4ba on cream ~1.6:1)',
     await g('d2', 'color') === 'rgb(124, 134, 149)', await g('d2', 'color'));
  ok('today KEEPS cardinal red — semantic',
     await g('d3', 'backgroundColor') === 'rgb(200, 32, 46)', await g('d3', 'backgroundColor'));
  ok('dow strip no longer gold-on-cream',
     await g('dow', 'color') !== 'rgb(184, 134, 11)', await g('dow', 'color'));
  ok('legend readable (was #3a2e28 on this ground)',
     await g('leg', 'color') === 'rgb(223, 229, 238)', await g('leg', 'color'));
  ok('"all jobs" is off the calendar',
     await g('prodCalWho', 'display') === 'none', await g('prodCalWho', 'display'));

  console.log('\nPIPELINE — orbs become a strip');
  ok('the sphere is flattened to a 3px top edge',
     await g(null, 'x') === null || (await p.evaluate(() =>
       getComputedStyle(document.querySelector('.pcirc')).height)) === '3px',
     await p.evaluate(() => getComputedStyle(document.querySelector('.pcirc')).height));
  ok('  and is no longer a 50% circle',
     (await p.evaluate(() => getComputedStyle(document.querySelector('.pcirc')).borderRadius)) === '0px');

  console.log('\nNEGATIVE CONTROL — light theme must be untouched');
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
  await p.waitForTimeout(120);
  ok('light: card top edge is NOT the navy override',
     await g('c1', 'borderTopColor') !== 'rgb(51, 73, 106)', await g('c1', 'borderTopColor'));
  ok('light: "all jobs" comes back',
     await g('prodCalWho', 'display') !== 'none', await g('prodCalWho', 'display'));

  console.log('\nNEGATIVE CONTROL — Claims must be untouched');
  await p.evaluate(() => { document.documentElement.removeAttribute('data-theme');
                           document.body.className = 'claim-insurance'; });
  await p.waitForTimeout(120);
  ok('claims: card top edge is NOT the navy override',
     await g('c1', 'borderTopColor') !== 'rgb(51, 73, 106)', await g('c1', 'borderTopColor'));

  console.log('\n' + '='.repeat(56) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(56));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
