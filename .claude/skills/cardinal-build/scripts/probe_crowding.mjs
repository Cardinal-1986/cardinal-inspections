/* probe_crowding.mjs — WHICH SCREENS SPEND THE PHONE ON CHROME?

   Theo, on All Leads & Jobs: "this screen is a mess, check all screens that
   might have this clustered issue". The cause is not any one element — it is
   that a wrapped chip strip silently becomes SIX rows on a 390px phone and
   pushes the results below the fold.

   ⚠ THE HISTORY MATTERS, and it is why this is a trade-off and not a bug.
   Build 992 put `flex-wrap:wrap` on seven strips ON PURPOSE, because with
   `nowrap; overflow-x:auto` and a hidden scrollbar they were CLIPPING — the
   photo editor hid Undo and Clear, the Showcase hid its own way out. Wrapping
   fixed a real defect. It also bought this one. Do not "fix" it by reverting to
   nowrap; that re-opens CLIPPED, which the sentinel watches.

   So the instrument must be GENERAL — measure rows, everywhere — rather than
   a map of the one screen that got reported. A map only ever finds the screen
   you already knew about.

   Reports, per state and per strip:
     rows   how many visual lines the strip's own children occupy
     px     what that costs vertically
   and, for the states that have a mapped results list, how far down the first
   result sits.

   usage:
     node probe_crowding.mjs <file.html> [390x844] [state,state|all]
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const [VW, VH] = (process.argv[3] || '390x844').split('x').map(Number);
const WANT = (process.argv[4] || 'all').split(',').filter(Boolean);

/* Only the states with a list of results below the strips can answer "how far
   down is the first row". Everything else still gets the strip measurement,
   which is the general finding. */
const LISTS = {
  leads: '#ljList', punch: '#puList', clientdir: '#cliList',
  photoactivity: '#phGrid', insclients: '#cr-ic-list',
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: VW, height: VH } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto('file://' + process.cwd() + '/' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const names = await p.evaluate('(window.__sentinelStates||[]).map(s=>s.name)');
const states = WANT[0] === 'all' ? names : WANT;

const MEASURE = (listSel) => {
  const vis = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const strips = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (!/flex/.test(cs.display)) continue;
    const kids = [...el.children].filter(vis);
    if (kids.length < 3) continue;
    /* a "strip" is a row of pills: every child refuses to shrink and refuses
       to break its own text. That is what all seven of 992's strips are, and
       it is what separates them from an ordinary flex layout. */
    const pill = k => {
      const c = getComputedStyle(k);
      return c.whiteSpace === 'nowrap' && parseFloat(c.flexShrink) === 0;
    };
    if (kids.filter(pill).length < kids.length * 0.8) continue;
    const tops = new Set(kids.map(k => Math.round(k.getBoundingClientRect().top)));
    const name = el.id ? '#' + el.id
      : '.' + (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    strips.push({ name, rows: tops.size, kids: kids.length,
      h: Math.round(el.getBoundingClientRect().height),
      scrollHidden: cs.overflowX === 'auto' && cs.flexWrap === 'nowrap' });
  }
  let firstY = null;
  if (listSel) {
    const L = document.querySelector(listSel);
    const row = L ? [...L.children].find(vis) : null;
    if (row) firstY = Math.round(row.getBoundingClientRect().top + window.scrollY);
  }
  return { strips, firstY, listFound: listSel ? !!document.querySelector(listSel) : null };
};

console.log('viewport ' + VW + 'x' + VH + '   (rows>2 on a phone = the reported defect)\n');
let worst = [];
for (const st of states) {
  const i = names.indexOf(st);
  if (i < 0) { console.log('  ' + st.padEnd(14) + '-- no such state'); continue; }
  try { await p.evaluate('Promise.resolve(window.__sentinelStates[' + i + '].run())'); }
  catch (e) { console.log('  ' + st.padEnd(14) + '-- threw: ' + String(e.message).split('\n')[0].slice(0, 70)); continue; }
  await p.waitForTimeout(900);
  let r;
  try { r = await p.evaluate(MEASURE, LISTS[st] || null); }
  catch (e) { console.log('  ' + st.padEnd(14) + '-- probe threw: ' + String(e.message).slice(0, 60)); continue; }
  const bad = r.strips.filter(s => s.rows > 2);
  const line = [];
  if (r.firstY != null) {
    const pct = Math.round(100 * r.firstY / VH);
    line.push('first row y=' + String(r.firstY).padStart(4) + ' (' + String(pct).padStart(3) + '% chrome)');
  } else if (LISTS[st]) line.push('list ' + LISTS[st] + (r.listFound ? ' empty' : ' MISSING'));
  if (bad.length) {
    line.push('CROWDED: ' + bad.map(s => s.name + ' ' + s.rows + ' rows/' + s.kids + ' chips/' + s.h + 'px').join('  '));
    worst.push([st, bad]);
  } else if (r.strips.length) {
    line.push(r.strips.length + ' strip(s) ok (max ' + Math.max(...r.strips.map(s => s.rows)) + ' row)');
  } else line.push('no strips');
  console.log('  ' + st.padEnd(14) + line.join('   '));
}
console.log('\n' + worst.length + ' state(s) with a strip over two rows at ' + VW + 'px');
await b.close();
