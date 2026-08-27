/* gate_1090.mjs — tapping a day in Production opens that day.

   Build 1090, Theo's options 1 and 5: a sheet over the hub showing the tapped
   day, and on dismiss the hub scrolls to that day and lights it once.

   ⚠ THIS GATE MUST BE RUN AGAINST 1089 AS A CONTROL, and it is written so that
   it goes RED there rather than crashing. BUG_CLASSES 37 — a control that dies
   with `undefined is not an object` before printing a line has proved nothing,
   and that shape has struck this project five times in one session. Every probe
   below reads through optional chaining or a guarded lookup, and every
   interaction goes through tap(), which records a failure and carries on.

   usage:  node gate_1090.mjs <file.html>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

/* open Production the way the app opens it */
const opened = await p.evaluate(async () => {
  try {
    const st = (window.__sentinelStates || []).find(s => s.name === 'production');
    if (!st) return 'no production state';
    await st.run();
    return 'ok';
  } catch (e) { return String(e.message || e).split('\n')[0]; }
});
ok(opened === 'ok', 'Production hub opens (' + opened + ')');
await p.waitForTimeout(900);

/* a click that cannot throw the run away */
async function tap(sel, why) {
  const hit = await p.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return 'absent';
    e.click();
    return 'clicked';
  }, sel);
  if (hit !== 'clicked') { fail++; console.log('  FAIL  could not ' + why + ' (' + sel + ' ' + hit + ')'); return false; }
  return true;
}

const read = () => p.evaluate(() => {
  const m = document.getElementById('cr-pb-modal');
  const rule = document.getElementById('pbDayRule');
  const sheet = m ? m.querySelector('.pbdaysheet') : null;
  return {
    modalExists : !!m,
    open        : !!(m && m.classList.contains('open')),
    mode        : m ? (m.getAttribute('data-mode') || '') : '',
    daySheet    : !!sheet,
    when        : sheet ? (sheet.querySelector('.pbdwhen b') || {}).textContent || '' : '',
    rows        : sheet ? sheet.querySelectorAll('.pbev, .pbempty').length : 0,
    rowWired    : sheet ? [...sheet.querySelectorAll('.pbev')].every(r => typeof r.onclick === 'function') : null,
    closeBtn    : sheet ? !!sheet.querySelector('[data-dayclose]') : false,
    closeBox    : sheet && sheet.querySelector('.pbdx')
                    ? (r => ({ w: Math.round(r.width), h: Math.round(r.height) }))(sheet.querySelector('.pbdx').getBoundingClientRect())
                    : null,
    ruleExists  : !!rule,
    ruleFlash   : !!(rule && rule.classList.contains('pbflash')),
    /* ⚠ THE CHECK THIS GATE WAS MISSING, and it let a real defect through a
       green run. Every production class is scoped `#cr-pb .x`; the sheet lives
       on document.body, OUTSIDE #cr-pb. The first version of 1090 therefore put
       the day's rows in a sheet where none of the module's CSS applied and
       Chromium computed .pbev at rgb(239,239,239) — a light-grey UA button on a
       near-black sheet. Structure was perfect; appearance was broken. Compare
       the SHEET's computed values against the HUB's, because "it has a class"
       is not "it is styled". */
    evStyle     : (function(){ var e = sheet && sheet.querySelector('.pbev'); if(!e) return null;
                    var c = getComputedStyle(e);
                    return { display:c.display, bg:c.backgroundColor, pad:c.padding }; })(),
    hubEvStyle  : (function(){ var e = document.querySelector('#cr-pb .pbev'); if(!e) return null;
                    var c = getComputedStyle(e);
                    return { display:c.display, bg:c.backgroundColor, pad:c.padding }; })(),
    chipStyle   : (function(){ var e = sheet && sheet.querySelector('.pbchip'); if(!e) return null;
                    var c = getComputedStyle(e);
                    return { bw:c.borderTopWidth, bc:c.borderTopColor, r:c.borderRadius }; })(),
    hubChipStyle: (function(){ var e = document.querySelector('#cr-pb .pbchip'); if(!e) return null;
                    var c = getComputedStyle(e);
                    return { bw:c.borderTopWidth, bc:c.borderTopColor, r:c.borderRadius }; })(),
  };
});
const same = (a, b) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

