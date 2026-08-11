/* Build 708 — the Photo Album loads pictures again.

   Root cause (live-DB verified): the photos bucket went PRIVATE in the July
   hardening; storage-backed photos carry a retired PUBLIC URL in `data` and a
   signed `_src` attached at list time. The enhanced album grid (cr-pae) read
   `data` alone — 183 of 196 photos (45/45 on the reported client) rendered
   dead links. api/caption additionally accepts ONLY base64 data: URLs, so AI
   captions have 400'd on every storage photo since the flip.

   This executes the ENTIRE shipped cr-pae IIFE in jsdom and drives it through
   the real window.renderGallery wrapper; paeImageDataUrl is additionally
   sliced and executed alone. The remaining three sites (two downloads, the
   caption-modal img) are asserted TEXTUALLY, scoped to the sliced block — say
   so plainly: those three are pattern-checked, not executed.

   Negative control: the 707 artifact — grid renders the dead URL, helper
   absent → red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_708.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const open_ = SRC.indexOf('<script id="cr-pae-script">');
ok('cr-pae-script block found', open_ !== -1);
const close_ = SRC.indexOf('<\/script>', open_);
const block = SRC.slice(open_ + '<script id="cr-pae-script">'.length, close_);
console.log('  (sliced ' + block.length + ' chars of shipped module)');

/* ── 1 · the whole IIFE, driven through the real renderGallery wrapper ── */
const dom = new JSDOM(
  '<div id="galleryView"><div id="galGrid"></div></div>' +
  '<span id="galXferWrap"></span><button id="galAddBtn"></button><button id="galCamBtn"></button>' +
  '<button id="galInspBtn"></button><button id="galInspRmBtn"></button><span id="galCount"></span>');
const doc = dom.window.document;
const win = {
  currentPhotos: [
    { id: 'p1', data: 'https://dead.example/public/old1.jpg', _src: 'https://signed.example/one?token=abc',
      created_at: '2026-08-11T01:00:00Z', section: 'Inspection', created_by: 'joan@x' },
    { id: 'p2', data: 'data:image/jpeg;base64,QUFB',
      created_at: '2026-08-10T01:00:00Z', section: 'Inspection', created_by: 'joan@x' },
  ],
  galChecked: {},
  renderGallery: function () {},
  addEventListener: () => {},
};
class MO { observe() {} disconnect() {} }
try {
  new Function('window', 'document', 'MutationObserver', 'setInterval', 'clearInterval',
    'setTimeout', 'fetch', 'alert', 'confirm',
    '"use strict";\n' + block)(
    win, doc, MO, (fn) => { try { fn(); } catch (e) {} return 0; }, () => {},
    (fn) => { try { fn(); } catch (e) {} return 0; }, async () => ({ ok: true }), () => {}, () => true);
  ok('the shipped IIFE executed', true);
} catch (e) { ok('the shipped IIFE executed', false, e.message); }

(async () => {
  /* jsdom's document is still readyState 'loading' when the IIFE runs, so the
     module correctly parks start() on DOMContentLoaded — wait for it to fire
     before asserting (the first draft asserted synchronously and blamed the
     module for its own impatience). */
  await new Promise(r => setTimeout(r, 50));
  ok('the module wrapped window.renderGallery (after DOMContentLoaded)',
    !!(win.renderGallery && win.renderGallery.__crPaeWrapped), doc.readyState);
  win.renderGallery();
  const imgs = doc.querySelectorAll('#galGrid .gph img');
  ok('the grid rendered both photos', imgs.length === 2, imgs.length);
  ok('a storage-backed photo uses the SIGNED _src, not the dead public URL',
    imgs[0] && imgs[0].getAttribute('src') === 'https://signed.example/one?token=abc',
    imgs[0] && imgs[0].getAttribute('src'));
  ok('a legacy base64 photo still uses its data: URL',
    imgs[1] && imgs[1].getAttribute('src') === 'data:image/jpeg;base64,QUFB',
    imgs[1] && imgs[1].getAttribute('src'));

  /* ── 2 · paeImageDataUrl, sliced and executed alone ── */
  const at = block.indexOf('async function paeImageDataUrl(photo){');
  ok('paeImageDataUrl exists in the shipped block', at !== -1);
  if (at !== -1) {
    let i = block.indexOf('{', at), depth = 0, end = -1;
    for (; i < block.length; i++) {
      if (block[i] === '{') depth++;
      else if (block[i] === '}') { depth--; if (!depth) { end = i + 1; break; } }
    }
    const fetches = [];
    const helper = new Function('fetch', 'FileReader',
      '"use strict";\n' + block.slice(at, end) + '\nreturn paeImageDataUrl;')(
      async (u) => { fetches.push(u); return { ok: true, blob: async () => new dom.window.Blob(['xx'], { type: 'image/jpeg' }) }; },
      dom.window.FileReader);
    const passthrough = await helper({ data: 'data:image/png;base64,QQ==' });
    ok('a base64 photo passes straight through (no fetch)',
      passthrough === 'data:image/png;base64,QQ==' && fetches.length === 0);
    const converted = await helper({ data: 'https://dead.example/x.jpg', _src: 'https://signed.example/x?t=1' });
    ok('a storage photo is fetched via the SIGNED URL', fetches.length === 1 && fetches[0] === 'https://signed.example/x?t=1',
      JSON.stringify(fetches));
    ok('…and converted to the base64 data: URL the API accepts',
      typeof converted === 'string' && converted.indexOf('data:') === 0, String(converted).slice(0, 30));
  }

  /* ── 3 · the remaining sites, pattern-checked within the sliced block ── */
  ok('both AI caption payloads send the converted image (0 raw photo.data left)',
    (block.match(/image: await paeImageDataUrl\(photo\)/g) || []).length === 2 &&
    block.indexOf('image: photo.data') === -1);
  ok('the bulk download fetches _src first', block.indexOf('fetch(photos[i]._src || photos[i].data)') !== -1);
  ok('the single download fetches _src first', block.indexOf('fetch(photo._src || photo.data)') !== -1);
  ok('the caption-modal image prefers _src',
    block.indexOf('<div class="imgwrap"><img src="\' + esc(String(photo._src || photo.data || \'\'))') !== -1);

  console.log('\nHARNESS 708: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
