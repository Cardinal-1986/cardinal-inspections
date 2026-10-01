/* gate_1221.mjs — build 1221: the tile-sized twin of a job photo, and one
   preparation for every camera upload. A REAL Chromium page (real canvas, real
   JPEG encoder, real image decode), with a spy standing in for Supabase storage
   so every upload and every signing request is recorded.

     A. photoThumbPathOf maps a photo to its -t.jpg twin and never twins a twin.
     B. photoPrepFile re-encodes a 3000px camera JPEG to <=1600px and the result
        carries NO EXIF/GPS — the bytes are searched, not assumed. A PDF and an
        undecodable "HEIC" pass through untouched (never blocked).
     C. photoDb.add uploads the photo AND a twin <=512px; photoDb.remove removes both.
     D. attachSignedPhotoUrls signs both in ONE request, keys by path, and leaves
        _thumb unset when the twin does not exist yet (the API answers an error
        entry, which is what OC Colors has relied on since 633).
     E. the job-photo grid paints the twin, keeps the full photo in data-full,
        and falls back to it when the twin fails to load.
     F. healPhotoThumbs backfills only rows without a twin, at most 8 per call,
        upsert:false, and never touches a row that already has one.

   ⚠ Written to go RED on 1220 rather than crash (BUG_CLASSES 37): every probe
   checks the symbol exists first and reports "missing" as a failure.

   usage:  node gate_1221.mjs [file.html]
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => { window.__sentinelTheme = 'dark'; });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await page.addInitScript(readFileSync(resolve(here, f), 'utf8'));
await page.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);

const R = await page.evaluate(async () => {
  const out = {};
  const has = n => typeof window[n] === 'function';
  out.symbols = ['photoThumbPathOf', 'photoPrepFile', 'scaleImageSrc', 'healPhotoThumbs', 'attachSignedPhotoUrls']
    .filter(n => !has(n));

  /* a camera-sized JPEG, with an APP1 EXIF segment carrying "GPS" spliced in after SOI */
  async function cameraJpeg(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#7a5'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#123'; for (let i = 0; i < 40; i++) x.fillRect((i * 97) % w, (i * 53) % h, 80, 60);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95));
    const raw = new Uint8Array(await b.arrayBuffer());
    const txt = new TextEncoder().encode('Exif\0\0MM\0*GPSLatitude 39.75 GPSLongitude -84.19');
    const len = txt.length + 2;
    const app1 = new Uint8Array([0xFF, 0xE1, (len >> 8) & 255, len & 255, ...txt]);
    const outb = new Uint8Array(raw.length + app1.length);
    outb.set(raw.slice(0, 2), 0); outb.set(app1, 2); outb.set(raw.slice(2), 2 + app1.length);
    return new File([outb], 'IMG_0001.JPG', { type: 'image/jpeg' });
  }
  const bytesHave = async (blob, s) => {
    const u = new Uint8Array(await blob.arrayBuffer()); const n = new TextEncoder().encode(s);
    outer: for (let i = 0; i + n.length <= u.length; i++) { for (let j = 0; j < n.length; j++) if (u[i + j] !== n[j]) continue outer; return true; }
    return false;
  };
  const dims = async blob => { const bm = await createImageBitmap(blob); return [bm.width, bm.height]; };

  /* A */
  if (has('photoThumbPathOf')) {
    out.A = [photoThumbPathOf('projects/p1/1700000000-abc1234.jpg'), photoThumbPathOf('projects/p1/x-t.jpg'),
             photoThumbPathOf('a/b.png'), photoThumbPathOf('')];
  }

  /* B */
  if (has('photoPrepFile')) {
    const cam = await cameraJpeg(3000, 2000);
    out.B = { inGps: await bytesHave(cam, 'GPS'), inSize: cam.size };
    const prep = await photoPrepFile(cam);
    out.B.outType = prep.type; out.B.outName = prep.name; out.B.outSize = prep.size;
    out.B.outGps = await bytesHave(prep, 'GPS'); out.B.outExif = await bytesHave(prep, 'Exif');
    out.B.outDims = await dims(prep);
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], 'scope.pdf', { type: 'application/pdf' });
    out.B.pdfSame = (await photoPrepFile(pdf)) === pdf;
    const heic = new File([new Uint8Array([1, 2, 3, 4, 5, 6])], 'x.heic', { type: 'image/heic' });
    out.B.heicSame = (await photoPrepFile(heic)) === heic;
  }

  /* a storage spy that records uploads/removes and signs only paths that "exist" */
  const realSb = window.sb;
  function spy(existing) {
    const log = { up: [], rm: [], sign: [] };
    const bucket = {
      upload: async (p, blob, opt) => { log.up.push({ p, size: blob && blob.size, type: blob && blob.type, opt }); existing.add(p); return { data: { path: p }, error: null }; },
      remove: async ps => { log.rm.push(ps); return { data: [], error: null }; },
      getPublicUrl: p => ({ data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/photos/' + p } }),
      createSignedUrls: async ps => { log.sign.push(ps.slice());
        return { data: ps.map(p => existing.has(p) ? { path: p, signedUrl: 'blob:signed/' + p, error: null }
                                                   : { path: p, signedUrl: null, error: 'Object not found' }), error: null }; }
    };
    return { log, client: Object.assign({}, realSb, { storage: { from: () => bucket } }) };
  }

  /* C */
  try {
    if (typeof photoDb === 'object' && photoDb && photoDb.add) {
      const S = spy(new Set());
      window.sb = Object.assign(S.client, {
        auth: { getUser: async () => ({ data: { user: { email: 'theo@cardinalrenovations.net' } } }) },
        from: () => ({ insert: async () => ({ data: null, error: null }),
                       select: () => ({ eq: () => ({ single: async () => ({ data: { storage_path: 'projects/p9/1-aaaaaaa.jpg' }, error: null }) }) }),
                       delete: () => ({ eq: async () => ({ error: null }) }) })
      });
      const cam = await cameraJpeg(1600, 1200);
      const d = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(cam); });
      await photoDb.add('p9', d);
      out.C = { uploads: S.log.up.map(u => u.p), sizes: S.log.up.map(u => u.size) };
      const twin = S.log.up.find(u => /-t\.jpg$/.test(u.p));
      out.C.twinDims = null;
      await photoDb.remove('id-1');
      out.C.removed = S.log.rm[0] || null;
      window.sb = realSb;
    }
  } catch (e) { out.C = { err: String(e) }; window.sb = realSb; }

  /* D */
  if (has('attachSignedPhotoUrls')) {
    const S = spy(new Set(['projects/a/1-aaaaaaa.jpg', 'projects/a/1-aaaaaaa-t.jpg', 'projects/a/2-bbbbbbb.jpg']));
    window.sb = S.client;
    const rows = [{ id: 1, storage_path: 'projects/a/1-aaaaaaa.jpg' }, { id: 2, storage_path: 'projects/a/2-bbbbbbb.jpg' }, { id: 3, data: 'data:image/jpeg;base64,xx' }];
    await attachSignedPhotoUrls(rows);
    out.D = { calls: S.log.sign.length, asked: S.log.sign[0] || [], rows: rows.map(r => ({ src: r._src || null, thumb: r._thumb || null })) };
    window.sb = realSb;
  }

  /* F */
  if (has('healPhotoThumbs')) {
    const S = spy(new Set());
    window.sb = S.client;
    const cam = await cameraJpeg(1600, 1200);
    const realFetch = window.fetch;
    window.fetch = async () => new Response(cam);
    const rows = [];
    for (let i = 0; i < 11; i++) rows.push({ storage_path: 'projects/h/' + i + '-ccccccc.jpg', _src: 'blob:signed/' + i });
    rows.push({ storage_path: 'projects/h/has-ddddddd.jpg', _src: 'blob:s', _thumb: 'blob:t' });
    await healPhotoThumbs(rows);
    window.fetch = realFetch; window.sb = realSb;
    out.F = { n: S.log.up.length, paths: S.log.up.map(u => u.p), upsert: S.log.up.map(u => u.opt && u.opt.upsert),
              maxSize: Math.max(0, ...S.log.up.map(u => u.size || 0)), touchedHas: S.log.up.some(u => /has-/.test(u.p)) };
  }
  return out;
}).catch(e => ({ err: String(e) }));

