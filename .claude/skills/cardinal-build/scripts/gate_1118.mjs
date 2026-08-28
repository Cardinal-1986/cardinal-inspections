/* gate_1118.mjs — build 1118: the Estimates tile fills on zero-estimate jobs.
 *
 * Build 1094 added _commEst() to the profile's Estimates NAVIGATION count and
 * called isCommunityClient() — a name that exists only inside cr-wo-script's
 * closed IIFE (its exports are render/canSee, nothing else). && short-circuits,
 * so the ReferenceError fired exactly when the count was 0 — the one case with
 * something to say — and the tile kept its "…" placeholder forever.
 * 1118 gates on the block's own projClaimType() instead.
 *
 * Proves, in Chromium against the sentinel mock (project p1 has no estimates):
 *   1. the tile's text is a NUMBER, not the "…" placeholder
 *   2. zero-count styling applied (the .zero class the fill path toggles)
 *   3. no isCommunityClient ReferenceError reached the page
 * Run:  node gate_1118.mjs [artifact]      (defaults to <repo>/index.html)
 * Control: run against the previous build — it must go RED on all three,
 * because a gate never seen red proves nothing.
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1118: playwright not found'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1118.mjs [index.html]'); process.exit(2); }

const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  .catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
/* state 1 = the client profile on the seeded project p1 (zero estimates) */
await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
await page.waitForTimeout(1800);

const r = await page.evaluate(`(function(){
  var e = document.getElementById('dbEstN');
  return { text: e ? e.textContent : 'MISSING', cls: e ? e.className : '' };
})()`);
await browser.close();

const fails = [];
if (!/^\d+$/.test(r.text)) fails.push(`tile shows ${JSON.stringify(r.text)} — not a number (the "…" never-filled symptom)`);
if (r.text === '0' && !/\bzero\b/.test(r.cls)) fails.push(`tile is 0 but missing the .zero class the fill path toggles (got "${r.cls}")`);
const refErrs = errs.filter(e => /isCommunityClient/.test(e));
if (refErrs.length) fails.push(`isCommunityClient ReferenceError reached the page x${refErrs.length}`);
if (!fails.length && errs.length) console.log('  note: unrelated page errors (not judged here): ' + errs.slice(0, 2).join(' | '));

for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1118 RED — ${fails.length} failure(s)` : 'GATE 1118 GREEN — 3 checks (tile=' + r.text + ')');
process.exit(fails.length ? 1 : 0);
