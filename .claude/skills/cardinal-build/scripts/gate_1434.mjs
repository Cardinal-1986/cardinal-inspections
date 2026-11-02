#!/usr/bin/env node
/* gate_1434.mjs — build 1434: five of Theo's taste calls (1 Nov 2026), measured in Chromium.
     T2   the phone drawer opens with Daily expanded and every other section folded, every time;
          nothing remembered; the rail's 'cardinal.lnav.sections' untouched; a field account flat
     T5   a signed agreement says so in the editor's notice bar, and never in what is saved,
          shared, emailed or printed; 1078-1079's version keeping unchanged
     T6   Production's board: 0 monospace text pieces, tabular figures on every number, nothing
          clipped or re-wrapped against the reference tree, punch card and day sheet still sans
     T9   + New: one way to start a client ("New lead"), which saves Job cost to checklist.job_cost;
          #projModal still edits; Contact gone for every role
     T10  desktop: only the page title switches portal; phone unchanged; rail counts correct
   Usage: node gate_1434.mjs [index.html] [--ref <reference index.html>]
          default artifact: the repo's index.html; default reference: build 1433's tree
          (git show 7b5003c:index.html, written to the OS temp dir) — T6 compares layout against it.
   Control: node gate_1434.mjs /tmp/b1433.html  -> RED with named failures, no crash.
   Needs NODE_PATH=<scratchpad>/jsd/node_modules:$(npm root -g)                       */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const args = process.argv.slice(2);
const ri = args.indexOf('--ref');
function ref1433() {   /* build 1433 (main at 7b5003c), the tree these five picks changed */
  const out = path.join(os.tmpdir(), 'gate_1434_ref1433.html');
  if (!fs.existsSync(out)) fs.writeFileSync(out, execSync('git show 7b5003c:index.html', { cwd: path.resolve(S, '../../../..'), maxBuffer: 64 << 20 }));
  return out;
}
const REF = path.resolve(ri >= 0 ? args[ri + 1] : ref1433());
const APPF = path.resolve(args.filter((a, i) => a !== '--ref' && (ri < 0 || i !== ri + 1))[0] || path.resolve(S, '../../../../index.html'));
/* ⚠ both libs read APPFILE at IMPORT time — set it first, and import the reference tree under a
   query string so it is a separate module instance with its own APP */
process.env.APPFILE = APPF;
const L3 = await import(S + 'gate_1403_lib.mjs');
const L0 = await import(S + 'gate_1400_lib.mjs');
process.env.APPFILE = REF;
const R0 = await import(S + 'gate_1400_lib.mjs?ref');
process.env.APPFILE = APPF;
console.log('gate_1434 on', path.basename(APPF), '(reference', path.basename(REF) + ')');

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 260) : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 900000); wd.unref();
async function group(name, fn) {
  console.log('\n' + name);
  try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 160)); }
}

const LIGHT = `try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`;
const SAMPLE_DOC = `(function(){ var S = window.__SEED__; if(!S) return;
  var ct = (S.inspection_reports||[]).find(function(r){ return r.id === 'ctR1'; });
  if (ct) ct.html = '<html><head><style>body{font:11pt Georgia,serif;color:#1b1b1b}</style></head><body><h1>Roofing Agreement</h1><h2>Owner</h2><div>Sample Retail One</div><h2>Scope of work</h2><table><tr><td>Tear-off, one layer</td><td>included</td></tr></table><div class="sig">Owner signed</div></body></html>';
})();`;
/* L3.boot runs `seed` as an init script BEFORE the app parses: light mode the real way, no reload */
async function boot3(as, o = {}) {
  const r = await L3.boot(as, { instr: false, desktop: !!o.desktop, seed: SAMPLE_DOC + (o.light ? LIGHT : '') + (o.seed || '') });
  if (o.w) { await r.page.setViewportSize({ width: o.w, height: o.h || 900 }); await sleep(700); }
  const th = await r.page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if ((th === 'rb-light') !== !!o.light) throw new Error('theme mismatch: wanted ' + (o.light ? 'light' : 'dark') + ', got ' + th);
  return r;
}
/* curtis/scottie: gate_1400_lib takes no seed, so the theme is set the way taste/rig.mjs does it —
   localStorage, no service worker, then ONE reload (a registered sw.js would land on sign-in).
   Since 1436 a production or field account with NOTHING stored opens in Sun (T8 C), so dark
   is no longer the default for these two and is stored explicitly ('0'), the same as a
   person who picked Dark in the drawer. */
async function boot0(L, as, o = {}) {
  const r = await L.boot(as, {});
  const { page } = r;
  {
    await page.addInitScript(() => { try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return new Promise(function () {}); }; } catch (e) {} });
    await page.evaluate(async () => { try { for (const g of await navigator.serviceWorker.getRegistrations()) await g.unregister(); } catch (e) {} });
    await page.evaluate(v => { try { localStorage.setItem('cardinal.theme.rb', v); } catch (e) {} }, o.light ? '1' : '0');
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(3200);
  }
  if (o.w) { await page.setViewportSize({ width: o.w, height: o.h || 900 }); await sleep(700); }
  const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if ((th === 'rb-light') !== !!o.light) throw new Error('theme mismatch: wanted ' + (o.light ? 'light' : 'dark') + ', got ' + th);
  return r;
}
const TN = l => (l ? 'light' : 'dark');
/* contrast against the composited ground (translucent layers + every gradient stop, worst wins) */
const INK = `window.__ink = function(el){
  function parse(v){ var m = v && v.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 }; }
  function lin(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
  function lum(c){ return 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b); }
  function over(t, b){ var a = t.a; return { r:t.r*a+b.r*(1-a), g:t.g*a+b.g*(1-a), b:t.b*a+b.b*(1-a), a:1 }; }
  var stack = [], e = el, stops = [];
  while (e && e.nodeType === 1) { var cs = getComputedStyle(e);
    var bi = cs.backgroundImage; if (bi && bi !== 'none') (bi.match(/rgba?\\([^)]+\\)/g) || []).forEach(function(s){ var c = parse(s); if (c && c.a > 0.5) stops.push(c); });
    var c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; }
    if (stops.length) break; e = e.parentElement; }
  var base = { r:255, g:255, b:255, a:1 }; var bb = parse(getComputedStyle(el.ownerDocument.body).backgroundColor); if (bb && bb.a > 0.99) base = bb;
  var solid = stack.length ? stack.reduceRight(function(acc, c){ return over(c, acc); }, base) : base;
  var gs = stops.length ? stops.map(function(s){ return over(s, solid); }) : [solid];
  var fg = parse(getComputedStyle(el).color);
  return Math.min.apply(null, gs.map(function(g){ var f = over(fg, g), x = lum(f), y = lum(g); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }));
};`;

