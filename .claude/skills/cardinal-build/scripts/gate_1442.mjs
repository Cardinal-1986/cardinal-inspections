/* gate_1442 - round-1 leftovers (builder A2, made on build 1438): the desktop layout set.
 *
 *   P09.01  Clients: three CRM columns from 1280 (was 1600); no CRM tag on a card inside a column
 *   P09.05  retail client profile: two columns from 1280 (was 1600), CSS and cols() agreeing
 *   P09.06  Insurance: the hub is no longer held to 840px; the insurance profile gets the two columns
 *   P09.07  the insurance profile's Google Reviews card is light in light (docket), dark in dark
 *   P09.08  Invoices & AR and Owner Review sit beside the rail; AR's main row action is label-sized, red
 *   P09.10  Schedule Board grid from 1280, day cells >= 125px, chips carry the client and a title
 *   P09.12  hover feedback on a Clients card, an Owner Review row and a pipeline tile
 *   P09.14  the home Activity card folds one person's same-day bookings into one row
 *   P09.15  the seven Reports KPI tiles never strand one or two on a row (7, or 4 + 3)
 *   P06.14  the Insurance hub's stat tiles: no empty third track, the label and icon inside the tile
 *   J15.17  the A/R screen's status pills are dark in dark (and unchanged in light)
 *   PHONE   at 390 nothing on these screens moves against the reference tree (the Activity card's
 *           content is excluded - its grouping is the P09.14 change itself)
 *
 *   node gate_1442.mjs [artifact] [--ref reference.html]
 * Default artifact: the repo index.html. Default reference: build 1438 (git show 9eb1a8c).
 * On build 1438 itself this gate must go RED, on the items, not by crashing.
 */
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../..');
const LIB = REPO + '/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs';
const args = process.argv.slice(2);
const ri = args.indexOf('--ref');
let REF = ri !== -1 ? args[ri + 1] : null;
const FILE = resolve(args.find((a, i) => !a.startsWith('--') && (ri === -1 || i !== ri + 1)) || join(REPO, 'index.html'));
if (!REF) {
  REF = join(os.tmpdir(), 'gate_1442_ref1438.html');
  if (!existsSync(REF)) writeFileSync(REF, execSync('git show 9eb1a8c:index.html', { cwd: REPO, maxBuffer: 64 << 20 }));
}
/* the desktop seed: 36 extra clients across the three CRMs and 18 appointments booked by one
   person (V1's re-check seed), so the directory, the board and the Activity card have volume. */
const SEED = existsSync(join(HERE, 'gate_1442_seed.js')) ? readFileSync(join(HERE, 'gate_1442_seed.js'), 'utf8') : '';

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 260) : '')); }

