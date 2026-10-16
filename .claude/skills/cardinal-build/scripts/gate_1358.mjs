// gate_1358 — iPhone (HEIC) photos upload in Chrome.
// A: resizeImageFile() on a REAL HEIC (fixtures/sample_1358.heic, 2400×1800) returns a JPEG ≤1600px (1357: rejects).
// B: the album: picking that HEIC through #galFileInput adds a photo (1357: "Upload failed").
// C: the converter is never downloaded on a normal launch, nor for a PNG; a PNG still shrinks.
// D: the album picker lists .heic/.heif.
// The converter (heic2any 0.0.4) is fetched from cdnjs by this gate and served to the page; no network = FAIL.
// node gate_1358.mjs [index.html]   (1357 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
const HEIC = here + 'fixtures/sample_1358.heic';
const LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
let LIB = '';
try { const r = await fetch(LIB_URL); LIB = r.ok ? await r.text() : ''; } catch (e) { LIB = ''; }
ok(LIB.length > 100000, 'the converter was fetched for the test', LIB.length);
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
let libHits = 0;
await p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/')) return r.fulfill({ status: 200, contentType: 'text/html', body: APP });
  if (u === LIB_URL) { libHits++; return r.fulfill({ status: 200, contentType: 'application/javascript', body: LIB }); }
  return r.fulfill({ status: 200, body: '' });
});
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const heicB64 = readFileSync(HEIC).toString('base64');
ok(libHits === 0, 'C: a normal launch never downloads the converter', libHits);
/* C: a PNG */
const png = await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 2000; c.height = 1000; c.getContext('2d').fillRect(0, 0, 10, 10);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  try { const d = await window.resizeImageFile(new File([blob], 'a.png', { type: 'image/png' }), 1600, 0.82); return d.slice(0, 23); } catch (e) { return 'ERR ' + e.message; }
});
ok(png === 'data:image/jpeg;base64,' && libHits === 0, 'C: a PNG still shrinks to JPEG and loads no converter', png + ' hits=' + libHits);
/* A */
const a = await p.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const f = new File([bin], 'IMG_0412.HEIC', { type: 'image/heic' });
  try {
    const d = await window.resizeImageFile(f, 1600, 0.82);
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = d; });
    return { type: d.slice(0, 23), w: img.naturalWidth, h: img.naturalHeight };
  } catch (e) { return { err: String(e && e.message || e) }; }
}, heicB64);
ok(a.type === 'data:image/jpeg;base64,' && a.w === 1600 && a.h === 1200, 'A: a real HEIC becomes a 1600×1200 JPEG', JSON.stringify(a));
/* B: the album */
const b0 = await p.evaluate(async () => { window.openProject('p1'); await new Promise(r => setTimeout(r, 2200)); if (typeof window.openGallery === 'function') window.openGallery(); else if (typeof window.openGalleryMode === 'function') window.openGalleryMode('all'); await new Promise(r => setTimeout(r, 1500)); return (window.currentPhotos || []).length; });
const tmp = here + 'fixtures/sample_1358.heic';
await p.setInputFiles('#galFileInput', { name: 'IMG_0413.HEIC', mimeType: 'image/heic', buffer: readFileSync(tmp) });
await p.waitForTimeout(6000);
const bres = await p.evaluate(() => ({ status: (document.getElementById('galStatus') || {}).textContent || '', n: (window.currentPhotos || []).length,
  wrote: (window.__WRITES__ || []).filter(w => w.table === 'project_photos' && w.op === 'insert').length }));
ok(!/failed/i.test(bres.status) && (bres.wrote >= 1 || bres.n > b0), 'B: the album adds the HEIC photo', JSON.stringify({ before: b0, ...bres }));
/* D */
const acc = await p.evaluate(() => (document.getElementById('galFileInput') || {}).accept);
ok(/\.heic/.test(acc || '') && /image\/\*/.test(acc || ''), 'D: the album picker lists .heic', acc);
await b.close();
console.log(fail ? 'GATE 1358 RED — ' + fail + ' failing' : 'GATE 1358 GREEN');
process.exit(fail ? 1 : 0);