/* ═══════════════════════ T2 — the phone drawer ═══════════════════════ */
const DRAWER = `(() => { const m = document.getElementById('navMenu'); const kids = [...m.children]; const out = []; let cur = null;
  for (const el of kids) {
    if (el.classList.contains('navsec')) { const vis = el.getBoundingClientRect().height > 0; cur = { name: el.textContent.trim(), vis, exp: el.getAttribute('aria-expanded'), count: el.getAttribute('data-crcount'), rows: 0, shown: 0 }; out.push(cur); continue; }
    if (cur && el.classList.contains('navopt') && el.id !== 'signOutBtn' && !el.hasAttribute('data-cr-footer')) { cur.rows++; if (el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none') cur.shown++; }
  }
  return { open: m.style.display === 'block', secs: out.filter(s => s.vis) }; })()`;
async function drawerOpen(page) { await page.evaluate(() => { if (document.getElementById('navMenu').style.display !== 'block') document.getElementById('navBtn').click(); }); await sleep(900); return page.evaluate(DRAWER); }
async function drawerClose(page) { await page.evaluate(() => { const b = document.getElementById('navBackdrop'); if (b && b.classList.contains('on')) b.click(); else document.getElementById('navMenu').style.display = 'none'; }); await sleep(700); }
async function tapSec(page, re) { return page.evaluate(src => { const rx = new RegExp(src, 'i'); const s = [...document.querySelectorAll('#navMenu .navsec')].find(x => rx.test(x.textContent.trim()) && x.getBoundingClientRect().height > 0); if (!s) return false; s.click(); return true; }, re); }

for (const [as, light] of [['theo', false], ['theo', true], ['rep', false]]) {
  await group(`T2  drawer (${as}, 390, ${TN(light)})`, async () => {
    const RAIL = JSON.stringify({ office: 1, sell: 0, daily: 0 });
    const { browser, page } = await boot3(as, { light, seed: `try{ localStorage.setItem('cardinal.lnav.sections', ${JSON.stringify(RAIL)}); }catch(e){}` });
    try {
      const d1 = await drawerOpen(page);
      const daily = d1.secs.find(s => /^daily$/i.test(s.name));
      const others = d1.secs.filter(s => s !== daily);
      ok(d1.open && !!daily && daily.exp === 'true', `T2 ${as} ${TN(light)}: the drawer opens with Daily expanded`, daily);
      ok(!!daily && daily.shown > 0 && String(daily.shown) === daily.count, `T2 ${as} ${TN(light)}: Daily's rows show, and its count is what you can see (1430)`, daily && { shown: daily.shown, count: daily.count });
      ok(others.length >= 3 && others.every(s => s.exp === 'false' && s.shown === 0), `T2 ${as} ${TN(light)}: every other section is folded (${others.length} sections, 0 rows showing)`, others.map(s => s.name + ':' + s.exp + ':' + s.shown).join(' '));
      ok(!!(others.find(s => /^office$/i.test(s.name)) || { exp: 'false' }).exp && (others.find(s => /^office$/i.test(s.name)) || { exp: 'false' }).exp === 'false', `T2 ${as} ${TN(light)}: a section the RAIL stored as open stays folded in the drawer (1115)`);
      /* expand Sell, fold Daily, close, reopen: nothing is remembered */
      await tapSec(page, '^sell$'); await sleep(250); await tapSec(page, '^daily$'); await sleep(250);
      const mid = await page.evaluate(DRAWER);
      ok(mid.secs.find(s => /^sell$/i.test(s.name)).exp === 'true' && mid.secs.find(s => /^daily$/i.test(s.name)).exp === 'false', `T2 ${as} ${TN(light)}: tapping still expands and folds while the drawer is open`);
      await drawerClose(page);
      const d2 = await drawerOpen(page);
      ok(d2.secs.find(s => /^daily$/i.test(s.name)).exp === 'true' && d2.secs.filter(s => !/^daily$/i.test(s.name)).every(s => s.exp === 'false'), `T2 ${as} ${TN(light)}: reopened, it is Daily-open again — Sell folded, nothing remembered`, d2.secs.map(s => s.name + ':' + s.exp).join(' '));
      const st = await page.evaluate(() => localStorage.getItem('cardinal.lnav.sections'));
      ok(st === RAIL, `T2 ${as} ${TN(light)}: the rail's 'cardinal.lnav.sections' is byte-identical after the session`, st);
    } finally { await browser.close(); }
  });
}
await group('T2  a field account keeps its flat list (scottie, 390)', async () => {
  const VIS = () => [...document.getElementById('navMenu').children].filter(e => e.getBoundingClientRect().height > 0).map(e => (e.classList.contains('navsec') ? 'SEC ' : '') + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30));
  const seen = {};
  for (const [nm, L] of [['ref', R0], ['art', L0]]) {
    const { browser, page } = await boot0(L, 'scottie');
    try {
      await drawerOpen(page);
      seen[nm] = { vis: await page.evaluate(VIS), ctl: await page.evaluate(() => document.querySelectorAll('#navMenu .navsec[aria-expanded], #navMenu [data-crhide]').length) };
    } finally { await browser.close(); }
  }
  ok(seen.art.ctl === 0 && seen.art.vis.filter(t => !/^SEC /.test(t)).length >= 5, 'T2 scottie: no section is a fold control and no row is folded away (1317 flat list)', seen.art);
  /* the version line differs by construction (the reference is 1433): compare everything else */
  /* version line aside, and since 1436 the Appearance row's third button (Sun, T8 C):
     only an exact "AppearanceDarkLightSun" folds back, so any other drift still fails */
  const unstamp = v => v.map(t => t.replace(/v\d{4}-\d\d-\d\d build \d+/, 'vSTAMP').replace(/^AppearanceDarkLightSun$/, 'AppearanceDarkLight'));
  ok(JSON.stringify(unstamp(seen.art.vis)) === JSON.stringify(unstamp(seen.ref.vis)), 'T2 scottie: the drawer shows exactly what it showed on the reference tree (version line and Sun button aside)', seen.art.vis.join(' | '));
});
await group('T2  the desktop rail keeps its own folds (theo, 1440)', async () => {
  const { browser, page } = await boot3('theo', { desktop: true, w: 1440 });
  try {
    const r = await page.evaluate(() => [...document.querySelectorAll('#cr-lnav .lnav-sec')].map(b => b.textContent.replace(/\d+$/, '').replace('▼', '').trim() + ':' + b.getAttribute('aria-expanded')));
    ok(r.length >= 4 && /Daily:true/.test(r.join(' ')) && /Sell:true/.test(r.join(' ')), 'T2 the rail still opens Daily and Sell by default (its own store, untouched)', r.join(' '));
  } finally { await browser.close(); }
});

