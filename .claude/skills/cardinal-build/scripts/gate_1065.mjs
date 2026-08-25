/* gate_1065 — the retail header slogan shows where it fits and nowhere else.
 *
 * A REAL CHROMIUM RENDER, not jsdom, for two reasons this project has paid for:
 *   - the new rule has to BEAT `#cr-hd2-mid #brandTitle{display:block !important}`
 *     which lives in a LATER stylesheet. Later source order wins at equal
 *     specificity; this rule wins on specificity instead (3 ids + attribute +
 *     type vs 2 ids). Only an engine settles which one actually applied —
 *     build 481 is the class where a rule parsed, balanced, and never won,
 *     with every mechanical gate green.
 *   - jsdom does not lay text out, so "is it truncated" is unanswerable there.
 *
 * ⚠ CHECK 3 IS THE ONE THAT MATTERS MOST. #brandTitle carries the CRM NAME in
 * the non-retail CRMs, and the 416-era comment in the same stylesheet forces it
 * visible because it must never disappear. A fix that hid the slogan by hiding
 * #brandTitle globally would look perfect on every retail screen and quietly
 * remove the title from Insurance and Community.
 *
 *   node gate_1065.mjs [index.html]
 *
 * Exit 0 = all checks pass. Point it at the previous build as a control.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_1065: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

let pass = 0; const fails = [];
const ok  = (n, d) => { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); };
const bad = (n, d) => { fails.push(n + (d ? ': ' + d : '')); console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

async function at(width, crmHead) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://g65.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u)) return r.abort();
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP);
  await page.goto('https://g65.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  try { await page.evaluate(`(window.__sentinelStates||[])[0] && window.__sentinelStates[0].run()`); } catch (e) {}
  await page.waitForTimeout(400);

  /* Drive the CRM through the app's own attribute, the way skin() publishes it,
     then let the header module settle. Reaching past crmNow() is deliberate:
     seeding a whole insurance project just to read one header would test the
     fixture, not the rule. */
  if (crmHead) {
    await page.evaluate((h) => { document.body.dataset.crmHead = h; }, crmHead);
    await page.waitForTimeout(300);
  }

  const r = await page.evaluate(() => {
    const t = document.getElementById('brandTitle');
    if (!t) return { missing: true };
    const h1 = t.querySelector('h1');
    const cs = getComputedStyle(t);
    const box = t.getBoundingClientRect();
    return {
      display: cs.display,
      onScreen: cs.display !== 'none' && box.width > 2 && box.height > 2,
      truncated: h1 ? h1.scrollWidth > h1.clientWidth : null,
      text: h1 ? (h1.textContent || '').trim() : '',
      crmHead: document.body.dataset.crmHead || '(unset)',
    };
  });
  await ctx.close();
  return r;
}

console.log(`gate_1065 — ${FILE}\n`);

/* 1-2 — retail on a phone: gone, not cut off */
const p390 = await at(390, 'retail');
p390.display === 'none'
  ? ok('390px retail — the slogan is hidden', 'display:none won over a later !important rule')
  : bad('390px retail — the slogan is hidden', `display is "${p390.display}", text "${p390.text}"`);

/* 3 — the width where it fits: present AND not truncated. Both halves matter;
   "present" alone would pass on the broken build too. */
const p438 = await at(438, 'retail');
if (!p438.onScreen) bad('438px retail — the slogan is shown', `display:${p438.display}`);
else if (p438.truncated) bad('438px retail — the slogan is shown', 'on screen but STILL truncated');
else ok('438px retail — shown and not truncated', p438.text);

/* 4 — a desktop width, unchanged */
const p1194 = await at(1194, 'retail');
(p1194.onScreen && !p1194.truncated)
  ? ok('1194px retail — untouched', p1194.text)
  : bad('1194px retail — untouched', `onScreen:${p1194.onScreen} truncated:${p1194.truncated}`);

/* 5-6 — ⚠ THE OTHER CRMs KEEP THEIR TITLE ON A PHONE. This is the check that
   catches the tempting-but-wrong fix. */
for (const crm of ['insurance', 'community']) {
  const r = await at(390, crm);
  /* ⚠ Assert the attribute actually TOOK before trusting the result. Without
     this the check passes vacuously if the header module resets data-crm-head
     to retail — it would then be re-testing retail and calling it insurance.
     (It does not reset it: check 1 proves retail at 390 is hidden, so these
     two cannot both pass unless the attribute really changed.)
     The h1 TEXT stays "Single source of truth" here because skin() only
     rewrites it when crmNow() changes, and nothing seeded an insurance
     project. That is cosmetic and not what is under test — the CSS scoping is.
     Printing the text without saying so implied the CRM name had rendered,
     which it had not. */
  if (r.crmHead !== crm) bad(`390px ${crm} — the CRM title survives`,
        `data-crm-head is "${r.crmHead}", not "${crm}" — this check would be vacuous`);
  else if (!r.onScreen) bad(`390px ${crm} — the CRM title survives`,
        `display:${r.display} — the title must never disappear`);
  else ok(`390px ${crm} — the CRM title survives`,
        `data-crm-head="${r.crmHead}", element shown (h1 text is still retail's; skin() re-renders it only on a real CRM change)`);
}

await browser.close();

console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}`);
process.exit(0);
