/* gate_1238.mjs — build 1238: a photo fits the screen when the phone is on its side.
   Theo: "When I put my phone in landscape mode it shortens the photo view." Tapping a photo in
   the album opens #cr-pae-cap-modal (photo + caption). Stacked, it is 630px tall; at 844x390 it
   centred off both ends — the top 120px of the photo above the screen, unreachable, and the
   buttons below it. Sideways it now lays the photo and the form side by side.
     A. landscape 844x390 / 932x430 / 667x375: the sheet, the WHOLE photo and the action row are
        inside the screen, and the photo is the bigger half.
     B. portrait 390x844 is unchanged: the 4:3 photo above the form, the sheet unchanged in size.
   RED on 1237 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1238.mjs [file.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const artifact = resolve(process.argv[2] || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 560000).unref();
const browser = await launchChromium(chromium);

async function sheet(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, 'dark');
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => window.__sentinelStates.find(s => s.name === 'album').run()).catch(() => {});
  await p.waitForTimeout(900);
  /* the mock project has no photos, so one 4:3 photograph is put in the album and tapped —
     the tap goes through the album's own capture handler, which is what opens the sheet. */
  const r = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
    const x = c.getContext('2d'); x.fillStyle = '#6fa8dc'; x.fillRect(0, 0, 1600, 1200);
    const src = c.toDataURL('image/jpeg', .7);
    window.currentPhotos = [{ id: 'ph1', _src: src, data: src, section: 'Inspection', caption: 'x' }];
    if (typeof renderGallery === 'function') renderGallery();
    await new Promise(r => setTimeout(r, 600));
    const card = document.querySelector('#galGrid .gph'); if (!card) return { none: 'no album card' };
    card.click(); await new Promise(r => setTimeout(r, 700));
    const m = document.getElementById('cr-pae-cap-modal'); if (!m || !m.classList.contains('open')) return { none: 'sheet did not open' };
    const R = e => { const b = m.querySelector(e).getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
    return { vw: innerWidth, vh: innerHeight, box: R('.box'), img: R('.imgwrap img'), wrap: R('.imgwrap'), form: R('.form'), act: R('.actions') };
  }).catch(e => ({ none: String(e) }));
  await p.close();
  return r;
}
const inside = (o, r) => o.t >= 0 && o.b <= r.vh && o.l >= 0 && o.r <= r.vw;

for (const [w, h] of [[844, 390], [932, 430], [667, 375]]) {
  const r = await sheet(w, h);
  if (r.none) { ok(false, `A  ${w}x${h}: the photo sheet opens`, r.none); continue; }
  ok(inside(r.box, r), `A  ${w}x${h}: the whole sheet is on screen`, JSON.stringify(r.box));
  ok(inside(r.img, r), `A  ${w}x${h}: the whole photo is on screen, top to bottom`, JSON.stringify(r.img));
  ok(inside(r.act, r), `A  ${w}x${h}: Save and Close are on screen`, JSON.stringify(r.act));
  ok(r.wrap.w > r.form.w && r.wrap.l < r.form.l, `A  ${w}x${h}: the photo is on the left and is the bigger half`, [r.wrap.w, r.form.w].join(' vs '));
}
const r = await sheet(390, 844);
if (r.none) ok(false, 'B  390x844: the photo sheet opens', r.none);
else {
  ok(r.wrap.b <= r.form.t + 1 && Math.abs(r.wrap.h / r.wrap.w - 0.75) < 0.02, 'B  upright: the 4:3 photo sits above the form, as before', JSON.stringify([r.wrap, r.form.t]));
  ok(r.box.h === 544 && inside(r.box, r), 'B  upright: the sheet is the same 544px it was at 1237', r.box.h);
}
await browser.close();
console.log((fail ? 'GATE 1238 RED' : 'GATE 1238 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