/* ── the tap ─────────────────────────────────────────────────────────── */
const before = await read();
ok(before.ruleExists, 'the hub carries the #pbDayRule anchor');
ok(!before.open, 'no sheet is open before any tap');

/* pick a day cell that is NOT the already-selected one */
const daySel = await p.evaluate(() => {
  const cells = [...document.querySelectorAll('#cr-pb [data-day], .pbday[data-day]')]
    .filter(c => !c.classList.contains('out') && !c.classList.contains('sel'));
  if (!cells.length) return null;
  /* PREFER a day that actually has work on it — a day with nothing renders the
     empty state, and then the row-styling assertions above have no row to
     score and pass vacuously. A check that cannot fail is worse than none. */
  const c = cells.find(x => x.querySelector('.pbpip')) || cells[Math.min(12, cells.length - 1)];
  c.setAttribute('data-gate1090', '1');
  return '[data-gate1090]';
});
ok(!!daySel, 'a tappable day cell exists on the hub');
if (daySel) await tap(daySel, 'tap a day cell');
await p.waitForTimeout(700);

const after = await read();
/* an optional picture from the same run that made the assertions, so the render
   and the numbers can never describe two different states */
if (process.argv[3]) {
  const cdp = await p.context().newCDPSession(p);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  (await import('fs')).writeFileSync(process.argv[3], Buffer.from(shot.data, 'base64'));
  console.log('  ..    wrote ' + process.argv[3]);
}
ok(after.open, 'tapping a day OPENS a sheet');
ok(after.mode === 'day', 'the shared modal is in day mode (' + (after.mode || 'none') + ')');
ok(after.daySheet, 'the sheet is the day sheet');
ok(/[A-Za-z]/.test(after.when), 'the sheet names the day: "' + after.when + '"');
ok(after.rows > 0, 'the sheet renders that day (' + after.rows + ' row(s), agenda or empty state)');
ok(after.closeBtn, 'the sheet has its own close control');
ok(after.closeBox && after.closeBox.w >= 44 && after.closeBox.h >= 44,
   'close control clears the 44px floor (' + JSON.stringify(after.closeBox) + ')');
ok(after.rowWired !== false, 'every event row inside the sheet is wired by qAll (' + after.rowWired + ')');
/* the module's CSS reaches inside the sheet — computed, not assumed */
ok(after.evStyle === null || same(after.evStyle, after.hubEvStyle),
   'a day row in the sheet computes IDENTICALLY to one on the hub  sheet=' +
   JSON.stringify(after.evStyle) + '  hub=' + JSON.stringify(after.hubEvStyle));
ok(after.chipStyle === null || same(after.chipStyle, after.hubChipStyle),
   'a chip in the sheet computes IDENTICALLY to one on the hub  sheet=' +
   JSON.stringify(after.chipStyle) + '  hub=' + JSON.stringify(after.hubChipStyle));

/* ── the dismiss: option 5 ───────────────────────────────────────────── */
await tap('[data-dayclose]', 'close the day sheet');
await p.waitForTimeout(500);
const closed = await read();
ok(!closed.open, 'the close control dismisses the sheet');
ok(closed.ruleFlash, 'dismissing lights the day row on the hub (option 5)');

/* ── the full-calendar pane must NOT get a sheet ─────────────────────── */
await p.evaluate(() => {
  const b = [...document.querySelectorAll('[data-go="cal"]')][0];
  if (b) b.click();
});
await p.waitForTimeout(800);
const calDay = await p.evaluate(() => {
  const cells = [...document.querySelectorAll('.pbday[data-day]')].filter(c => !c.classList.contains('sel'));
  if (!cells.length) return null;
  cells[Math.min(10, cells.length - 1)].click();
  return true;
});
await p.waitForTimeout(600);
const onCal = await read();
ok(calDay === null || !onCal.open,
   'the full-calendar pane does NOT open a sheet — it already shows the day beside the grid');

/* ── the scroll lock did not move ────────────────────────────────────── */
const lock = await p.evaluate(() => document.body.style.overflow);
ok(lock === 'hidden' || lock === '', 'body overflow is the board\'s own value, untouched (' + JSON.stringify(lock) + ')');

console.log('\n' + (fail ? 'RED  ' : 'GREEN  ') + pass + ' pass / ' + fail + ' fail');
await b.close();
process.exit(fail ? 1 : 0);