/* ═══════════════════════ T5 — the signed-agreement line ═══════════════════════ */
const TXT5 = 'You’re editing a signed agreement. Saving keeps the signed one on file as a version.';
const ED = `(() => { const f = document.getElementById('reportFrame'); const d = f && f.contentDocument; if (!d || !d.body) return null;
  const s = d.querySelector('[data-cardinal-hint="signed"]'); const b = d.querySelector('[data-cardinal-hint="1"]');
  const all = [...d.querySelectorAll('[data-cardinal-hint]')];
  const any = all.find(e => /signed agreement/.test(e.textContent)) || s;
  const cs = any ? getComputedStyle(any) : null, bs = b ? getComputedStyle(b) : null;
  const q = any ? any.getBoundingClientRect() : null, bq = b ? b.getBoundingClientRect() : null;
  return { chip: (document.getElementById('editorStatusChip') || {}).textContent, hints: all.length,
    text: any ? any.textContent : null, attr: any ? any.getAttribute('data-cardinal-hint') : null,
    before: !!(any && b && any.nextElementSibling === b), above: !!(q && bq && q.bottom <= bq.top + 0.5),
    pos: cs && cs.position, bg: cs && cs.backgroundColor, color: cs && cs.color, fs: cs && cs.fontSize, ff: cs && cs.fontFamily, fw: cs && cs.fontWeight,
    barBg: bs && bs.backgroundColor, barColor: bs && bs.color, barFs: bs && bs.fontSize, barFf: bs && bs.fontFamily, barFw: bs && bs.fontWeight,
    h: q ? Math.round(q.height) : 0, ink: any ? +window.top.__ink(any).toFixed(2) : 0 }; })()`;
