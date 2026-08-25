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

/* The states that legitimately have an overlay up: the two whose entire
   subject IS that overlay. Anything else showing one has inherited it. */
const EXPECTED = {
  newproject: ['projModal'],
  checklist:  ['ckModal'],
  signature:  ['sigModal'],
  /* 'nav' IS the drawer — the backdrop is its subject, not something it
     inherited. Listing it here is not a fudge to get to green: the test is
     "did this state hand back the screen it NAMES", and the screen this one
     names is the open menu. Every other state showing navBackdrop is a
     genuine bleed, which is exactly what caught the closeDrawer() defect. */
  nav:        ['navBackdrop'],
};
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

const names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
const fails = [];
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

  const open = await page.evaluate(() => {
    /* Every position:fixed overlay currently on screen, by id. The same
       definition the setup snapshot uses, so the two cannot disagree. */
    const out = [];
    for (const el of document.body.querySelectorAll('[id]')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      /* off-canvas (a shut drawer) is not on screen — #navMenu lives at
         translateX(-320px) with a full-size rect, and reading that as "open"
         is the mirror-image false positive of the one this gate catches. */
      if (r.right <= 0 || r.left >= window.innerWidth) continue;
      if (/modal|sheet|overlay|drawer|backdrop/i.test(el.id)) out.push(el.id);
    }
    return out;
  });

  const allowed = EXPECTED[names[i]] || [];
  const stray = open.filter(id => !allowed.includes(id));
  console.log(`  ${names[i].padEnd(15)} ${stray.length ? '❌ ' + stray.join(', ') : (open.length ? '· ' + open.join(', ') + ' (its own)' : 'clean')}`);
  if (stray.length)
    fails.push(`state "${names[i]}" inherited: ${stray.join(', ')} — it is measuring another screen`);
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
