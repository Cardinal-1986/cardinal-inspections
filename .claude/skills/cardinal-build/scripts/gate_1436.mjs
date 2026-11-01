// gate_1436.mjs [index.html] — SUN, the third appearance (Theo's T8 C pick).
//
//   NODE_PATH=<scratchpad>/jsd/node_modules:$(npm root -g) node gate_1436.mjs [index.html]
//
// Renders through rig_1436.mjs (the sentinel production seed + the repo's e2e mock; sw.js
// blocked; appearance set in localStorage by an init script BEFORE boot, never by
// reload). Every check is named; a check that throws is recorded as a FAIL with the
// reason, never a crash — on the pre-Sun tree this gate must go RED and say why.
//
//   A  Menu -> Appearance offers Dark · Light · Sun; Sun applies, survives the 1s
//      sweep, is stored, and a fresh boot from that storage opens in Sun
//   B  curtis and scottie with NO stored choice open in Sun, and nothing is written
//   C  theo and a rep open exactly as before (dark), theo's stored Light stays Light
//   D  a stored Dark (scottie) and a stored Light (curtis) are respected
//   E  0 text pieces under 7:1 on every covered screen in Sun — 390 and 1440
//   F  every text piece is heavier and larger than in Light (390, scottie)
//   G  floors: rendered text >= 11px x 1.15, CSS px >= 11, no control's short side
//      worsens under 44, no more sub-44 controls than Light, no sideways scroll
//   H  the user's own Text size still applies on top of Sun
//   I  the header switch: Sun -> Dark -> back to Sun for a field account; theo -> Light
//   J  the insurance palette reads Sun as light
//   K  in Light, the day sheet is readable (a light defect this build fixes on the way)
// Exit 0 green · 1 red · 2 could not run.
import fs from 'fs';
const HERE = new URL('./', import.meta.url).pathname;
const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
if (!fs.existsSync(APP)) { console.error('gate_1436: no such file ' + APP); process.exit(2); }
let rig;
try { rig = await import(HERE + 'rig_1436.mjs'); } catch (e) { console.error('gate_1436: rig did not load: ' + e.message); process.exit(2); }
const { boot, STATES, closeBrowser, sleep } = rig;

const results = [];
const ok = (cond, name, detail) => { const r = { pass: !!cond, name, detail: detail || '' }; results.push(r);
  /* streamed as recorded: a run killed by a timeout still says how far it got */
  console.log(`${r.pass ? '  PASS' : '  FAIL'}  ${r.name}${r.detail ? '\n          ' + r.detail : ''}`); };
const T0 = Date.now();