for (const [dev, light] of [['desk', false], ['desk', true], ['phone', false], ['phone', true]]) {
  await group(`T5  signed agreement in the editor (theo, ${dev}, ${TN(light)})`, async () => {
    const { browser, page } = await boot3('theo', dev === 'desk' ? { desktop: true, w: 1440, light } : { light });
    let sent = null;
    await page.route('**/api/senddoc', async route => { try { sent = JSON.parse(route.request().postData() || '{}'); } catch (e) { sent = {}; } return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    try {
      await page.evaluate(INK);
      await page.evaluate(() => window.openEditor('ctR1')); await sleep(2600);
      const e = await page.evaluate(ED);
      ok(!!e && e.chip === 'SIGNED' && e.text === TXT5, `T5 ${dev} ${TN(light)}: a signed agreement reads "${TXT5.slice(0, 40)}…"`, e && { chip: e.chip, text: e.text });
      ok(!!e && e.attr === 'signed' && e.before && e.above && e.pos === 'static', `T5 ${dev} ${TN(light)}: it is a data-cardinal-hint line directly above the editing bar, and scrolls with the page`, e && { attr: e.attr, before: e.before, above: e.above, pos: e.pos });
      ok(!!e && e.bg === e.barBg && e.color === e.barColor && e.fs === e.barFs && e.ff === e.barFf && e.fw === e.barFw, `T5 ${dev} ${TN(light)}: in the editor's own notice style (ground, ink, size, face, weight)`, e && [e.bg, e.color, e.fs, e.fw]);
      ok(!!e && e.ink >= 4.5 && (dev === 'desk' ? e.h <= 40 : e.h <= 60), `T5 ${dev} ${TN(light)}: ${e && e.ink}:1 on its ground, ${e && e.h}px tall`);
      /* the saved copy */
      const ser = await page.evaluate(() => { try { const h = serializeFrame(); return { line: /signed agreement/.test(h), hints: (h.match(/data-cardinal-hint/g) || []).length }; } catch (x) { return { err: x.message }; } });
      ok(!ser.err && !ser.line && ser.hints === 0, `T5 ${dev} ${TN(light)}: serializeFrame() carries neither the line nor any notice bar`, ser);
      /* Save: the written html, and 1079's version is still asked for */
      const w0 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await page.evaluate(() => document.getElementById('saveBtn').click()); await sleep(1500);
      const sv = await page.evaluate(n => { const w = (window.__WRITES__ || []).slice(n); const up = w.filter(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && typeof x.payload.html === 'string');
        return { n: up.length, line: up.some(x => /signed agreement/.test(x.payload.html)), hints: up.some(x => /data-cardinal-hint/.test(x.payload.html)), snap: w.filter(x => x.table === 'rpc:snapshot_document').map(x => x.payload && x.payload.p_doc) }; }, w0);
      ok(sv.n >= 1 && !sv.line && !sv.hints, `T5 ${dev} ${TN(light)}: Save writes the document without the line`, sv);
      ok(sv.snap.indexOf('ctR1') !== -1, `T5 ${dev} ${TN(light)}: and still asks the server to keep the signed copy (1079's snapshot_document)`, sv.snap);
      const e2 = await page.evaluate(ED);
      ok(!!e2 && e2.text === TXT5, `T5 ${dev} ${TN(light)}: the line is still on screen after saving`);
      if (dev === 'desk' && !light) {
        /* Share link: it saves first, then hands out the stored copy */
        const w1 = await page.evaluate(() => (window.__WRITES__ || []).length);
        await page.evaluate(() => document.getElementById('shareBtn').click()); await sleep(1800);
        await page.evaluate(() => { const g = document.querySelector('#crAsk.open .askgo'); if (g) g.click(); }); await sleep(1200);
        const sh = await page.evaluate(n => { const up = (window.__WRITES__ || []).slice(n).filter(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && typeof x.payload.html === 'string'); return { n: up.length, line: up.some(x => /signed agreement|data-cardinal-hint/.test(x.payload.html)) }; }, w1);
        ok(sh.n >= 1 && !sh.line, 'T5 Share link: the copy it saves and shares has no line', sh);
        /* Email to client: the attached file */
        await page.evaluate(() => document.getElementById('emailDocBtn').click());
        for (let i = 0; i < 30 && !sent; i++) { await sleep(500);
          await page.evaluate(() => { const g = document.querySelector('#crAsk.open .askgo'); if (g) g.click(); const s = document.querySelector('#crEmailSheet.open'); if (s) { const a = document.getElementById('emShAddr'); if (a && !a.value) a.value = 'client@example.com'; const b = document.getElementById('emShGo'); if (b) b.click(); } }); }
        const html = String((sent && sent.html) || '');
        ok(!!sent && html.length > 50 && !/signed agreement/.test(html) && !/data-cardinal-hint/.test(html), 'T5 Email to client: the attached file has no line and no notice bar', { sent: !!sent, len: html.length });
        /* Print / PDF: the print rule hides it */
        const pr = await page.evaluate(() => { try { ensurePrintFix(document.getElementById('reportFrame').contentDocument); return true; } catch (x) { return x.message; } });
        await page.emulateMedia({ media: 'print' });
        const pd = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const s = [...d.querySelectorAll('[data-cardinal-hint]')].find(e => /signed agreement/.test(e.textContent)); return s ? getComputedStyle(s).display : 'absent'; });
        await page.emulateMedia({ media: 'screen' });
        ok(pr === true && pd === 'none', 'T5 Print / PDF: the line is display:none on paper', { pr, pd });
      }
      if (dev === 'phone' && !light) {
        /* an unsigned document has no line; signing it while open adds it, through setEditorStatus */
        await page.evaluate(async () => { try { await closeEditor(); } catch (x) {} }); await sleep(600);
        await page.evaluate(() => window.openEditor('invR1')); await sleep(2600);
        const u = await page.evaluate(ED);
        ok(!!u && u.chip !== 'SIGNED' && !u.text && u.hints === 1, 'T5 an unsigned document shows only the editing bar', u && { chip: u.chip, hints: u.hints, text: u.text });
        await page.evaluate(() => setEditorStatus(current.status, current.sent_at, new Date().toISOString())); await sleep(200);
        const u2 = await page.evaluate(ED);
        await page.evaluate(() => setEditorStatus(current.status, current.sent_at, null)); await sleep(200);
        const u3 = await page.evaluate(ED);
        ok(!!u2 && u2.text === TXT5 && !!u3 && !u3.text, 'T5 signing while it is open adds the line; un-signing takes it away (setEditorStatus)', { on: u2 && u2.text && u2.text.slice(0, 20), off: u3 && u3.text });
      }
    } finally { await browser.close(); }
  });
}

/* ═══════════════════════ T6 — Production's board ═══════════════════════ */
const MONO_RX = 'mono|Menlo|Consolas|Courier';
const CENSUS = `(sel) => { const rx = new RegExp('${MONO_RX}', 'i'); let mono = 0, all = 0, num = 0, numTab = 0; const bad = [], badN = [];
  const isNum = t => /^[\\d\\s$,.:%\\/#+\\-\\u2013\\u00b7]*\\d[\\d\\s$,.:%\\/#+\\-\\u2013\\u00b7]*(am|pm|d|h|m)?$/i.test(t);
  document.querySelectorAll(sel + ' *').forEach(e => { const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (!own) return;
    const q = e.getBoundingClientRect(); if (q.width < 1 || q.height < 1 || q.bottom < 0 || q.top > innerHeight) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    all++; if (rx.test(cs.fontFamily)) { mono++; if (bad.length < 4) bad.push(own.slice(0, 16)); }
    if (isNum(own)) { num++; if (/tabular-nums/.test(cs.fontVariantNumeric)) numTab++; else if (badN.length < 4) badN.push(own); } });
  return { mono, all, num, numTab, bad, badN }; }`;