if (R.err) { ok(false, 'page probe threw', R.err); }
else {
  console.log('\nA. naming');
  ok(R.symbols && R.symbols.length === 0, 'the 1221 helpers exist', R.symbols && R.symbols.length ? 'missing: ' + R.symbols.join(', ') : 'all present');
  ok(!!R.A && R.A[0] === 'projects/p1/1700000000-abc1234-t.jpg', 'a job photo maps to its -t.jpg twin', R.A && R.A[0]);
  ok(!!R.A && R.A[1] === '', 'a twin is never twinned', R.A && JSON.stringify(R.A[1]));
  ok(!!R.A && R.A[2] === 'a/b-t.jpg' && R.A[3] === '', 'png maps, empty stays empty', R.A && R.A.slice(2).join(' | '));

  console.log('\nB. one preparation for every camera photo');
  const B = R.B || {};
  ok(B.inGps === true, 'control: the test camera file really carries GPS bytes', String(B.inGps));
  ok(B.outGps === false && B.outExif === false, 'after preparation there is NO EXIF and NO GPS in the bytes', 'Exif ' + B.outExif + ' · GPS ' + B.outGps);
  ok(B.outType === 'image/jpeg' && /\.jpg$/.test(B.outName || ''), 'it comes out as a .jpg JPEG', B.outType + ' ' + B.outName);
  ok(!!B.outDims && Math.max(...B.outDims) <= 1600 && Math.max(...B.outDims) >= 1500, 'a 3000px photo comes out at 1600px on its long edge', B.outDims && B.outDims.join('x'));
  ok(B.pdfSame === true, 'a PDF passes through untouched', String(B.pdfSame));
  ok(B.heicSame === true, 'an image this browser cannot decode passes through untouched (never blocked)', String(B.heicSame));

  console.log('\nC. the job photo store writes and removes the twin');
  const C = R.C || {};
  ok(!C.err && Array.isArray(C.uploads) && C.uploads.length === 2, 'photoDb.add uploads TWO objects', C.err || (C.uploads || []).join(' + '));
  ok(Array.isArray(C.uploads) && C.uploads[1] === (C.uploads[0] || '').replace(/\.jpg$/, '-t.jpg'), 'the second is the first one\'s -t.jpg twin', (C.uploads || [])[1]);
  ok(Array.isArray(C.sizes) && C.sizes[1] > 0 && C.sizes[1] < C.sizes[0] / 3, 'the twin is a fraction of the photo', (C.sizes || []).join(' vs '));
  ok(Array.isArray(C.removed) && C.removed.length === 2 && /-t\.jpg$/.test(C.removed[1] || ''), 'photoDb.remove removes the photo AND its twin', JSON.stringify(C.removed));

  console.log('\nD. signing');
  const D = R.D || {};
  ok(D.calls === 1, 'photo and twin are signed in ONE request', D.calls + ' request(s), ' + (D.asked || []).length + ' paths');
  ok(D.rows && D.rows[0].thumb === 'blob:signed/projects/a/1-aaaaaaa-t.jpg' && D.rows[0].src === 'blob:signed/projects/a/1-aaaaaaa.jpg', 'a photo WITH a twin gets both _src and _thumb', D.rows && JSON.stringify(D.rows[0]));
  ok(D.rows && D.rows[1].src && D.rows[1].thumb === null, 'a photo with NO twin yet keeps _src and gets no _thumb', D.rows && JSON.stringify(D.rows[1]));
  ok(D.rows && D.rows[2].src === null, 'an inline base64 photo is left alone', D.rows && JSON.stringify(D.rows[2]));

  console.log('\nF. old photos fill themselves in');
  const F = R.F || {};
  ok(F.n === 8, 'at most 8 twins per opening', F.n);
  ok(Array.isArray(F.paths) && F.paths.every(p => /-t\.jpg$/.test(p)), 'every backfill write is a -t.jpg twin', (F.paths || [])[0]);
  ok(F.touchedHas === false, 'a row that already has a twin is never rewritten', String(F.touchedHas));
  ok(Array.isArray(F.upsert) && F.upsert.every(u => u === false), 'backfill never overwrites (upsert:false)', JSON.stringify(F.upsert && F.upsert.slice(0, 2)));
  ok(F.maxSize > 0 && F.maxSize < 120000, 'a backfilled twin is small', F.maxSize + ' bytes');
}

/* E — the grid, in its own render */
console.log('\nE. the job-photo grid');
const E = await page.evaluate(async () => {
  if (typeof renderGallery !== 'function') return { missing: true };
  let g = document.getElementById('galGrid');
  if (!g) { g = document.createElement('div'); g.id = 'galGrid'; document.body.appendChild(g); }
  if (!document.getElementById('galCount')) { const c = document.createElement('span'); c.id = 'galCount'; document.body.appendChild(c); }
  const tiny = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  window.currentPhotos = [{ id: 'g1', _thumb: 'blob:not-a-real-twin', _src: tiny }];
  try { currentPhotos = window.currentPhotos; } catch (e) {}
  try { renderGallery(); } catch (e) { return { threw: String(e) }; }
  const img = g.querySelector('img');
  if (!img) return { noimg: true };
  const first = img.getAttribute('src'), full = img.getAttribute('data-full');
  await new Promise(r => setTimeout(r, 600));
  return { first, full, after: img.getAttribute('src') };
}).catch(e => ({ threw: String(e) }));
if (E.missing || E.threw || E.noimg) ok(false, 'the grid renders a tile', JSON.stringify(E));
else {
  ok(E.first === 'blob:not-a-real-twin', 'the tile asks for the twin first', E.first);
  ok(/^data:image\/gif/.test(E.full || ''), 'and keeps the full photo in data-full', (E.full || '').slice(0, 22));
  ok(/^data:image\/gif/.test(E.after || ''), 'when the twin fails to load, the tile falls back to the full photo', (E.after || '').slice(0, 22));
}

await browser.close();
console.log('\n' + (fail ? 'GATE 1221 RED' : 'GATE 1221 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
