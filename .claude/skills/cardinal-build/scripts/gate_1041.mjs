/* gate_1041.mjs — build 1041 (audit O2): the footer stamp diet.
 * Rendered proof: the nav menu's [data-cr-footer] carries ONE build line
 * (<600 chars, exactly one "build NNNN"), the stamp is the CURRENT build, and
 * the CHANGELOG still holds the deep history (b:1015 present) so What's New
 * lost nothing.
 * Run:  node gate_1041.mjs <artifact> [--control <main index at 1040>]
 * Control must go RED (11.6 KB, 26 build write-ups).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1041: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1041.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function probe(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(`(function(){
    var f = document.querySelector('[data-cr-footer]');
    var t = f ? (f.textContent || '') : '';
    return { found: !!f, len: t.trim().length,
             builds: (t.match(/[Bb]uild \\d+/g) || []).length,
             head: t.trim().slice(0, 40) };
  })()`);
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r, html) {
  const fails = [];
  if (!r.found) { fails.push('[data-cr-footer] not rendered (proves nothing)'); return fails; }
  if (r.len > 600) fails.push(`footer text is ${r.len} chars (want one line, <600)`);
  if (r.builds !== 1) fails.push(`footer names ${r.builds} builds (want exactly 1 — the current one)`);
  if (!html.includes('{ b:1015, d:')) fails.push('CHANGELOG lost the deep history (b:1015 gone) — the diet ate the wrong record');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await probe(html), html);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1041 RED — ${fails.length} failure(s)` : 'GATE 1041 GREEN — one-line stamp, history intact in What’s New');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cfails = judge(await probe(chtml), chtml);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 3)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