const FIRST_FAMILY = `(sel) => { const fams = {}; document.querySelectorAll(sel + ' *').forEach(e => { const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) return; const q = e.getBoundingClientRect(); if (q.width < 1 || q.bottom < 0 || q.top > innerHeight) return; const cs = getComputedStyle(e); if (cs.display === 'none') return; const f = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); fams[f] = (fams[f] || 0) + 1; }); return fams; }`;
const LAYOUT = `(() => { const out = {}; const all = [...document.querySelectorAll('#cr-pb *')];
  all.forEach(e => { const q = e.getBoundingClientRect(); if (q.width < 1 || q.height < 1) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    let p = e, key = ''; while (p && p.id !== 'cr-pb') { const par = p.parentElement; key = p.tagName + '.' + String(p.className && p.className.baseVal !== undefined ? p.className.baseVal : p.className || '').split(' ')[0] + ':' + [...par.children].indexOf(p) + '>' + key; p = par; }
    let lines = 0; const tn = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (tn.length) { const tops = new Set(); tn.forEach(n => { const r = document.createRange(); r.selectNodeContents(n); [...r.getClientRects()].forEach(c => { if (c.width > 0) tops.add(Math.round(c.top)); }); }); lines = tops.size; }
    /* any box whose content runs past it (gate_1416 D's rule): text that spills OR is cut */
    const clip = e.clientWidth > 0 && (e.scrollWidth > e.clientWidth + 1 || (cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1));
    out[key] = { x: Math.round(q.left), w: Math.round(q.width), h: Math.round(q.height), lines, clip, cls: String(e.className && e.className.baseVal !== undefined ? '' : e.className || '') }; });
  const pb = document.getElementById('cr-pb'); return { els: out, hscroll: pb.scrollWidth > pb.clientWidth + 1, H: Math.round(pb.scrollHeight) }; })()`;
/* one boot per tree, every width in turn (the board re-lays itself on resize) */
const WIDTHS = [390, 1100, 1194, 1366, 1440, 1920];
/* 1438 changed the tile grid on purpose (four across only where the labels fit; 2-up below
   1366 at Normal). This group measures 1434's FONT change, so both trees are pinned to the
   reference's grid — 2-up on a phone, 4-up from 1100 — and the tiles are judged by gate_1438. */
const PIN_1433_TILES = `(() => { const s = document.createElement('style'); s.id = 'gate1434-pin-tiles';
  s.textContent = '@media (min-width:1100px){#cr-pb .pbtiles{grid-template-columns:repeat(4,minmax(0,1fr)) !important}}';
  document.head.appendChild(s); })()`;
async function prodLayouts(L) {
  const { browser, page } = await boot0(L, 'curtis');
  const out = {};
  try {
    await page.evaluate(PIN_1433_TILES);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w > 900 ? 900 : 844 }); await sleep(700);
      await page.evaluate(() => { if (!document.querySelector('#cr-pb.open')) window.CardinalProduction.open(); }); await sleep(1200);
      out[w] = await page.evaluate(LAYOUT);
    }
  } finally { await browser.close(); }
  return out;
}
for (const light of [false, true]) {
  await group(`T6  Production board type (curtis, 390, ${TN(light)})`, async () => {
    const { browser, page } = await boot0(L0, 'curtis', { light });
    try {
      await page.evaluate(() => window.CardinalProduction.open()); await sleep(1700);
      const c = await page.evaluate(`(${CENSUS})('#cr-pb')`);
      ok(c.all >= 60 && c.mono === 0, `T6 ${TN(light)}: ${c.mono} of ${c.all} visible board text pieces are monospace (want 0)`, c.bad.join(' | ') || 'none');
      ok(c.num >= 20 && c.numTab === c.num, `T6 ${TN(light)}: ${c.numTab} of ${c.num} number pieces keep fixed-width digits (tabular-nums)`, c.badN.join(' | ') || 'all tabular');
      const fam = await page.evaluate(`(${FIRST_FAMILY})('#cr-pb')`);
      const segoe = fam['Segoe UI'] || 0;
      ok(segoe >= 60 && !Object.keys(fam).some(f => new RegExp(MONO_RX, 'i').test(f)), `T6 ${TN(light)}: the former monospace pieces run the 1415 stack (Segoe UI first): ${segoe}`, fam);
      /* the day sheet and the punch card were already sans — measured, not touched */
      await page.locator('#cr-pb').getByText('punch-outs', { exact: false }).first().click({ timeout: 5000 }); await sleep(1300);
      const day = await page.evaluate(`(${CENSUS})('#cr-pb-modal')`);
      ok(day.all >= 5 && day.mono === 0, `T6 ${TN(light)}: the day sheet is still 0 monospace (${day.all} pieces)`, day.bad.join(' | ') || 'none');
      await page.keyboard.press('Escape'); await sleep(500);
      await page.evaluate(() => window.openPunchView()); await sleep(1500);
      await page.locator('#punchView').getByText('Tarp over rear slope').first().click({ timeout: 5000 }); await sleep(1500);
      const pk = await page.evaluate(`(${CENSUS})('#cr-pk')`);
      ok(pk.all >= 10 && pk.mono === 0, `T6 ${TN(light)}: the punch card is still 0 monospace (${pk.all} pieces)`, pk.bad.join(' | ') || 'none');
    } finally { await browser.close(); }
  });
}
await group('T6  nothing clips or re-wraps against the reference (curtis, dark, ' + WIDTHS.join('/') + ')', async () => {
  const A = await prodLayouts(R0), B = await prodLayouts(L0);
  for (const w of WIDTHS) {
    const a = A[w], b = B[w];
      /* two boots of one tree can differ by a late chip row (.pbrule), so compare what both drew */
      const keys = Object.keys(a.els).filter(k => b.els[k]);
      const only = Object.keys(a.els).length + Object.keys(b.els).length - 2 * keys.length;
      ok(keys.length >= 150 && only <= 6, `T6 ${w}: ${keys.length} boxes drawn on both trees (${only} on one only)`);
      const clipA = keys.filter(k => a.els[k].clip).length, clipB = keys.filter(k => b.els[k].clip).length;
      ok(clipB <= clipA, `T6 ${w}: no new clipped text (${clipB} vs ${clipA} on the reference)`);
      const wrap = keys.filter(k => b.els[k] && b.els[k].lines > a.els[k].lines).map(k => k.split('>').slice(-2).join('>') + ' ' + a.els[k].lines + '→' + b.els[k].lines);
      ok(wrap.length === 0, `T6 ${w}: no text wraps onto an extra line`, wrap.slice(0, 4).join(' | ') || 'none');
      ok(!b.hscroll, `T6 ${w}: the board does not scroll sideways`);
      const GRID = /^(pbday|pbtile|pbnavbtn|pbwd|pbtiles|pbgrid|pbmonth|pbtoday|pbclosed|pbhubs|pbback|pbact)$/;
      const shifted = keys.filter(k => b.els[k] && GRID.test(a.els[k].cls.split(' ')[0]) && (Math.abs(a.els[k].x - b.els[k].x) > 1 || Math.abs(a.els[k].w - b.els[k].w) > 1));
      ok(shifted.length === 0, `T6 ${w}: the grid's columns are unchanged (day cells, tiles, cards: x and width within 1px)`, shifted.slice(0, 3).map(k => k.split('>').slice(-2).join('>')).join(' | ') || 'none');
      const dh = b.H - a.H;
      ok(Math.abs(dh) <= Math.max(16, a.H * 0.015), `T6 ${w}: board height ${a.H} → ${b.H}px (${dh >= 0 ? '+' : ''}${dh}; line-box metrics of the stand-in fonts)`);
  }
});