/* gate_1403_lib reads APPFILE at import time, so each tree is measured in its own child process */
function child(file, theme, phone) {
  const seed = "try{localStorage.setItem('cardinal.theme.rb','" + (theme === 'light' ? '1' : '0') + "');}catch(e){}\n" + SEED;
  return `process.env.APPFILE = ${JSON.stringify(file)};
const L3 = await import(${JSON.stringify(LIB)});
const PHONE = ${phone ? 'true' : 'false'};
const { browser, page } = await L3.boot('theo', { instr: false, desktop: !PHONE, seed: ${JSON.stringify(seed)} });
const R = { theme: await page.evaluate(() => document.documentElement.getAttribute('data-theme')), rl: null };
const ev = async (fn, a) => { try { return await page.evaluate(fn, a); } catch (e) { return { err: String(e.message).split('\\n')[0].slice(0, 160) }; } };
const size = async (w, h) => { await page.setViewportSize({ width: w, height: h || 1000 }); await page.waitForTimeout(650); };
const pause = ms => page.waitForTimeout(ms);
const leave = () => ev(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } }); try { hideAllViews(); } catch (e) {} });
await page.evaluate(() => { window.__lum = function (c) { const m = String(c).match(/[\\d.]+/g); if (!m) return null; const v = m.slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  window.__cr = function (a, b) { const x = __lum(a), y = __lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__vis = function (e) { if (!e) return false; const q = e.getBoundingClientRect(); const cs = getComputedStyle(e); return q.width > 0 && q.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }; });
async function hover(sel) {
  const snap = () => ev(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const c = getComputedStyle(e); const b = e.getBoundingClientRect();
    return { k: [c.backgroundColor, c.backgroundImage.slice(0, 60), c.boxShadow.slice(0, 60), c.borderTopColor, c.borderLeftColor, c.transform].join('|'), x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 20) }; }, sel);
  await page.mouse.move(2, 2); await pause(250); const a = await snap(); if (!a || a.err) return { err: 'no ' + sel };
  await page.mouse.move(a.x, a.y); await pause(450); const b = await snap(); await page.mouse.move(2, 2); await pause(200);
  return { changed: a.k !== b.k, before: a.k, after: b && b.k };
}
const W = PHONE ? [390] : [1194, 1280, 1440, 1536, 1920];

/* ---- P09.01 Clients ---- */
await leave(); await ev(() => window.openClientsDirectory()); await pause(1100);
R.cd = {};
for (const w of W) { await size(w);
  R.cd[w] = await ev(() => { const l = document.getElementById('cliList'); const cards = [...document.querySelectorAll('#clientsView .cd-card')].filter(__vis);
    const xs = [...new Set(cards.map(c => Math.round(c.getBoundingClientRect().left)))];
    const tagsIn = [...document.querySelectorAll('#cliList .cd-crmsec .cd-crmtag')].filter(__vis).length;
    const tagsFlat = [...document.querySelectorAll('#cliList > .cd-card .cd-crmtag')].filter(__vis).length;
    const cut = [...document.querySelectorAll('#clientsView .cd-name')].filter(n => __vis(n) && n.scrollWidth > n.clientWidth + 1).length;
    const off = cards.filter(c => c.getBoundingClientRect().right > innerWidth + 1).length;
    return { cols: xs.length, crmcols: l.classList.contains('cd-crmcols'), tagsIn, tagsFlat, cut, off, n: cards.length, cardW: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : 0,
      sig: cards.slice(0, 6).map(c => { const q = c.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)].join(','); }).join(';') }; }); }
if (!PHONE) { await size(1440); R.hovCd = await hover('#clientsView .cd-card'); }

/* ---- P09.05 / P09.06 / P09.07 the client profile ---- */
async function prof(pid, ws) { const o = {}; await leave(); await ev(p => window.openProject(p), pid); await pause(1700);
  for (const w of ws) { await size(w); await pause(250);
    o[w] = await ev(() => { const m = document.getElementById('acxMount'); const box = m && m.querySelector(':scope > .acx-cols'); const L = box && box.querySelector('.acx-colL'), Rr = box && box.querySelector('.acx-colR');
      const lq = L && L.getBoundingClientRect(), rq = Rr && Rr.getBoundingClientRect();
      const two = !!(box && __vis(box) && lq && rq && lq.width > 300 && rq.width > 300 && rq.left > lq.right - 1 && Math.abs(lq.top - rq.top) < 2 && L.children.length && Rr.children.length);
      const v = document.getElementById('projectView');
      const rv = document.querySelector('#projectView .rvcard'), rvt = rv && rv.querySelector('.rvtop'), rvs = rv && rv.querySelector('.rvstatus');
      const kids = m ? [...m.children].filter(__vis).map(e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.width), Math.round(q.height)].join(','); }).join(';') : '';
      const strip = document.querySelector('#acxMount > .cr-claimstrip');
      return { box: !!box, two, lw: lq ? Math.round(lq.width) : 0, rw: rq ? Math.round(rq.width) : 0, h: Math.round(v.scrollHeight), rl: document.body.getAttribute('data-rltheme'),
        stripFull: strip ? Math.round(strip.getBoundingClientRect().width) : null, mountW: m ? Math.round(m.getBoundingClientRect().width) : 0,
        boxAfterStrip: !!(strip && box && (strip.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)),
        rv: rv && __vis(rv) ? { bg: __lum(getComputedStyle(rv).backgroundColor), top: __lum(getComputedStyle(rvt).backgroundColor), ink: rvs ? +__cr(getComputedStyle(rvs).color, getComputedStyle(rv).backgroundColor).toFixed(2) : null,
          tink: +__cr(getComputedStyle(rvt).color, getComputedStyle(rvt).backgroundColor).toFixed(2), pg: __lum(getComputedStyle(v).backgroundColor) } : null, sig: kids }; }); }
  return o; }
R.r1 = await prof('R1', W);
R.i1 = await prof('I1', PHONE ? [390] : [1194, 1280, 1920]);

/* ---- P09.06 / P06.14 the insurance hub ---- */
await leave(); await ev(() => window.showCardinalTruth()); await pause(1300);
R.truth = {};
for (const w of (PHONE ? [390] : [1194, 1280, 1440, 1920])) { await size(w); await pause(300);
  R.truth[w] = await ev(() => { const b = document.querySelector('#cardinalTruthView .ins-body'); const st = document.querySelector('#cardinalTruthView .cr-cth-stats');
    const tiles = st ? [...st.children].filter(__vis) : [];
    const cols = st ? getComputedStyle(st).gridTemplateColumns.split(' ').filter(x => parseFloat(x) > 0).length : 0;   /* auto-fit keeps collapsed tracks as 0px */
    const spill = []; tiles.forEach(t => { const tq = t.getBoundingClientRect(); const top = t.querySelector('.top'); if (top && top.scrollWidth > top.clientWidth + 1) spill.push('top ' + top.scrollWidth + '>' + top.clientWidth);
      t.querySelectorAll('svg, .l, .ic').forEach(e => { const q = e.getBoundingClientRect(); if (q.width && (q.right > tq.right + 0.5 || q.left < tq.left - 0.5)) spill.push((e.className.baseVal || e.className || e.tagName) + ' ' + Math.round(q.right) + '>' + Math.round(tq.right)); }); });
    return { bodyW: b ? Math.round(b.getBoundingClientRect().width) : 0, area: Math.round(document.getElementById('cardinalTruthView').getBoundingClientRect().width), tiles: tiles.length, cols, spill,
      sig: tiles.map(t => { const q = t.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.width)].join(','); }).join(';') + '|' + (b ? Math.round(b.getBoundingClientRect().width) : 0) }; }); }

/* ---- P09.08 / J15.17 Invoices & AR, Owner Review ---- */
await size(PHONE ? 390 : 1920, 1080); await leave(); await ev(() => window.CardinalAR.open()); await pause(1500);
R.ar = await ev(() => { const v = document.getElementById('cr-ar-view'); const q = v.getBoundingClientRect(); const rail = document.getElementById('cr-lnav');
  let railHit = null; if (rail && __vis(rail)) { const r = rail.getBoundingClientRect(); const h = document.elementFromPoint(r.left + 30, Math.min(innerHeight - 20, r.top + 200)); railHit = !!h && rail.contains(h); }
  const go = [...v.querySelectorAll('.crar-acts .crar-go')].filter(__vis).map(b => ({ w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), bg: getComputedStyle(b).backgroundColor, primary: b.classList.contains('primary'), row: Math.round(b.closest('.crar-row').getBoundingClientRect().width) }));
  /* a pill's tint is often translucent: composite it over the row's own opaque ground */
  const rgba = c => { const m = String(c).match(/[\\d.]+/g) || [0, 0, 0, 0]; return [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]]; };
  const ground = e => { for (let x = e.parentElement; x; x = x.parentElement) { const c = rgba(getComputedStyle(x).backgroundColor); if (c[3] >= 0.99) return c; } return [255, 255, 255, 1]; };
  const over = (f, b) => 'rgb(' + [0, 1, 2].map(i => Math.round(f[i] * f[3] + b[i] * (1 - f[3]))).join(',') + ')';
  const pills = [...v.querySelectorAll('.crar-pill')].filter(__vis).map(p => { const g = ground(p), comp = over(rgba(getComputedStyle(p).backgroundColor), g);
    return { k: p.className.replace('crar-pill', '').trim(), bg: +(__lum(comp) || 0).toFixed(3), cr: +__cr(getComputedStyle(p).color, comp).toFixed(2), comp }; });
  return { left: Math.round(q.left), top: Math.round(q.top), w: Math.round(q.width), railHit, go, pills, sig: [Math.round(q.left), Math.round(q.width)].join(',') + '|' + go.map(g => g.w).join(',') }; });
await ev(() => { try { window.CardinalAR.close(); } catch (e) {} }); await pause(400);
await leave(); await ev(() => window.CardinalOwnerReview.open()); await pause(1500);
R.orv = await ev(() => { const v = document.getElementById('cr-orv-view'); const q = v.getBoundingClientRect(); const rail = document.getElementById('cr-lnav');
  let railHit = null; if (rail && __vis(rail)) { const r = rail.getBoundingClientRect(); const h = document.elementFromPoint(r.left + 30, Math.min(innerHeight - 20, r.top + 200)); railHit = !!h && rail.contains(h); }
  return { left: Math.round(q.left), w: Math.round(q.width), railHit, cards: document.querySelectorAll('#cr-orv-view button.orv-card').length, sig: [Math.round(q.left), Math.round(q.width)].join(',') }; });
if (!PHONE) { await size(1440); R.hovOrv = await hover('#cr-orv-view button.orv-card'); }
await ev(() => { try { window.CardinalOwnerReview.close(); } catch (e) {} }); await pause(400);

/* ---- P09.10 the Schedule Board ---- */
await leave(); await ev(() => window.openScheduleBoard()); await pause(1300);
R.board = {};
for (const w of (PHONE ? [390] : [1194, 1280, 1536, 1600, 1920])) { await size(w); await pause(300);
  R.board[w] = await ev(() => { const wd = document.getElementById('boardWide'); const on = __vis(wd); const cells = on ? [...wd.querySelectorAll('.sbw-grid .sbw-cell')] : [];
    const chips = on ? [...wd.querySelectorAll('.sbw-ev')].filter(__vis) : [];
    const lay = on && wd.querySelector('.sbw-lay'); const rail = on && wd.querySelector('.sbw-rail');
    return { on, cells: cells.length, minCell: cells.length ? Math.round(Math.min(...cells.map(c => c.getBoundingClientRect().width))) : 0,
      chips: chips.length, withTitle: chips.filter(c => (c.getAttribute('title') || '').length > 6).length, withCli: chips.filter(c => { const n = c.querySelector('.sbw-evc'); return n && n.textContent.trim() && __vis(n); }).length,
      cliClipAll: chips.filter(c => { const n = c.querySelector('.sbw-evc'); return n && n.clientWidth < 20; }).length,
      sample: chips.slice(0, 2).map(c => c.innerText.replace(/\\s+/g, ' ').trim() + ' | ' + (c.getAttribute('title') || '')),
      railBeside: !!(lay && rail && rail.getBoundingClientRect().left > wd.querySelector('.sbw-cal').getBoundingClientRect().right - 1),
      docH: document.documentElement.scrollHeight, list: __vis(document.getElementById('boardMount')) }; }); }

/* ---- P09.12 / P09.14 home ---- */
await size(PHONE ? 390 : 1440); await leave(); await ev(() => window.showHome && window.showHome()); await pause(1200);
R.act = await ev(() => { const rows = [...document.querySelectorAll('#actFeed .actitem')]; const t = rows.map(r => r.innerText.replace(/\\s+/g, ' ').trim());
  return { n: rows.length, appt: t.filter(x => / appointment /i.test(x) && !/booked/i.test(x)).length, booked: t.filter(x => /booked \\d+ appointments/i.test(x)).length, other: t.filter(x => !/appointment/i.test(x)).length, sample: t.slice(0, 4) }; });
if (!PHONE) R.hovPipe = await hover('#mainView #pipeRow .pipebtn');

/* ---- P09.15 Reports ---- */
await leave(); await ev(() => window.openReportsView()); await pause(1500);
R.rpt = {};
for (const w of (PHONE ? [390] : [1194, 1280, 1366, 1440, 1536, 1920])) { await size(w); await pause(400);
  R.rpt[w] = await ev(() => { const k = document.getElementById('rptKpis'); const tiles = k ? [...k.children].filter(__vis) : []; const rows = {};
    tiles.forEach(t => { const y = Math.round(t.getBoundingClientRect().top); rows[y] = (rows[y] || 0) + 1; });
    const cut = []; tiles.forEach(t => t.querySelectorAll('span,b').forEach(e => { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline') cut.push(e.textContent.trim().slice(0, 18)); }));
    const right = tiles.length ? Math.round(Math.max(...tiles.map(t => t.getBoundingClientRect().right))) : 0;
    return { n: tiles.length, rows: Object.keys(rows).sort((a, b) => a - b).map(y => rows[y]), cut, fill: k ? Math.round(k.getBoundingClientRect().right) - right : null,
      sig: tiles.map(t => { const q = t.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width)].join(','); }).join(';') }; }); }
R.errs = L3.log.filter(l => /PAGEERROR/.test(l)).slice(0, 4);
console.log('@@' + JSON.stringify(R));
await browser.close();`;
}
function measure(file, theme, phone) {
  const tmp = join(os.tmpdir(), `gate_1442_m_${process.pid}_${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(tmp, child(file, theme, phone));
  const res = execSync(`node ${tmp}`, { encoding: 'utf8', maxBuffer: 32 << 20, timeout: 420000 });
  const line = res.split('\n').find(l => l.startsWith('@@'));
  if (!line) throw new Error('measure produced no result: ' + res.slice(-300));
  return JSON.parse(line.slice(2));
}
const RED = 'rgb(200, 32, 46)';
console.log('gate_1442 on ' + FILE + '  (reference ' + REF + ')');
try {
  for (const theme of ['dark', 'light']) {
    console.log(`\n── desktop, ${theme} ──`);
    const D = measure(FILE, theme, false);
    ok(D.theme === (theme === 'light' ? 'rb-light' : null), `${theme}: the theme is actually ${theme}`, D.theme);
    ok(!D.errs.length, `${theme}: no page errors`, D.errs);

    /* P09.01 */
    for (const w of [1280, 1440, 1536]) { const c = D.cd[w];
      ok(c.crmcols && c.cols === 3, `P09.01 ${theme} ${w}: Clients in three CRM columns`, c);
      ok(c.tagsIn === 0 && c.cut === 0 && c.off === 0, `P09.01 ${theme} ${w}: no CRM tag inside a column, no name cut, nothing off screen`, { tagsIn: c.tagsIn, cut: c.cut, off: c.off }); }
    ok(!D.cd[1194].crmcols && D.cd[1194].tagsFlat > 0, `P09.01 ${theme} 1194: the flat list (with its CRM tags) below the line`, D.cd[1194]);
    ok(D.cd[1920].crmcols && D.cd[1920].cols === 3 && D.cd[1920].tagsIn === 0, `P09.01 ${theme} 1920: still three columns`, D.cd[1920]);

    /* P09.05 */
    for (const w of [1280, 1440, 1536, 1920]) ok(D.r1[w].two, `P09.05 ${theme} ${w}: the retail profile is two columns`, { lw: D.r1[w].lw, rw: D.r1[w].rw, box: D.r1[w].box });
    ok(!D.r1[1194].box, `P09.05 ${theme} 1194: one column below the line (cols() and the CSS agree)`, D.r1[1194]);
    ok(D.r1[1280].h < D.r1[1194].h - 600, `P09.05 ${theme}: 1280 is far shorter than one column`, { h1280: D.r1[1280].h, h1194: D.r1[1194].h });

    /* P09.06 */
    ok(D.truth[1920].bodyW >= 1300, `P09.06 ${theme} 1920: the Insurance hub is not held to 840px`, D.truth[1920]);
    ok(D.truth[1194].bodyW >= D.truth[1194].area - 2, `P09.06 ${theme} 1194: the hub fills the area beside the rail`, D.truth[1194]);
    for (const w of [1280, 1920]) {
      ok(D.i1[w].two, `P09.06 ${theme} ${w}: the insurance profile is two columns`, { lw: D.i1[w].lw, rw: D.i1[w].rw });
      ok(D.i1[w].stripFull && D.i1[w].stripFull >= D.i1[w].mountW - 2 && D.i1[w].boxAfterStrip, `P09.06 ${theme} ${w}: the claim strip stays one full-width band above the columns`, { strip: D.i1[w].stripFull, mount: D.i1[w].mountW, after: D.i1[w].boxAfterStrip }); }
    ok(D.i1[1920].h < 4200, `P09.06 ${theme} 1920: the insurance profile is no longer one ~4,800px column`, D.i1[1920].h);
    ok(!D.i1[1194].box, `P09.06 ${theme} 1194: one column below the line`, D.i1[1194].box);

    /* P06.14 */
    for (const w of [1280, 1440, 1920]) { const t = D.truth[w];
      ok(t.tiles > 0 && t.cols === t.tiles, `P06.14 ${theme} ${w}: as many tracks as tiles (no empty third column)`, { tiles: t.tiles, cols: t.cols });
      ok(t.spill.length === 0, `P06.14 ${theme} ${w}: the label and the icon stay inside the tile`, t.spill); }

    /* P09.07 */
    { const r = D.i1[1920].rv;
      ok(!!r, `P09.07 ${theme}: the insurance profile shows its Google Reviews card`, r);
      if (r) {
        if (theme === 'light') {
          ok(D.i1[1920].rl === 'docket', 'P09.07 light: the insurance page is in its light (docket) theme', D.i1[1920].rl);
          ok(r.bg > 0.8 && r.top > 0.8, 'P09.07 light: the Reviews card and its header are light, like the page', r);
          ok(r.ink >= 4.5 && r.tink >= 4.5, 'P09.07 light: its text clears 4.5:1', r);
        } else {
          ok(r.bg < 0.05, 'P09.07 dark: the Reviews card stays dark', r);
          ok(r.ink >= 4.5 && r.tink >= 4.5, 'P09.07 dark: its text clears 4.5:1', r);
        } } }

    /* P09.08 */
    ok(D.ar.left === 288 && D.ar.railHit === true, `P09.08 ${theme} 1920: Invoices & AR beside the rail, the rail clickable`, { left: D.ar.left, railHit: D.ar.railHit });
    ok(D.orv.left === 288 && D.orv.railHit === true, `P09.08 ${theme} 1920: Owner Review beside the rail, the rail clickable`, { left: D.orv.left, railHit: D.orv.railHit });
    ok(D.ar.go.length > 0 && D.ar.go.every(g => g.w < 300 && g.h >= 44), `P09.08 ${theme} 1920: the row actions are label-sized and >= 44px tall`, D.ar.go.slice(0, 4));
    ok(D.ar.go.filter(g => g.primary).every(g => g.bg === RED) && D.ar.go.some(g => g.primary), `P09.08 ${theme} 1920: the main action stays solid red (Buttons A)`, D.ar.go.slice(0, 4));

    /* J15.17 */
    ok(D.ar.pills.length > 0, `J15.17 ${theme}: the A/R screen shows status pills`, D.ar.pills.length);
    if (theme === 'dark') ok(D.ar.pills.every(p => p.bg < 0.15 && p.cr >= 4.5), 'J15.17 dark: every A/R pill is a dark tint, its ink >= 4.5:1', D.ar.pills);
    else ok(D.ar.pills.every(p => p.bg > 0.7 && p.cr >= 4.5), 'J15.17 light: the A/R pills keep their light tints, ink >= 4.5:1', D.ar.pills);

    /* P09.10 */
    for (const w of [1280, 1536, 1920]) { const b = D.board[w];
      ok(b.on && b.cells === 14 && b.minCell >= 125, `P09.10 ${theme} ${w}: the two-week grid, day cells >= 125px`, { on: b.on, cells: b.cells, minCell: b.minCell });
      ok(b.chips > 0 && b.withTitle === b.chips && b.withCli === b.chips && b.cliClipAll === 0, `P09.10 ${theme} ${w}: every chip names its client and carries a title`, b); }
    ok(!D.board[1194].on && D.board[1194].list, `P09.10 ${theme} 1194: the list below the line`, D.board[1194]);
    ok(D.board[1920].railBeside && !D.board[1536].railBeside, `P09.10 ${theme}: the day rail sits beside the grid from 1600, under it below`, { 1536: D.board[1536].railBeside, 1920: D.board[1920].railBeside });

    /* P09.12 */
    ok(D.hovCd && D.hovCd.changed, `P09.12 ${theme}: a Clients card reacts to hover`, D.hovCd);
    ok(D.hovOrv && D.hovOrv.changed, `P09.12 ${theme}: an Owner Review row reacts to hover`, D.hovOrv);
    ok(D.hovPipe && D.hovPipe.changed, `P09.12 ${theme}: a pipeline tile reacts to hover`, D.hovPipe);

    /* P09.14 */
    ok(D.act.n >= 10 && D.act.appt <= 3 && D.act.booked >= 1 && D.act.other >= 6, `P09.14 ${theme}: same-day bookings fold into one row, other events keep their place`, D.act);

    /* P09.15 */
    for (const w of [1194, 1280, 1366, 1440, 1536, 1920]) { const r = D.rpt[w];
      ok(r.n === 7 && (JSON.stringify(r.rows) === '[7]' || JSON.stringify(r.rows) === '[4,3]') && r.cut.length === 0, `P09.15 ${theme} ${w}: the seven KPI tiles are 7 across or 4 + 3, nothing cut`, r);
      if (JSON.stringify(r.rows) === '[4,3]') ok(Math.abs(r.fill) <= 1, `P09.15 ${theme} ${w}: the second row spans the width`, r.fill); }
  }

  console.log('\n── phone 390: nothing on these screens moves against the reference ──');
  for (const theme of ['dark', 'light']) {
    const A = measure(FILE, theme, true), B = measure(REF, theme, true);
    ok(!A.errs.length, `PHONE ${theme}: no page errors`, A.errs);
    const pairs = [['Clients', A.cd[390].sig, B.cd[390].sig], ['Clients tags', A.cd[390].tagsFlat, B.cd[390].tagsFlat], ['retail profile', A.r1[390].sig, B.r1[390].sig],
      ['insurance profile', A.i1[390].sig, B.i1[390].sig], ['Insurance hub', A.truth[390].sig, B.truth[390].sig], ['A/R', A.ar.sig, B.ar.sig], ['Owner Review', A.orv.sig, B.orv.sig],
      ['Schedule Board', JSON.stringify([A.board[390].on, A.board[390].list, A.board[390].docH]), JSON.stringify([B.board[390].on, B.board[390].list, B.board[390].docH])],
      ['Reports KPIs', A.rpt[390].sig, B.rpt[390].sig]];
    for (const [n, a, b] of pairs) ok(a === b && a !== undefined, `PHONE ${theme}: ${n} is unchanged`, a === b ? 'same' : { now: String(a).slice(0, 110), ref: String(b).slice(0, 110) });
    ok(!A.r1[390].box && !A.i1[390].box && !A.cd[390].crmcols && !A.board[390].on, `PHONE ${theme}: no desktop layout leaks onto the phone`, { r1: A.r1[390].box, i1: A.i1[390].box, cd: A.cd[390].crmcols, board: A.board[390].on });
    ok(A.ar.left === 0 && A.ar.go.length > 0 && A.ar.go.every(g => g.w > 200), `PHONE ${theme}: A/R stays full screen, its main action still fills the row`, { left: A.ar.left, go: A.ar.go.slice(0, 2) });
    ok(JSON.stringify(A.rpt[390].rows) === JSON.stringify(B.rpt[390].rows), `PHONE ${theme}: the KPI tiles keep their phone rows`, { now: A.rpt[390].rows, ref: B.rpt[390].rows });
  }
} catch (e) { ok(false, 'gate threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 220)); }
const total = passes + fails.length;
const FLOOR = 140;
if (total < FLOOR) { fails.push(`only ${total} checks ran (floor ${FLOOR})`); console.log(`  ✗ FAIL only ${total} checks ran (floor ${FLOOR})`); }
console.log(`\n${fails.length ? 'GATE 1442 RED' : 'GATE 1442 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
