/* gate_1137.mjs — the Owner Console is a hub with areas, not one long scroller.
 *
 * ⚠ Built as 1129; renumbered to 1137 when main reached 1136 mid-build and #541
 * had already taken 1129. The control below is the tree this branch forked from
 * (1128 content, now merged forward) — what it proves is unchanged.
 *
 * Theo: "The owner console is just 1 looooong page. Can we make it more
 * presentable like an owners hub that can take you to different areas?"
 * Measured before building: 2,907px on a phone = 3.4 screenfuls, and that was
 * with every list EMPTY, so real data only ever made it longer.
 *
 * ⚠ The check that matters most here is the BROWSER BACK BUTTON, not the in-app
 * one. A full-screen view that adds an inner level and does not record history
 * swaps the page underneath itself and traps the user — the 570-572 class, which
 * cost six screens at once. Back from an area must land on the hub, and back
 * from the hub must leave the console.
 *
 * Negative control: point it at pre-hub main -> RED (no .ow-card exists at all), and it
 * must report red rather than crash (BUG_CLASSES 37), so every probe is guarded.
 *   node gate_1137.mjs [file.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
const errs = [];

async function boot(w, h){
  const p = await b.newPage({ viewport:{ width:w, height:h } });
  for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S + f, 'utf8'));
  p.on('pageerror', e => errs.push(String(e.message).split('\n')[0]));
  await p.goto(URL_, { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(2600);
  return p;
}
const openConsole = (p, a) => p.evaluate(async (a) => {
  try { await window.CardinalOwner.open(a); } catch(e) { return String(e.message || e); }
  await new Promise(r => setTimeout(r, 1400));
  return 'ok';
}, a || null).catch(e => String(e));

/* ── 1. the hub itself ─────────────────────────────────────────────────── */
const p = await boot(390, 844);
const opened = await openConsole(p);
ok(opened === 'ok', 'the console opens (' + opened + ')');

const hub = await p.evaluate(() => {
  const w = document.querySelector('#cr-owner .ow-wrap');
  const cards = [...document.querySelectorAll('#cr-owner .ow-card')];
  return { h: w ? Math.round(w.scrollHeight) : 0, n: cards.length,
           areas: cards.map(c => c.getAttribute('data-area')),
           figures: cards.map(c => (c.querySelector('.oc-n') || {}).textContent || ''),
           boxes: cards.map(c => Math.round(c.getBoundingClientRect().height)),
           secs: document.querySelectorAll('#cr-owner .ow-sec').length };
}).catch(() => ({ h:0, n:0, areas:[], figures:[], boxes:[], secs:0 }));

ok(hub.n >= 7, 'the hub shows a card per area (' + hub.n + ')');
ok(hub.secs === 0, 'and the eight stacked sections are NOT all on it (' + hub.secs + ' rendered)');
ok(hub.h > 0 && hub.h < 2000,
   'the hub fits ~1.5 screens, not 3.4 — ' + hub.h + 'px (was 2907px before the hub)');
/* ⚠ [].every() is TRUE. Both of these passed vacuously on the 1128 control,
   where there are no cards at all — "every card carries a figure — []" is a
   check that cannot fail. BUG_CLASSES 81, written this same day and promptly
   reproduced: assert the POPULATION before asserting over it. */
ok(hub.figures.length > 0 && hub.figures.every(f => String(f).trim().length > 0),
   'every card carries a live figure, so the hub answers "does anything need me" ' +
   'without opening anything — [' + hub.figures.join(', ') + ']');
ok(hub.boxes.length > 0 && hub.boxes.every(x => x >= 44),
   'every card clears the 44px touch rule (' + hub.boxes.length + ' cards, min ' +
   Math.min(...(hub.boxes.length ? hub.boxes : [0])) + 'px)');

/* ── 2. contrast on the card, against its REAL ground ──────────────────── */
const ink = await p.evaluate(() => {
  const L = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const RAT = (a,b) => { let x=L(a), y=L(b); if(x<y){const t=x;x=y;y=t;} return (x+0.05)/(y+0.05); };
  const px = s => { const m=String(s).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); return m?[+m[1],+m[2],+m[3]]:null; };
  const card = document.querySelector('#cr-owner .ow-card');
  if (!card) return null;
  const g = px(getComputedStyle(card).backgroundColor) || [255,253,249];
  const out = [];
  for (const sel of ['.oc-t','.oc-n','.oc-w','.oc-d','.oc-go']) {
    const el = card.querySelector(sel); if (!el) continue;
    const cs = getComputedStyle(el), fg = px(cs.color); if (!fg) continue;
    out.push({ sel, r:+RAT(fg,g).toFixed(2), size:parseFloat(cs.fontSize) });
  }
  return out;
}).catch(() => null);
if (ink && ink.length) {
  const worst = ink.slice().sort((a,b) => a.r - b.r)[0];
  ok(worst.r >= 4.5, 'every ink on the card clears 4.5 against its own ground — ' +
     'worst ' + worst.sel + ' at ' + worst.r + ':1');
  ok(ink.every(x => x.size >= 11), 'and nothing is under the 11px floor (min ' +
     Math.min(...ink.map(x => x.size)) + 'px)');
} else { ok(false, 'could not read the card inks (no card?)'); ok(false, 'font floor unchecked'); }

