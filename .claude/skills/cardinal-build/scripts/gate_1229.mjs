/* gate_1229.mjs — build 1229: take several photos, then upload once; and a
   tidier Photo Album.

   Theo, 4 Oct: "you can take multiples instead of one then upload ... Need to
   take several then upload" / "maybe make a drop down reorganize" / "Look at
   the scattered bottom buttons too". Then, from the preview: "Build all".
   Real Chromium render; getUserMedia is answered by a canvas stream:
     A. TOOLBAR: Take photos first, Add from phone second, one row, ≥44px.
     B. DROPDOWN: one "All photos" button + Select replace the chip heap; the
        menu lists six sections with counts and filters the grid.
     C. TILES: no delete X and no initials ball on a tile; tapping a photo
        OPENS it (Select off) and ticks nothing.
     D. SELECT BAR: Select → bar with every action the same height, three
        across, nothing past the bar's edge; two ticks → "2 selected";
        Delete removes both behind one confirm; Done clears it.
     E. ADD FROM PHONE opens the device picker for an admin AND a rep; an
        admin gets "Copy CompanyCam photos" on the CompanyCam card instead.
     F. CAMERA: stays open; 3 shots → Upload 3; the strip drops one; Upload
        hands addGalleryFiles 2 files carrying the chosen section; the camera
        tracks are stopped; closing with shots asks first.
     G. GUARDS: a different client underneath → Upload refuses and KEEPS the
        photos; no camera API → the phone camera input, as before.
     H. Inspection Photos keeps its own renderer (remove X on the tile).
   390 × both themes, plus 1440 dark for the layout checks.
   ⚠ RED on 1228 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1229.mjs [file.html]
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

const PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const browser = await launchChromium(chromium);

async function boot(theme, vw, admin) {
  const p = await browser.newPage({ viewport: { width: vw, height: 844 } });
  await p.route('**/api/companycam-job', route => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, linked: false, photos: [] }) }));
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  /* a camera that is a canvas: Chromium's captureStream gives real frames */
  await p.addInitScript(() => {
    window.__gum = 0;
    const md = navigator.mediaDevices || {};
    md.getUserMedia = async () => {
      window.__gum++;
      const c = document.createElement('canvas'); c.width = 640; c.height = 480;
      const g = c.getContext('2d'); let n = 0;
      setInterval(() => { g.fillStyle = 'hsl(' + (n++ * 7 % 360) + ',60%,50%)'; g.fillRect(0, 0, 640, 480); }, 30);
      g.fillStyle = '#888'; g.fillRect(0, 0, 640, 480);
      const s = c.captureStream(30); window.__stream = s; return s;
    };
    try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md }); } catch (e) {}
  });
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'album'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.evaluate(({ px, admin }) => {
    window.isAdminUser = function () { return admin; };
    window.__asks = 0; window.__askAnswer = true;
    window.crAsk = function () { window.__asks++; return Promise.resolve(window.__askAnswer); };
    window.__removed = [];
    if (window.photoDb) window.photoDb.remove = async function (id) { window.__removed.push(String(id)); };
    window.__added = null;
    window.addGalleryFiles = async function (files, metas) { window.__added = { n: files.length, metas: metas, types: [...files].map(f => f.type) }; };
    const secs = ['Inspection', 'Before', 'After'];
    currentPhotos = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, data: px, _src: px, _thumb: px, section: secs[i % 3], caption: '',
      created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-0' + (1 + (i % 3)) + 'T12:00:00Z' }));
    window.galChecked = {};
    if (typeof galJobLoad === 'function') galJobLoad();
    renderGallery();
  }, { px: PX, admin });
  await p.waitForTimeout(900);
  return p;
}
const R = p => p.evaluate(() => {
  const box = el => { if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  return { cam: box(document.getElementById('galCamBtn')), add: box(document.getElementById('galAddBtn')),
    dd: box(document.querySelector('#cr-pae-tabs .pae-dd')), sel: box(document.querySelector('#cr-pae-tabs .pae-sel')),
    chips: document.querySelectorAll('#cr-pae-tabs > button[data-tab]').length,
    menu: box(document.querySelector('#cr-pae-tabs .pae-menu')),
    opts: [...document.querySelectorAll('#cr-pae-tabs .pae-menu button')].map(b => b.innerText.replace(/\s+/g, ' ').trim()),
    tiles: document.querySelectorAll('#galGrid .gph').length,
    del: [...document.querySelectorAll('#galGrid .gdel')].filter(e => e.getClientRects().length).length,
    ini: [...document.querySelectorAll('#galGrid .cr-pae-initials')].filter(e => e.getClientRects().length).length,
    vw: innerWidth, docW: document.documentElement.scrollWidth };
});

for (const [theme, vw] of [['dark', 390], ['rb-light', 390], ['dark', 1440]]) {
  const at = (theme === 'dark' ? 'dark' : 'light') + ' @' + vw;
  console.log('\n── ' + at + ' ' + '─'.repeat(40));
  const p = await boot(theme, vw, true);
  let r = await R(p).catch(e => ({ err: String(e) }));
  if (r.err) { ok(false, at + ' — the album renders', r.err); await p.close(); continue; }
  /* A */
  ok(!!(r.cam && r.add && r.cam.x < r.add.x && Math.abs(r.cam.y - r.add.y) < 4 && r.cam.h >= 44 && r.add.h >= 44),
    at + ' — A: Take photos then Add from phone, one row, ≥44px', JSON.stringify([r.cam && Math.round(r.cam.h), r.add && Math.round(r.add.h)]));
  const lab = await p.evaluate(() => [document.getElementById('galCamBtn').innerText, document.getElementById('galAddBtn').innerText].join(' | '));
  ok(/Take photos/.test(lab) && /Add from phone/.test(lab), at + ' — A: the labels say what they do', lab);
  /* B */
  ok(!!(r.dd && r.sel) && r.chips === 0 && !r.menu, at + ' — B: one dropdown + Select, no chip heap, menu closed', 'chips ' + r.chips + ' · dd ' + !!r.dd + ' · sel ' + !!r.sel);
  ok(!!(r.dd && r.sel && r.dd.h >= 44 && r.sel.h >= 44 && Math.abs(r.dd.y - r.sel.y) < 4), at + ' — B: both ≥44px on one row');
  await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-dd'); if (b) b.click(); }); await p.waitForTimeout(300);
  r = await R(p);
  ok(r.opts.length === 6 && /All photos 9/.test(r.opts[0] || '') && /Before 3/.test(r.opts.join('|')), at + ' — B: the menu lists six sections with counts', r.opts.join(' / '));
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cr-pae-tabs .pae-menu button')].find(b => b.dataset.tab === 'Before'); if (b) b.click(); }); await p.waitForTimeout(400);
  r = await R(p);
  const ddText = await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-dd'); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
  ok(r.tiles === 3 && !r.menu && /Before/.test(ddText), at + ' — B: picking Before filters the grid and closes the menu', r.tiles + ' tiles · "' + ddText + '"');
  await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-dd'); if (b) b.click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { document.body.click(); }); await p.waitForTimeout(200);
  r = await R(p);
  ok(!r.menu, at + ' — B: a tap outside closes the menu');
  await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-dd'); if (b) b.click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cr-pae-tabs .pae-menu button')].find(b => b.dataset.tab === 'all'); if (b) b.click(); }); await p.waitForTimeout(400);
  r = await R(p);
  /* C */
  ok(r.tiles === 9 && r.del === 0 && r.ini === 0, at + ' — C: tiles carry no delete X and no initials', 'tiles ' + r.tiles + ' · X ' + r.del + ' · ini ' + r.ini);
  ok(r.docW <= r.vw, at + ' — nothing pushes the page sideways', r.docW + ' > ' + r.vw);
  const tap = await p.evaluate(async () => {
    const t = document.querySelector('#galGrid .gph'); if (!t) return { none: true };
    t.click(); await new Promise(z => setTimeout(z, 300));
    const m = document.getElementById('cr-pae-cap-modal');
    const open = !!(m && m.classList.contains('open'));
    if (m) m.classList.remove('open');
    return { open, ticked: Object.keys(window.galChecked || {}).filter(k => window.galChecked[k]).length };
  });
  ok(tap.open && tap.ticked === 0, at + ' — C: tapping a photo opens it and ticks nothing', JSON.stringify(tap));
  /* D */
  await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-sel'); if (b) b.click(); }); await p.waitForTimeout(500);
  const bar0 = await p.evaluate(() => { const b = document.getElementById('cr-pae-actionbar'); return b ? { show: b.classList.contains('show'), text: b.innerText.replace(/\s+/g, ' '), dis: [...b.querySelectorAll('.pae-bar-acts [data-act]')].filter(x => x.disabled).length } : { show: false }; });
  ok(bar0.show && /Tap photos to select/.test(bar0.text || '') && bar0.dis >= 4, at + ' — D: Select raises the bar, actions waiting for a tick', JSON.stringify(bar0).slice(0, 140));
  await p.evaluate(async () => { const t = document.querySelectorAll('#galGrid .gph'); t[0].click(); await new Promise(z => setTimeout(z, 120)); document.querySelectorAll('#galGrid .gph')[1].click(); });
  await p.waitForTimeout(700);
  const bar = await p.evaluate(() => {
    const b = document.getElementById('cr-pae-actionbar'); if (!b) return { none: true };
    const br = b.getBoundingClientRect();
    const acts = [...b.querySelectorAll('.pae-bar-acts > *')].filter(e => e.getClientRects().length);
    const ctl = [...b.querySelectorAll('.pae-bar-acts select, .pae-bar-acts button:not(#galXferMenu button)')].filter(e => e.getClientRects().length && !e.closest('#galXferMenu'));
    const hs = ctl.map(e => Math.round(e.getBoundingClientRect().height));
    const over = [...b.querySelectorAll('*')].filter(e => e.getClientRects().length && !e.closest('#galXferMenu'))
      .filter(e => { const r = e.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1; }).length;
    const xw = document.getElementById('galXferWrap');
    return { text: b.innerText.replace(/\s+/g, ' '), n: acts.length, hs, over, onScreen: br.bottom <= innerHeight + 1 && br.top >= 0,
      xferSecond: !!(xw && acts[1] === xw), checks: [...document.querySelectorAll('#galGrid .gph .gchk')].filter(e => e.getClientRects().length).length };
  });
  ok(/2 selected/.test(bar.text || ''), at + ' — D: two ticks read "2 selected"', (bar.text || '').slice(0, 80));
  ok(bar.n === 5 && bar.xferSecond, at + ' — D: Move · To report · To Inspection · Save · Delete', bar.n + ' items · report 2nd ' + bar.xferSecond);
  ok(bar.hs && bar.hs.length >= 5 && Math.min(...bar.hs) >= 44 && Math.max(...bar.hs) - Math.min(...bar.hs) <= 2, at + ' — D: every action the same height, ≥44px', JSON.stringify(bar.hs));
  ok(bar.over === 0 && bar.onScreen, at + ' — D: nothing runs past the bar, and the bar is on screen', 'over ' + bar.over + ' · on ' + bar.onScreen);
  ok(bar.checks === 9, at + ' — D: in Select every tile shows its tick', bar.checks);
  const del = await p.evaluate(async () => {
    const b = document.querySelector('#cr-pae-actionbar [data-act="bulk-delete"]'); if (!b) return { none: true };
    b.click(); await new Promise(z => setTimeout(z, 700));
    return { asks: window.__asks, removed: window.__removed.slice(), tiles: document.querySelectorAll('#galGrid .gph').length };
  });
  ok(del.asks === 1 && del.removed && del.removed.length === 2 && del.tiles === 7, at + ' — D: Delete removes both behind ONE confirm', JSON.stringify(del));
  await p.evaluate(() => { const b = document.querySelector('#cr-pae-tabs .pae-sel'); if (b) b.click(); }); await p.waitForTimeout(500);
  const done = await p.evaluate(() => { const b = document.getElementById('cr-pae-actionbar'); return { show: !!(b && b.classList.contains('show')), checks: [...document.querySelectorAll('#galGrid .gph .gchk')].filter(e => e.getClientRects().length).length }; });
  ok(!done.show && done.checks === 0, at + ' — D: Done puts the bar and the ticks away', JSON.stringify(done));
  /* E (admin) */
  const add = await p.evaluate(async () => {
    let picked = false; const fi = document.getElementById('galFileInput'); fi.click = () => { picked = true; };
    document.getElementById('galAddBtn').click(); await new Promise(z => setTimeout(z, 400));
    const pan = document.getElementById('galCcPanel');
    return { picked, cc: !!(pan && pan.style.display !== 'none'), copy: !!document.querySelector('#galJobCc [data-gjc="copy"]') };
  });
  ok(add.picked && !add.cc, at + ' — E: an admin\'s Add from phone opens the phone', JSON.stringify(add));
  ok(add.copy, at + ' — E: an admin copies CompanyCam photos from the CompanyCam card');
  const cp = await p.evaluate(async () => { const b = document.querySelector('#galJobCc [data-gjc="copy"]'); if (!b) return false; b.click(); await new Promise(z => setTimeout(z, 300)); const pan = document.getElementById('galCcPanel'); const o = !!(pan && pan.style.display !== 'none'); if (typeof galCcClose === 'function') galCcClose(); return o; });
  ok(cp, at + ' — E: and that button opens the copy panel');
  const hd = await p.evaluate(() => { const h = document.querySelector('#galJobCc .gjc-h'); if (!h) return null; const t = h.querySelector('.gjc-t'), a = h.querySelector('.gjc-act'); if (!t || !a) return null; const x = t.getBoundingClientRect(), y = a.getBoundingClientRect(); return !(x.right > y.left - 6 && x.bottom > y.top && x.top < y.bottom); });
  ok(hd === true, at + ' — the CompanyCam title and its button never touch', String(hd));
  if (vw === 390) {
    const moon = await p.evaluate(() => { const m = document.getElementById('cr-dark-toggle'); if (!m) return 'absent'; m.classList.add('show'); const v = getComputedStyle(m).display; return v; });
    ok(moon === 'none' || moon === 'absent', at + ' — the floating moon is off the album on a phone', moon);
  }
  /* F */
  const cam = await p.evaluate(async () => {
    document.getElementById('galCamBtn').click(); await new Promise(z => setTimeout(z, 900));
    const root = document.getElementById('cr-mcam'); if (!root) return { none: true };
    const sh = root.querySelector('[data-mc="shoot"]');
    for (let i = 0; i < 3; i++) { sh.click(); await new Promise(z => setTimeout(z, 250)); }
    const up = root.querySelector('[data-mc="upload"]');
    const r1 = { open: root.classList.contains('open'), up: up.innerText, dis: up.disabled, gum: window.__gum };
    root.querySelector('[data-mc="strip"]').click(); await new Promise(z => setTimeout(z, 150));
    const thumbs = root.querySelectorAll('.mc-strip [data-mc="drop"]').length;
    root.querySelector('.mc-strip [data-mc="drop"]').click(); await new Promise(z => setTimeout(z, 150));
    const sel = root.querySelector('.mc-sec'); sel.value = 'Before';
    const tall = [...root.querySelectorAll('button, select')].filter(e => e.getClientRects().length).map(e => Math.round(Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width)));
    const up2 = up.innerText;
    up.click(); await new Promise(z => setTimeout(z, 500));
    const live = window.__stream ? window.__stream.getTracks().filter(t => t.readyState === 'live').length : -1;
    return { r1, thumbs, up2, after: window.__added, closed: !root.classList.contains('open'), live, minTap: Math.min(...tall) };
  });
  ok(cam.r1 && cam.r1.open && cam.r1.up === 'Upload 3' && cam.r1.gum >= 1, at + ' — F: the camera stays open: three shots read Upload 3', JSON.stringify(cam.r1 || cam));
  ok(cam.thumbs === 3 && cam.up2 === 'Upload 2', at + ' — F: the strip shows them and drops a bad one', cam.thumbs + ' · ' + cam.up2);
  ok(cam.minTap >= 44, at + ' — F: every camera control ≥44px', cam.minTap);
  ok(!!(cam.after && cam.after.n === 2 && cam.after.metas.every(m => m.section === 'Before') && cam.after.types.every(t => t === 'image/jpeg')),
    at + ' — F: Upload hands the album 2 JPEGs carrying the chosen section', JSON.stringify(cam.after));
  ok(cam.closed && cam.live === 0, at + ' — F: the camera closes and its tracks are stopped', 'closed ' + cam.closed + ' · live ' + cam.live);
  const ask = await p.evaluate(async () => {
    window.__asks = 0; window.__askAnswer = false;
    document.getElementById('galCamBtn').click(); await new Promise(z => setTimeout(z, 800));
    const root = document.getElementById('cr-mcam'); if (!root) return { none: true };
    root.querySelector('[data-mc="shoot"]').click(); await new Promise(z => setTimeout(z, 250));
    root.querySelector('[data-mc="close"]').click(); await new Promise(z => setTimeout(z, 200));
    const stayed = root.classList.contains('open');
    /* G1: a different client underneath */
    const real = currentProject.id; currentProject.id = 'someone-else'; window.__added = null;
    root.querySelector('[data-mc="upload"]').click(); await new Promise(z => setTimeout(z, 200));
    const refused = window.__added === null && root.classList.contains('open') && /different client/.test(root.innerText);
    const kept = window.CardinalMultiCam._state().shots;
    currentProject.id = real;
    window.__askAnswer = true; root.querySelector('[data-mc="close"]').click(); await new Promise(z => setTimeout(z, 200));
    return { asks: window.__asks, stayed, refused, kept, closed: !root.classList.contains('open') };
  });
  ok(ask.asks >= 1 && ask.stayed, at + ' — F: closing with unsent photos asks first', JSON.stringify(ask));
  ok(ask.refused && ask.kept === 1, at + ' — G: a different client underneath → Upload refuses, photos kept', JSON.stringify(ask));
  const fb = await p.evaluate(async () => {
    let native = false; const ci = document.getElementById('galCamInput'); ci.click = () => { native = true; };
    const keep = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = undefined;
    document.getElementById('galCamBtn').click(); await new Promise(z => setTimeout(z, 300));
    navigator.mediaDevices.getUserMedia = keep;
    const root = document.getElementById('cr-mcam');
    return { native, overlay: !!(root && root.classList.contains('open')) };
  });
  ok(fb.native && !fb.overlay, at + ' — G: no camera API → the phone camera, as before', JSON.stringify(fb));
  /* H */
  const insp = await p.evaluate(async () => {
    const keep = currentPhotos.slice(0, 2);
    try { openGalleryMode('insp'); } catch (e) { return 'err'; }
    await new Promise(z => setTimeout(z, 1800));   /* loadGallery reloads from the mock first */
    currentPhotos = keep; renderGallery();
    return { x: [...document.querySelectorAll('#galGrid .gdel')].filter(e => e.getClientRects().length).length, cam: getComputedStyle(document.getElementById('galCamBtn')).display };
  });
  ok(insp && insp.x === 2 && insp.cam === 'none', at + ' — H: Inspection Photos keeps its remove X and hides the camera', JSON.stringify(insp));
  await p.close();
}
/* E (rep) */
console.log('\n── rep @390 ' + '─'.repeat(40));
const q = await boot('dark', 390, false);
const rep = await q.evaluate(async () => {
  let picked = false; const fi = document.getElementById('galFileInput'); fi.click = () => { picked = true; };
  document.getElementById('galAddBtn').click(); await new Promise(z => setTimeout(z, 400));
  return { picked, copy: !!document.querySelector('#galJobCc [data-gjc="copy"]') };
}).catch(e => ({ err: String(e) }));
ok(rep.picked && !rep.copy, 'rep — E: Add from phone opens the phone; no CompanyCam copy button', JSON.stringify(rep));
await q.close();

const SRC = readFileSync(artifact, 'utf8');
console.log('\n── source ' + '─'.repeat(40));
const MC = (SRC.match(/<script id="cr-mcam-script">[\s\S]*?<\/script>/) || [''])[0];
ok(MC.length > 0 && !/document\.body\.style\.overflow/.test(MC), 'the camera never writes the global scroll lock');
ok(/window\.CardinalMultiCam = Object\.assign\(window\.CardinalMultiCam \|\| \{\}/.test(SRC), 'CardinalMultiCam is exported with Object.assign');
await browser.close();
console.log('\n' + (fail ? 'GATE 1229 RED' : 'GATE 1229 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
