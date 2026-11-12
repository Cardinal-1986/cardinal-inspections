/* gate_1445.mjs — build 1445: punch-out photos go up several at a time, and they arrive.

   Theo, 12 Nov 2026, on Scottie's phone: "it's one photo at a time and it doesn't even
   show up." Real Chromium, signed in as Scottie (?as=scottie), on his punch-out i4.
   getUserMedia answers with a canvas stream, as in gate_1229.

     A  a slot tap opens the app's own camera for THIS punch-out (target mode), not a
        one-shot file chooser; the album's Section picker is hidden
     B  three shots and one Upload: three photos uploaded under punch/i4/, one
        punch_items write carrying all three (stamped as Scottie), three filled
        slots, the camera closed, no "Uploading" note left behind
     C  Add photos from phone: a chooser that takes SEVERAL, from an input that is IN
        the page (iPhone Safari can drop a detached one while its picker is up), with
        no capture attribute; two files make five photos
     D  the gallery offers Take photos and From phone
     E  no camera API: a slot tap falls back to the phone camera through an input that
        is in the page, capture="environment", one photo; the photo arrives
     F  a batch finishing after the card moved on lands on ITS punch-out, appended on
        the server; the card on screen is untouched
     G  no signal: the photo is held on the phone (the 866 outbox), not dropped
     I  the card's Add receipt camera is in the page too, and removed after use
     H  source: the scope reader's CardinalSolUpload.prepare is off the punch path;
        the album's camera keeps its own path (open() with no target)

   ⚠ Written to go RED on 1444 rather than crash (BUG_CLASSES 37): every step checks
   what it needs and records a failure.

   usage: node gate_1445.mjs [file.html]
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
const HTML = readFileSync(artifact, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m + (d !== undefined ? '  — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 260) : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 420000).unref();
const sleep = ms => new Promise(r => setTimeout(r, ms));
console.log('gate_1445 on ' + artifact);

/* a real 8x8 JPEG (PIL) */
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDQooor5888/9k=', 'base64');

const LEAVE = `(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } });
  try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {} })()`;

const browser = await launchChromium(chromium);

async function boot(cam) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  /* every remote request refused: the CDN supabase-js would otherwise replace the
     e2e mock and the punch cache would load empty (the 1441 gate_stack lesson) */
  await ctx.route(/^(https?|wss?):\/\//, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => { if (!/ResizeObserver/.test(String(e))) console.log('    [pageerror] ' + String(e).slice(0, 160)); });
  await p.addInitScript(() => { window.__sentinelTheme = 'dark'; });
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.addInitScript(on => {
    window.__gum = 0;
    const md = navigator.mediaDevices || {};
    if (on) {
      md.getUserMedia = async () => {
        window.__gum++;
        const c = document.createElement('canvas'); c.width = 640; c.height = 480;
        const g = c.getContext('2d'); let n = 0;
        setInterval(() => { g.fillStyle = 'hsl(' + (n++ * 7 % 360) + ',60%,50%)'; g.fillRect(0, 0, 640, 480); }, 30);
        g.fillStyle = '#888'; g.fillRect(0, 0, 640, 480);
        return c.captureStream(30);
      };
    } else {
      md.getUserMedia = undefined;
    }
    try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md }); } catch (e) {}
  }, cam);
  await p.goto('file://' + artifact + '?as=scottie', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  const opened = await p.evaluate(async L => {
    eval(L);
    if (!window.CardinalPunchCard) return 'no CardinalPunchCard';
    /* the punch cache fills when Production opens; load it the same way first */
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch (e) {}
    window.CardinalPunchCard.open('i4', { back: 'production' });
    for (let k = 0; k < 60 && !document.querySelector('#cr-pk .pkslot'); k++) await new Promise(r => setTimeout(r, 150));
    return document.querySelector('#cr-pk .pkslot') ? 'ok' : 'no slots';
  }, LEAVE).catch(e => 'threw ' + String(e).slice(0, 80));
  await p.waitForTimeout(500);
  return { ctx, p, opened };
}
const W = p => p.evaluate(() => (window.__WRITES__ || []).map(w => ({ t: w.table, op: w.op, path: w.payload && w.payload.path, ph: w.payload && Array.isArray(w.payload.photos) ? w.payload.photos : null, f: JSON.stringify(w.extra && w.extra.filters || w.filters || '') })));
const uploads = (ws, pre) => ws.filter(w => w.t === 'storage:photos' && w.op === 'upload' && String(w.path || '').startsWith(pre));
const photoWrites = (ws, id) => ws.filter(w => w.t === 'punch_items' && w.op === 'update' && w.ph && (!id || w.f.includes(id)));
const card = p => p.evaluate(() => {
  const c = document.getElementById('cr-pk');
  return {
    filled: c ? c.querySelectorAll('.pkslot img').length : -1,
    up: c ? c.querySelectorAll('[data-pkup]').length : -1,
    lib: c ? c.querySelectorAll('[data-act="phlib"]').length : -1,
    count: c ? ((c.querySelector('#pkSecPh .rt b') || {}).textContent || '') : '',
  };
});

