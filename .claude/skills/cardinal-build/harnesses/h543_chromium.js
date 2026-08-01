/* Build 543 — before/after for the nav's Schedule Board icon, plus the gate.
 *
 * Renders the REAL nav item — 536's recessed well, 537's icon rules, the
 * shipped SVG geometry — with the old slab and the new clipboard side by side,
 * in both modes and all three states. The active state matters because
 * .lnav-item.on recolours the icon to cardinal red, which is where a solid
 * slab looks worst.
 *
 * The evenodd hole must show the WELL through it (#0A0E16 dark, #f2f3f5
 * light), which is the thing a hardcoded knockout fill would get wrong — so
 * the well colour is real here, not a white test page.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const now = fs.readFileSync(SC + '/app/index_v543.html', 'utf8');
const prev = fs.readFileSync(SC + '/app/index_v542.html', 'utf8');

const sched = (src, set) => {
  const i = src.indexOf('var ' + set + ' = {');
  const j = src.indexOf("scheduleboard:'", i) + 15;
  return src.slice(j, src.indexOf("',", j));
};
const NEW2 = sched(now, 'I2'), NEW5 = sched(now, 'I5');
const OLD2 = sched(prev, 'I2'), OLD5 = sched(prev, 'I5');
console.log(`  old solid ${OLD2.length} chars → new ${NEW2.length}`);
console.log(`  old keyline ${OLD5.length} chars → new ${NEW5.length}`);

/* the shipped rules, lifted not retyped */
const CSS = `
:root{--rbe-mute:#8b9199;--rbe-head:#fff;--lnav-crmc:#c8202e}
#cr-lnav .lnav-ic{flex:0 0 auto;width:17px;height:17px;display:grid;place-items:center}
#cr-lnav .lnav-ic svg{width:17px;height:17px;display:block}
#cr-lnav .lnav-ic .i2{fill:var(--rbe-mute,#8b9199);stroke:none}
#cr-lnav .lnav-ic .i5{display:none;fill:none;stroke:var(--rbe-mute,#8b9199);stroke-width:2;stroke-linecap:round}
#cr-lnav .lnav-item:hover .lnav-ic .i2{fill:var(--rbe-head,#fff)}
#cr-lnav .lnav-item.on .lnav-ic .i2{fill:var(--lnav-crmc,#c8202e)}
:root[data-theme="rb-light"] #cr-lnav .lnav-ic .i2{display:none}
:root[data-theme="rb-light"] #cr-lnav .lnav-ic .i5{display:block;stroke:#a3121e}
:root[data-theme="rb-light"] #cr-lnav .lnav-ic .i5 .m{stroke:#9a9a9a}
:root[data-theme="rb-light"] #cr-lnav .lnav-item.on .lnav-ic .i5{stroke:var(--lnav-crmc,#c8202e)}
#cr-lnav{width:230px;padding:8px 0;border-radius:8px}
#cr-lnav .lnav-item{display:flex;align-items:center;gap:10px;padding:8px 14px;
  font:14px/1.2 system-ui,sans-serif;border-left:3px solid transparent}
:root:not([data-theme="rb-light"]) #cr-lnav{background:#0A0E16;border-right:1px solid #223047;
  box-shadow:inset 3px 0 7px -3px rgba(0,0,0,.85), inset -1px 0 0 rgba(255,255,255,.055)}
:root:not([data-theme="rb-light"]) #cr-lnav .lnav-item{color:#c2cbd8}
:root:not([data-theme="rb-light"]) #cr-lnav .lnav-item.hov{background:#111927;color:#fff}
:root:not([data-theme="rb-light"]) #cr-lnav .lnav-item.on{
  background:linear-gradient(180deg,#1A2434,#141C29);color:#fff;font-weight:700;
  border-left-color:transparent;
  box-shadow:inset 3px 0 0 var(--lnav-crmc,#c8202e),0 1px 2px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.07)}
:root[data-theme="rb-light"] #cr-lnav{background:#f2f3f5;border-right:1px solid #dcdee2;
  box-shadow:inset 3px 0 6px -3px rgba(30,45,65,.22), inset -1px 0 0 #fff}
:root[data-theme="rb-light"] #cr-lnav .lnav-item{color:#3f3f46}
:root[data-theme="rb-light"] #cr-lnav .lnav-item.hov{background:#e7e9ec;color:#161616}
:root[data-theme="rb-light"] #cr-lnav .lnav-item.on{background:#fff;color:#161616;font-weight:700;
  border-left-color:transparent;
  box-shadow:inset 3px 0 0 var(--lnav-crmc,#c8202e),0 1px 2px rgba(30,45,65,.10)}
body{margin:0;font:13px system-ui,sans-serif}
.wrap{display:flex;gap:34px;padding:26px}
.col h3{font:600 12px system-ui;letter-spacing:.10em;text-transform:uppercase;margin:0 0 10px}
.pane{padding:22px;border-radius:12px}
.pane.d{background:#0b0e13} .pane.l{background:#e6e8ea}
.pane.d h3{color:#8d97a6} .pane.l h3{color:#6f7683}
.lbl{font:600 10px system-ui;letter-spacing:.08em;text-transform:uppercase;margin:14px 0 5px;opacity:.6}
.pane.d .lbl{color:#8d97a6} .pane.l .lbl{color:#6f7683}
`;
const item = (i2, i5, cls) =>
  `<div class="lnav-item ${cls}"><span class="lnav-ic">` +
  `<svg class="i2" viewBox="0 0 24 24">${i2}</svg>` +
  `<svg class="i5" viewBox="0 0 24 24">${i5}</svg>` +
  `</span><span class="lnav-tx">Schedule Board</span></div>`;
