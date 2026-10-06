/* gate_1246.mjs — build 1246: the multi-shot camera zooms.
   A sales rep asked for it. Real Chromium; getUserMedia answers with a canvas stream (640x480),
   which has no lens zoom — so the DIGITAL path runs — and a second boot stubs a lens that
   reports zoom 1–5, so the LENS path runs.
     A  the zoom row shows 1x 2x 3x over the picture, 1x on, every button 44px or more.
     B  tapping 2x scales the preview from its centre and marks 2x.
     C  a shot at 2x is the centre crop at the camera's own pixels: 320x240 from 640x480.
     D  pinching apart by half again takes 2x to 3x; pinching hard stops at 4x (digital cap).
     E  closing and reopening starts again at 1x.
     F  LENS: with a camera that reports zoom, 2x asks the lens (applyConstraints zoom:2),
        the preview is NOT scaled, and the photo stays full size (640x480).
     G  the camera's own failure sentence reads "would not start", not "would not mcStart".
   RED on 1245 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1246.mjs [file.html]
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();
const browser = await launchChromium(chromium);

async function boot(lens) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.addInitScript(lens => {
    window.__zc = [];
    const md = navigator.mediaDevices || {};
    md.getUserMedia = async () => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 480;
      const g = c.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, 640, 480);
      setInterval(() => { g.fillStyle = '#8' + (Date.now() % 9) + '8'; g.fillRect(0, 0, 640, 480); }, 40);
      const s = c.captureStream(30);
      if (lens) s.getVideoTracks().forEach(t => {
        t.getCapabilities = () => ({ zoom: { min: 1, max: 5, step: 0.1 } });
        t.applyConstraints = c2 => { window.__zc.push(c2); return Promise.resolve(); };
      });
      return s;
    };
    try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md }); } catch (e) {}
  }, lens);
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2400);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'album'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    window.__added = null;
    window.addGalleryFiles = async function (files) {
      const dims = [];
      for (const f of files) { const b = await createImageBitmap(f); dims.push(b.width + 'x' + b.height); }
      window.__added = dims;
    };
  });
  return p;
}
const openCam = async p => { await p.evaluate(() => window.CardinalMultiCam && window.CardinalMultiCam.open()); await p.waitForTimeout(900); };
const zoomRow = p => p.evaluate(() => {
  const box = document.querySelector('#cr-mcam .mc-zoom');
  if (!box || box.hidden || !box.getClientRects().length) return null;
  return [...box.querySelectorAll('button')].map(b => ({ t: b.textContent, on: b.getAttribute('aria-pressed'), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) }));
});
const tapZoom = (p, z) => p.evaluate(z => { const b = document.querySelector('#cr-mcam .mc-zoom [data-z="' + z + '"]'); if (b) b.click(); return !!b; }, z);
const st = p => p.evaluate(() => (window.CardinalMultiCam && window.CardinalMultiCam._state && window.CardinalMultiCam._state()) || {});
const shootAndUpload = async p => {
  await p.evaluate(() => document.querySelector('#cr-mcam [data-mc="shoot"]').click());
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#cr-mcam [data-mc="upload"]').click());
  await p.waitForTimeout(800);
  return p.evaluate(() => window.__added);
};
const pinch = (p, d0, d1) => p.evaluate(([d0, d1]) => {
  const el = document.querySelector('#cr-mcam .mc-stage video');
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const fire = (type, id, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: cy, bubbles: true, pointerType: 'touch' }));
  fire('pointerdown', 1, cx - d0 / 2); fire('pointerdown', 2, cx + d0 / 2);
  fire('pointermove', 1, cx - d0 / 2);
  for (let k = 1; k <= 5; k++) { const d = d0 + (d1 - d0) * k / 5; fire('pointermove', 1, cx - d / 2); fire('pointermove', 2, cx + d / 2); }
  fire('pointerup', 1, cx); fire('pointerup', 2, cx);
}, [d0, d1]);

/* digital */
const p = await boot(false);
await openCam(p);
const row = await zoomRow(p);
ok(!!row && row.map(b => b.t).join(' ') === '1× 2× 3×' && row[0].on === 'true', 'A  the zoom row shows 1× 2× 3× with 1× on', JSON.stringify(row));
ok(!!row && row.every(b => b.h >= 44 && b.w >= 44), 'A  every zoom button is 44px or more', row && row.map(b => b.w + 'x' + b.h).join(','));
await tapZoom(p, 2); await p.waitForTimeout(150);
const b = await p.evaluate(() => ({ tf: document.querySelector('#cr-mcam video').style.transform, on: (document.querySelector('#cr-mcam .mc-zoom [aria-pressed="true"]') || {}).textContent }));
ok(b.tf === 'scale(2)' && b.on === '2×', 'B  2× scales the preview and is marked', JSON.stringify(b));
const c = await shootAndUpload(p);
ok(Array.isArray(c) && c[0] === '320x240', 'C  the 2× photo is the centre crop at camera pixels (320x240 of 640x480)', JSON.stringify(c));
await openCam(p);
await tapZoom(p, 2); await p.waitForTimeout(100);
await pinch(p, 100, 150); await p.waitForTimeout(100);
const d1 = (await st(p)).zoom;
ok(Math.abs(d1 - 3) < 0.15, 'D  pinching apart by half again takes 2× to 3×', d1);
await pinch(p, 60, 400); await p.waitForTimeout(100);
const d2 = (await st(p)).zoom;
ok(d2 === 4, 'D  a hard pinch stops at the 4× digital cap', d2);
await p.evaluate(() => { window.crAsk = () => Promise.resolve(true); document.querySelector('#cr-mcam [data-mc="close"]').click(); });
await p.waitForTimeout(400);
await openCam(p);
const e = await st(p);
const etf = await p.evaluate(() => document.querySelector('#cr-mcam video').style.transform);
ok(e.zoom === 1 && etf === '', 'E  reopening starts at 1×', JSON.stringify({ z: e.zoom, tf: etf }));
const src = readFileSync(artifact, 'utf8');
ok(/The camera would not start \(/.test(src) && !/would not mcStart/.test(src), 'G  the failure sentence reads "would not start"');
await p.close();

/* lens */
const q = await boot(true);
await openCam(q);
await tapZoom(q, 2); await q.waitForTimeout(250);
const f = await q.evaluate(() => ({ zc: JSON.stringify(window.__zc), tf: document.querySelector('#cr-mcam video').style.transform }));
const fs_ = await st(q);
ok(fs_.lens === true && /"zoom":2/.test(f.zc), 'F  LENS: 2× asks the lens to zoom', f.zc);
ok(f.tf === '', 'F  LENS: the preview is not scaled on top of the lens zoom', f.tf);
const fc = await shootAndUpload(q);
ok(Array.isArray(fc) && fc[0] === '640x480', 'F  LENS: the photo stays full size', JSON.stringify(fc));
await q.close();

await browser.close();
console.log((fail ? 'GATE 1246 RED' : 'GATE 1246 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