/* ── A + B: the camera ─────────────────────────────────────────────────── */
console.log('\nA  a slot tap opens the app camera for this punch-out');
{
  const { ctx, p, opened } = await boot(true);
  ok(opened === 'ok', 'A  Scottie’s punch-out i4 opens', opened);
  let choosers = 0; p.on('filechooser', () => { choosers++; });
  await p.click('#cr-pk [data-slot="0"]', { timeout: 4000 }).catch(e => ok(false, 'A  slot 0 is tappable', String(e).slice(0, 80)));
  for (let k = 0; k < 30; k++) { const st = await p.evaluate(() => window.CardinalMultiCam && window.CardinalMultiCam._state && window.CardinalMultiCam._state()).catch(() => null); if (st && st.live) break; await sleep(150); }
  const st = await p.evaluate(() => {
    const m = document.getElementById('cr-mcam'); const s = window.CardinalMultiCam && window.CardinalMultiCam._state ? window.CardinalMultiCam._state() : null;
    const sec = m && m.querySelector('.mc-sec');
    return { open: !!(m && m.classList.contains('open')), s, secHidden: sec ? sec.hidden : null };
  });
  ok(st.open && st.s && st.s.target === true && String(st.s.pid) === 't:punch:i4', 'A  the app’s own camera opens, aimed at punch-out i4', st.s);
  ok(choosers === 0, 'A  no one-shot file chooser opened', choosers);
  ok(st.secHidden === true, 'A  the album’s Section picker is hidden here', st.secHidden);

  console.log('\nB  three shots, one Upload');
  for (let k = 0; k < 3; k++) { await p.click('#cr-mcam [data-mc="shoot"]', { timeout: 3000 }).catch(() => {}); await sleep(350); }
  const shots = await p.evaluate(() => window.CardinalMultiCam && window.CardinalMultiCam._state ? window.CardinalMultiCam._state().shots : -1);
  ok(shots === 3, 'B  three shots held', shots);
  await p.click('#cr-mcam [data-mc="upload"]', { timeout: 3000 }).catch(e => ok(false, 'B  Upload is tappable', String(e).slice(0, 80)));
  for (let k = 0; k < 40; k++) { const ws = await W(p); if (photoWrites(ws, 'i4').length) break; await sleep(150); }
  await sleep(600);
  let ws = await W(p);
  const up3 = uploads(ws, 'punch/i4/');
  const pw = photoWrites(ws, 'i4');
  ok(up3.length === 3, 'B  three photos uploaded under punch/i4/', up3.map(u => u.path));
  ok(pw.length >= 1 && pw[pw.length - 1].ph.length === 3, 'B  one punch_items write carries all three', pw.map(w => w.ph.length));
  ok(pw.length && pw[pw.length - 1].ph.every(x => x && x.by === 'scottie@cardinalrenovations.net' && /^blob:mock\/punch\/i4\//.test(x.u)), 'B  each is stamped as Scottie and points at its upload', pw.length ? pw[pw.length - 1].ph : null);
  let c = await card(p);
  const camOpen = await p.evaluate(() => { const m = document.getElementById('cr-mcam'); return !!(m && m.classList.contains('open')); });
  ok(c.filled === 3 && c.count === '3', 'B  the card shows three photos', c);
  ok(!camOpen && c.up === 0, 'B  the camera closed and no "Uploading" note is left', { camOpen, up: c.up });

  console.log('\nC  Add photos from phone takes several');
  ok(c.lib === 1, 'C  the card has an Add photos from phone button', c.lib);
  let ch = null;
  if (c.lib) {
    [ch] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.click('#cr-pk #pkSecPh [data-act="phlib"]').catch(() => null)]);
  }
  ok(!!ch, 'C  it opens the phone’s picker', !!ch);
  if (ch) {
    const info = await ch.element().evaluate(e => ({ conn: e.isConnected, cap: e.getAttribute('capture'), multi: e.multiple, acc: e.accept }));
    ok(ch.isMultiple() && info.multi, 'C  the picker takes several at once', info);
    ok(info.conn === true, 'C  its input is IN the page', info.conn);
    ok(info.cap === null, 'C  no capture attribute, so the library is offered', info.cap);
    await ch.setFiles([{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }, { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPG }]);
    for (let k = 0; k < 40; k++) { ws = await W(p); if (uploads(ws, 'punch/i4/').length >= 5) break; await sleep(150); }
    await sleep(800);
  }
  ws = await W(p);
  c = await card(p);
  const last = photoWrites(ws, 'i4').slice(-1)[0];
  ok(uploads(ws, 'punch/i4/').length === 5 && last && last.ph.length === 5, 'C  two more uploaded and saved: five photos', { uploads: uploads(ws, 'punch/i4/').length, saved: last && last.ph.length });
  ok(c.filled === 5 && c.count === '5', 'C  the card shows five, the close rule is met', c);

  console.log('\nD  the gallery');
  await p.click('#cr-pk [data-act="gallery"]', { timeout: 3000 }).catch(() => {});
  await sleep(500);
  const g = await p.evaluate(() => ({ cam: document.querySelectorAll('#cr-pk .pkgal [data-act="galadd"]').length, lib: document.querySelectorAll('#cr-pk .pkgal [data-act="phlib"]').length,
    camT: ((document.querySelector('#cr-pk .pkgal [data-act="galadd"]') || {}).textContent || '').trim() }));
  ok(g.cam === 1 && /Take photos/.test(g.camT) && g.lib === 1, 'D  the gallery offers Take photos and From phone', g);
  await p.click('#cr-pk [data-act="galback"]', { timeout: 3000 }).catch(() => {});
  await sleep(300);

  console.log('\nF  a batch for another punch-out lands on that one');
  const before = await p.evaluate(() => document.querySelectorAll('#cr-pk .pkslot img').length);
  const rf = await p.evaluate(async b64 => {
    if (!window.CardinalPunchCard || !window.CardinalPunchCard._addPhotos) return { missing: true };
    const bin = Uint8Array.from(atob(b64), x => x.charCodeAt(0));
    return window.CardinalPunchCard._addPhotos('i3', [new File([bin], 'x.jpg', { type: 'image/jpeg' })]);
  }, JPG.toString('base64')).catch(e => ({ threw: String(e).slice(0, 120) }));
  await sleep(500);
  ws = await W(p);
  const i3w = photoWrites(ws, 'i3').slice(-1)[0];
  const after = await p.evaluate(() => document.querySelectorAll('#cr-pk .pkslot img').length);
  ok(rf && rf.added === 1 && i3w && i3w.ph.length === 1 && uploads(ws, 'punch/i3/').length === 1, 'F  the photo is uploaded and appended to punch-out i3', { rf, i3: i3w && i3w.ph.length });
  ok(before === after && after === 5, 'F  the card on screen (i4) is untouched', { before, after });

  console.log('\nG  no signal: held on the phone');
  const rg = await p.evaluate(async b64 => {
    if (!window.CardinalPunchCard || !window.CardinalPunchCard._addPhotos) return { missing: true };
    const d = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    try {
      const bin = Uint8Array.from(atob(b64), x => x.charCodeAt(0));
      const r = await window.CardinalPunchCard._addPhotos('i4', [new File([bin], 'y.jpg', { type: 'image/jpeg' })]);
      const pend = await window.CardinalPunchCard._pendingPhotos();
      return Object.assign({ pend }, r);
    } finally { delete navigator.onLine; if (d) {} }
  }, JPG.toString('base64')).catch(e => ({ threw: String(e).slice(0, 120) }));
  ok(rg && rg.held === 1 && rg.pend >= 1, 'G  the photo is held on the phone, not dropped', rg);
  await ctx.close();
}