/* ═══════════════════════ T9 — + New: one way to start a client ═══════════════════════ */
const NEWMENU = `(() => { const m = document.getElementById('newMenu'); if (!m || getComputedStyle(m).display === 'none') return null;
  return [...m.querySelectorAll('.navopt')].filter(b => b.getBoundingClientRect().height > 0 && getComputedStyle(b).display !== 'none').map(b => ({ k: b.getAttribute('data-new'), t: b.textContent.trim() })); })()`;
async function openNew(page) { await page.evaluate(() => { document.getElementById('newMenu').style.display = 'none'; document.getElementById('addProjectBtn').click(); }); await sleep(500); return page.evaluate(NEWMENU); }
const shownId = (page, id) => page.evaluate(id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, id);
for (const light of [false, true]) {
  await group(`T9  + New and the Lead form (theo, 390, ${TN(light)})`, async () => {
    const { browser, page } = await boot3('theo', { light });
    try {
      await page.evaluate(INK);
      const menu = await openNew(page);
      const ks = (menu || []).map(x => x.k);
      ok(!!menu && ks.indexOf('contact') === -1 && !(menu || []).some(x => /^contact$/i.test(x.t)), `T9 ${TN(light)}: + New has no separate "Contact" entry`, menu);
      ok(!!menu && (menu || []).filter(x => x.k === 'lead').length === 1 && (menu.find(x => x.k === 'lead') || {}).t === 'New lead', `T9 ${TN(light)}: one client entry, labelled "New lead"`, menu && menu.map(x => x.t).join(', '));
      await page.evaluate(() => document.querySelector('#newMenu [data-new="lead"]').click()); await sleep(900);
      ok(await shownId(page, 'leadFormModal') && !(await shownId(page, 'projModal')), `T9 ${TN(light)}: New lead opens the Lead form (#leadFormModal), not #projModal`);
      const jc0 = await page.evaluate(() => { const w = document.getElementById('ldJobCostWrap'); return w ? (w.getBoundingClientRect().height > 0) : 'absent'; });
      await page.evaluate(() => document.getElementById('ldMoreBtn').click()); await sleep(400);
      const jc = await page.evaluate(() => { const w = document.getElementById('ldJobCostWrap'); const i = document.getElementById('ldJobCost'); if (!w || !i) return null; const t = [...w.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        return { shown: w.getBoundingClientRect().height > 0, label: t, type: i.type, min: i.min, step: i.step, h: Math.round(i.getBoundingClientRect().height), ink: +window.__ink(w).toFixed(2), fs: parseFloat(getComputedStyle(w).fontSize) }; });
      ok(jc0 === false && !!jc && jc.shown && jc.label === 'Job cost (materials + labor, $)' && jc.type === 'number' && jc.min === '0' && jc.step === '0.01', `T9 ${TN(light)}: an admin finds "Job cost (materials + labor, $)" under More detail, the Add-project form's own field`, { before: jc0, jc });
      ok(!!jc && jc.ink >= 4.5 && jc.fs >= 11 && jc.h >= 36, `T9 ${TN(light)}: the label reads ${jc && jc.ink}:1 at ${jc && jc.fs}px; the box is ${jc && jc.h}px tall`);
      /* the Lead form still refuses without a lead source, then saves Job cost to the key Reports reads */
      await page.evaluate(() => { const v = (id, x) => { const e = document.getElementById(id); if (!e) return; e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
        v('ldFirst', 'Sample'); v('ldLast', 'Lead K'); const ph = document.querySelector('#ldPhones .ldrow input'); if (ph) ph.value = '9375550111';
        const r = document.querySelector('input[name="ldClaimType"][value="retail"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
        v('ldJobCost', '12345.67'); document.getElementById('ldSource').value = ''; });
      const w0 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await page.evaluate(() => document.getElementById('ldSave').click()); await sleep(900);
      const refused = await page.evaluate(n => ({ err: document.getElementById('ldError').textContent, ins: (window.__WRITES__ || []).slice(n).filter(x => x.table === 'projects' && x.op === 'insert').length }), w0);
      ok(refused.ins === 0 && /came from/.test(refused.err), `T9 ${TN(light)}: Lead Source is still required`, refused.err.slice(0, 60));
      await page.evaluate(() => { const s = document.getElementById('ldSource'); s.value = [...s.options].map(o => o.value).filter(Boolean)[0]; });
      await page.evaluate(() => document.getElementById('ldSave').click()); await sleep(2200);
      const saved = await page.evaluate(n => { const ins = (window.__WRITES__ || []).slice(n).filter(x => x.table === 'projects' && x.op === 'insert').map(x => x.payload);
        const p = ins[0]; if (!p) return null; let ck = {}; try { ck = JSON.parse(p.checklist); } catch (e) {}
        const pr = (typeof cacheProjects !== 'undefined' ? cacheProjects : []).find(x => x.name === 'Sample Lead K');
        let rj = null; try { rj = pr && typeof rptCk === 'function' ? rptCk(pr).job_cost : 'no reader'; } catch (e) { rj = 'err ' + e.message; }
        return { n: ins.length, name: p.name, stage: p.stage, job_cost: ck.job_cost, src: ck.lead_source, ct: ck.lead && ck.lead.claim_type, rpt: rj }; }, w0);
      ok(!!saved && saved.n === 1 && saved.name === 'Sample Lead K' && saved.stage === 'Lead' && saved.job_cost === 12345.67 && !!saved.src && saved.ct === 'retail', `T9 ${TN(light)}: Create Lead writes checklist.job_cost = 12345.67 beside the source and claim type`, saved);
      ok(!!saved && saved.rpt === 12345.67, `T9 ${TN(light)}: and the Reports reader (rptCk) sees it`, saved && saved.rpt);
      /* #projModal still EDITS a client */
      await page.evaluate(() => { try { document.getElementById('leadFormModal').style.display = 'none'; } catch (e) {} window.openProject('R1'); }); await sleep(1500);
      await page.evaluate(() => window.openProjModal(window.currentProject)); await sleep(600);
      const ed = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('projModal')).display !== 'none', title: document.getElementById('projModalTitle').textContent, name: document.getElementById('pfName').value }));
      const w1 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await page.evaluate(() => document.getElementById('pfSave').click()); await sleep(1500);
      const ew = await page.evaluate(n => { const w = (window.__WRITES__ || []).slice(n).filter(x => x.table === 'projects'); return { upd: w.filter(x => x.op === 'update').length, ins: w.filter(x => x.op === 'insert').length }; }, w1);
      ok(ed.shown && ed.title === 'Edit client info' && ed.name === 'Sample Retail One' && ew.upd >= 1 && ew.ins === 0, `T9 ${TN(light)}: #projModal still edits an existing client (Edit client info → update, no insert)`, { ed, ew });
      /* 1372's "New job for" — an existing client's next job — still uses #projModal */
      await page.evaluate(() => { document.getElementById('projModal').style.display = 'none'; window.pfNewJobFor(window.currentProject); }); await sleep(500);
      const nj = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('projModal')).display !== 'none', title: document.getElementById('projModalTitle').textContent }));
      ok(nj.shown && /^New job for /.test(nj.title), `T9 ${TN(light)}: "New job for" an existing client still opens its prefilled form (left alone)`, nj);
    } finally { await browser.close(); }
  });
}
await group('T9  a rep sees New lead but no Job cost (rep, 390, dark)', async () => {
  const { browser, page } = await boot3('rep', {});
  try {
    const menu = await openNew(page);
    ok(!!menu && (menu || []).map(x => x.k).indexOf('contact') === -1 && (menu || []).some(x => x.k === 'lead' && x.t === 'New lead'), 'T9 rep: + New offers New lead and no Contact', menu && menu.map(x => x.t).join(', '));
    await page.evaluate(() => document.querySelector('#newMenu [data-new="lead"]').click()); await sleep(900);
    await page.evaluate(() => document.getElementById('ldMoreBtn').click()); await sleep(400);
    const jc = await page.evaluate(() => { const w = document.getElementById('ldJobCostWrap'); return w ? { present: true, shown: w.getBoundingClientRect().height > 0 } : { present: false }; });
    ok(jc.present && !jc.shown, 'T9 rep: Job cost is an admin field (1203), hidden for a rep even with More detail open', jc);
  } finally { await browser.close(); }
});
await group('T9  production (curtis, 390, installed)', async () => {
  const { browser, page } = await boot0(L0, 'curtis');
  try {
    await page.evaluate(() => document.body.classList.add('standalone')); await sleep(300);
    await page.tap('#pwaNew', { timeout: 3000 }).catch(() => page.evaluate(() => document.getElementById('addProjectBtn').click())); await sleep(600);
    const menu = await page.evaluate(NEWMENU);
    ok(!!menu && menu.map(x => x.k).join(',') === 'task,reminder,punch', 'T9 curtis: + New is Task, Reminder, Punch-out — no Contact, and New lead stays sales/admin', menu && menu.map(x => x.t).join(', '));
  } finally { await browser.close(); }
});

