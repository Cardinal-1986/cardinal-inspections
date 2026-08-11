/* render_desk704.js — build 704: the dead Supplement Desk card is gone, and
   the live one still works.

   Removing dead markup is only safe if you can show BOTH halves:

     the dead one   was never in the DOM, and is now not in the FILE either
     the live one   is still in the DOM, still says Supplement Desk, and still
                    points at /supplement.html

   Proving only the first would pass on a build that deleted the working tile
   by mistake, which is the whole risk of a deletion.

   The negative control (703) is the interesting run: there, the dead card is
   present in the FILE and still absent from the DOM — which is the measurement
   that justified deleting it in the first place, and the gate prints it.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_desk704.js [index.html]
   Point it at 703 as the negative control.                                   */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SRC = fs.readFileSync(FILE, 'utf8');

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await br.newPage({ viewport: { width: 393, height: 900 } });
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 140)));
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);

  const R = await p.evaluate(async () => {
    ['landingView', 'mainView', 'projectView'].forEach(id => {
      const e = document.getElementById(id); if (e) e.style.display = 'none';
    });
    const v = document.getElementById('cardinalTruthView');
    if (v) { v.style.display = 'block'; v.style.zIndex = '9999'; }
    await new Promise(r => setTimeout(r, 900));   // let the hub's render() run

    const tile = document.querySelector('[data-go="desk"]');
    const r = tile ? tile.getBoundingClientRect() : null;
    return {
      // the static grid: dead before this build and dead after — unchanged
      staticAnchors: document.querySelectorAll('a[href="/supplement.html"]').length,
      staticCards: document.querySelectorAll('.ins-card').length,
      staticGrid: !!document.querySelector('.ins-grid'),
      insBody: [...(document.querySelector('.ins-body') || { children: [] }).children]
        .map(c => (c.className || c.tagName).toString().slice(0, 24)),
      // the live tile
      tile: tile ? {
        text: (tile.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        w: Math.round(r.width), h: Math.round(r.height),
        visible: r.width > 0 && r.height > 0,
        icon: !!tile.querySelector('svg'),
        parent: (tile.parentElement.className || '').slice(0, 24)
      } : null
    };
  });

  console.log(`\n.ins-card in the DOM: ${R.staticCards} · .ins-grid present: ${R.staticGrid} · .ins-body holds: ${R.insBody.join(', ') || '(nothing)'}`);

  // ---- the dead half ----
  ok(R.staticCards === 0,
    `the static grid renders nothing — render() replaces .ins-body (${R.staticCards} .ins-card in the DOM)`);
  ok(R.staticAnchors === 0, 'no static link to /supplement.html survives into the DOM');
  ok(!/href="\/supplement\.html"/.test(SRC),
    'and it is gone from the FILE too, so a grep cannot mislead the next reader');

  /* the one thing that must NOT have happened: the working route deleted along
     with the dead markup. */
  ok(/'<button data-go="desk"/.test(SRC), 'the live tile is still emitted in the tools rail');
  ok(SRC.includes("if(d === 'desk'){ window.location.href = '/supplement.html'; return; }"),
    'and its handler still navigates to /supplement.html');

  // ---- the live half, in the rendered page ----
  ok(!!R.tile, 'the Supplement Desk tile is in the DOM');
  ok(R.tile && R.tile.visible, `and is drawn (${R.tile ? R.tile.w + 'x' + R.tile.h : 'absent'})`);
  ok(R.tile && /Supplement Desk/.test(R.tile.text), `and reads: "${R.tile ? R.tile.text : ''}"`);
  ok(R.tile && R.tile.icon, 'and carries a drawn icon rather than an emoji');
  ok(R.tile && /cr-cth-tools/.test(R.tile.parent),
    `and sits in the tools rail (${R.tile ? R.tile.parent : '—'})`);

  /* exactly one way in. Two would be the 668 situation again, in reverse. */
  const paths = (SRC.match(/\/supplement\.html/g) || []).length;
  ok(paths === 2,
    `/supplement.html appears ${paths}x in the file: the live handler and the comment warning nobody to re-add the card`);

  ok(errors.length === 0, `the page loads without throwing (${errors.slice(0, 2).join(' | ') || 'none'})`);

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
