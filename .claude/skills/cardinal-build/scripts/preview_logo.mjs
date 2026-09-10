/* preview_logo.mjs — AUDIT PROBE + PREVIEW BUILDER for the sign-in logo.
 *
 *   node preview_logo.mjs [outdir]
 *
 * OPEN_ITEMS (9 Sep assessment, item 2): "the sign-in logo is 1.14 MB
 * (cardinal-transparent.png) and loads before sign-in. Re-encode or vectorize;
 * VISUAL — labelled previews first."
 *
 * This container has no PIL, no ImageMagick and no cwebp, and npm is blocked —
 * so the encoder used here is CHROMIUM'S OWN, through canvas.toBlob(). That is
 * not a workaround: it is the same encoder the app already uses to shrink
 * photographs (shrinkOne(), build 633), so a size measured here is a size the
 * app could actually produce.
 *
 * It re-encodes at the sizes the logo is REALLY DISPLAYED AT — the login mark
 * is capped at 340 CSS px wide, so 680 and 1020 device px cover a 2x and a 3x
 * phone — and writes both the candidate files and one self-contained preview
 * page showing them at true size on the real login ground, light and dark.
 *
 * ⚠ It ships nothing. The swap is a multi-site edit (six references in
 * index.html, two of them the report templates' onerror fallback) and the
 * 1.73 MB cardinal-landing.PNG behind the login <img>'s own onerror must stay
 * whatever happens. This is the labelled preview the standing rule asks for.
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const OUT = resolve(process.argv[2] || resolve(ROOT, '.logo-preview'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
mkdirSync(OUT, { recursive: true });

const SRC_PNG = resolve(ROOT, 'cardinal-transparent.png');
const raw = readFileSync(SRC_PNG);
const dataUri = 'data:image/png;base64,' + raw.toString('base64');
console.log('source: cardinal-transparent.png — ' + raw.length.toLocaleString() + ' bytes\n');

/* the widths that matter, and why each one is here */
const WIDTHS = [
  { w: 1176, why: 'native — no resampling at all' },
  { w: 1020, why: 'exact 3x of the 340px cap (iPhone Pro)' },
  { w: 680,  why: 'exact 2x of the 340px cap' },
];
const QUALITIES = [0.92, 0.85, 0.8];

const ENCODE = async function (arg) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('image did not decode')); img.src = arg.uri; });
  const out = [];
  const nat = { w: img.naturalWidth, h: img.naturalHeight };
  for (const { w, why } of arg.widths) {
    const h = Math.round(nat.h * (w / nat.w));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.clearRect(0, 0, w, h);          /* keep the alpha — never paint a ground in */
    g.drawImage(img, 0, 0, w, h);
    for (const type of ['image/webp', 'image/png']) {
      for (const q of (type === 'image/webp' ? arg.qualities : [1])) {
        const blob = await new Promise(r => c.toBlob(r, type, q));
        if (!blob) continue;
        const buf = new Uint8Array(await blob.arrayBuffer());
        /* the encoder can silently answer PNG when it cannot do the type */
        const isWebp = buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
        const isPng  = buf[0] === 0x89 && buf[1] === 0x50;
        out.push({ w, h, why, type, q, bytes: buf.length,
                   real: type === 'image/webp' ? isWebp : isPng,
                   b64: btoa(String.fromCharCode(...buf.slice(0, 0))) });
      }
    }
  }
  return { nat, out };
};

const GRAB = async function (arg) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = arg.uri; });
  const c = document.createElement('canvas');
  const h = Math.round(img.naturalHeight * (arg.w / img.naturalWidth));
  c.width = arg.w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.clearRect(0, 0, arg.w, h);
  g.drawImage(img, 0, 0, arg.w, h);
  return c.toDataURL(arg.type, arg.q);
};

let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  const { nat, out } = await page.evaluate(ENCODE, { uri: dataUri, widths: WIDTHS, qualities: QUALITIES });
  console.log('natural size: ' + nat.w + 'x' + nat.h +
              '   displayed at: width:min(78vw,340px) — so 340 CSS px is the cap\n');
  console.log('  ' + 'candidate'.padEnd(34) + 'bytes'.padStart(10) + '   vs 1.14 MB');
  console.log('  ' + '-'.repeat(60));
  const rows = [];
  for (const r of out) {
    const label = r.type.replace('image/', '') + (r.type === 'image/webp' ? ' q' + r.q : '') +
                  '  ' + r.w + 'x' + r.h;
    const pct = (100 * r.bytes / raw.length);
    rows.push({ ...r, label, pct });
    console.log('  ' + label.padEnd(34) + r.bytes.toLocaleString().padStart(10) +
                '   ' + pct.toFixed(1) + '%' + (r.real ? '' : '   ⚠ NOT the format asked for'));
  }

  /* write the four worth looking at, and build the preview page from them */
  const PICKS = [
    { w: 1020, type: 'image/webp', q: 0.92, name: 'A' },
    { w: 1020, type: 'image/webp', q: 0.85, name: 'B' },
    { w: 680,  type: 'image/webp', q: 0.85, name: 'C' },
    { w: 680,  type: 'image/webp', q: 0.80, name: 'D' },
  ];
  const cards = [];
  for (const p of PICKS) {
    const uri = await page.evaluate(GRAB, { uri: dataUri, w: p.w, type: p.type, q: p.q });
    const bytes = Math.floor((uri.length - uri.indexOf(',') - 1) * 3 / 4);
    const file = 'cardinal-logo-' + p.w + '-q' + String(p.q).replace('0.', '') + '.webp';
    writeFileSync(resolve(OUT, file),
      Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64'));
    const row = rows.find(r => r.w === p.w && r.type === p.type && r.q === p.q);
    cards.push({ ...p, uri, bytes, file, h: row ? row.h : 0 });
    console.log('  wrote ' + file + '  (' + bytes.toLocaleString() + ' bytes)');
  }
  writeFileSync(resolve(OUT, 'candidates.json'),
    JSON.stringify({ source: { file: 'cardinal-transparent.png', bytes: raw.length, ...nat },
                     rows: rows.map(({ b64, ...r }) => r),
                     picks: cards.map(({ uri, ...c }) => c) }, null, 2));
  writeFileSync(resolve(OUT, 'original.b64.txt'), dataUri);
  console.log('\nwrote ' + OUT + '/candidates.json  (+ original.b64.txt for the preview page)');
  await ctx.close();
} catch (e) {
  console.log('PROBE ERROR: ' + String((e && e.message) || e).slice(0, 400));
  process.exitCode = 1;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }
