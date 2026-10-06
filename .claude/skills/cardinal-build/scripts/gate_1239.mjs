/* gate_1239.mjs — build 1239: the album's photo sheet (#cr-pae-cap-modal) in dark mode, and its controls.
   It was a cream card in BOTH themes; Save's ink was 3.97:1; its buttons were ~30px tall.
   390x844, both themes:
     A. the sheet's ground is dark in dark and the original cream (#fdfcf7) in light.
     B. label, caption text, the ghost buttons and Save all clear 4.5:1 on their own ground.
     C. every action button and the Section menu is at least 44px tall.
   RED on 1238 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1239.mjs [file.html]
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

async function sheet(w, h, th) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, th);
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
    const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
    const ground = el => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] >= .95) return c; e = e.parentElement; } return [255,255,255,1]; };
    const ratio = el => { const a = lum(parse(getComputedStyle(el).color)), b = lum(ground(el)); return +((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2); };
    const boxBg = parse(getComputedStyle(m.querySelector('.box')).backgroundColor);
    const ink = {};
    ink.label = ratio(m.querySelector('label')); ink.caption = ratio(m.querySelector('textarea')); ink.section = ratio(m.querySelector('select'));
    ink.edit = ratio(m.querySelector('[data-act="edit"]')); ink.close = ratio(m.querySelector('[data-act="close"]')); ink.save = ratio(m.querySelector('[data-act="save"]'));
    const tall = [...m.querySelectorAll('.actions button, select')].map(b => Math.round(b.getBoundingClientRect().height));
    return { boxBg, boxLum: +lum(boxBg).toFixed(3), ink, tall };
  }).catch(e => ({ none: String(e) }));
  await p.close();
  return r;
}

for (const th of ['dark', 'rb-light']) {
  const r = await sheet(390, 844, th);
  if (r.none) { ok(false, th + ': the photo sheet opens', r.none); continue; }
  if (th === 'dark') ok(r.boxLum < 0.05, 'A  dark: the sheet is a dark card, not cream', JSON.stringify(r.boxBg));
  else ok(r.boxBg.slice(0, 3).join() === '253,252,247', 'A  light: the sheet keeps its original cream #fdfcf7', JSON.stringify(r.boxBg));
  const low = Object.entries(r.ink).filter(([, v]) => !(v >= 4.5));
  ok(low.length === 0, 'B  ' + th + ': label, caption, Section, Edit, Close and Save all clear 4.5:1', JSON.stringify(r.ink));
  ok(r.tall.length >= 6 && r.tall.every(h => h >= 44), 'C  ' + th + ': every button and the Section menu is 44px or taller', r.tall.join(','));
}
await browser.close();
console.log((fail ? 'GATE 1239 RED' : 'GATE 1239 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