/* ═══════════════════════ T10 — one portal switcher on the desktop ═══════════════════════ */
const SWITCHERS = `(() => { const vis = e => !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const bt = document.getElementById('brandTitle'); const h1 = bt && bt.querySelector('h1');
  const secs = [...document.querySelectorAll('#cr-lnav .lnav-sec')].map(b => { const body = document.getElementById(b.getAttribute('aria-controls')); const items = body ? body.querySelectorAll('.lnav-item').length : -1; const cnt = b.querySelector('.cnt'); return { name: b.textContent.replace(/\\d+$/, '').replace('▼', '').trim(), cnt: cnt ? +cnt.textContent : -1, items }; });
  return { rail: !!document.getElementById('cr-lnav'), pills: vis(document.querySelector('#crBanner .cbcrm')) || vis(document.getElementById('cbCrm')), pillsInDom: !!document.querySelector('#crBanner .cbcrm, #cbCrm'),
    seg: vis(document.querySelector('#cr-lnav .lnav-crm')), segInDom: !!document.querySelector('#cr-lnav .lnav-crm, #cr-lnav [data-crm]'),
    railSwitch: [...document.querySelectorAll('#cr-lnav .lnav-item')].filter(b => /switch portal/i.test(b.textContent) || b.getAttribute('data-k') === 'switchportal').length,
    title: vis(bt) ? bt.textContent.trim() : null, caret: h1 ? getComputedStyle(h1, '::after').content : null, secs }; })()`;
