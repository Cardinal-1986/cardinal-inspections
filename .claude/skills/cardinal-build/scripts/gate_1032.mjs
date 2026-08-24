/* gate_1032.mjs — build 1032: the delete-client caption is readable in light mode.
 * Chromium rig, estprofile state, BOTH themes. Proves the caption under
 * #delClientBtn computes #a89f9a in dark and #6c655e in rb-light, carries the
 * .danger-note class, and no longer pins its ink inline (the 1025 Balance-Due
 * class of bug: an inline style beats every stylesheet).
 * Run:  node gate_1032.mjs <artifact> [--control <prev>]
 * The control must go RED (same dark grey computed in the light theme).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1032: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1032.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function probe(html, light) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.evaluate(`Promise.resolve(window.__sentinelStates[4].run())`);
  await page.waitForTimeout(700);
  const out = await page.evaluate(`(function(){
    var z = document.getElementById('dangerZone');
    var n = z && (z.querySelector('.danger-note') ||
                  (function(){ var b = document.getElementById('delClientBtn');
                     return b && b.nextElementSibling; })());
    if (!n) return { ink: 'MISSING' };
    return {
      ink: getComputedStyle(n).color,
      hasClass: n.classList.contains('danger-note'),
      inlineInk: (n.getAttribute('style') || '').indexOf('color:') !== -1,
    };
  })()`);
  await browser.close();
  return out;
}

function judge(dark, lite) {
  const fails = [];
  if (dark.ink !== 'rgb(168, 159, 154)') fails.push(`caption ink dark ${dark.ink} (want rgb(168, 159, 154))`);
  if (lite.ink !== 'rgb(108, 101, 94)') fails.push(`caption ink light ${lite.ink} (want rgb(108, 101, 94))`);
  if (!dark.hasClass) fails.push('caption has no .danger-note class');
  if (dark.inlineInk) fails.push('caption still pins its ink inline');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await probe(html, false), await probe(html, true));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1032 RED — ${fails.length} failure(s)` : 'GATE 1032 GREEN — caption themed, de-inlined');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cfails = judge(await probe(chtml, false), await probe(chtml, true));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