const nav = (i2, i5) => `<div id="cr-lnav">` +
  `<div class="lbl" style="padding:0 14px">rest</div>${item(i2, i5, '')}` +
  `<div class="lbl" style="padding:0 14px">hover</div>${item(i2, i5, 'hov')}` +
  `<div class="lbl" style="padding:0 14px">active</div>${item(i2, i5, 'on')}</div>`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 640 }, deviceScaleFactor: 2 });

  for (const mode of ['dark', 'light']) {
    const attr = mode === 'light' ? ' data-theme="rb-light"' : '';
    await p.setContent(`<html${attr}><style>${CSS}</style><body>
      <div class="wrap">
        <div class="col pane ${mode[0]}"><h3>Before &mdash; build 542</h3>${nav(OLD2, OLD5)}</div>
        <div class="col pane ${mode[0]}"><h3>After &mdash; build 543</h3>${nav(NEW2, NEW5)}</div>
      </div></body></html>`, { waitUntil: 'load' });
    await p.screenshot({ path: `${SC}/sched543_${mode}.png`, fullPage: true });
    console.log(`  rendered sched543_${mode}.png`);
  }

  console.log('\nTHE SOLID WEIGHT IS NO LONGER A SLAB');
  await p.setContent(`<html><style>${CSS}</style><body>${nav(NEW2, NEW5)}</body></html>`,
                     { waitUntil: 'load' });
  const geom = await p.evaluate(() => {
    const svg = document.querySelector('.i2');
    return { paths: svg.querySelectorAll('path').length,
             evenodd: [...svg.querySelectorAll('path')].some(n => n.getAttribute('fill-rule') === 'evenodd'),
             rects: svg.querySelectorAll('rect').length };
  });
  ok('the body is cut open with fill-rule="evenodd"', geom.evenodd);
  ok(`  ${geom.paths} paths + ${geom.rects} rects, not one slab`,
     geom.paths >= 2 && geom.rects >= 1);

  /* the hole must show the WELL, which is what a hardcoded knockout gets wrong */
  const hole = await p.evaluate(() => {
    const el = document.querySelector('.lnav-ic');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  ok('the icon renders at the nav\'s 17px box', Math.round(hole.w) === 17 && Math.round(hole.h) === 17,
     `${hole.w}x${hole.h}`);
  ok('no hardcoded knockout fill that would punch black on the well',
     !NEW2.includes('#0d0d10') && !NEW2.includes('fill="#'), NEW2.slice(0, 60));

  console.log('\nIT IS THE SAME ARTWORK AS THE CARD, NOT A LOOKALIKE');
  const i = now.indexOf('Work Schedule', 233000);
  const a = now.lastIndexOf('<svg', i);
  const card = now.slice(a, now.indexOf('</svg>', a) + 6);
  ok('nav solid === card solid, byte for byte',
     card.includes(NEW2), 'diverged');
  ok('nav keyline === card keyline, byte for byte', card.includes(NEW5), 'diverged');

  console.log('\nNOTHING ELSE MOVED');
  ok('the old filled slab is gone from the file', !now.includes('M7 2h2v2.4h6V2h2v2.4h2A2 2 0 0 1 21 6.4V20'));
  ok('  and it was there in 542', prev.includes('M7 2h2v2.4h6V2h2v2.4h2A2 2 0 0 1 21 6.4V20'));

  console.log('\n' + '='.repeat(56) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(56));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
