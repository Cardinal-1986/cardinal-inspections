/* gate_setupleak — does each walked state hand back the screen it names?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * This class has now bitten the sentinel setup TWICE, and both times the
 * symptom was the same: a sweep that reported findings for screens it had
 * never actually looked at.
 *
 *   1. The DRAWER (recorded in sentinel_setup_cardinal.js's own banner).
 *      The nav menu does not close with hideAllViews(), so every state after
 *      'nav' was probed with the menu over it — "four contrast failures that
 *      were really one screen bleeding into three others."
 *
 *   2. The MODALS (found 25 Aug 2026 by the design audit). closeAll() knew
 *      about the drawer and two module views, and nothing about the NINE
 *      display:none;position:fixed overlays in static markup. From state 13
 *      onward, ckModal and projModal sat over EVERY remaining screen:
 *
 *          newproject    projModal open,  8 white elements
 *          checklist     both open,      40 white elements
 *          signature     both open,      42
 *          … TRUE/TRUE through showcase, the 25th and last state
 *
 *      Twelve of twenty-five states were not swept. They were the checklist
 *      modal wearing another screen's name — and a white modal on a dark app
 *      is exactly the shape that manufactures INK findings.
 *
 * The project's standing rule (SKILL.md, Gate 0): when a class recurs it does
 * not get another paragraph, it gets a check. This is that check. Prose lost
 * to this one twice.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT ASSERTS
 *
 * For every state in the walk: no overlay that the state did not itself open
 * is still on screen when the probe would run. "Its own" is declared by
 * EXPECTED below — the two states that legitimately open a modal are the two
 * whose whole purpose is that modal.
 *
 * ⚠ It asserts a FLOOR on the number of states too. The failure mode this
 * guards against second is a walk that silently shrinks: if a state throws,
 * it contributes no renders and no findings, and the sweep still prints a
 * tidy summary. A smaller number nobody reads is this project's documented
 * BUG_CLASSES trap, and it has already cost a coverage check (15 → 14).
 *
 *   node gate_setupleak.mjs [index.html]
 *
 * Exit 0 = every state hands back its own screen. Exit 1 = something bled.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_setupleak: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

/* ⚠ NO EXPECTED LIST, AND THAT IS THE POINT.
   Earlier shapes of this gate needed a hand-maintained map of which state may
   legitimately have which overlay up — and a hand-maintained list is the thing
   that rots. FIRST APPEARANCE settles it without one: a state's own view or
   modal first appears at that state, so it is never a leak there. An element
   on screen NOW that was already on screen at an EARLIER state is one nobody
   cleaned up, whatever it is called and however it hides.

   This is also what makes the check mechanism-agnostic, which matters because
   the three real leaks used three different mechanisms:
     display   #ckModal / #projModal / #sigModal (the nine static modals)
     transform #navMenu (translateX(-320px))
     class     #cr-est-picker (.open{display:flex}, built at runtime)
   A rule keyed on any one of those would have missed the other two. */
const MIN_STATES = 25;   /* the floor — see the banner. Raise it when states are added. */

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://leak.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://leak.test/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const fails = [];
const firstSeen = new Map();   /* id -> the state that first put it on screen */

/* ⚠ THE BASELINE IS WHAT IS VISIBLE AT REST, NOT WHAT IS display:none AT REST.
   Two earlier shapes of this check were each blind to half the bug:

     - matching /modal|sheet|overlay|drawer|backdrop/ against the element id
       missed any overlay named something else, silently, while still printing
       PASS — a check that cannot fail for part of what it checks;
     - keying on "position:fixed AND display:none at rest" caught the nine
       static modals but would have missed BOTH originals: #navMenu is
       display:block at rest (it hides by transform:translateX(-320px)) and
       #navBackdrop is display:block too (it hides by opacity + pointer-events).
       The drawer bleed this gate is named for would have walked straight past.

   So: record the ids of every position:fixed element that is genuinely ON
   SCREEN at rest — the app's own chrome, header and bottom bar. Anything
   position:fixed and on screen DURING a state that was not on screen at rest
   arrived with that state. It is either the state's own subject (EXPECTED) or
   a leak, and the mechanism it used to appear does not matter. */
const onScreenFixed = `(() => {
  const ids = [];
  for (const el of document.body.querySelectorAll('[id]')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= 0 || r.left >= window.innerWidth) continue;
    ids.push(el.id);
  }
  return ids;
})()`;

const BASE = await page.evaluate(onScreenFixed);
console.log(`chrome visible at rest (position:fixed, on screen): ${BASE.length ? BASE.join(', ') : '(none)'}`);

const names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
if (names.length < MIN_STATES)
  fails.push(`WALK SHRANK: ${names.length} states, floor is ${MIN_STATES}. ` +
             `A state that throws contributes nothing and stays silent — find out which.`);

console.log(`gate_setupleak — ${FILE}\n${names.length} states\n`);
console.log('state            open overlays (that it did not open itself)');

for (let i = 0; i < names.length; i++) {
  try {
    await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`);
  } catch (e) {
    fails.push(`state "${names[i]}" THREW: ${String(e.message).split('\n')[0]}`);
    console.log(`  ${names[i].padEnd(15)} THREW`);
    continue;
  }
  await page.waitForTimeout(300);

  const nowFixed = await page.evaluate(onScreenFixed);
  const arrived = nowFixed.filter(id => !BASE.includes(id));
  /* leaked = on screen now, and first seen under an EARLIER state's name */
  const open = arrived.filter(id => firstSeen.has(id) && firstSeen.get(id) !== names[i]);
  for (const id of arrived) if (!firstSeen.has(id)) firstSeen.set(id, names[i]);

  const ownNow = arrived.filter(id => !open.includes(id));
  console.log(`  ${names[i].padEnd(15)} ${open.length ? '❌ ' + open.map(id => id + ' (from ' + firstSeen.get(id) + ')').join(', ')
                                                      : (ownNow.length ? '· ' + ownNow.join(', ') + ' (its own)' : 'clean')}`);
  if (open.length)
    fails.push(`state "${names[i]}" inherited ${open.map(id => id + ' from "' + firstSeen.get(id) + '"').join(', ')}`
             + ` — it is measuring another screen`);
}

await browser.close();

console.log('');
if (fails.length) {
  console.log('❌ FAIL — ' + fails.length);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — all ${names.length} states hand back their own screen`);
process.exit(0);