/* ── E: no camera API ─────────────────────────────────────────────────── */
console.log('\nE  no camera API: the phone camera, through an input in the page');
{
  const { ctx, p, opened } = await boot(false);
  ok(opened === 'ok', 'E  the punch-out opens', opened);
  const [ch] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.click('#cr-pk [data-slot="0"]').catch(() => null)]);
  ok(!!ch, 'E  a slot tap opens the phone camera', !!ch);
  if (ch) {
    const info = await ch.element().evaluate(e => ({ conn: e.isConnected, cap: e.getAttribute('capture'), multi: e.multiple }));
    ok(info.conn === true, 'E  its input is IN the page', info);
    ok(info.cap === 'environment' && info.multi === false, 'E  capture="environment", one photo', info);
    await ch.setFiles([{ name: 'cam.jpg', mimeType: 'image/jpeg', buffer: JPG }]);
    for (let k = 0; k < 40; k++) { const ws = await W(p); if (photoWrites(ws, 'i4').length) break; await sleep(150); }
    await sleep(500);
  }
  const ws = await W(p);
  const c = await card(p);
  ok(uploads(ws, 'punch/i4/').length === 1 && c.filled === 1, 'E  the photo arrives and shows', { uploads: uploads(ws, 'punch/i4/').length, card: c });

  console.log('\nI  the receipt camera on the same card');
  const hasR = await p.evaluate(() => !!document.querySelector('#cr-pk [data-act="rcpt"]'));
  if (hasR) {
    const [rc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.click('#cr-pk [data-act="rcpt"]').catch(() => null)]);
    const ri = rc ? await rc.element().evaluate(e => ({ conn: e.isConnected, cap: e.getAttribute('capture') })) : null;
    ok(!!(ri && ri.conn === true), 'I  Add receipt\u2019s input is IN the page', ri);
    if (rc) { await rc.setFiles([{ name: 'r.jpg', mimeType: 'image/jpeg', buffer: JPG }]); await sleep(400); }
    const left = await p.evaluate(() => document.querySelectorAll('#pkRcptInput').length);
    ok(left === 0, 'I  and it is taken out again once the photo is in', left);
  } else ok(false, 'I  the card has an Add receipt button');
  await ctx.close();
}

/* ── H: source ─────────────────────────────────────────────────────────── */
console.log('\nH  source');
const blk = id => { const i = HTML.indexOf('<script id="' + id + '"'); return i < 0 ? '' : HTML.slice(i, HTML.indexOf('</script>', i)); };
const pk = blk('cr-pk-script'), mc = blk('cr-mcam-script');
ok(pk.length > 0 && !/CardinalSolUpload\.prepare\(/.test(pk), 'H  the scope reader’s prepare() is off the punch path');
ok(/function pkInput\(\)[\s\S]{0,900}document\.body\.appendChild\(inp\)/.test(pk), 'H  the punch photo input is put in the page');
ok(/function mcOpen\(opts\)/.test(mc) && /if\(!window\.currentProject\) return;\n  mcBuild\(\);/.test(mc) && /addGalleryFiles\(files, metas\)/.test(mc), 'H  the album camera keeps its own path (no target → currentProject, addGalleryFiles)');

await browser.close();
const FLOOR = 26;
const total = pass + fail;
if (total < FLOOR) { console.log(`  ✗ FAIL only ${total} checks ran (floor ${FLOOR})`); fail++; }
console.log(`\n${fail ? 'GATE 1445 RED' : 'GATE 1445 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