/* ── 3. tapping in, and the IN-APP back ────────────────────────────────── */
const trip = await p.evaluate(async () => {
  const c = document.querySelector('#cr-owner .ow-card[data-area="ledger"]');
  if (!c) return { no:true };
  c.click(); await new Promise(r => setTimeout(r, 500));
  const inArea = { sec: document.querySelectorAll('#cr-owner .ow-sec').length,
                   back: !!document.querySelector('#cr-owner .ow-back'),
                   title: (document.querySelector('#cr-owner .ow-at')||{}).textContent || '',
                   cards: document.querySelectorAll('#cr-owner .ow-card').length };
  const bk = document.querySelector('#cr-owner .ow-back');
  if (bk) bk.click();
  await new Promise(r => setTimeout(r, 500));
  return { inArea, hubCards: document.querySelectorAll('#cr-owner .ow-card').length };
}).catch(() => ({ no:true }));
ok(!trip.no && trip.inArea && trip.inArea.sec === 1, 'tapping a card opens that ONE area');
ok(!trip.no && trip.inArea && /Ledger/i.test(trip.inArea.title),
   '  · and names it (' + (trip.inArea ? trip.inArea.title : '—') + ')');
ok(!trip.no && trip.inArea && trip.inArea.cards === 0, '  · the hub cards are gone while inside');
ok(!trip.no && trip.hubCards >= 7, 'the in-app back returns to the hub (' + trip.hubCards + ' cards)');

/* ── 4. THE BROWSER BACK BUTTON — the 570-572 trap ─────────────────────── */
const hist = await p.evaluate(async () => {
  const c = document.querySelector('#cr-owner .ow-card[data-area="vault"]');
  if (!c) return { no:true };
  c.click(); await new Promise(r => setTimeout(r, 500));
  const wentIn = document.querySelectorAll('#cr-owner .ow-sec').length === 1;
  history.back(); await new Promise(r => setTimeout(r, 900));
  const backOnHub = document.querySelectorAll('#cr-owner .ow-card').length;
  const consoleShown = getComputedStyle(document.getElementById('cr-owner')).display !== 'none';
  return { wentIn, backOnHub, consoleShown };
}).catch(() => ({ no:true }));
ok(!hist.no && hist.wentIn, 'browser test: a card opens its area');
ok(!hist.no && hist.consoleShown,
   'BACK KEEPS YOU IN THE CONSOLE — it does not dump you on the home screen');
ok(!hist.no && hist.backOnHub >= 7,
   '  · and lands on the hub (' + (hist.no ? '—' : hist.backOnHub) + ' cards) — the 570-572 trap');
await p.close();

/* ── 5. a deep link opens straight into an area ────────────────────────── */
const p2 = await boot(390, 844);
await openConsole(p2, 'strategy');
const deep = await p2.evaluate(() => ({
  sec: document.querySelectorAll('#cr-owner .ow-sec').length,
  title: (document.querySelector('#cr-owner .ow-at')||{}).textContent || '',
  cards: document.querySelectorAll('#cr-owner .ow-card').length })).catch(() => ({}));
ok(deep.sec === 1 && /Strategy/i.test(deep.title || ''),
   'open("strategy") lands straight in that area, not the hub (' + (deep.title||'—') + ')');
/* an unknown key must fall back to the hub, never a blank screen */
await p2.evaluate(async () => { await window.CardinalOwner.open('nonsense-key');
  await new Promise(r => setTimeout(r, 800)); }).catch(() => {});
const bogus = await p2.evaluate(() => document.querySelectorAll('#cr-owner .ow-card').length).catch(() => 0);
ok(bogus >= 7, 'an unrecognised area falls back to the hub, not a blank page (' + bogus + ' cards)');
await p2.close();

/* ── 6. desktop gets two columns, and nothing scrolls sideways ─────────── */
const p3 = await boot(1440, 900);
await openConsole(p3);
const wide = await p3.evaluate(() => {
  const cards = [...document.querySelectorAll('#cr-owner .ow-card')];
  if (cards.length < 2) return { cols:0 };
  /* ⚠ Count the WIDEST row, not the average. Seven cards in two columns lay out
     2+2+2+1, so cards/rows is 1.75 and a ">= 2" average fails a correct grid.
     An odd card count makes the mean structurally unreachable. */
  const rows = {};
  for (const c of cards) { const t = Math.round(c.getBoundingClientRect().top);
    rows[t] = (rows[t] || 0) + 1; }
  return { cols: Math.max(...Object.values(rows)),
           rowShape: Object.keys(rows).sort((a,b)=>a-b).map(t => rows[t]).join('+'),
           sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
}).catch(() => ({ cols:0 }));
ok(wide.cols >= 2, 'the hub goes two-up on a desktop (widest row ' + wide.cols +
   ', shape ' + (wide.rowShape || '—') + ')');
ok((wide.sideways || 0) <= 0, 'and nothing scrolls sideways (' + (wide.sideways||0) + 'px)');
await p3.close();

ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs[0] : ''));

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