for (const light of [false, true]) {
  await group(`T10 desktop portal switchers (theo, 1440, ${TN(light)})`, async () => {
    const { browser, page } = await boot3('theo', { desktop: true, w: 1440, light });
    try {
      const s = await page.evaluate(SWITCHERS);
      ok(s.rail && !!s.title && /Retail/.test(s.title) && /▾/.test(s.caret || ''), `T10 ${TN(light)}: the page title "Retail ▾" stays`, { title: s.title, caret: s.caret });
      ok(!s.pills && !s.pillsInDom, `T10 ${TN(light)}: the top-bar pill strip is gone`, { shown: s.pills, inDom: s.pillsInDom });
      ok(!s.seg && !s.segInDom, `T10 ${TN(light)}: the rail's Retail | Insurance | Community segment is gone`, { shown: s.seg, inDom: s.segInDom });
      ok(s.railSwitch === 0, `T10 ${TN(light)}: the rail's Daily section has no "Switch portal" row`, s.railSwitch);
      const bad = s.secs.filter(x => x.cnt !== x.items);
      ok(s.secs.length >= 4 && bad.length === 0, `T10 ${TN(light)}: every rail section's count is its row count (${s.secs.map(x => x.name + ' ' + x.cnt).join(', ')})`, bad);
      /* the one that stays still works: title → Front Door → Cardinal Truth */
      await page.click('#brandTitle'); await sleep(900);
      const fd = await page.evaluate(() => { const v = document.querySelector('#cr-fd .fd-sheet'); return !!v && v.getBoundingClientRect().height > 0; });
      await page.evaluate(() => { const b = document.querySelector('#cr-fd [data-fd="insurance"]'); if (b) b.click(); }); await sleep(1500);
      const crm = await page.evaluate(() => ({ crm: document.body.dataset.crm, head: document.body.dataset.crmHead, rail: (document.getElementById('cr-lnav') || { style: { getPropertyValue: () => '' } }).style.getPropertyValue('--lnav-crmc') }));
      ok(fd && crm.crm === 'insurance', `T10 ${TN(light)}: the title opens the Front Door and it switches portal (body is Insurance)`, { fd, crm });
      ok(crm.rail === '#c8202e', `T10 ${TN(light)}: the rail still takes the portal's colour`, crm.rail);
    } finally { await browser.close(); }
  });
}
await group('T10 the in-between width (theo, 1024, dark): no rail, no pills, the title', async () => {
  const { browser, page } = await boot3('theo', { desktop: true, w: 1024 });
  try {
    const s = await page.evaluate(SWITCHERS);
    ok(!s.rail && !s.pills && !!s.title, 'T10 1024: the title is the switcher; the pill strip that showed above 900px is gone', { rail: s.rail, pills: s.pills, title: s.title });
  } finally { await browser.close(); }
});
for (const light of [false, true]) {
  await group(`T10 the phone is unchanged (theo, 390, ${TN(light)})`, async () => {
    const { browser, page } = await boot3('theo', { light });
    try {
      const s = await page.evaluate(SWITCHERS);
      ok(!s.rail && !s.pills && !!s.title && /Retail/.test(s.title), `T10 phone ${TN(light)}: the title is there, no pills (hidden under 900px before too), no rail`, { title: s.title, pills: s.pills });
      await drawerOpen(page);
      await page.evaluate(() => { const d = [...document.querySelectorAll('#navMenu .navsec')].find(x => /^daily$/i.test(x.textContent.trim())); if (d && d.getAttribute('aria-expanded') !== 'true') d.click(); }); await sleep(300);
      const row = await page.evaluate(() => { const r = document.querySelector('#navMenu .navopt[data-nav="landing"]'); const d = [...document.querySelectorAll('#navMenu .navsec')].find(x => /^daily$/i.test(x.textContent.trim()));
        const shown = [...document.querySelectorAll('#navMenu .navopt')].filter(e => e.getBoundingClientRect().height > 0); let n = 0, on = false; for (const el of document.getElementById('navMenu').children) { if (el.classList.contains('navsec')) on = (el === d); else if (on && shown.includes(el)) n++; }
        return { text: r && r.textContent.trim(), shown: !!r && r.getBoundingClientRect().height > 0, count: d && d.getAttribute('data-crcount'), visible: n }; });
      ok(row.text === 'Switch portal' && row.shown && String(row.visible) === row.count, `T10 phone ${TN(light)}: the drawer's "Switch portal" row stays in Daily, and Daily's count matches its rows (${row.count})`, row);
      await page.evaluate(() => document.querySelector('#navMenu .navopt[data-nav="landing"]').click()); await sleep(1100);
      const fd = await page.evaluate(() => { const v = document.querySelector('#cr-fd .fd-sheet'); return !!v && v.getBoundingClientRect().height > 0; });
      ok(fd, `T10 phone ${TN(light)}: it opens the Front Door`);
    } finally { await browser.close(); }
  });
}

const errs = [...L3.log, ...L0.log].filter(l => /^PAGEERROR/.test(l));
ok(errs.length === 0, 'no uncaught page errors across every boot', errs.slice(0, 3).join(' | ') || 'none');
console.log('\n' + (fails.length ? 'GATE 1434 RED' : 'GATE 1434 GREEN') + ' — ' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('failed:'); fails.forEach(f => console.log('  - ' + f)); }
process.exit(fails.length ? 1 : 0);
