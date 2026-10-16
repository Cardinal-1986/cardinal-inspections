// gate_1355 — the client card is one slim bar on a wide screen (the rest of Theo's pick B).
// 1700px retail: the card is short, name / phone / email / address sit on one row, star + pencil still there,
// every link keeps its 44px height, the stage band is slim and its arrows still 44px. 1200px and the phone are
// untouched (the tall card; the 791 namebar).   node gate_1355.mjs [index.html]   (1354 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
async function measure(width) {
  const ctx = await b.newContext({ viewport: { width, height: 1000 } });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => {
    window.openProject('p1'); await new Promise(r => setTimeout(r, 2500));
    const q = s => document.querySelector('#projectView ' + s);
    const box = s => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.height ? { t: r.top, h: r.height, cy: r.top + r.height / 2 } : null; };
    const nb = document.getElementById('cr-namebar');
    return { card: box('.projinfo'), nm: box('.heroNm'), ph: box('#projName .hph'), em: box('#projName .hem'), ad: box('#projMeta .mrow'),
      star: box('#favStar'), pen: box('#projEditBtn'), sw: box('#dbSwitchPrim'), stage: box('#acxMount > .dbstage'), back: box('#dbStgBack'),
      tel: (q('#projName .hph') || {}).getAttribute ? q('#projName .hph').getAttribute('href') : null,
      namebar: nb ? getComputedStyle(nb).display : null };
  });
  await ctx.close(); return r;
}
const w = await measure(1700);
ok(w.card && w.card.h <= 80, 'wide: the client card is one slim bar', w.card && Math.round(w.card.h));
const ys = [w.nm, w.ph, w.em, w.ad].map(x => x && x.cy);
ok(ys.every(Boolean) && Math.max(...ys) - Math.min(...ys) <= 12, 'name, phone, email and address on one row', JSON.stringify(ys.map(y => y && Math.round(y))));
ok(w.star && w.pen && Math.abs(w.star.cy - w.nm.cy) <= 12, 'the star and the pencil stay on the bar');
ok(w.ph && w.ph.h >= 44 && w.em.h >= 44 && w.sw && w.sw.h >= 44, 'phone, email and Switch Primary keep a 44px tap height');
ok(/^tel:/.test(w.tel || ''), 'the phone still dials', w.tel);
ok(w.stage && w.stage.h <= 56 && w.back && w.back.h >= 44, 'the stage band is slim and its arrows are still 44px', w.stage && Math.round(w.stage.h));
const m = await measure(1200);
ok(m.card && m.card.h > 150 && m.ph && m.ad && m.ad.t > m.ph.t, 'below 1600px the card is as it was', m.card && Math.round(m.card.h));
const ph = await measure(390);
ok(ph.namebar === 'flex' && !ph.card, 'the phone keeps its own name band', ph.namebar);
await b.close();
console.log(fail ? 'GATE 1355 RED — ' + fail + ' failing' : 'GATE 1355 GREEN');
process.exit(fail ? 1 : 0);