/* a pool, so ~50 boots take minutes and not ten of them */
async function pool(jobs, n = 4) {
  const out = new Array(jobs.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const k = i++; try { out[k] = await jobs[k](); } catch (e) { out[k] = { error: String(e && e.message || e).split('\n')[0] }; } } }));
  return out;
}
async function withBoot(o, fn) {
  const b = await boot(Object.assign({ app: APP }, o));
  try { return await fn(b.page, b); } finally { await b.close().catch(() => {}); }
}
const state = page => page.evaluate(() => ({
  theme: document.documentElement.getAttribute('data-theme') || '',
  sun: document.documentElement.getAttribute('data-cr-sun') || '',
  stored: (() => { try { return localStorage.getItem('cardinal.theme.rb'); } catch (e) { return 'THREW'; } })(),
  zoom: getComputedStyle(document.documentElement).zoom,
  pbOpen: !!document.querySelector('#cr-pb.open')
}));
async function probeState(page, name) {
  await STATES[name].run(page);
  return page.evaluate(([s]) => { const r = window.__sunProbe(s, 7); r.over = document.documentElement.scrollWidth - document.documentElement.clientWidth; return r; }, [STATES[name].scope]);
}
const appearRow = page => page.evaluate(() => [...document.querySelectorAll('#navMenu [data-cr-appear]')].map(b => ({ v: b.getAttribute('data-cr-appear'), t: b.textContent.trim(), p: b.getAttribute('aria-pressed') })));
async function openDrawer(page) {
  await page.evaluate(() => { const b = document.getElementById('navBtn') || document.querySelector('[data-pwa-tab="menu"]'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelectorAll('#navMenu [data-cr-appear]').length > 0 && [...document.querySelectorAll('#navMenu .navopt')].some(e => e.getBoundingClientRect().left > -50 && e.getClientRects().length), null, { timeout: 12000, polling: 150 }).catch(() => {});
  await sleep(400);
}

/* ── A · the Appearance row ─────────────────────────────────────────────── */
async function partA() {
  let storedAfter = null;
  await withBoot({ as: 'curtis', theme: '1' }, async page => {
    await openDrawer(page);
    const row = await appearRow(page);
    ok(row.length === 3 && row.map(r => r.v).join(',') === 'dark,light,sun' && row.map(r => r.t).join(',') === 'Dark,Light,Sun',
       'A1 Menu -> Appearance offers Dark · Light · Sun', JSON.stringify(row.map(r => r.t)));
    const clicked = await page.evaluate(() => { const b = document.querySelector('#navMenu [data-cr-appear="sun"]'); if (!b) return false; b.click(); return true; });
    await sleep(300);
    let s = await state(page);
    ok(clicked && s.sun === '1' && s.theme === 'rb-light', 'A2 tapping Sun applies it (data-cr-sun + the light theme under it)', JSON.stringify(s));
    ok(s.stored === 'sun', 'A3 Sun is stored per device in cardinal.theme.rb, like Dark and Light', 'stored=' + s.stored);
    const row2 = await appearRow(page);
    ok(row2.length === 3 && row2.filter(r => r.p === 'true').map(r => r.v).join() === 'sun', 'A4 the Sun button reads pressed, the other two do not', JSON.stringify(row2));
    await sleep(1600);
    s = await state(page);
    ok(s.sun === '1' && s.theme === 'rb-light', 'A5 the 1s theme sweep keeps Sun (it does not reset it)', JSON.stringify(s));
    storedAfter = s.stored;
    const d = await page.evaluate(() => { const b = document.querySelector('#navMenu [data-cr-appear="dark"]'); if (b) b.click(); return !!b; });
    await sleep(300);
    s = await state(page);
    ok(d && s.sun === '' && s.theme === '' && s.stored === '0', 'A6 tapping Dark from Sun clears it all the way to Dark', JSON.stringify(s));
  });
  await withBoot({ as: 'theo', theme: storedAfter == null ? 'MISSING' : storedAfter }, async page => {
    const s = await state(page);
    await openDrawer(page);
    const row = await appearRow(page);
    ok(s.sun === '1' && s.theme === 'rb-light' && row.filter(r => r.p === 'true').map(r => r.v).join() === 'sun',
       'A7 Sun persists: a fresh boot from the stored value opens in Sun (any account) with Sun pressed', JSON.stringify(s) + ' ' + JSON.stringify(row));
  });
}

/* ── B, C, D · who opens in what ─────────────────────────────────────────── */
async function partBCD() {
  const cases = [
    ['B1', { as: 'scottie' }, s => s.sun === '1' && s.theme === 'rb-light' && s.stored === null && s.pbOpen, 'scottie (field), no stored choice: opens in Sun on the Production board, nothing written'],
    ['B2', { as: 'curtis' }, s => s.sun === '1' && s.theme === 'rb-light' && s.stored === null && s.pbOpen, 'curtis (production), no stored choice: opens in Sun on the Production board, nothing written'],
    ['B3', { as: 'curtis', desktop: true }, s => s.sun === '1' && s.theme === 'rb-light' && s.stored === null, 'curtis at desktop, no stored choice: Sun'],
    ['B4', { as: 'scottie' }, s => String(s.zoom) === '1.15', 'scottie in Sun with no Text size of his own: one step up (zoom 1.15)'],
    ['C1', { as: 'theo' }, s => s.sun === '' && s.theme === '' && s.stored === null, 'theo (admin), no stored choice: opens Dark exactly as before'],
    ['C2', { as: 'nick' }, s => s.sun === '' && s.theme === '', 'a rep, no stored choice: opens Dark exactly as before'],
    ['C3', { as: 'theo', theme: '1' }, s => s.sun === '' && s.theme === 'rb-light' && String(s.zoom) === '1', 'theo with a stored Light: Light, no Sun, no zoom'],
    ['D1', { as: 'scottie', theme: '0' }, s => s.sun === '' && s.theme === '' && s.pbOpen, 'scottie with a stored Dark: Dark is respected'],
    ['D2', { as: 'curtis', theme: '1' }, s => s.sun === '' && s.theme === 'rb-light' && String(s.zoom) === '1', 'curtis with a stored Light: Light is respected (no Sun, no zoom)'],
    ['D3', { as: 'scottie', theme: '0', desktop: true }, s => s.sun === '' && s.theme === '', 'scottie with a stored Dark at desktop: Dark'],
  ];
  const got = await pool(cases.map(([, o]) => () => withBoot(o, async page => { await sleep(1300); return state(page); })));
  cases.forEach(([id, , pred, name], i) => { const s = got[i]; ok(s && !s.error && pred(s), id + ' ' + name, JSON.stringify(s)); });
  /* C4: theo's drawer offers Sun too — the row is for everyone */
  await withBoot({ as: 'theo' }, async page => { await openDrawer(page); const row = await appearRow(page);
    ok(row.length === 3 && row.filter(r => r.p === 'true').map(r => r.v).join() === 'dark', 'C4 theo sees Dark · Light · Sun with Dark pressed', JSON.stringify(row)); });
}

/* ── E, F, G · the screens ───────────────────────────────────────────────── */
const FLOOR = { board: 50, daysheet: 8, calendar: 60, box: 20, punchlist: 50, punchcard: 35, dispatch: 60, drawer: 15, tabbar: 3, toast: 6, ask: 4, header: 2 };
const PHONE = ['board', 'daysheet', 'calendar', 'box', 'punchlist', 'punchcard', 'dispatch', 'drawer', 'tabbar', 'toast', 'ask'];
const TABLE = [];
const EXEMPT = [];   /* a white "!" on a red badge may be listed here IF it really is a badge — none needed */
function sunOk(id, label, r) {
  if (!r || r.error) { ok(false, id + ' ' + label, 'did not render: ' + (r && r.error)); return; }
  const under = r.list.filter(t => !EXEMPT.some(x => t.el.includes(x)));
  const floor = FLOOR[label.split(' ')[0]] || 1;
  ok(r.sun === '1' && r.n >= floor && under.length === 0, id + ' ' + label + ': 0 text under 7:1 in Sun',
     `sun=${r.sun || 'no'} scored=${r.n} (floor ${floor}) under7=${under.length}` + (under.length ? ' worst: ' + under.slice(0, 3).map(t => `${t.ratio} "${t.text.slice(0, 18)}" ${t.el.slice(-30)}`).join(' | ') : ''));
}
async function partEFG() {
  /* scottie at 390: Light and Sun for each covered screen */
  const jobs = [];
  for (const st of PHONE) {
    jobs.push(() => withBoot({ as: 'scottie', theme: '1' }, p => probeState(p, st)));
    jobs.push(() => withBoot({ as: 'scottie' }, p => probeState(p, st)));
  }
  /* curtis at 390 (his extra controls), and both at 1440 */
  const extra = [];
  for (const st of ['punchcard', 'drawer', 'tabbar', 'dispatch', 'punchlist']) extra.push(['E-c390', st, { as: 'curtis' }]);
  for (const st of ['board', 'daysheet', 'calendar', 'box', 'punchlist', 'punchcard', 'dispatch', 'drawer', 'header', 'toast', 'ask']) extra.push(['E-c1440', st, { as: 'curtis', desktop: true }]);
  for (const st of ['drawer', 'punchcard', 'dispatch', 'punchlist']) extra.push(['E-s1440', st, { as: 'scottie', desktop: true }]);
  for (const [, st, o] of extra) jobs.push(() => withBoot(o, p => probeState(p, st)));
  const got = await pool(jobs, 3);
  PHONE.forEach((st, i) => {
    const L = got[2 * i], S = got[2 * i + 1];
    TABLE.push([st, L && !L.error ? `${L.under}/${L.n}` : '—', S && !S.error ? `${S.under}/${S.n}` : '—', L && !L.error ? L.meanW : '—', S && !S.error ? S.meanW : '—', L && !L.error ? L.medPx : '—', S && !S.error ? S.medPx : '—']);
    sunOk('E-s390', st + ' (scottie, 390)', S);
    if (st === 'daysheet') {   /* E7: the day sheet never got the light tokens — in LIGHT its date sat at 1.02:1 */
      const bad = L && !L.error ? L.texts.filter(t => t.ratio < 4.5) : null;
      ok(bad && bad.length === 0 && L.n >= FLOOR.daysheet, 'K1 in Light too, the day sheet clears 4.5:1 (its date was 1.02:1 on 1433)',
         bad ? `scored ${L.n} under4.5 ${bad.length}` + (bad.length ? ' worst: ' + bad.sort((a, b) => a.ratio - b.ratio).slice(0, 2).map(t => `${t.ratio} "${t.text.slice(0, 16)}"`).join(' | ') : '') : 'did not render');
    }
    if (!L || L.error || !S || S.error) { ok(false, 'F ' + st + ': heavier and larger than Light', 'did not render'); ok(false, 'G ' + st + ': floors', 'did not render'); return; }
    const key = t => t.el + '|' + t.kind + '|' + t.text;
    const m = new Map(); for (const t of L.texts) { const k = key(t); (m.get(k) || m.set(k, []).get(k)).push(t); }
    let matched = 0, heavier = 0, cap = 0; const notHeavier = [], notBigger = [];
    for (const t of S.texts) { const l = (m.get(key(t)) || []).shift(); if (!l) continue; matched++;
      if (t.w > l.w) heavier++; else if (l.w >= 900 && t.w >= 900) cap++; else notHeavier.push(`${l.w}->${t.w} "${t.text.slice(0, 14)}"`);
      if (!(t.rpx > l.rpx * 1.1)) notBigger.push(`${l.rpx}->${t.rpx} "${t.text.slice(0, 14)}"`); }
    ok(matched >= Math.min(L.texts.length, S.texts.length) * 0.9 && matched >= (FLOOR[st] || 1) && notHeavier.length === 0 && S.meanW > L.meanW,
       `F ${st}: every text piece one weight heavier than Light`, `matched ${matched}/${S.texts.length} heavier ${heavier} at-900 ${cap} meanW ${L.meanW}->${S.meanW}` + (notHeavier.length ? ' NOT: ' + notHeavier.slice(0, 3).join(' | ') : ''));
    ok(matched >= (FLOOR[st] || 1) && notBigger.length === 0, `F ${st}: every text piece rendered at least 10% larger than Light`, `median ${L.medPx}->${S.medPx}px` + (notBigger.length ? ' NOT: ' + notBigger.slice(0, 3).join(' | ') : ''));
    /* a control laid out in 339 CSS px (390 / 1.15) can end a few viewport px narrower
       when it spans the width; what must not happen is a short side under 44 getting
       SHORTER, or a control at or over 44 dropping under it */
    const tk = t => t.el + '|' + t.text; const lt = new Map(L.targets.map(t => [tk(t), t]));
    const shrank = S.targets.filter(t => { const l = lt.get(tk(t)); if (!l) return false; const a = Math.min(l.w, l.h), b = Math.min(t.w, t.h); return b < 44 && b < a - 0.5; });
    const s44 = S.targets.filter(t => Math.min(t.w, t.h) < 44).length, l44 = L.targets.filter(t => Math.min(t.w, t.h) < 44).length;
    ok(S.minRpx >= 12.6 && S.minPx >= 11 && shrank.length === 0 && s44 <= l44 && S.over <= 0,
       `G ${st}: 11px x 1.15 rendered floor, 11px CSS floor, no control's short side worsens under 44, sub-44 ${l44}->${s44}, no sideways scroll`,
       `minRendered ${S.minRpx} minCss ${S.minPx} shrank ${shrank.length} overflowX ${S.over}`);
  });
  extra.forEach(([id, st, o], j) => sunOk(id, `${st} (${o.as}, ${o.desktop ? 1440 : 390})`, got[2 * PHONE.length + j]));
}

/* ── H · the user's own Text size still applies on top ───────────────────── */
async function partH() {
  const cases = [
    [{ as: 'scottie', text: 'lg' }, '1.3', 'H1 Sun + the user\'s Large: one step past Large (1.30)'],
    [{ as: 'scottie', text: 'xl' }, '1.45', 'H2 Sun + the user\'s Larger: one step past Larger (1.45)'],
    [{ as: 'curtis', theme: '1', text: 'lg' }, '1.15', 'H3 Light + Large is unchanged (1.15)'],
    [{ as: 'theo', theme: '0', text: 'xl' }, '1.3', 'H4 Dark + Larger is unchanged (1.30)'],
  ];
  const got = await pool(cases.map(([o]) => () => withBoot(o, async p => { await sleep(800); return Object.assign(await state(p), { text: await p.evaluate(() => document.documentElement.getAttribute('data-cr-text') || 'md') }); })));
  cases.forEach(([o, z, name], i) => { const s = got[i]; ok(s && !s.error && String(s.zoom) === z && s.text === o.text, name, JSON.stringify(s)); });
}

/* ── I · the header switch, J · the insurance palette ────────────────────── */
async function partIJ() {
  await withBoot({ as: 'scottie' }, async page => {
    const has = await page.evaluate(() => !!(window.CardinalRBTheme && window.CardinalRBTheme.toggle));
    if (!has) { ok(false, 'I1 the header switch takes a field account Sun -> Dark -> Sun', 'no CardinalRBTheme.toggle'); return; }
    const a = await state(page);
    await page.evaluate(() => window.CardinalRBTheme.toggle()); await sleep(200); const b = await state(page);
    await page.evaluate(() => window.CardinalRBTheme.toggle()); await sleep(200); const c = await state(page);
    ok(a.sun === '1' && b.sun === '' && b.theme === '' && b.stored === '0' && c.sun === '1' && c.stored === 'sun',
       'I1 the header switch takes a field account Sun -> Dark -> Sun', [a, b, c].map(s => (s.sun ? 'sun' : s.theme || 'dark') + '/' + s.stored).join(' -> '));
    const ins = await page.evaluate(() => { try { localStorage.removeItem('cardinalRLTheme'); return window.CardinalInsTheme && window.CardinalInsTheme.get ? window.CardinalInsTheme.get() : 'none'; } catch (e) { return 'threw ' + e.message; } });
    ok(ins === 'docket', 'J1 the insurance palette reads Sun as a light theme (docket)', 'got ' + ins);
  });
  await withBoot({ as: 'theo' }, async page => {
    const a = await state(page);
    await page.evaluate(() => window.CardinalRBTheme && window.CardinalRBTheme.toggle()); await sleep(200);
    const b = await state(page);
    ok(a.theme === '' && b.theme === 'rb-light' && b.sun === '' && b.stored === '1', 'I2 theo\'s header switch still goes Dark -> Light (never Sun)', JSON.stringify([a, b]));
  });
}

for (const [name, fn] of [['A', partA], ['B-D', partBCD], ['E-G', partEFG], ['H', partH], ['I-J', partIJ]]) {
  try { await fn(); } catch (e) { ok(false, 'part ' + name + ' could not finish', String(e && e.message || e).split('\n')[0]); }
}
await closeBrowser().catch(() => {});

const fails = results.filter(r => !r.pass);
if (TABLE.length) {
  console.log('scottie at 390 — text under 7:1 / scored, mean weight, median rendered px:  Light -> Sun');
  for (const [st, a, b, wa, wb, pa, pb] of TABLE) console.log(`  ${st.padEnd(10)} under7 ${String(a).padStart(6)} -> ${String(b).padEnd(6)}  weight ${wa} -> ${wb}  size ${pa} -> ${pb}`);
  console.log('');
}
console.log('');
if (fails.length) { console.log('failed:'); for (const r of fails) console.log('  - ' + r.name); console.log(''); }
console.log(`${results.length} checks · ${results.length - fails.length} pass · ${fails.length} fail · ${Math.round((Date.now() - T0) / 1000)}s · ${APP}`);
if (results.length < 60) { console.log('GATE 1436 RED — fewer checks than the floor of 60: a part did not run'); process.exit(1); }
console.log(fails.length ? 'GATE 1436 RED' : 'GATE 1436 GREEN');
process.exit(fails.length ? 1 : 0);
